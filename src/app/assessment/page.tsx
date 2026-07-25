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
  CLINICAL_CONDITION_STATS,
  CLINICAL_CATEGORY_LABELS,
  CLINICAL_SUBCATEGORY_LABELS,
  getConditionById,
  matchConditionsFromText,
  summarizeConditions,
} from "@/data/clinical-conditions";
import {
  ASSISTIVE_DEVICES,
  BORG_TARGETS,
  CLINICAL_PRECAUTIONS,
  CLINICAL_SAFETY_STATS,
  IMPLANTED_DEVICES,
  ORTHOTIC_DEVICES,
  PRECAUTION_CATEGORY_LABELS,
  PROSTHETIC_DEVICES,
  estimateMaxHr,
  getBorgTarget,
  ageBasedDefaultBorg,
  hrZonesFromMax,
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
import { Home, Sparkles, Stethoscope, X } from "lucide-react";

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

  function removeDescriptor(id: string) {
    setAutoApplyDesc(false);
    setDescriptorIds((prev) => prev.filter((x) => x !== id));
    setAutoDescIds((prev) => prev.filter((x) => x !== id));
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 sm:space-y-6">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-500">
          Assessment · Clinical intake
        </p>
        <h1 className="flex items-center gap-2 text-xl font-bold text-brand-950 sm:text-2xl">
          <Stethoscope className="h-6 w-6 shrink-0 text-brand-600 sm:h-7 sm:w-7" />
          Assessment
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-brand-700/85">
          Start with a short paragraph about your issue. We extract{" "}
          <strong>clinical pain descriptors</strong> and{" "}
          <strong>musculoskeletal injuries, surgeries, and complex medical conditions</strong>{" "}
          from your words (
          {CLINICAL_CONDITION_STATS.capacity.toLocaleString()}+ condition variations across{" "}
          {CLINICAL_CONDITION_STATS.categories} categories /{" "}
          {CLINICAL_CONDITION_STATS.subcategories} sub-categories)
          and build stretch and exercise plans with realistic clinical outcomes—then you can fine-tune.
        </p>
      </div>

      {/* Primary: paragraph intake with live descriptor + condition extraction */}
      <section className="card space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-semibold text-brand-900">Describe your issue (paragraph)</h2>
            <p className="text-sm text-brand-700/85">
              Write freely—how it feels, when it is worse, what helps, where it is, and any
              diagnoses, surgeries, or medical conditions (for example ACL, knee replacement, stroke,
              COPD, diabetes).
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs font-medium text-brand-700">
            <input
              type="checkbox"
              className="accent-brand-600"
              checked={autoApplyDesc}
              onChange={(e) => setAutoApplyDesc(e.target.checked)}
            />
            Auto-apply descriptors from text
          </label>
        </div>

        <textarea
          className="input min-h-[140px] text-base leading-relaxed"
          value={paragraph}
          onChange={(e) => setParagraph(e.target.value)}
          placeholder="Example: For the last two weeks my low back has a dull aching pain that gets worse when I sit at my desk. It feels tight and stiff in the morning for about 20 minutes. Sometimes I get sharp pain when I bend forward. Walking a little helps. Pain is about 4/10. I want to move easier at work."
          aria-label="Describe your issue in a paragraph"
        />

        {/* Live pain descriptors from paragraph */}
        {paragraph.trim().length >= 12 && (
          <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-brand-900">
              <Sparkles className="h-4 w-4 text-brand-600" />
              Pain descriptors detected from your paragraph
            </p>
            {paragraphDescDetails.length === 0 ? (
              <p className="mt-2 text-sm text-brand-600">
                Keep writing details (e.g. burning, worse sitting, morning stiffness, numbness) so we
                can match clinical descriptors.
              </p>
            ) : (
              <>
                <div className="mt-3 flex flex-wrap gap-2">
                  {paragraphDescDetails.map((d) => {
                    const applied = descriptorIds.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => {
                          if (applied) removeDescriptor(d.id);
                          else {
                            setAutoApplyDesc(false);
                            setDescriptorIds((prev) => [...prev, d.id]);
                          }
                        }}
                        className={`inline-flex max-w-full items-start gap-1.5 rounded-xl border px-3 py-2 text-left text-xs transition ${
                          applied
                            ? "border-brand-500 bg-brand-100 text-brand-950"
                            : "border-brand-200 bg-white text-brand-800 hover:border-brand-400"
                        }`}
                        title={d.plainLanguage}
                      >
                        <span>
                          <span className="font-semibold">{d.label}</span>
                          <span className="mt-0.5 block text-[11px] font-normal text-brand-600">
                            {d.clinicalTerm}
                          </span>
                        </span>
                        {applied && <X className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] text-brand-500">
                  Tap a chip to add/remove. Auto-apply is {autoApplyDesc ? "on" : "off"}.
                </p>
              </>
            )}

            {parsedPreview && (
              <div className="mt-4 space-y-1 border-t border-brand-100 pt-3 text-sm text-brand-800">
                <p className="font-medium">Also detected</p>
                <p>
                  <strong>Areas:</strong>{" "}
                  {parsedPreview.areas.map((a) => BODY_PART_LABELS[a]).join(", ")}
                </p>
                <p>
                  <strong>Symptoms:</strong> {parsedPreview.symptoms.join(", ")}
                </p>
                <p>
                  <strong>Goals:</strong> {parsedPreview.goals.join(", ")}
                </p>
                <p>
                  <strong>Plan mix:</strong>{" "}
                  {parsedPreview.preferKinds === "auto"
                    ? "auto (stretches + exercises)"
                    : parsedPreview.preferKinds.join(" + ")}{" "}
                  ┬╖ estimated pain ~{parsedPreview.estimatedPain}/10
                </p>
                <button
                  type="button"
                  className="btn-secondary mt-2 text-xs"
                  onClick={applyParagraphParse}
                >
                  Apply all detected fields to the form
                </button>
              </div>
            )}
          </div>
        )}

        {descriptorIds.length > 0 && (
          <div className="rounded-xl bg-brand-50/80 p-3 text-sm text-brand-800 dark:bg-brand-900/50">
            <p className="font-medium">
              Active descriptors shaping your program ({descriptorIds.length})
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {descriptorIds.map((id) => (
                <span key={id} className="chip">
                  {getDescriptorById(id)?.label || id}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs">
              Stretch bias {(descHints.stretchBias * 100).toFixed(0)}% · Exercise bias{" "}
              {(descHints.exerciseBias * 100).toFixed(0)}% · Irritability +
              {descHints.effectivePainBoost.toFixed(1)}
              {descHints.biases.length
                ? ` · ${descHints.biases.slice(0, 5).join(", ")}`
                : ""}
            </p>
          </div>
        )}

        {paragraphConditions.length > 0 && (
          <div className="rounded-xl border border-brand-200 bg-white p-3 text-sm text-brand-800 dark:border-brand-700 dark:bg-brand-950">
            <p className="flex items-center gap-2 font-medium text-brand-900">
              <Sparkles className="h-4 w-4 text-brand-600" />
              Clinical conditions matched from your paragraph ({paragraphConditions.length})
            </p>
            <p className="mt-1 text-xs text-brand-600">
              Categories:{" "}
              {conditionHints.categories
                .map((c) => CLINICAL_CATEGORY_LABELS[c] || c)
                .slice(0, 6)
                .join(", ")}
              {conditionHints.subcategories.length
                ? ` · Sub-categories: ${conditionHints.subcategories
                    .map((s) => CLINICAL_SUBCATEGORY_LABELS[s] || s)
                    .slice(0, 5)
                    .join(", ")}`
                : ""}
              {conditionHints.clearanceRequired
                ? " · Clearance-sensitive: volume and intensity will be capped"
                : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {paragraphConditions.map((id) => {
                const c = getConditionById(id);
                return (
                  <span
                    key={id}
                    className="chip"
                    title={c?.plainLanguage || id}
                  >
                    {c?.label || id}
                    {c?.subcategory && c.subcategory !== "general"
                      ? ` · ${CLINICAL_SUBCATEGORY_LABELS[c.subcategory]}`
                      : ""}
                  </span>
                );
              })}
            </div>
            {conditionHints.clinicalOutcomes.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
                  Evidence-informed outcome targets for your routine
                </p>
                <ul className="space-y-1.5 text-xs text-brand-700">
                  {conditionHints.clinicalOutcomes.slice(0, 4).map((o) => (
                    <li key={o.label} className="rounded-lg bg-brand-50/80 px-2.5 py-1.5 dark:bg-brand-900/40">
                      <strong>{o.label}</strong>
                      <span className="text-brand-500"> · {o.timeframe}</span>
                      <p className="mt-0.5 text-brand-600">{o.evidenceNote}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {conditionHints.redFlags.length > 0 && (
              <p className="mt-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
                {conditionHints.redFlags[0]}
              </p>
            )}
          </div>
        )}
      </section>

      <section className="card p-5">
        <p className="mb-3 text-sm text-brand-700/85">
          Optional: browse the full clinical database to add more descriptors beyond what was
          detected in your paragraph.
        </p>
        <PainDescriptorPicker value={descriptorIds} onChange={(ids) => {
          setAutoApplyDesc(false);
          setDescriptorIds(ids);
        }} />
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="font-semibold text-brand-900">Suggest movement mix</h2>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["auto", "Auto (stretch + exercise)"],
              ["stretch", "Stretches emphasis"],
              ["exercise", "Exercises emphasis"],
              ["both", "Balanced both"],
            ] as const
          ).map(([key, label]) => {
            const active =
              key === "auto"
                ? preferKinds === "auto"
                : key === "both"
                  ? Array.isArray(preferKinds) &&
                    preferKinds.includes("stretch") &&
                    preferKinds.includes("exercise") &&
                    preferKinds[0] === "stretch"
                  : Array.isArray(preferKinds) && preferKinds[0] === key;
            return (
              <button
                key={key}
                type="button"
                className={`rounded-full px-3 py-1.5 text-sm ring-1 ${
                  active ? "bg-brand-700 text-white ring-brand-700" : "bg-white ring-brand-200"
                }`}
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
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-semibold text-brand-900">Areas of concern</h2>
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
                className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition ${
                  on
                    ? "bg-brand-600 text-white ring-brand-600"
                    : "bg-white text-brand-800 ring-brand-200 hover:bg-brand-50"
                }`}
              >
                {BODY_PART_LABELS[area]}
              </button>
            );
          })}
        </div>
      </section>

      {areas.length > 0 && (
        <section className="card space-y-5 p-5">
          <h2 className="font-semibold text-brand-900">Pain scale by area</h2>
          {areas.map((area) => (
            <PainScale
              key={area}
              id={`pain-${area}`}
              label={`${BODY_PART_LABELS[area]} pain`}
              value={painLevels[area] ?? 0}
              onChange={(n) => setPainLevels((p) => ({ ...p, [area]: n }))}
            />
          ))}
        </section>
      )}

      <section className="card space-y-3 p-5">
        <h2 className="font-semibold text-brand-900">Symptoms & goals</h2>
        <div className="flex flex-wrap gap-2">
          {SYMPTOM_CHIPS.map((s) => {
            const on = symptoms.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSymptoms(toggle(symptoms, s))}
                className={`rounded-full px-3 py-1.5 text-sm ring-1 ${
                  on ? "bg-accent-500 text-white ring-accent-500" : "bg-white ring-brand-200"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="Add symptom note"
            value={customSymptom}
            onChange={(e) => setCustomSymptom(e.target.value)}
          />
          <button
            type="button"
            className="btn-secondary"
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
        <div className="flex flex-wrap gap-2 pt-2">
          {GOAL_CHIPS.map((g) => {
            const on = goals.includes(g);
            return (
              <button
                key={g}
                type="button"
                onClick={() => setGoals(toggle(goals, g))}
                className={`rounded-full px-3 py-1.5 text-sm ring-1 ${
                  on ? "bg-brand-700 text-white ring-brand-700" : "bg-white ring-brand-200"
                }`}
              >
                {g}
              </button>
            );
          })}
        </div>
      </section>

      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="minutes">
            Available minutes
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
      </section>

      {/* Age / Borg / Max HR */}
      <section className="card space-y-4 p-5">
        <h2 className="font-semibold text-brand-900">Age, effort (Borg), and heart-rate guidance</h2>
        <p className="text-sm text-brand-700/85">
          Age estimates max HR (Tanaka: 208 − 0.7×age). Borg sets effort caps so the routine stays
          realistic for cardiac risk and deconditioning. Educational only—beta-blockers and devices
          change targets; follow your clinician.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="label">Age (years)</span>
            <input
              type="number"
              min={5}
              max={110}
              className="input"
              value={ageYears}
              onChange={(e) =>
                setAgeYears(e.target.value === "" ? "" : Math.min(110, Math.max(5, Number(e.target.value))))
              }
              placeholder="e.g. 62"
            />
          </label>
          <label className="block text-sm">
            <span className="label">Resting HR (optional)</span>
            <input
              type="number"
              min={30}
              max={200}
              className="input"
              value={restingHr}
              onChange={(e) =>
                setRestingHr(e.target.value === "" ? "" : Number(e.target.value))
              }
              placeholder="e.g. 72"
            />
          </label>
          <label className="block text-sm">
            <span className="label">Borg effort target</span>
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
          <div className="rounded-xl bg-brand-50 p-3 text-sm text-brand-800">
            {(() => {
              const max = estimateMaxHr(Number(ageYears));
              const zones = hrZonesFromMax(max);
              const borg = getBorgTarget(borgTargetId);
              const cap = Math.round(max * borg.hrMaxFractionCap);
              return (
                <>
                  <p>
                    <strong>Est. HRmax ≈ {max} bpm</strong> · suggested ceiling for this Borg band ~{" "}
                    <strong>{cap} bpm</strong> ({Math.round(borg.hrMaxFractionCap * 100)}% HRmax)
                  </p>
                  <p className="mt-1 text-xs text-brand-600">
                    Light zone {zones.light.min}–{zones.light.max} · Moderate {zones.moderate.min}–
                    {zones.moderate.max} bpm. {borg.education}
                  </p>
                </>
              );
            })()}
          </div>
        )}
      </section>

      {/* Precautions */}
      <section className="card space-y-4 p-5">
        <div>
          <h2 className="font-semibold text-brand-900">Surgical & activity precautions (editable)</h2>
          <p className="text-sm text-brand-700/85">
            Select all that apply. Plans auto-detect common terms from your paragraph (
            {CLINICAL_SAFETY_STATS.precautions} protocols). You can uncheck anything.
          </p>
        </div>
        {(Object.keys(PRECAUTION_CATEGORY_LABELS) as Array<keyof typeof PRECAUTION_CATEGORY_LABELS>).map(
          (cat) => {
            const items = CLINICAL_PRECAUTIONS.filter((p) => p.category === cat);
            if (!items.length) return null;
            return (
              <div key={cat}>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-500">
                  {PRECAUTION_CATEGORY_LABELS[cat]}
                </p>
                <div className="flex flex-wrap gap-2">
                  {items.map((p) => {
                    const on = precautionIds.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs ${
                          on
                            ? "border-brand-500 bg-brand-100 text-brand-950"
                            : "border-brand-200 bg-white text-brand-800"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="accent-brand-600"
                          checked={on}
                          onChange={() => setPrecautionIds((prev) => toggle(prev, p.id))}
                        />
                        <span>
                          <span className="font-semibold">{p.shortLabel}</span>
                          <span className="mt-0.5 block max-w-[14rem] text-[11px] text-brand-600">
                            {p.label}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          }
        )}
        {precautionIds.length > 0 && (
          <div className="space-y-3 border-t border-brand-100 pt-3">
            <p className="text-xs font-semibold uppercase text-brand-500">
              How to adhere (evidence-informed protocol education)
            </p>
            {precautionIds.map((id) => {
              const p = CLINICAL_PRECAUTIONS.find((x) => x.id === id);
              if (!p) return null;
              return (
                <div key={id} className="rounded-xl border border-brand-100 p-3 text-sm">
                  <p className="font-semibold text-brand-950">{p.label}</p>
                  <p className="mt-1 text-brand-700">{p.definition}</p>
                  <p className="mt-1 text-xs text-brand-500">{p.typicalDuration}</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-brand-800">
                    {p.adherence.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                  {p.redFlagEducation && (
                    <p className="mt-2 text-xs font-medium text-amber-800">{p.redFlagEducation}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Implants */}
      <section className="card space-y-3 p-5">
        <h2 className="font-semibold text-brand-900">
          Implanted devices ({CLINICAL_SAFETY_STATS.implants})
        </h2>
        <p className="text-sm text-brand-700/85">
          Cardiac electronics, structural devices, neurostim, and orthopedic implants adjust dosing
          and default precautions.
        </p>
        <div className="flex flex-wrap gap-2">
          {IMPLANTED_DEVICES.map((d) => {
            const on = implantIds.includes(d.id);
            return (
              <label
                key={d.id}
                className={`inline-flex max-w-xs cursor-pointer items-start gap-2 rounded-xl border px-3 py-2 text-xs ${
                  on ? "border-brand-500 bg-brand-100" : "border-brand-200 bg-white"
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 accent-brand-600"
                  checked={on}
                  onChange={() => setImplantIds((prev) => toggle(prev, d.id))}
                />
                <span>
                  <span className="font-semibold">{d.label}</span>
                  <span className="mt-0.5 block text-[11px] text-brand-600">{d.plainLanguage}</span>
                </span>
              </label>
            );
          })}
        </div>
      </section>

      {/* Orthotics / Prosthetics / AD */}
      <section className="card space-y-4 p-5">
        <h2 className="font-semibold text-brand-900">Orthotics, prosthetics & assistive devices</h2>
        <div>
          <p className="mb-2 text-xs font-bold uppercase text-brand-500">
            Orthotics ({ORTHOTIC_DEVICES.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {ORTHOTIC_DEVICES.map((o) => (
              <label
                key={o.id}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs ${
                  orthoticIds.includes(o.id)
                    ? "border-brand-500 bg-brand-100"
                    : "border-brand-200 bg-white"
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
          <p className="mb-2 text-xs font-bold uppercase text-brand-500">
            Prosthetics ({PROSTHETIC_DEVICES.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {PROSTHETIC_DEVICES.map((p) => (
              <label
                key={p.id}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs ${
                  prostheticIds.includes(p.id)
                    ? "border-brand-500 bg-brand-100"
                    : "border-brand-200 bg-white"
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
          <p className="mb-2 text-xs font-bold uppercase text-brand-500">
            Assistive devices ({ASSISTIVE_DEVICES.length}) — suggested from precautions:{" "}
            {safetyPreview.suggestedAssistiveDeviceIds
              .map((id) => ASSISTIVE_DEVICES.find((a) => a.id === id)?.label)
              .filter(Boolean)
              .slice(0, 4)
              .join(", ") || "none yet"}
          </p>
          <div className="flex flex-wrap gap-2">
            {ASSISTIVE_DEVICES.map((a) => (
              <label
                key={a.id}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs ${
                  assistiveDeviceIds.includes(a.id)
                    ? "border-brand-500 bg-brand-100"
                    : "border-brand-200 bg-white"
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
        <label className="block text-sm">
          <span className="label">Surgeon / protocol notes (optional)</span>
          <textarea
            className="input min-h-[72px]"
            value={protocolNotes}
            onChange={(e) => setProtocolNotes(e.target.value)}
            placeholder="e.g. NWB right LE × 4 weeks per Dr. Lee; sternal lift limit 10 lb; collar when upright…"
          />
        </label>
      </section>

      {/* Home-based program */}
      <section className="card space-y-3 border-brand-300 bg-brand-50/40 p-5">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 accent-brand-600"
            checked={homeBasedProgram}
            onChange={(e) => setHomeBasedProgram(e.target.checked)}
          />
          <span>
            <span className="flex items-center gap-2 font-semibold text-brand-950">
              <Home className="h-4 w-4 text-brand-600" />
              Home-based program
            </span>
            <span className="mt-1 block text-sm text-brand-700">
              Prefer chair/wall/floor/minimal-equipment variations for every stretch and exercise.
              You can toggle this again anytime on your routine session screen.
            </span>
          </span>
        </label>
      </section>

      {adjectivePreview && adjectivePreview.hits.length > 0 && (
        <section className="card space-y-2 p-5">
          <h2 className="font-semibold text-brand-900">Words shaping your plan</h2>
          <p className="text-sm text-brand-700">
            Each adjective/qualifier from your paragraph maps to clinical dosing biases:
          </p>
          <ul className="space-y-1 text-sm text-brand-800">
            {adjectivePreview.summaryLines.map((line) => (
              <li key={line} className="rounded-lg bg-brand-50 px-3 py-1.5">
                {line}
              </li>
            ))}
          </ul>
        </section>
      )}

      <button
        type="button"
        className="btn-primary w-full py-3.5 text-base"
        onClick={createPlan}
        disabled={saving || (!paragraph.trim() && areas.length === 0 && descriptorIds.length === 0)}
      >
        {saving ? "Building plan…" : "Generate clinical stretch + exercise plan"}
      </button>

      {generated && (
        <section className="card space-y-4 border-brand-300 p-5">
          <h2 className="text-lg font-bold text-brand-950">{generated.name}</h2>
          <p className="text-sm text-brand-700">{generated.description}</p>
          <p className="text-sm">
            ~{generated.estimatedMinutes} min · {generated.difficulty} ·{" "}
            {generated.items.length} movements (
            {generated.stretchIds.length} stretches · {generated.exerciseIds?.length || 0} exercises)
            {generated.homeBasedProgram ? " · Home-based variations ON" : ""}
          </p>
          {(generated.generatedFrom?.borgLabel || generated.generatedFrom?.maxHr) && (
            <p className="text-sm text-brand-700">
              <strong>Effort:</strong> {generated.generatedFrom?.borgLabel}
              {generated.generatedFrom?.maxHr
                ? ` · Est. HRmax ${generated.generatedFrom.maxHr} (cap ~${generated.generatedFrom.targetHrCap} bpm)`
                : ""}
            </p>
          )}
          {generated.selfAdjustHistory[0] && (
            <p className="rounded-xl bg-brand-50 p-3 text-sm text-brand-800">
              <strong>Dosing note:</strong> {generated.selfAdjustHistory[0].details}
            </p>
          )}
          {(generated.generatedFrom?.adjectiveSummary || []).length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
                Adjective-driven clinical adjustments
              </p>
              <ul className="mt-2 space-y-1 text-xs text-brand-800">
                {generated.generatedFrom!.adjectiveSummary!.slice(0, 8).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          )}
          {(generated.generatedFrom?.safetySummary || []).length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
                Safety / device / precaution summary
              </p>
              <ul className="mt-2 space-y-1 text-xs text-brand-800">
                {generated.generatedFrom!.safetySummary!.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          )}
          {(generated.generatedFrom?.safetyEducation || []).length > 0 && (
            <details className="rounded-xl border border-brand-100 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-brand-900">
                Precaution & device adherence instructions (
                {generated.generatedFrom!.safetyEducation!.length})
              </summary>
              <div className="mt-3 space-y-3">
                {generated.generatedFrom!.safetyEducation!.slice(0, 12).map((block) => (
                  <div key={block.title} className="text-sm">
                    <p className="font-semibold text-brand-950">{block.title}</p>
                    <p className="mt-1 text-brand-700">{block.body}</p>
                    <ul className="mt-1 list-disc pl-5 text-xs text-brand-800">
                      {block.bullets.slice(0, 6).map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </details>
          )}
          {(generated.generatedFrom?.conditionSummary || []).length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
                Condition-driven adjustments
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {generated.generatedFrom!.conditionSummary!.map((label) => (
                  <span key={label} className="chip">
                    {label}
                  </span>
                ))}
              </div>
              {(generated.generatedFrom?.conditionSubcategories || []).length > 0 && (
                <p className="mt-2 text-xs text-brand-600">
                  Sub-categories:{" "}
                  {generated.generatedFrom!.conditionSubcategories!
                    .map((s) => CLINICAL_SUBCATEGORY_LABELS[s as keyof typeof CLINICAL_SUBCATEGORY_LABELS] || s)
                    .join(", ")}
                </p>
              )}
            </div>
          )}
          {(generated.generatedFrom?.clinicalOutcomes || []).length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
                Realistic clinical outcomes tied to this routine
              </p>
              <ul className="mt-2 space-y-2 text-sm text-brand-800">
                {generated.generatedFrom!.clinicalOutcomes!.slice(0, 5).map((o) => (
                  <li key={o.label} className="rounded-xl border border-brand-100 px-3 py-2 dark:border-brand-800">
                    <p className="font-semibold text-brand-950">{o.label}</p>
                    <p className="text-xs text-brand-600">{o.timeframe}</p>
                    <p className="mt-1 text-xs leading-relaxed text-brand-700">{o.evidenceNote}</p>
                    <p className="mt-1 text-[11px] text-brand-500">Track: {o.measureHint}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(generated.generatedFrom?.descriptorSummary || []).length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
                Paragraph / descriptor-driven plan
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {generated.generatedFrom!.descriptorSummary!.map((label) => (
                  <span key={label} className="chip">
                    {label}
                  </span>
                ))}
              </div>
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
                  className="rounded-lg border border-brand-100 px-3 py-2 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>
                      {i + 1}. <span className="capitalize text-brand-500">{item.kind}</span> —{" "}
                      {m?.name ?? item.movementId}
                    </span>
                    {m && (
                      <Link
                        href={
                          item.kind === "stretch" ? `/library/${m.slug}` : `/exercises/${m.slug}`
                        }
                        className="font-semibold text-brand-700"
                      >
                        View
                      </Link>
                    )}
                  </div>
                  {item.variationId && (
                    <p className="mt-1 text-xs font-medium text-brand-700">
                      Variation:{" "}
                      {m?.variations.find((v) => v.id === item.variationId)?.name ??
                        item.variationId}
                    </p>
                  )}
                  {m && (
                    <p className="mt-1 text-xs text-brand-600">{m.clinical.whyImportant}</p>
                  )}
                </li>
              );
            })}
          </ol>
          <div className="flex flex-wrap gap-2">
            <Link
              href={routineId ? `/routines/session?id=${routineId}` : "/routines"}
              className="btn-primary"
            >
              Start guided session
            </Link>
            <Link href="/modalities" className="btn-secondary">
              <Sparkles className="h-4 w-4" />
              Pre/post-visit modalities
            </Link>
            <Link href="/builder" className="btn-secondary">
              Customize / rotate
            </Link>
            <Link href="/jeffery" className="btn-ghost">
              Discuss with Jeffery
            </Link>
            <Link href="/insights" className="btn-ghost">
              View correlations
            </Link>
          </div>
        </section>
      )}

      {modalityPlan && (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-brand-950">
                Pre-visit & post-visit modality plan
              </h2>
              <p className="text-sm text-brand-700/80">
                Matched to your pain rating, descriptors, and written experienceΓÇösame clinical
                data that shaped your movement plan. Add any of these to your program with pre/post
                visit flags.
              </p>
            </div>
            <Link href="/modalities" className="text-sm font-semibold text-brand-700 hover:underline">
              Full hub
            </Link>
          </div>
          <ModalityPlanPanels plan={modalityPlan} showLink />
          <Link href="/modalities?tab=program" className="btn-secondary inline-flex">
            <Sparkles className="h-4 w-4" />
            Multi-select & add modalities to program
          </Link>
        </section>
      )}
    </div>
  );
}
