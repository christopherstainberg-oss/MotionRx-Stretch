"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { BODY_PART_LABELS, getStretchById } from "@/data/stretch-library";
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
import type { UserMedicationEntry } from "@/data/medications";
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
import { MedicationPicker } from "@/components/MedicationPicker";
import { ClinicalSymptomPicker } from "@/components/ClinicalSymptomPicker";
import { AdlPicker } from "@/components/AdlPicker";
import { ModalityPlanPanels } from "@/components/ModalitySuggestions";
import type { UserAdlEntry } from "@/data/adls";
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
  { id: 1, title: "Your story", short: "1 · Story" },
  { id: 2, title: "Body & pain", short: "2 · Body" },
  { id: 3, title: "Safety", short: "3 · Safety" },
  { id: 4, title: "Preferences", short: "4 · Prefs" },
  { id: 5, title: "Your plan", short: "5 · Plan" },
] as const;

/** Grouped body regions for scannable sub-categories */
const BODY_AREA_GROUPS: Array<{ id: string; label: string; parts: BodyPart[] }> = [
  {
    id: "spine-head",
    label: "Neck, jaw & spine",
    parts: ["neck", "jaw", "upper-back", "thoracic", "lower-back", "pelvis"],
  },
  {
    id: "upper",
    label: "Shoulders & arms",
    parts: ["shoulders", "scapular", "chest", "elbow", "forearm", "wrists", "hand"],
  },
  {
    id: "lower",
    label: "Hips & legs",
    parts: ["hips", "groin", "glutes", "hamstrings", "quadriceps", "knee", "calves", "shins"],
  },
  {
    id: "feet-core",
    label: "Feet, ankles & core",
    parts: ["ankles", "foot", "toes", "core", "full-body"],
  },
];

const AREAS: BodyPart[] = BODY_AREA_GROUPS.flatMap((g) => g.parts);

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
  const [medications, setMedications] = useState<UserMedicationEntry[]>([]);
  const [clinicalSymptomIds, setClinicalSymptomIds] = useState<string[]>([]);
  const [adlEntries, setAdlEntries] = useState<UserAdlEntry[]>([]);
  const [step, setStep] = useState(1);
  const [deviceTab, setDeviceTab] = useState<"precautions" | "implants" | "supports">("precautions");
  const [bodyGroupOpen, setBodyGroupOpen] = useState<string>("spine-head");

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
    if (local?.medications?.length) setMedications(local.medications);
    if (local?.clinicalSymptomIds?.length) setClinicalSymptomIds(local.clinicalSymptomIds);
    if (local?.adlEntries?.length) setAdlEntries(local.adlEntries);
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
        if (d.profile?.medications?.length) setMedications(d.profile.medications);
        if (d.profile?.clinicalSymptomIds?.length)
          setClinicalSymptomIds(d.profile.clinicalSymptomIds);
        if (d.profile?.adlEntries?.length) setAdlEntries(d.profile.adlEntries);
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
      medications,
      clinicalSymptomIds,
      adlEntries,
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
    medications,
    clinicalSymptomIds,
    adlEntries,
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
      medications,
      clinicalSymptomIds,
      adlEntries,
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
        "clinical-function-profile",
        JSON.stringify({
          clinicalSymptomIds,
          adlEntries,
          at: new Date().toISOString(),
        })
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
          medications: profile.medications,
          clinicalSymptomIds,
          adlEntries,
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

  function chipClass(on: boolean) {
    return on
      ? "border-brand-600 bg-brand-600 text-white"
      : "border-brand-200 bg-white text-brand-800 hover:border-brand-400 dark:border-brand-700 dark:bg-brand-950 dark:text-brand-100";
  }

  function SubSection({
    title,
    hint,
    children,
    action,
  }: {
    title: string;
    hint?: string;
    children: ReactNode;
    action?: ReactNode;
  }) {
    return (
      <div className="space-y-3 border-t border-brand-100 pt-5 first:border-t-0 first:pt-0 dark:border-brand-800">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-brand-950">{title}</h3>
            {hint && <p className="mt-0.5 text-xs text-brand-500">{hint}</p>}
          </div>
          {action}
        </div>
        {children}
      </div>
    );
  }

  function StepNav() {
    const progress = ((step - 1) / (STEPS.length - 1)) * 100;
    return (
      <nav aria-label="Assessment steps" className="mb-6">
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-brand-100 dark:bg-brand-900">
          <div
            className="h-full rounded-full bg-brand-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <ol className="grid grid-cols-5 gap-1">
          {STEPS.map((s) => {
            const active = step === s.id;
            const done = step > s.id || (s.id === 5 && Boolean(generated));
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setStep(s.id)}
                  className={`flex w-full flex-col items-center gap-1 rounded-lg px-0.5 py-1.5 text-center transition ${
                    active ? "text-brand-900" : done ? "text-brand-700" : "text-brand-400"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                      active
                        ? "bg-brand-600 text-white"
                        : done
                          ? "bg-brand-200 text-brand-900 dark:bg-brand-800 dark:text-brand-100"
                          : "bg-brand-50 text-brand-500 ring-1 ring-brand-100 dark:bg-brand-950 dark:ring-brand-800"
                    }`}
                  >
                    {done && !active ? <Check className="h-4 w-4" /> : s.id}
                  </span>
                  <span className="hidden text-[10px] font-medium leading-tight sm:block">
                    {s.title}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <p className="mt-2 text-center text-sm font-medium text-brand-800">
          {STEPS[step - 1]?.short}
          <span className="font-normal text-brand-500"> · of {STEPS.length}</span>
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
      <div className="mt-6 flex items-center justify-between gap-3 border-t border-brand-100 pt-5 dark:border-brand-800">
        {onBack ? (
          <button type="button" className="btn-ghost px-3" onClick={onBack}>
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
        ) : (
          <span className="w-20" />
        )}
        {showGenerate ? (
          <button
            type="button"
            className="btn-primary min-w-[11rem]"
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
    <div className="mx-auto max-w-xl pb-10 sm:max-w-2xl">
      <header className="mb-4 text-center sm:mb-6 sm:text-left">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-500">
          Clinical intake
        </p>
        <h1 className="inline-flex items-center gap-2 text-xl font-bold text-brand-950 sm:text-2xl">
          <Stethoscope className="h-6 w-6 shrink-0 text-brand-600" />
          Assessment
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-brand-600 sm:mx-0">
          One step at a time. Finish when you are ready—most fields are optional.
        </p>
      </header>

      <StepNav />

      {/* ─── Step 1: Story ─── */}
      {step === 1 && (
        <section className="card space-y-0 p-5 sm:p-6">
          <SubSection
            title="Describe your issue"
            hint="Feel free to write naturally. Include location, sensations, and any surgeries if you know them."
          >
            <textarea
              className="input min-h-[150px] resize-y text-base leading-relaxed"
              value={paragraph}
              onChange={(e) => setParagraph(e.target.value)}
              placeholder="Example: Dull low-back ache, worse sitting at my desk, stiff in the morning. Sharp pain when I bend. Pain about 4/10. Want to move easier at work."
              aria-label="Describe your issue"
            />
            <label className="mt-3 flex items-center gap-2.5 text-sm text-brand-700">
              <input
                type="checkbox"
                className="h-4 w-4 accent-brand-600"
                checked={autoApplyDesc}
                onChange={(e) => setAutoApplyDesc(e.target.checked)}
              />
              Auto-detect clinical details from my text
            </label>
          </SubSection>

          {paragraph.trim().length >= 12 && (
            <SubSection
              title="What we noticed"
              hint="Expand only if you want to review or apply detections."
              action={
                insightCount > 0 ? (
                  <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-semibold text-brand-800 dark:bg-brand-900">
                    {descriptorIds.length + paragraphConditions.length} matches
                  </span>
                ) : null
              }
            >
              <details className="group rounded-xl border border-brand-100 bg-brand-50/40 dark:border-brand-800 dark:bg-brand-950/30">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-brand-900 marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-brand-600" />
                    View detected insights
                  </span>
                  <ChevronRight className="h-4 w-4 text-brand-400 transition group-open:rotate-90" />
                </summary>
                <div className="space-y-4 border-t border-brand-100 px-4 py-3 dark:border-brand-800">
                  {paragraphDescDetails.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-500">
                        Pain descriptors
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {paragraphDescDetails.slice(0, 8).map((d) => (
                          <span key={d.id} className="chip text-xs">
                            {d.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {paragraphConditions.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-500">
                        Conditions
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {paragraphConditions.slice(0, 6).map((id) => (
                          <span key={id} className="chip text-xs">
                            {getConditionById(id)?.label || id}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {adjectivePreview && adjectivePreview.summaryLines.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-500">
                        Language cues
                      </p>
                      <ul className="mt-1.5 space-y-1 text-xs text-brand-700">
                        {adjectivePreview.summaryLines.slice(0, 3).map((line) => (
                          <li key={line} className="leading-snug">
                            {line}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {parsedPreview && (
                    <button
                      type="button"
                      className="btn-secondary w-full text-xs sm:w-auto"
                      onClick={applyParagraphParse}
                    >
                      Apply detected areas, symptoms & goals
                    </button>
                  )}
                  {conditionHints.redFlags[0] && (
                    <p className="rounded-lg bg-rose-50 p-2.5 text-xs leading-relaxed text-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
                      {conditionHints.redFlags[0]}
                    </p>
                  )}
                </div>
              </details>
            </SubSection>
          )}

          <SubSection title="Optional" hint="Only if you want more control over pain descriptors.">
            <details className="group rounded-xl border border-brand-100 dark:border-brand-800">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-brand-800 marker:content-none [&::-webkit-details-marker]:hidden">
                Browse full descriptor library
                <ChevronRight className="h-4 w-4 text-brand-400 transition group-open:rotate-90" />
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
          </SubSection>

          <FooterNav onNext={() => setStep(2)} />
        </section>
      )}

      {/* ─── Step 2: Body & pain ─── */}
      {step === 2 && (
        <section className="card space-y-0 p-5 sm:p-6">
          <SubSection
            title="Body regions"
            hint="Open a category, then tap areas that apply. Selected count updates as you go."
            action={
              areas.length > 0 ? (
                <span className="text-xs font-semibold text-brand-600">{areas.length} selected</span>
              ) : null
            }
          >
            <div className="space-y-2">
              {BODY_AREA_GROUPS.map((group) => {
                const selectedInGroup = group.parts.filter((p) => areas.includes(p)).length;
                const open = bodyGroupOpen === group.id;
                return (
                  <div
                    key={group.id}
                    className="overflow-hidden rounded-xl border border-brand-100 dark:border-brand-800"
                  >
                    <button
                      type="button"
                      onClick={() => setBodyGroupOpen(open ? "" : group.id)}
                      className="flex w-full items-center justify-between gap-2 bg-brand-50/60 px-3.5 py-3 text-left dark:bg-brand-950/50"
                    >
                      <span className="text-sm font-semibold text-brand-900">{group.label}</span>
                      <span className="flex items-center gap-2">
                        {selectedInGroup > 0 && (
                          <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold text-white">
                            {selectedInGroup}
                          </span>
                        )}
                        <ChevronRight
                          className={`h-4 w-4 text-brand-400 transition ${open ? "rotate-90" : ""}`}
                        />
                      </span>
                    </button>
                    {open && (
                      <div className="flex flex-wrap gap-2 border-t border-brand-100 bg-white p-3 dark:border-brand-800 dark:bg-brand-950">
                        {group.parts.map((area) => {
                          const on = areas.includes(area);
                          return (
                            <button
                              key={area}
                              type="button"
                              onClick={() => {
                                setAreas(toggle(areas, area));
                                if (!painLevels[area])
                                  setPainLevels((p) => ({ ...p, [area]: 3 }));
                              }}
                              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${chipClass(on)}`}
                            >
                              {BODY_PART_LABELS[area]}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </SubSection>

          {areas.length > 0 && (
            <SubSection title="Pain levels" hint="Rate each selected area from 0 (none) to 10 (worst).">
              <div className="space-y-4 rounded-xl bg-brand-50/50 p-3.5 dark:bg-brand-950/40">
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
            </SubSection>
          )}

          <SubSection
            title="Clinical symptoms"
            hint="Evidence-based symptoms that change dosing. Suggestions appear as you select."
            action={
              clinicalSymptomIds.length ? (
                <span className="text-xs font-semibold text-brand-600">
                  {clinicalSymptomIds.length} selected
                </span>
              ) : null
            }
          >
            <ClinicalSymptomPicker
              value={clinicalSymptomIds}
              onChange={setClinicalSymptomIds}
              areas={areas}
              concernParagraph={paragraph}
              onInsertParagraph={(snippet) => {
                setParagraph((p) => (p.trim() ? `${p.trim()}\n\n${snippet}` : snippet));
              }}
            />
            <div className="mt-3 flex gap-2">
              <input
                className="input"
                placeholder="Other free-text symptom…"
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
          </SubSection>

          <SubSection
            title="Activities of daily living (ADLs)"
            hint="Rate function. Suggestions use your areas, pain, story, and devices. Limited ADLs reshape the routine."
            action={
              adlEntries.length ? (
                <span className="text-xs font-semibold text-brand-600">{adlEntries.length} rated</span>
              ) : null
            }
          >
            <AdlPicker
              value={adlEntries}
              onChange={setAdlEntries}
              areas={areas}
              painLevels={painLevels}
              assistiveDeviceIds={assistiveDeviceIds}
              concernParagraph={paragraph}
              onInsertParagraph={(snippet) => {
                setParagraph((p) => (p.trim() ? `${p.trim()}\n\n${snippet}` : snippet));
              }}
            />
          </SubSection>

          <SubSection title="Goals" hint="What you want this plan to help with.">
            <div className="flex flex-wrap gap-2">
              {GOAL_CHIPS.map((g) => {
                const on = goals.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGoals(toggle(goals, g))}
                    className={`rounded-full border px-3 py-1.5 text-sm transition ${chipClass(on)}`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </SubSection>

          <FooterNav onBack={() => setStep(1)} onNext={() => setStep(3)} />
        </section>
      )}

      {/* ─── Step 3: Safety ─── */}
      {step === 3 && (
        <section className="card space-y-0 p-5 sm:p-6">
          <SubSection
            title="Effort & heart rate"
            hint="Age estimates max HR. Borg sets how hard the plan should feel."
          >
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
              <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-xs leading-relaxed text-brand-800 dark:bg-brand-900/50">
                {(() => {
                  const max = estimateMaxHr(Number(ageYears));
                  const borg = getBorgTarget(borgTargetId);
                  const cap = Math.round(max * borg.hrMaxFractionCap);
                  return (
                    <>
                      Est. HRmax ≈ <strong>{max}</strong> bpm · this Borg band caps ~{" "}
                      <strong>{cap}</strong> bpm. Educational only.
                    </>
                  );
                })()}
              </p>
            )}
          </SubSection>

          <SubSection
            title="Precautions & devices"
            hint="Pick a category tab. Only select what your care team has told you."
            action={
              precautionIds.length + implantIds.length + orthoticIds.length > 0 ? (
                <span className="text-xs font-semibold text-brand-600">
                  {precautionIds.length + implantIds.length + orthoticIds.length + prostheticIds.length + assistiveDeviceIds.length}{" "}
                  selected
                </span>
              ) : null
            }
          >
            <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl bg-brand-50 p-1 dark:bg-brand-950">
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
                  className={`rounded-lg px-2 py-2 text-xs font-semibold transition sm:text-sm ${
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
              <div className="max-h-72 space-y-2 overflow-y-auto pr-0.5">
                {(
                  Object.keys(PRECAUTION_CATEGORY_LABELS) as Array<
                    keyof typeof PRECAUTION_CATEGORY_LABELS
                  >
                ).map((cat) => {
                  const items = CLINICAL_PRECAUTIONS.filter((p) => p.category === cat);
                  if (!items.length) return null;
                  const selected = items.filter((p) => precautionIds.includes(p.id)).length;
                  return (
                    <details
                      key={cat}
                      className="group rounded-xl border border-brand-100 dark:border-brand-800"
                      open={selected > 0}
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium text-brand-900 marker:content-none [&::-webkit-details-marker]:hidden">
                        <span>{PRECAUTION_CATEGORY_LABELS[cat]}</span>
                        <span className="flex items-center gap-2">
                          {selected > 0 && (
                            <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                              {selected}
                            </span>
                          )}
                          <ChevronRight className="h-4 w-4 text-brand-400 transition group-open:rotate-90" />
                        </span>
                      </summary>
                      <div className="flex flex-wrap gap-1.5 border-t border-brand-100 px-3 py-2.5 dark:border-brand-800">
                        {items.map((p) => {
                          const on = precautionIds.includes(p.id);
                          return (
                            <label
                              key={p.id}
                              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${chipClass(on)}`}
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
                    </details>
                  );
                })}
                {precautionIds.length > 0 && (
                  <details className="rounded-xl border border-brand-200 bg-brand-50/50 dark:border-brand-700 dark:bg-brand-950/40">
                    <summary className="cursor-pointer px-3 py-2.5 text-xs font-semibold text-brand-800">
                      How to follow selected precautions ({precautionIds.length})
                    </summary>
                    <div className="space-y-2.5 border-t border-brand-100 px-3 py-2.5 dark:border-brand-800">
                      {precautionIds.map((id) => {
                        const p = CLINICAL_PRECAUTIONS.find((x) => x.id === id);
                        if (!p) return null;
                        return (
                          <div key={id} className="text-xs leading-relaxed text-brand-800">
                            <p className="font-semibold">{p.label}</p>
                            <p className="mt-0.5 text-brand-600">{p.definition}</p>
                            <ul className="mt-1 list-disc pl-4 text-brand-700">
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
              <div className="max-h-72 space-y-1.5 overflow-y-auto">
                {IMPLANTED_DEVICES.map((d) => {
                  const on = implantIds.includes(d.id);
                  return (
                    <label
                      key={d.id}
                      className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 text-xs transition ${
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
                        <span className="mt-0.5 block leading-snug text-brand-600">
                          {d.plainLanguage}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            {deviceTab === "supports" && (
              <div className="max-h-72 space-y-4 overflow-y-auto">
                {(
                  [
                    ["Orthotics", ORTHOTIC_DEVICES, orthoticIds, setOrthoticIds],
                    ["Prosthetics", PROSTHETIC_DEVICES, prostheticIds, setProstheticIds],
                    ["Assistive devices", ASSISTIVE_DEVICES, assistiveDeviceIds, setAssistiveDeviceIds],
                  ] as const
                ).map(([label, list, selected, setter]) => (
                  <div key={label}>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-500">
                      {label}
                      {label === "Assistive devices" &&
                        safetyPreview.suggestedAssistiveDeviceIds.length > 0 && (
                          <span className="ml-1 font-normal normal-case text-brand-500">
                            · suggested available
                          </span>
                        )}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {list.map((item) => {
                        const on = selected.includes(item.id);
                        return (
                          <label
                            key={item.id}
                            className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] ${chipClass(on)}`}
                          >
                            <input
                              type="checkbox"
                              className="accent-brand-600"
                              checked={on}
                              onChange={() =>
                                (setter as (fn: (prev: string[]) => string[]) => void)((prev) =>
                                  toggle(prev, item.id)
                                )
                              }
                            />
                            {item.label}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SubSection>

          <SubSection
            title="Current medications"
            hint="Optional. Search the clinical library, then set strength, route (pill, IM, IV…), and dose."
            action={
              medications.length > 0 ? (
                <span className="text-xs font-semibold text-brand-600">
                  {medications.length} listed
                </span>
              ) : null
            }
          >
            <MedicationPicker value={medications} onChange={setMedications} />
          </SubSection>

          <SubSection title="Protocol notes" hint="Optional free text from your surgeon or PT.">
            <textarea
              className="input min-h-[72px]"
              value={protocolNotes}
              onChange={(e) => setProtocolNotes(e.target.value)}
              placeholder="e.g. NWB right leg 4 weeks; 10 lb lift limit…"
            />
          </SubSection>

          <FooterNav onBack={() => setStep(2)} onNext={() => setStep(4)} />
        </section>
      )}

      {/* ─── Step 4: Preferences ─── */}
      {step === 4 && (
        <section className="card space-y-0 p-5 sm:p-6">
          <SubSection
            title="Session length & difficulty"
            hint="We may still cap intensity based on safety and pain."
          >
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
          </SubSection>

          <SubSection title="Movement mix" hint="Auto is fine for most people.">
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
                    className={`rounded-full border px-3 py-1.5 text-sm transition ${chipClass(active)}`}
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
          </SubSection>

          <SubSection title="Home setup">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-brand-200 bg-brand-50/40 p-4 dark:border-brand-700 dark:bg-brand-950/40">
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
                <span className="mt-1 block text-sm leading-relaxed text-brand-700">
                  Prefer chair, wall, floor, and minimal-equipment variations.
                </span>
              </span>
            </label>
          </SubSection>

          <SubSection title="Before you generate">
            <ul className="space-y-1.5 text-sm text-brand-700">
              <li className="flex gap-2">
                <span className="font-medium text-brand-500">Areas</span>
                <span>
                  {areas.length
                    ? areas.map((a) => BODY_PART_LABELS[a]).join(", ")
                    : "From your story (or none yet)"}
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium text-brand-500">Safety</span>
                <span>
                  {precautionIds.length || implantIds.length
                    ? `${precautionIds.length} precautions · ${implantIds.length} implants`
                    : "None selected"}
                  {medications.length ? ` · ${medications.length} meds` : ""}
                  {clinicalSymptomIds.length ? ` · ${clinicalSymptomIds.length} symptoms` : ""}
                  {adlEntries.length ? ` · ${adlEntries.length} ADLs` : ""}
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium text-brand-500">Session</span>
                <span>
                  {minutes} min · {difficulty}
                  {homeBasedProgram ? " · home HEP" : ""}
                </span>
              </li>
            </ul>
          </SubSection>

          <FooterNav onBack={() => setStep(3)} showGenerate />
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
