"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BODY_PART_LABELS,
  SUGGESTED_BODY_PART_ORDER,
  getStretchById,
} from "@/data/stretch-library";
import { getExerciseById } from "@/data/exercise-library";
import {
  getDescriptorById,
  matchDescriptorsFromText,
  summarizeDescriptors,
} from "@/data/pain-descriptors";
import {
  CLINICAL_SUBCATEGORY_LABELS,
  getConditionById,
  matchConditionsFromText,
  summarizeConditions,
} from "@/data/clinical-conditions";
import {
  ASSISTIVE_DEVICES,
  BORG_TARGETS,
  CLINICAL_PRECAUTIONS,
  IMPLANTED_DEVICES,
  ORTHOTIC_DEVICES,
  PRECAUTION_CATEGORY_LABELS,
  PROSTHETIC_DEVICES,
  estimateMaxHr,
  getBorgTarget,
  ageBasedDefaultBorg,
  buildClinicalSafetyPlan,
} from "@/data/clinical-safety";
import { analyzeAssessmentAdjectives } from "@/data/assessment-adjectives";
import { generateHybridPlan, parseConcernParagraph } from "@/lib/routine-engine";
import { planFromSymptomInput } from "@/lib/modality-engine";
import type {
  BodyPart,
  Difficulty,
  ModalityPlan,
  MovementKind,
  SymptomInput,
} from "@/lib/types";
import { PainScale } from "@/components/PainScale";
import { PainDescriptorPicker } from "@/components/PainDescriptorPicker";
import { ModalityPlanPanels } from "@/components/ModalitySuggestions";
import {
  averagePainFromAreas,
  loadLocalPainProfile,
  saveLocalPainProfile,
} from "@/lib/pain-profile";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Home,
  Sparkles,
  Stethoscope,
} from "lucide-react";

const STEPS = [
  { id: 1, title: "Your story", short: "Story" },
  { id: 2, title: "Body & pain", short: "Body" },
  { id: 3, title: "Safety", short: "Safety" },
  { id: 4, title: "Preferences", short: "Prefs" },
  { id: 5, title: "Your plan", short: "Plan" },
] as const;

const AREAS: BodyPart[] = [
  ...SUGGESTED_BODY_PART_ORDER,
  ...(Object.keys(BODY_PART_LABELS) as BodyPart[]).filter(
    (a) => !SUGGESTED_BODY_PART_ORDER.includes(a)
  ),
];
const SYMPTOM_CHIPS = [
  "stiffness",
  "desk posture",
  "morning tightness",
  "after workout soreness",
  "limited mobility",
  "stress tension",
  "walking discomfort",
  "weakness",
];
const GOAL_CHIPS = [
  "improve flexibility",
  "build strength",
  "reduce stiffness",
  "move easier at work",
  "prepare for sport",
  "better posture",
  "recover gently",
];

export default function AssessmentPage() {
  const [paragraph, setParagraph] = useState("");
  const [areas, setAreas] = useState<BodyPart[]>([]);
  const [painLevels, setPainLevels] = useState<Partial<Record<BodyPart, number>>>({});
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [customSymptom, setCustomSymptom] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [minutes, setMinutes] = useState(15);
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [preferKinds, setPreferKinds] = useState<"auto" | MovementKind[]>("auto");
  /** Manually selected / applied descriptors */
  const [descriptorIds, setDescriptorIds] = useState<string[]>([]);
  /** Track which IDs came from paragraph auto-detect (can re-sync) */
  const [autoDescIds, setAutoDescIds] = useState<string[]>([]);
  const [autoApplyDesc, setAutoApplyDesc] = useState(true);
  const [routineId, setRoutineId] = useState<string | null>(null);
  const [generated, setGenerated] = useState<ReturnType<typeof generateHybridPlan> | null>(null);
  const [modalityPlan, setModalityPlan] = useState<ModalityPlan | null>(null);
  const [saving, setSaving] = useState(false);

  // Detailed clinical Assessment fields
  const [ageYears, setAgeYears] = useState<number | "">("");
  const [borgTargetId, setBorgTargetId] = useState("borg-light");
  const [restingHr, setRestingHr] = useState<number | "">("");
  const [precautionIds, setPrecautionIds] = useState<string[]>([]);
  const [implantIds, setImplantIds] = useState<string[]>([]);
  const [orthoticIds, setOrthoticIds] = useState<string[]>([]);
  const [prostheticIds, setProstheticIds] = useState<string[]>([]);
  const [assistiveDeviceIds, setAssistiveDeviceIds] = useState<string[]>([]);
  const [protocolNotes, setProtocolNotes] = useState("");
  const [homeBasedProgram, setHomeBasedProgram] = useState(true);
  const [step, setStep] = useState(1);
  const [deviceTab, setDeviceTab] = useState<"precautions" | "implants" | "supports">("precautions");

  useEffect(() => {
    const local = loadLocalPainProfile();
    if (local?.descriptorIds?.length) setDescriptorIds(local.descriptorIds);
    if (local?.freeText) setParagraph(local.freeText);
    if (local?.ageYears != null) setAgeYears(local.ageYears);
    if (local?.borgTargetId) setBorgTargetId(local.borgTargetId);
    if (local?.precautionIds) setPrecautionIds(local.precautionIds);
    if (local?.implantIds) setImplantIds(local.implantIds);
    if (local?.orthoticIds) setOrthoticIds(local.orthoticIds);
    if (local?.prostheticIds) setProstheticIds(local.prostheticIds);
    if (local?.assistiveDeviceIds) setAssistiveDeviceIds(local.assistiveDeviceIds);
    if (local?.protocolNotes) setProtocolNotes(local.protocolNotes);
    if (local?.homeBasedProgram != null) setHomeBasedProgram(local.homeBasedProgram);
    fetch("/api/pain-profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.profile?.descriptorIds?.length) setDescriptorIds(d.profile.descriptorIds);
        if (d.profile?.freeText && !local?.freeText) setParagraph(d.profile.freeText);
        if (d.profile?.ageYears != null) setAgeYears(d.profile.ageYears);
        if (d.profile?.borgTargetId) setBorgTargetId(d.profile.borgTargetId);
        if (d.profile?.precautionIds) setPrecautionIds(d.profile.precautionIds);
        if (d.profile?.implantIds) setImplantIds(d.profile.implantIds);
        if (d.profile?.orthoticIds) setOrthoticIds(d.profile.orthoticIds);
        if (d.profile?.prostheticIds) setProstheticIds(d.profile.prostheticIds);
        if (d.profile?.assistiveDeviceIds) setAssistiveDeviceIds(d.profile.assistiveDeviceIds);
        if (d.profile?.protocolNotes) setProtocolNotes(d.profile.protocolNotes);
        if (d.profile?.homeBasedProgram != null) setHomeBasedProgram(d.profile.homeBasedProgram);
      })
      .catch(() => {});
  }, []);

  const toggle = <T,>(list: T[], item: T): T[] =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

  const parsedPreview = useMemo(
    () => (paragraph.trim().length > 12 ? parseConcernParagraph(paragraph) : null),
    [paragraph]
  );

  // Live clinical descriptors from paragraph text
  const paragraphDescriptors = useMemo(() => {
    if (paragraph.trim().length < 12) return [] as string[];
    return matchDescriptorsFromText(paragraph, 14);
  }, [paragraph]);

  const paragraphDescDetails = useMemo(
    () =>
      paragraphDescriptors
        .map((id) => getDescriptorById(id))
        .filter(Boolean)
        .map((d) => d!),
    [paragraphDescriptors]
  );

  // Auto-merge paragraph descriptors into selection when enabled
  useEffect(() => {
    if (!autoApplyDesc) return;
    if (!paragraphDescriptors.length) {
      setAutoDescIds([]);
      return;
    }
    setAutoDescIds(paragraphDescriptors);
    setDescriptorIds((prev) => {
      const manualOnly = prev.filter((id) => !autoDescIds.includes(id));
      return Array.from(new Set([...manualOnly, ...paragraphDescriptors]));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- autoDescIds intentionally previous set
  }, [paragraphDescriptors, autoApplyDesc]);

  const descHints = useMemo(() => summarizeDescriptors(descriptorIds), [descriptorIds]);

  const paragraphConditions = useMemo(() => {
    if (paragraph.trim().length < 12) return [] as string[];
    return matchConditionsFromText(paragraph, 12);
  }, [paragraph]);

  const conditionHints = useMemo(
    () => summarizeConditions(paragraphConditions),
    [paragraphConditions]
  );

  const adjectivePreview = useMemo(
    () => (paragraph.trim().length > 8 ? analyzeAssessmentAdjectives(paragraph) : null),
    [paragraph]
  );

  const safetyPreview = useMemo(
    () =>
      buildClinicalSafetyPlan({
        ageYears: ageYears === "" ? undefined : Number(ageYears),
        borgTargetId,
        restingHr: restingHr === "" ? undefined : Number(restingHr),
        precautionIds,
        implantIds,
        orthoticIds,
        prostheticIds,
        assistiveDeviceIds,
        protocolNotes,
        concernParagraph: paragraph,
      }),
    [
      ageYears,
      borgTargetId,
      restingHr,
      precautionIds,
      implantIds,
      orthoticIds,
      prostheticIds,
      assistiveDeviceIds,
      protocolNotes,
      paragraph,
    ]
  );

  // Auto-merge paragraph-detected implants/precautions when auto-apply is on
  useEffect(() => {
    if (!autoApplyDesc || paragraph.trim().length < 12) return;
    setPrecautionIds((prev) => Array.from(new Set([...prev, ...safetyPreview.precautionIds])));
    setImplantIds((prev) => Array.from(new Set([...prev, ...safetyPreview.implantIds])));
    setOrthoticIds((prev) => Array.from(new Set([...prev, ...safetyPreview.orthoticIds])));
    setProstheticIds((prev) => Array.from(new Set([...prev, ...safetyPreview.prostheticIds])));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run on paragraph / auto flag
  }, [paragraph, autoApplyDesc]);

  useEffect(() => {
    if (ageYears !== "" && Number(ageYears) > 0) {
      setBorgTargetId(ageBasedDefaultBorg(Number(ageYears)));
    }
  }, [ageYears]);

  function applyParagraphParse() {
    if (!parsedPreview) return;
    setAreas(parsedPreview.areas);
    setSymptoms(parsedPreview.symptoms);
    setGoals(parsedPreview.goals);
    setPreferKinds(parsedPreview.preferKinds);
    const pain: Partial<Record<BodyPart, number>> = {};
    for (const a of parsedPreview.areas) pain[a] = parsedPreview.estimatedPain;
    setPainLevels(pain);
    const matched = parsedPreview.painDescriptorIds?.length
      ? parsedPreview.painDescriptorIds
      : matchDescriptorsFromText(paragraph, 14);
    setAutoDescIds(matched);
    setDescriptorIds((prev) => Array.from(new Set([...prev, ...matched])));
    setAutoApplyDesc(true);
  }

  const input: SymptomInput = useMemo(() => {
    // Always re-merge latest paragraph matches for plan generation
    const fromParagraph = matchDescriptorsFromText(paragraph, 14);
    const mergedDesc = Array.from(new Set([...descriptorIds, ...fromParagraph]));
    const fromConditions = matchConditionsFromText(paragraph, 12);
    return {
      areas,
      symptoms,
      painLevels,
      goals,
      availableMinutes: minutes,
      difficulty,
      concernParagraph: paragraph,
      preferKinds,
      painDescriptorIds: mergedDesc,
      conditionIds: fromConditions,
      ageYears: ageYears === "" ? undefined : Number(ageYears),
      borgTargetId,
      restingHr: restingHr === "" ? undefined : Number(restingHr),
      precautionIds,
      implantIds,
      orthoticIds,
      prostheticIds,
      assistiveDeviceIds,
      protocolNotes: protocolNotes.trim() || undefined,
      homeBasedProgram,
    };
  }, [
    areas,
    symptoms,
    painLevels,
    goals,
    minutes,
    difficulty,
    paragraph,
    preferKinds,
    descriptorIds,
    ageYears,
    borgTargetId,
    restingHr,
    precautionIds,
    implantIds,
    orthoticIds,
    prostheticIds,
    assistiveDeviceIds,
    protocolNotes,
    homeBasedProgram,
  ]);

  async function createPlan() {
    const routine = generateHybridPlan(input);
    const modPlan = planFromSymptomInput({
      ...input,
      painDescriptorIds:
        routine.generatedFrom?.painDescriptorIds || input.painDescriptorIds || descriptorIds,
    });
    modPlan.source = "assess";
    const suggestedModalityIds = [
      ...modPlan.preVisit,
      ...modPlan.postVisit,
      ...modPlan.preSession,
      ...modPlan.postSession,
    ]
      .map((m) => m.modalityId)
      .filter((id, i, arr) => arr.indexOf(id) === i)
      .slice(0, 12);
    routine.generatedFrom = {
      ...routine.generatedFrom!,
      modalityPlanId: modPlan.id,
      suggestedModalityIds,
    };
    setGenerated(routine);
    setModalityPlan(modPlan);
    setStep(5);
    setSaving(true);
    const finalDesc =
      routine.generatedFrom?.painDescriptorIds || input.painDescriptorIds || descriptorIds;
    setDescriptorIds(finalDesc);
    const overall = averagePainFromAreas(
      painLevels,
      areas.length ? areas : (["full-body"] as BodyPart[])
    );
    const finalConditions =
      routine.generatedFrom?.conditionIds || input.conditionIds || paragraphConditions;
    const profile = saveLocalPainProfile({
      userId: "local",
      descriptorIds: finalDesc,
      conditionIds: finalConditions,
      freeText: paragraph,
      overallPain: overall || parsedPreview?.estimatedPain || 0,
      areas,
      source: "assess",
      ageYears: ageYears === "" ? undefined : Number(ageYears),
      borgTargetId,
      restingHr: restingHr === "" ? undefined : Number(restingHr),
      precautionIds,
      implantIds,
      orthoticIds,
      prostheticIds,
      assistiveDeviceIds,
      protocolNotes: protocolNotes.trim() || undefined,
      homeBasedProgram,
      adjectiveSummary: routine.generatedFrom?.adjectiveSummary,
    });
    try {
      localStorage.setItem(`routine:${routine.id}`, JSON.stringify(routine));
      localStorage.setItem("active-routine", JSON.stringify(routine));
      localStorage.setItem("modality-plan", JSON.stringify(modPlan));
      localStorage.setItem(
        "clinical-conditions",
        JSON.stringify({ ids: finalConditions, at: new Date().toISOString() })
      );
      localStorage.setItem(
        "clinical-safety-profile",
        JSON.stringify({
          ageYears: profile.ageYears,
          borgTargetId: profile.borgTargetId,
          precautionIds: profile.precautionIds,
          implantIds: profile.implantIds,
          orthoticIds: profile.orthoticIds,
          prostheticIds: profile.prostheticIds,
          assistiveDeviceIds: profile.assistiveDeviceIds,
          homeBasedProgram: profile.homeBasedProgram,
          at: new Date().toISOString(),
        })
      );
      await fetch("/api/pain-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profile,
          conditionIds: finalConditions,
          source: "assess",
        }),
      }).catch(() => {});
      await fetch("/api/modalities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save-plan",
          plan: modPlan,
          source: "assess",
        }),
      }).catch(() => {});
      const res = await fetch("/api/routines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(routine),
      });
      if (res.ok) {
        const data = await res.json();
        setRoutineId(data.routine?.id ?? routine.id);
      } else {
        setRoutineId(routine.id);
      }
    } catch {
      setRoutineId(routine.id);
    } finally {
      setSaving(false);
    }
  }

  const canGenerate =
    Boolean(paragraph.trim()) || areas.length > 0 || descriptorIds.length > 0;

  const insightCount =
    (paragraphDescDetails.length > 0 ? 1 : 0) +
    (paragraphConditions.length > 0 ? 1 : 0) +
    (adjectivePreview?.hits.length ? 1 : 0) +
    (safetyPreview.precautionIds.length || safetyPreview.implantIds.length ? 1 : 0);

  function chipClass(on: boolean, tone: "brand" | "accent" = "brand") {
    if (tone === "accent") {
      return on
        ? "bg-accent-500 text-white ring-accent-500"
        : "bg-white text-brand-800 ring-brand-200 hover:bg-brand-50 dark:bg-brand-950 dark:ring-brand-700";
    }
    return on
      ? "bg-brand-600 text-white ring-brand-600"
      : "bg-white text-brand-800 ring-brand-200 hover:bg-brand-50 dark:bg-brand-950 dark:ring-brand-700";
  }

  function StepNav() {
    return (
      <nav aria-label="Assessment steps" className="mb-5">
        <ol className="flex items-center gap-1 sm:gap-2">
          {STEPS.map((s, i) => {
            const active = step === s.id;
            const done = step > s.id || (s.id === 5 && Boolean(generated));
            return (
              <li key={s.id} className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setStep(s.id)}
                  className={`flex w-full min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-center transition sm:flex-row sm:px-2 ${
                    active
                      ? "bg-brand-600 text-white shadow-sm"
                      : done
                        ? "bg-brand-100 text-brand-900 dark:bg-brand-900/60 dark:text-brand-100"
                        : "bg-brand-50 text-brand-600 dark:bg-brand-950"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      active
                        ? "bg-white/20"
                        : done
                          ? "bg-brand-600 text-white"
                          : "bg-white text-brand-700 ring-1 ring-brand-200 dark:bg-brand-900"
                    }`}
                  >
                    {done && !active ? <Check className="h-3.5 w-3.5" /> : s.id}
                  </span>
                  <span className="truncate text-[10px] font-semibold sm:text-xs">
                    <span className="sm:hidden">{s.short}</span>
                    <span className="hidden sm:inline">{s.title}</span>
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <span className="hidden h-px w-2 shrink-0 bg-brand-200 sm:block dark:bg-brand-700" />
                )}
              </li>
            );
          })}
        </ol>
        <p className="mt-2 text-center text-xs text-brand-500">
          Step {step} of {STEPS.length} · {STEPS[step - 1]?.title}
        </p>
      </nav>
    );
  }

  function FooterNav({
    onBack,
    onNext,
    nextLabel = "Continue",
    nextDisabled,
    showGenerate,
  }: {
    onBack?: () => void;
    onNext?: () => void;
    nextLabel?: string;
    nextDisabled?: boolean;
    showGenerate?: boolean;
  }) {
    return (
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-brand-100 pt-4 dark:border-brand-800">
        {onBack ? (
          <button type="button" className="btn-ghost" onClick={onBack}>
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
        ) : (
          <span />
        )}
        {showGenerate ? (
          <button
            type="button"
            className="btn-primary min-w-[10rem]"
            onClick={createPlan}
            disabled={saving || !canGenerate}
          >
            {saving ? "Building…" : "Generate plan"}
          </button>
        ) : (
          <button
            type="button"
            className="btn-primary"
            onClick={onNext}
            disabled={nextDisabled}
          >
            {nextLabel}
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl pb-8">
      <header className="mb-5">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-500">
          Clinical intake
        </p>
        <h1 className="flex items-center gap-2 text-xl font-bold text-brand-950 sm:text-2xl">
          <Stethoscope className="h-6 w-6 shrink-0 text-brand-600" />
          Assessment
        </h1>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-brand-700/85">
          Five short steps. We read your words, safety limits, and goals—then build a realistic
          home-capable stretch and exercise plan.
        </p>
      </header>

      <StepNav />

      {/* ─── Step 1: Story ─── */}
      {step === 1 && (
        <section className="card space-y-4 p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-semibold text-brand-950">Describe your issue</h2>
            <p className="mt-1 text-sm text-brand-600">
              How it feels, where, what makes it worse or better, and any diagnoses or surgeries.
            </p>
          </div>
          <textarea
            className="input min-h-[140px] text-base leading-relaxed"
            value={paragraph}
            onChange={(e) => setParagraph(e.target.value)}
            placeholder="Example: Dull low-back ache, worse sitting at my desk, stiff in the morning. Sharp pain when I bend. Pain about 4/10. Want to move easier at work."
            aria-label="Describe your issue"
          />
          <label className="flex items-center gap-2 text-sm text-brand-700">
            <input
              type="checkbox"
              className="accent-brand-600"
              checked={autoApplyDesc}
              onChange={(e) => setAutoApplyDesc(e.target.checked)}
            />
            Auto-detect clinical details from my text
          </label>

          {paragraph.trim().length >= 12 && (
            <details className="rounded-xl border border-brand-100 bg-brand-50/50 open:bg-brand-50/80 dark:border-brand-800 dark:bg-brand-950/40">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-brand-900 marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-brand-600" />
                    Detected insights
                    {insightCount > 0 && (
                      <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        {descriptorIds.length + paragraphConditions.length}
                      </span>
                    )}
                  </span>
                  <span className="text-xs font-normal text-brand-500">Tap to expand</span>
                </span>
              </summary>
              <div className="space-y-3 border-t border-brand-100 px-4 py-3 text-sm dark:border-brand-800">
                {paragraphDescDetails.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
                      Pain descriptors
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {paragraphDescDetails.slice(0, 10).map((d) => (
                        <span key={d.id} className="chip text-xs">
                          {d.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {paragraphConditions.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
                      Conditions
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {paragraphConditions.slice(0, 8).map((id) => (
                        <span key={id} className="chip text-xs">
                          {getConditionById(id)?.label || id}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {adjectivePreview && adjectivePreview.summaryLines.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
                      Language cues
                    </p>
                    <ul className="mt-1 space-y-0.5 text-xs text-brand-700">
                      {adjectivePreview.summaryLines.slice(0, 4).map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {parsedPreview && (
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    onClick={applyParagraphParse}
                  >
                    Apply detected areas, symptoms & goals
                  </button>
                )}
                {conditionHints.redFlags[0] && (
                  <p className="rounded-lg bg-rose-50 p-2 text-xs text-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
                    {conditionHints.redFlags[0]}
                  </p>
                )}
              </div>
            </details>
          )}

          <details className="rounded-xl border border-brand-100 dark:border-brand-800">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-brand-800">
              Optional: browse full descriptor library
            </summary>
            <div className="border-t border-brand-100 px-3 pb-3 pt-2 dark:border-brand-800">
              <PainDescriptorPicker
                value={descriptorIds}
                onChange={(ids) => {
                  setAutoApplyDesc(false);
                  setDescriptorIds(ids);
                }}
              />
            </div>
          </details>

          <FooterNav onNext={() => setStep(2)} />
        </section>
      )}

      {/* ─── Step 2: Body & pain ─── */}
      {step === 2 && (
        <section className="card space-y-5 p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-semibold text-brand-950">Body areas & symptoms</h2>
            <p className="mt-1 text-sm text-brand-600">
              Select regions, rate pain, and add goals. Skip anything that does not apply.
            </p>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-brand-900">Areas</p>
            <div className="flex flex-wrap gap-2">
              {AREAS.map((area) => {
                const on = areas.includes(area);
                return (
                  <button
                    key={area}
                    type="button"
                    onClick={() => {
                      setAreas(toggle(areas, area));
                      if (!painLevels[area]) setPainLevels((p) => ({ ...p, [area]: 3 }));
                    }}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition ${chipClass(on)}`}
                  >
                    {BODY_PART_LABELS[area]}
                  </button>
                );
              })}
            </div>
          </div>

          {areas.length > 0 && (
            <div className="space-y-4 rounded-xl border border-brand-100 bg-brand-50/40 p-4 dark:border-brand-800 dark:bg-brand-950/40">
              <p className="text-sm font-medium text-brand-900">Pain by area (0–10)</p>
              {areas.map((area) => (
                <PainScale
                  key={area}
                  id={`pain-${area}`}
                  label={BODY_PART_LABELS[area]}
                  value={painLevels[area] ?? 0}
                  onChange={(n) => setPainLevels((p) => ({ ...p, [area]: n }))}
                />
              ))}
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-medium text-brand-900">Symptoms</p>
            <div className="flex flex-wrap gap-2">
              {SYMPTOM_CHIPS.map((s) => {
                const on = symptoms.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSymptoms(toggle(symptoms, s))}
                    className={`rounded-full px-3 py-1.5 text-sm ring-1 ${chipClass(on, "accent")}`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                className="input"
                placeholder="Other symptom…"
                value={customSymptom}
                onChange={(e) => setCustomSymptom(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customSymptom.trim()) {
                    setSymptoms((s) => [...s, customSymptom.trim()]);
                    setCustomSymptom("");
                  }
                }}
              />
              <button
                type="button"
                className="btn-secondary shrink-0"
                onClick={() => {
                  if (customSymptom.trim()) {
                    setSymptoms((s) => [...s, customSymptom.trim()]);
                    setCustomSymptom("");
                  }
                }}
              >
                Add
              </button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-brand-900">Goals</p>
            <div className="flex flex-wrap gap-2">
              {GOAL_CHIPS.map((g) => {
                const on = goals.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGoals(toggle(goals, g))}
                    className={`rounded-full px-3 py-1.5 text-sm ring-1 ${chipClass(on)}`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </div>

          <FooterNav onBack={() => setStep(1)} onNext={() => setStep(3)} />
        </section>
      )}

      {/* ─── Step 3: Safety ─── */}
      {step === 3 && (
        <section className="card space-y-5 p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-semibold text-brand-950">Safety & devices</h2>
            <p className="mt-1 text-sm text-brand-600">
              Age and effort set intensity. Precautions and devices keep the plan within clinical
              limits.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="label">Age</span>
              <input
                type="number"
                min={5}
                max={110}
                className="input"
                value={ageYears}
                onChange={(e) =>
                  setAgeYears(
                    e.target.value === ""
                      ? ""
                      : Math.min(110, Math.max(5, Number(e.target.value)))
                  )
                }
                placeholder="Years"
              />
            </label>
            <label className="block text-sm">
              <span className="label">Resting HR</span>
              <input
                type="number"
                min={30}
                max={200}
                className="input"
                value={restingHr}
                onChange={(e) =>
                  setRestingHr(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="Optional"
              />
            </label>
            <label className="block text-sm">
              <span className="label">Borg effort</span>
              <select
                className="input"
                value={borgTargetId}
                onChange={(e) => setBorgTargetId(e.target.value)}
              >
                {BORG_TARGETS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {ageYears !== "" && (
            <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-800 dark:bg-brand-900/50">
              {(() => {
                const max = estimateMaxHr(Number(ageYears));
                const borg = getBorgTarget(borgTargetId);
                const cap = Math.round(max * borg.hrMaxFractionCap);
                return (
                  <>
                    Est. HRmax ≈ <strong>{max}</strong> bpm · this Borg band caps ~{" "}
                    <strong>{cap}</strong> bpm. Educational estimate only.
                  </>
                );
              })()}
            </p>
          )}

          <div>
            <div className="mb-3 flex flex-wrap gap-1 rounded-xl bg-brand-50 p-1 dark:bg-brand-950">
              {(
                [
                  ["precautions", "Precautions"],
                  ["implants", "Implants"],
                  ["supports", "Braces & aids"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setDeviceTab(id)}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                    deviceTab === id
                      ? "bg-white text-brand-900 shadow-sm dark:bg-brand-800 dark:text-white"
                      : "text-brand-600 hover:text-brand-900"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {deviceTab === "precautions" && (
              <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
                {(
                  Object.keys(PRECAUTION_CATEGORY_LABELS) as Array<
                    keyof typeof PRECAUTION_CATEGORY_LABELS
                  >
                ).map((cat) => {
                  const items = CLINICAL_PRECAUTIONS.filter((p) => p.category === cat);
                  if (!items.length) return null;
                  return (
                    <div key={cat}>
                      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-brand-500">
                        {PRECAUTION_CATEGORY_LABELS[cat]}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {items.map((p) => {
                          const on = precautionIds.includes(p.id);
                          return (
                            <label
                              key={p.id}
                              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                                on
                                  ? "border-brand-500 bg-brand-100 font-semibold text-brand-950"
                                  : "border-brand-200 bg-white text-brand-700 dark:border-brand-700 dark:bg-brand-950"
                              }`}
                              title={p.label}
                            >
                              <input
                                type="checkbox"
                                className="accent-brand-600"
                                checked={on}
                                onChange={() => setPrecautionIds((prev) => toggle(prev, p.id))}
                              />
                              {p.shortLabel}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {precautionIds.length > 0 && (
                  <details className="rounded-lg border border-brand-100 dark:border-brand-800">
                    <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-brand-800">
                      How to follow selected precautions ({precautionIds.length})
                    </summary>
                    <div className="space-y-2 border-t border-brand-100 px-3 py-2 dark:border-brand-800">
                      {precautionIds.map((id) => {
                        const p = CLINICAL_PRECAUTIONS.find((x) => x.id === id);
                        if (!p) return null;
                        return (
                          <div key={id} className="text-xs text-brand-800">
                            <p className="font-semibold">{p.label}</p>
                            <p className="text-brand-600">{p.definition}</p>
                            <ul className="mt-1 list-disc pl-4">
                              {p.adherence.slice(0, 3).map((a) => (
                                <li key={a}>{a}</li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                )}
              </div>
            )}

            {deviceTab === "implants" && (
              <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                {IMPLANTED_DEVICES.map((d) => {
                  const on = implantIds.includes(d.id);
                  return (
                    <label
                      key={d.id}
                      className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
                        on
                          ? "border-brand-500 bg-brand-50 dark:bg-brand-900/40"
                          : "border-brand-100 dark:border-brand-800"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 accent-brand-600"
                        checked={on}
                        onChange={() => setImplantIds((prev) => toggle(prev, d.id))}
                      />
                      <span>
                        <span className="font-semibold text-brand-900">{d.label}</span>
                        <span className="mt-0.5 block text-brand-600">{d.plainLanguage}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            {deviceTab === "supports" && (
              <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
                <div>
                  <p className="mb-1 text-[11px] font-bold uppercase text-brand-500">Orthotics</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ORTHOTIC_DEVICES.map((o) => (
                      <label
                        key={o.id}
                        className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] ${
                          orthoticIds.includes(o.id)
                            ? "border-brand-500 bg-brand-100"
                            : "border-brand-200 dark:border-brand-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="accent-brand-600"
                          checked={orthoticIds.includes(o.id)}
                          onChange={() => setOrthoticIds((prev) => toggle(prev, o.id))}
                        />
                        {o.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-bold uppercase text-brand-500">Prosthetics</p>
                  <div className="flex flex-wrap gap-1.5">
                    {PROSTHETIC_DEVICES.map((p) => (
                      <label
                        key={p.id}
                        className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] ${
                          prostheticIds.includes(p.id)
                            ? "border-brand-500 bg-brand-100"
                            : "border-brand-200 dark:border-brand-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="accent-brand-600"
                          checked={prostheticIds.includes(p.id)}
                          onChange={() => setProstheticIds((prev) => toggle(prev, p.id))}
                        />
                        {p.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-bold uppercase text-brand-500">
                    Assistive devices
                    {safetyPreview.suggestedAssistiveDeviceIds.length > 0 && (
                      <span className="ml-1 font-normal normal-case text-brand-500">
                        · suggested:{" "}
                        {safetyPreview.suggestedAssistiveDeviceIds
                          .slice(0, 2)
                          .map((id) => ASSISTIVE_DEVICES.find((a) => a.id === id)?.label)
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {ASSISTIVE_DEVICES.map((a) => (
                      <label
                        key={a.id}
                        className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] ${
                          assistiveDeviceIds.includes(a.id)
                            ? "border-brand-500 bg-brand-100"
                            : "border-brand-200 dark:border-brand-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="accent-brand-600"
                          checked={assistiveDeviceIds.includes(a.id)}
                          onChange={() => setAssistiveDeviceIds((prev) => toggle(prev, a.id))}
                        />
                        {a.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <label className="block text-sm">
            <span className="label">Surgeon / protocol notes (optional)</span>
            <textarea
              className="input min-h-[64px]"
              value={protocolNotes}
              onChange={(e) => setProtocolNotes(e.target.value)}
              placeholder="e.g. NWB right leg 4 weeks; 10 lb lift limit…"
            />
          </label>

          <FooterNav onBack={() => setStep(2)} onNext={() => setStep(4)} />
        </section>
      )}

      {/* ─── Step 4: Preferences ─── */}
      {step === 4 && (
        <section className="card space-y-5 p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-semibold text-brand-950">Session preferences</h2>
            <p className="mt-1 text-sm text-brand-600">
              How long, how hard, what mix—and whether this is a home program.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="minutes">
                Minutes available
              </label>
              <input
                id="minutes"
                type="number"
                min={5}
                max={45}
                className="input"
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label" htmlFor="difficulty">
                Preferred difficulty
              </label>
              <select
                id="difficulty"
                className="input"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-brand-900">Movement mix</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["auto", "Auto"],
                  ["stretch", "Stretches first"],
                  ["exercise", "Exercises first"],
                  ["both", "Balanced"],
                ] as const
              ).map(([key, label]) => {
                const active =
                  key === "auto"
                    ? preferKinds === "auto"
                    : key === "both"
                      ? Array.isArray(preferKinds) &&
                        preferKinds.includes("stretch") &&
                        preferKinds.includes("exercise")
                      : Array.isArray(preferKinds) && preferKinds[0] === key;
                return (
                  <button
                    key={key}
                    type="button"
                    className={`rounded-full px-3 py-1.5 text-sm ring-1 ${chipClass(active)}`}
                    onClick={() => {
                      if (key === "auto") setPreferKinds("auto");
                      else if (key === "stretch") setPreferKinds(["stretch", "exercise"]);
                      else if (key === "exercise") setPreferKinds(["exercise", "stretch"]);
                      else setPreferKinds(["stretch", "exercise"]);
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-700 dark:bg-brand-950/50">
            <input
              type="checkbox"
              className="mt-0.5 h-5 w-5 accent-brand-600"
              checked={homeBasedProgram}
              onChange={(e) => setHomeBasedProgram(e.target.checked)}
            />
            <span>
              <span className="flex items-center gap-2 font-semibold text-brand-950">
                <Home className="h-4 w-4 text-brand-600" />
                Home-based program
              </span>
              <span className="mt-1 block text-sm text-brand-700">
                Prefer chair, wall, floor, and minimal-equipment variations for every movement.
              </span>
            </span>
          </label>

          <div className="rounded-xl bg-brand-50/80 p-3 text-xs text-brand-700 dark:bg-brand-900/40">
            <p className="font-semibold text-brand-900">Quick summary</p>
            <ul className="mt-1.5 space-y-0.5">
              <li>
                {areas.length
                  ? `Areas: ${areas.map((a) => BODY_PART_LABELS[a]).join(", ")}`
                  : "Areas: auto from story"}
              </li>
              <li>
                {precautionIds.length || implantIds.length
                  ? `Safety: ${precautionIds.length} precautions · ${implantIds.length} implants`
                  : "Safety: none selected"}
              </li>
              <li>
                {minutes} min · {difficulty} · {homeBasedProgram ? "home HEP" : "general"}
              </li>
            </ul>
          </div>

          <FooterNav
            onBack={() => setStep(3)}
            showGenerate
          />
        </section>
      )}

      {/* ─── Step 5: Plan ─── */}
      {step === 5 && (
        <div className="space-y-4">
          {!generated ? (
            <section className="card space-y-4 p-5 sm:p-6 text-center">
              <h2 className="text-lg font-semibold text-brand-950">Ready to generate</h2>
              <p className="text-sm text-brand-600">
                Review earlier steps if needed, then build your clinical plan.
              </p>
              <button
                type="button"
                className="btn-primary mx-auto"
                onClick={createPlan}
                disabled={saving || !canGenerate}
              >
                {saving ? "Building…" : "Generate plan"}
              </button>
              <FooterNav onBack={() => setStep(4)} />
            </section>
          ) : (
            <>
              <section className="card space-y-4 border-brand-300 p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      Plan ready
                    </p>
                    <h2 className="text-lg font-bold text-brand-950">{generated.name}</h2>
                  </div>
                  <button
                    type="button"
                    className="btn-ghost text-xs"
                    onClick={() => setStep(4)}
                  >
                    Edit prefs
                  </button>
                </div>
                <p className="text-sm text-brand-700">
                  ~{generated.estimatedMinutes} min · {generated.difficulty} ·{" "}
                  {generated.items.length} movements
                  {generated.homeBasedProgram ? " · Home variations" : ""}
                </p>
                {(generated.generatedFrom?.borgLabel || generated.generatedFrom?.maxHr) && (
                  <p className="text-xs text-brand-600">
                    Effort: {generated.generatedFrom?.borgLabel}
                    {generated.generatedFrom?.maxHr
                      ? ` · HRmax ~${generated.generatedFrom.maxHr} (cap ~${generated.generatedFrom.targetHrCap})`
                      : ""}
                  </p>
                )}

                <details className="rounded-xl border border-brand-100 dark:border-brand-800">
                  <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-brand-900">
                    Why this plan was dosed this way
                  </summary>
                  <div className="space-y-2 border-t border-brand-100 px-3 py-2 text-xs text-brand-700 dark:border-brand-800">
                    {generated.selfAdjustHistory[0] && (
                      <p>{generated.selfAdjustHistory[0].details}</p>
                    )}
                    {(generated.generatedFrom?.safetySummary || []).map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </details>

                {(generated.generatedFrom?.safetyEducation || []).length > 0 && (
                  <details className="rounded-xl border border-brand-100 dark:border-brand-800">
                    <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-brand-900">
                      Precaution instructions (
                      {generated.generatedFrom!.safetyEducation!.length})
                    </summary>
                    <div className="max-h-48 space-y-2 overflow-y-auto border-t border-brand-100 px-3 py-2 dark:border-brand-800">
                      {generated.generatedFrom!.safetyEducation!.slice(0, 8).map((block) => (
                        <div key={block.title} className="text-xs">
                          <p className="font-semibold text-brand-950">{block.title}</p>
                          <p className="text-brand-600">{block.body}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {(generated.generatedFrom?.clinicalOutcomes || []).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
                      Outcome focus
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {generated.generatedFrom!.clinicalOutcomes!.slice(0, 3).map((o) => (
                        <li
                          key={o.label}
                          className="rounded-lg border border-brand-100 px-3 py-2 text-sm dark:border-brand-800"
                        >
                          <p className="font-semibold text-brand-950">{o.label}</p>
                          <p className="text-xs text-brand-500">{o.timeframe}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <ol className="space-y-2">
                  {generated.items.map((item, i) => {
                    const m =
                      item.kind === "stretch"
                        ? getStretchById(item.movementId)
                        : getExerciseById(item.movementId);
                    return (
                      <li
                        key={item.id}
                        className="rounded-lg border border-brand-100 px-3 py-2.5 text-sm dark:border-brand-800"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span>
                            <span className="text-brand-500">{i + 1}.</span>{" "}
                            <span className="capitalize text-brand-500">{item.kind}</span> —{" "}
                            <span className="font-medium text-brand-900">
                              {m?.name ?? item.movementId}
                            </span>
                          </span>
                          {m && (
                            <Link
                              href={
                                item.kind === "stretch"
                                  ? `/library/${m.slug}`
                                  : `/exercises/${m.slug}`
                              }
                              className="shrink-0 text-xs font-semibold text-brand-700"
                            >
                              View
                            </Link>
                          )}
                        </div>
                        {item.variationId && (
                          <p className="mt-1 text-xs text-brand-600">
                            {m?.variations.find((v) => v.id === item.variationId)?.name ??
                              item.variationId}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ol>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Link
                    href={routineId ? `/routines/session?id=${routineId}` : "/routines"}
                    className="btn-primary"
                  >
                    Start session
                  </Link>
                  <Link href="/builder" className="btn-secondary">
                    Customize
                  </Link>
                  <Link href="/modalities" className="btn-ghost text-sm">
                    Modalities
                  </Link>
                  <Link href="/jeffery" className="btn-ghost text-sm">
                    Jeffery
                  </Link>
                </div>
              </section>

              {modalityPlan && (
                <section className="card space-y-3 p-5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-brand-950">Pre / post-visit modalities</h3>
                    <Link
                      href="/modalities"
                      className="text-xs font-semibold text-brand-700 hover:underline"
                    >
                      Full hub
                    </Link>
                  </div>
                  <ModalityPlanPanels plan={modalityPlan} showLink />
                </section>
              )}

              <div className="flex justify-between">
                <button type="button" className="btn-ghost" onClick={() => setStep(4)}>
                  <ChevronLeft className="h-4 w-4" />
                  Preferences
                </button>
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  onClick={() => {
                    setGenerated(null);
                    setModalityPlan(null);
                    setStep(1);
                  }}
                >
                  Start over
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
