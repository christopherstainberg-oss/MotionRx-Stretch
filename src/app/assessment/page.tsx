"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { sameStringArray, useDebouncedValue } from "@/lib/hooks";
import {
  ConversationComposer,
  ConversationSpeedControl,
} from "@/components/ConversationSpeedControl";
import {
  useAnswerSettleCountdown,
  useConversationSpeed,
} from "@/lib/use-conversation-speed";
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
import {
  matchMedicationsFromText,
  medicationEntriesFromBaseIds,
  type UserMedicationEntry,
} from "@/data/medications";
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
import {
  getOccupationById,
  matchOccupationsFromText,
  userOccupationFromCatalog,
  type UserOccupationEntry,
} from "@/data/occupations";
import {
  SportSurgeryPickers,
  type SportSurgeryValue,
} from "@/components/SportSurgeryPickers";
import { VitalsLabsPanel } from "@/components/VitalsLabsPanel";
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
  answerAssessmentConversation,
  appendFlowQuestion,
  buildStoryPriorPrompt,
  countCompletedStoryTurns,
  currentOpenStoryQuestion,
  decideStoryFlow,
  displayPreferredName,
  formatQuestionForStoryBox,
  getStoryIntel,
  nextStoryBoxQuestion,
  selectAutoAppearingQuestions,
  storyEndsWithOpenQuestion,
  suggestedAssessmentConversation,
  type AssessmentCoachContext,
  type CoachExchange,
  type ConversationPrompt,
} from "@/lib/assessment-coach";
import {
  mergeHistoryText,
  parseMedicalHistoryFromText,
  parseSexFromText,
  type SexSelection,
} from "@/lib/clinical-history";
import {
  loadAssessmentQa,
  loadClinicalContext,
  saveAssessmentQa,
  saveClinicalContext,
} from "@/lib/clinical-context";
import {
  buildPrescribedPlanDocument,
  reconfigurePrescribedPlan,
  type PrescribedPlanDocument,
} from "@/lib/prescribed-plan";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Home,
  MessageCircleQuestion,
  Send,
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

/** Parse free-text goals into plan-engine string list (semicolons, commas, or newlines). */
function parseGoalsFreeText(text: string): string[] {
  return (text || "")
    .split(/[\n;]+/)
    .map((line) => line.replace(/^[-•*\u2022\d.)\s]+/, "").trim())
    .filter((s) => s.length >= 2)
    .slice(0, 16);
}

/** Join a goal list into one single-line free-text value. */
function goalsToFreeText(list: string[]): string {
  return Array.from(new Set(list.map((g) => g.trim()).filter(Boolean))).join("; ");
}

/**
 * Auto-populate the single-line Goals field from story intelligence + body areas.
 * Prefers user-stated goals; falls back to assumed + region-aware suggestions.
 */
function buildAutoGoalsFreeText(opts: {
  statedGoals?: string[];
  assumedGoals?: string[];
  areas?: BodyPart[];
  functionalLimits?: string[];
}): string {
  const lines: string[] = [];
  const push = (g: string) => {
    const t = g.trim();
    if (!t) return;
    if (lines.some((x) => x.toLowerCase() === t.toLowerCase())) return;
    lines.push(t);
  };

  for (const g of opts.statedGoals || []) push(g);
  for (const g of opts.assumedGoals || []) push(g);

  // Region-aware educational goals when story is thin
  if (lines.length < 2) {
    const areas = opts.areas || [];
    if (areas.some((a) => /neck|jaw|shoulder|upper-back|thoracic/.test(a))) {
      push("tolerate desk / screen time with less neck and shoulder stiffness");
    }
    if (areas.some((a) => /lower-back|pelvis|hip|glute/.test(a))) {
      push("move, sit, and stand with less low-back or hip irritation");
    }
    if (areas.some((a) => /knee|hamstring|quad|calf|ankle|foot/.test(a))) {
      push("walk stairs and daily distances with more confidence");
    }
    if (areas.some((a) => /wrist|hand|elbow|forearm/.test(a))) {
      push("use hands and arms for daily tasks with less flare");
    }
    for (const lim of (opts.functionalLimits || []).slice(0, 2)) {
      push(`improve ease with: ${lim}`);
    }
  }

  if (!lines.length) {
    push("move with less stiffness and more confidence in daily activities");
    push("build a short, sustainable home mobility routine I can stick with");
  }

  // One line in the box; multiple goals separated by "; "
  return lines.slice(0, 6).join("; ");
}

/**
 * IMPORTANT: Keep presentational helpers OUTSIDE AssessmentPage.
 * Nested function components remount on every parent render, which steals
 * focus from textareas/inputs and makes typing feel broken.
 */

/** Primary block — always visible, airy, no divider walls */
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
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-brand-950 dark:text-brand-50">{title}</h3>
          {hint ? (
            <p className="mt-1 max-w-prose text-xs leading-relaxed text-brand-500">{hint}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/**
 * Secondary / optional content — collapsed by default so the page stays calm.
 * Uses <details> so no focus-stealing remounts on parent re-render.
 */
function OptionalSection({
  title,
  hint,
  children,
  badge,
  defaultOpen = false,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  badge?: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className="group rounded-2xl border border-brand-100/70 bg-brand-50/30 open:bg-white dark:border-brand-800/70 dark:bg-brand-950/40 dark:open:bg-brand-950"
      open={defaultOpen || undefined}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 marker:content-none [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-4 w-4 shrink-0 text-brand-400 transition group-open:rotate-90" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-brand-900 dark:text-brand-50">
            {title}
          </span>
          {hint ? (
            <span className="mt-0.5 block text-xs text-brand-500">{hint}</span>
          ) : null}
        </span>
        {badge}
      </summary>
      <div className="space-y-3 border-t border-brand-100/70 px-4 py-4 dark:border-brand-800/70">
        {children}
      </div>
    </details>
  );
}

function StepNav({
  step,
  generated,
  onStep,
}: {
  step: number;
  generated: boolean;
  onStep: (id: number) => void;
}) {
  const progress = ((step - 1) / (STEPS.length - 1)) * 100;
  const current = STEPS[step - 1];
  return (
    <nav aria-label="Assessment steps" className="mb-8">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <p className="section-label">
            Step {step} of {STEPS.length}
          </p>
          <p className="mt-1 text-lg font-semibold tracking-tight text-brand-950 dark:text-brand-50">
            {current?.title}
          </p>
        </div>
      </div>
      <div className="mb-3 h-1 overflow-hidden rounded-full bg-brand-100 dark:bg-brand-900">
        <div
          className="h-full rounded-full bg-brand-600 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <ol className="flex items-center justify-between gap-1">
        {STEPS.map((s) => {
          const active = step === s.id;
          const done = step > s.id || (s.id === 5 && generated);
          return (
            <li key={s.id} className="flex-1">
              <button
                type="button"
                onClick={() => onStep(s.id)}
                title={s.title}
                aria-current={active ? "step" : undefined}
                className="flex w-full flex-col items-center gap-1.5 py-1"
              >
                <span
                  className={`flex h-2.5 w-full max-w-[2.5rem] rounded-full transition ${
                    active
                      ? "bg-brand-600"
                      : done
                        ? "bg-brand-300 dark:bg-brand-700"
                        : "bg-brand-100 dark:bg-brand-900"
                  }`}
                />
                <span
                  className={`text-[10px] font-medium ${
                    active
                      ? "text-brand-800 dark:text-brand-100"
                      : "text-brand-400"
                  }`}
                >
                  {s.id}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function FooterNav({
  onBack,
  onNext,
  nextLabel = "Continue",
  nextDisabled,
  showGenerate,
  onGenerate,
  saving,
  canGenerate,
}: {
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  showGenerate?: boolean;
  onGenerate?: () => void;
  saving?: boolean;
  canGenerate?: boolean;
}) {
  return (
    <div className="mt-8 flex items-center justify-between gap-3 pt-2">
      {onBack ? (
        <button type="button" className="btn-ghost px-2" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
      ) : (
        <span className="w-16" />
      )}
      {showGenerate ? (
        <button
          type="button"
          className="btn-primary min-w-[11rem]"
          onClick={onGenerate}
          disabled={saving || !canGenerate}
        >
          {saving ? "Building…" : "Generate plan"}
        </button>
      ) : (
        <button type="button" className="btn-primary" onClick={onNext} disabled={nextDisabled}>
          {nextLabel}
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export default function AssessmentPage() {
  const [paragraph, setParagraph] = useState("");
  const [areas, setAreas] = useState<BodyPart[]>([]);
  const [painLevels, setPainLevels] = useState<Partial<Record<BodyPart, number>>>({});
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [customSymptom, setCustomSymptom] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  /** Single-line goals field (auto-fills from story until the user edits) */
  const [goalsText, setGoalsText] = useState("");
  const [goalsAutoFill, setGoalsAutoFill] = useState(true);
  const goalsUserEditedRef = useRef(false);
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
  const [occupations, setOccupations] = useState<UserOccupationEntry[]>([]);
  const [sportSurgery, setSportSurgery] = useState<SportSurgeryValue>({
    sportIds: [],
    activityLevel: "unknown",
  });
  const [clinicalSymptomIds, setClinicalSymptomIds] = useState<string[]>([]);
  const [adlEntries, setAdlEntries] = useState<UserAdlEntry[]>([]);
  const [step, setStep] = useState(1);
  const [deviceTab, setDeviceTab] = useState<"precautions" | "implants" | "supports">("precautions");
  const [bodyGroupOpen, setBodyGroupOpen] = useState<string>("spine-head");
  const [preferredName, setPreferredName] = useState("");
  const [coachQuestion, setCoachQuestion] = useState("");
  const [coachLog, setCoachLog] = useState<CoachExchange[]>([]);
  /** Progressive Q&A guide inserts open-ended questions into free text */
  /** Off by default — user opts in to put guided questions in the story box */
  const [guideStoryQa, setGuideStoryQa] = useState(false);
  /** Keep seeding / advancing the free-text interview without waiting for first keystroke */
  const [continuousFlow, setContinuousFlow] = useState(true);
  const storyTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  /** Only auto-append after the user has typed (not on first load of saved story) */
  const storyUserEditedRef = useRef(false);
  /** Prevent re-entrant double-appends while React batches setState */
  const flowLockRef = useRef(false);
  const lastFlowAppendRef = useRef("");
  const [writtenApproach, setWrittenApproach] = useState<string | null>(null);
  const [prescribed, setPrescribed] = useState<PrescribedPlanDocument | null>(null);
  const [planAgreed, setPlanAgreed] = useState(false);
  const [adaptText, setAdaptText] = useState("");
  const [adaptMsg, setAdaptMsg] = useState("");
  const [adapting, setAdapting] = useState(false);
  const [planInputSnapshot, setPlanInputSnapshot] = useState<SymptomInput | null>(null);
  const [sex, setSex] = useState<SexSelection | "">("");
  const [pastMedicalHistory, setPastMedicalHistory] = useState("");
  const [currentMedicalHistory, setCurrentMedicalHistory] = useState("");
  /** When true, story paragraph can auto-fill sex / history fields */
  const [autoApplyHistory, setAutoApplyHistory] = useState(true);

  /** Heavy clinical matching runs on debounced text so the textarea stays responsive */
  const debouncedParagraph = useDebouncedValue(paragraph, 400);
  /**
   * Short pause so typing settles before we *detect* a complete answer.
   * The longer conversation-speed delay (default 5s) runs after that so the user can still edit.
   */
  const flowParagraph = useDebouncedValue(paragraph, 300);
  const { delayMs: conversationDelayMs } = useConversationSpeed();

  useEffect(() => {
    try {
      const stored = localStorage.getItem("preferredName");
      if (stored?.trim()) setPreferredName(stored.trim());
    } catch {
      /* ignore */
    }
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        const fromUser =
          d.user?.preferredName ||
          d.user?.displayName ||
          (typeof d.user?.name === "string" ? d.user.name.split(/\s+/)[0] : "");
        if (fromUser) {
          setPreferredName(String(fromUser).trim());
          try {
            localStorage.setItem("preferredName", String(fromUser).trim());
          } catch {
            /* ignore */
          }
        }
      })
      .catch(() => {});

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
    if (local?.occupations?.length) setOccupations(local.occupations);
    if (
      local?.sportIds?.length ||
      local?.surgeryId ||
      local?.activityLevel
    ) {
      setSportSurgery({
        sportIds: local.sportIds || [],
        surgeryId: local.surgeryId,
        surgeryDate: local.surgeryDate,
        activityLevel: (local.activityLevel as SportSurgeryValue["activityLevel"]) || "unknown",
      });
    }
    if (local?.clinicalSymptomIds?.length) setClinicalSymptomIds(local.clinicalSymptomIds);
    if (local?.adlEntries?.length) setAdlEntries(local.adlEntries);
    if (local?.sex) setSex(local.sex);
    if (local?.pastMedicalHistory) setPastMedicalHistory(local.pastMedicalHistory);
    if (local?.currentMedicalHistory) setCurrentMedicalHistory(local.currentMedicalHistory);
    const qaStored = loadAssessmentQa();
    if (qaStored.length) setCoachLog(qaStored);
    const ctx = loadClinicalContext();
    if (ctx?.freeText && !local?.freeText) setParagraph(ctx.freeText);
    if (ctx?.sex && !local?.sex) setSex(ctx.sex);
    if (ctx?.pastMedicalHistory && !local?.pastMedicalHistory)
      setPastMedicalHistory(ctx.pastMedicalHistory);
    if (ctx?.currentMedicalHistory && !local?.currentMedicalHistory)
      setCurrentMedicalHistory(ctx.currentMedicalHistory);
    if (ctx?.writtenApproach) setWrittenApproach(ctx.writtenApproach);
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
        if (d.profile?.occupations?.length) setOccupations(d.profile.occupations);
        if (
          d.profile?.sportIds?.length ||
          d.profile?.surgeryId ||
          d.profile?.activityLevel
        ) {
          setSportSurgery({
            sportIds: d.profile.sportIds || [],
            surgeryId: d.profile.surgeryId,
            surgeryDate: d.profile.surgeryDate,
            activityLevel:
              (d.profile.activityLevel as SportSurgeryValue["activityLevel"]) ||
              "unknown",
          });
        }
        if (d.profile?.clinicalSymptomIds?.length)
          setClinicalSymptomIds(d.profile.clinicalSymptomIds);
        if (d.profile?.sex && !local?.sex) setSex(d.profile.sex);
        if (d.profile?.pastMedicalHistory && !local?.pastMedicalHistory)
          setPastMedicalHistory(d.profile.pastMedicalHistory);
        if (d.profile?.currentMedicalHistory && !local?.currentMedicalHistory)
          setCurrentMedicalHistory(d.profile.currentMedicalHistory);
        if (d.profile?.adlEntries?.length) setAdlEntries(d.profile.adlEntries);
      })
      .catch(() => {});
  }, []);

  const toggle = <T,>(list: T[], item: T): T[] =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

  const parsedPreview = useMemo(
    () =>
      debouncedParagraph.trim().length > 12
        ? parseConcernParagraph(debouncedParagraph)
        : null,
    [debouncedParagraph]
  );

  // Live clinical descriptors from paragraph text (debounced for typing UX)
  const paragraphDescriptors = useMemo(() => {
    if (debouncedParagraph.trim().length < 12) return [] as string[];
    return matchDescriptorsFromText(debouncedParagraph, 14);
  }, [debouncedParagraph]);

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
      setAutoDescIds((prev) => (prev.length ? [] : prev));
      return;
    }
    setAutoDescIds((prev) =>
      sameStringArray(prev, paragraphDescriptors) ? prev : paragraphDescriptors
    );
    setDescriptorIds((prev) => {
      const manualOnly = prev.filter((id) => !autoDescIds.includes(id));
      const next = Array.from(new Set([...manualOnly, ...paragraphDescriptors]));
      return sameStringArray(prev, next) ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- autoDescIds intentionally previous set
  }, [paragraphDescriptors, autoApplyDesc]);

  const descHints = useMemo(() => summarizeDescriptors(descriptorIds), [descriptorIds]);

  const paragraphConditions = useMemo(() => {
    if (debouncedParagraph.trim().length < 12) return [] as string[];
    return matchConditionsFromText(debouncedParagraph, 12);
  }, [debouncedParagraph]);

  const conditionHints = useMemo(
    () => summarizeConditions(paragraphConditions),
    [paragraphConditions]
  );

  const adjectivePreview = useMemo(
    () =>
      debouncedParagraph.trim().length > 8
        ? analyzeAssessmentAdjectives(debouncedParagraph)
        : null,
    [debouncedParagraph]
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
        concernParagraph: debouncedParagraph,
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
      debouncedParagraph,
    ]
  );

  // Auto-merge paragraph-detected implants/precautions when auto-apply is on
  useEffect(() => {
    if (!autoApplyDesc || debouncedParagraph.trim().length < 12) return;
    setPrecautionIds((prev) => {
      const next = Array.from(new Set([...prev, ...safetyPreview.precautionIds]));
      return sameStringArray(prev, next) ? prev : next;
    });
    setImplantIds((prev) => {
      const next = Array.from(new Set([...prev, ...safetyPreview.implantIds]));
      return sameStringArray(prev, next) ? prev : next;
    });
    setOrthoticIds((prev) => {
      const next = Array.from(new Set([...prev, ...safetyPreview.orthoticIds]));
      return sameStringArray(prev, next) ? prev : next;
    });
    setProstheticIds((prev) => {
      const next = Array.from(new Set([...prev, ...safetyPreview.prostheticIds]));
      return sameStringArray(prev, next) ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run on debounced paragraph / auto flag
  }, [debouncedParagraph, autoApplyDesc]);

  // Auto-detect catalog medications named in the story (user can edit doses later)
  useEffect(() => {
    if (!autoApplyDesc || debouncedParagraph.trim().length < 12) return;
    const matched = matchMedicationsFromText(debouncedParagraph, 8);
    if (!matched.length) return;
    setMedications((prev) => {
      const drafts = medicationEntriesFromBaseIds(matched, prev);
      if (!drafts.length) return prev;
      return [...prev, ...drafts].slice(0, 20);
    });
  }, [debouncedParagraph, autoApplyDesc]);

  // Backend-only: sex, occupation, PMH/CMH from story free text (no UI pickers)
  useEffect(() => {
    if (!autoApplyHistory || debouncedParagraph.trim().length < 8) return;
    const parsedSex = parseSexFromText(debouncedParagraph);
    if (parsedSex) {
      setSex((prev) => prev || parsedSex);
    }
    const occIds = matchOccupationsFromText(debouncedParagraph, 3);
    if (occIds.length) {
      setOccupations((prev) => {
        if (prev.length) return prev;
        const next: UserOccupationEntry[] = [];
        for (const id of occIds) {
          const occ = getOccupationById(id);
          if (occ) next.push(userOccupationFromCatalog(occ));
        }
        return next.slice(0, 2);
      });
    }
    const hist = parseMedicalHistoryFromText(debouncedParagraph);
    if (hist.pastMedicalHistory) {
      setPastMedicalHistory((prev) => mergeHistoryText(prev, hist.pastMedicalHistory));
    }
    if (hist.currentMedicalHistory) {
      setCurrentMedicalHistory((prev) => mergeHistoryText(prev, hist.currentMedicalHistory));
    }
  }, [debouncedParagraph, autoApplyHistory]);

  // Keep cross-app clinical context in sync as the story evolves
  useEffect(() => {
    if (debouncedParagraph.trim().length < 4 && !coachLog.length) return;
    saveClinicalContext({
      freeText: debouncedParagraph,
      preferredName: displayPreferredName(preferredName),
      sex: sex || undefined,
      pastMedicalHistory: pastMedicalHistory.trim() || undefined,
      currentMedicalHistory: currentMedicalHistory.trim() || undefined,
      areas,
      goals,
      descriptorIds,
      qa: coachLog,
      writtenApproach: writtenApproach || undefined,
      occupations,
    });
  }, [
    debouncedParagraph,
    preferredName,
    sex,
    pastMedicalHistory,
    currentMedicalHistory,
    areas,
    goals,
    descriptorIds,
    coachLog,
    writtenApproach,
    occupations,
  ]);

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
    if (parsedPreview.goals?.length) {
      const text = goalsToFreeText(parsedPreview.goals);
      setGoalsText(text);
      goalsUserEditedRef.current = false;
    }
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
      occupations,
      sportIds: sportSurgery.sportIds,
      surgeryId: sportSurgery.surgeryId,
      surgeryDate: sportSurgery.surgeryDate,
      activityLevel:
        sportSurgery.activityLevel && sportSurgery.activityLevel !== "unknown"
          ? sportSurgery.activityLevel
          : undefined,
      clinicalSymptomIds,
      adlEntries,
      sex: sex || undefined,
      pastMedicalHistory: pastMedicalHistory.trim() || undefined,
      currentMedicalHistory: currentMedicalHistory.trim() || undefined,
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
    occupations,
    sportSurgery,
    clinicalSymptomIds,
    adlEntries,
    sex,
    pastMedicalHistory,
    currentMedicalHistory,
  ]);

  const coachContext = useMemo((): AssessmentCoachContext => {
    return {
      paragraph,
      areas,
      painLevels,
      goals,
      symptoms,
      minutes,
      difficulty,
      preferKinds,
      descriptorIds,
      conditionIds: paragraphConditions,
      clinicalSymptomIds,
      medications: medications.map((m) => ({
        genericName: m.genericName,
        strength: m.strength,
      })),
      precautionIds,
      implantIds,
      homeBasedProgram,
      preferredName: displayPreferredName(preferredName),
      sex: sex || undefined,
      pastMedicalHistory: pastMedicalHistory.trim() || undefined,
      currentMedicalHistory: currentMedicalHistory.trim() || undefined,
    };
  }, [
    paragraph,
    areas,
    painLevels,
    goals,
    symptoms,
    minutes,
    difficulty,
    preferKinds,
    descriptorIds,
    paragraphConditions,
    clinicalSymptomIds,
    medications,
    precautionIds,
    implantIds,
    homeBasedProgram,
    preferredName,
    sex,
    pastMedicalHistory,
    currentMedicalHistory,
  ]);

  const storyPromptCtx = useMemo(
    () => ({
      paragraph,
      areas,
      preferredName: displayPreferredName(preferredName),
      sex: sex || undefined,
      pastMedicalHistory,
      currentMedicalHistory,
      descriptorIds,
      conditionIds: paragraphConditions,
      goals,
    }),
    [
      paragraph,
      areas,
      preferredName,
      sex,
      pastMedicalHistory,
      currentMedicalHistory,
      descriptorIds,
      paragraphConditions,
      goals,
    ]
  );

  const storyIntel = useMemo(
    () => getStoryIntel(storyPromptCtx),
    [storyPromptCtx]
  );

  // Auto-populate Goals free-text from story + areas (until user edits)
  useEffect(() => {
    if (!goalsAutoFill || goalsUserEditedRef.current) return;
    const next = buildAutoGoalsFreeText({
      statedGoals: storyIntel.goals,
      assumedGoals: storyIntel.assumedGoals,
      areas,
      functionalLimits: storyIntel.functionalLimits,
    });
    if (!next.trim()) return;
    setGoalsText((prev) => (prev === next ? prev : next));
    const parsed = parseGoalsFreeText(next);
    setGoals((prev) => (sameStringArray(prev, parsed) ? prev : parsed));
  }, [
    goalsAutoFill,
    storyIntel.goals,
    storyIntel.assumedGoals,
    storyIntel.functionalLimits,
    areas,
  ]);

  const storyPriorPrompt = useMemo(
    () => buildStoryPriorPrompt(storyPromptCtx),
    [storyPromptCtx]
  );

  const autoAppearingQuestions = useMemo(
    () => selectAutoAppearingQuestions(storyPromptCtx, 7),
    [storyPromptCtx]
  );

  const conversationPrompts = useMemo(
    () => suggestedAssessmentConversation(storyPromptCtx),
    [storyPromptCtx]
  );

  const nextGuidedQuestion = useMemo(
    () => nextStoryBoxQuestion(storyPromptCtx),
    [storyPromptCtx]
  );

  function focusStoryEnd() {
    requestAnimationFrame(() => {
      const el = storyTextareaRef.current;
      if (!el) return;
      el.focus();
      const len = el.value.length;
      el.setSelectionRange(len, len);
      el.scrollTop = el.scrollHeight;
    });
  }

  /** Insert an open-ended Q into the free-text story box and focus for the answer */
  function insertQuestionIntoStory(prompt: ConversationPrompt, bridge?: string) {
    setParagraph((prev) => appendFlowQuestion(prev, prompt, bridge));
    lastFlowAppendRef.current = prompt.id;
    focusStoryEnd();
  }

  const flowCtx = useMemo(
    () => ({
      paragraph: flowParagraph,
      areas,
      preferredName: displayPreferredName(preferredName),
      sex: (sex || undefined) as SexSelection | undefined,
      pastMedicalHistory,
      currentMedicalHistory,
      descriptorIds,
      conditionIds: paragraphConditions,
      goals,
    }),
    [
      flowParagraph,
      areas,
      preferredName,
      sex,
      pastMedicalHistory,
      currentMedicalHistory,
      descriptorIds,
      paragraphConditions,
      goals,
    ]
  );

  const flowStatus = useMemo(() => decideStoryFlow(flowCtx), [flowCtx]);
  const openStoryQuestion = useMemo(
    () => currentOpenStoryQuestion(paragraph),
    [paragraph]
  );
  const completedTurns = useMemo(
    () => countCompletedStoryTurns(paragraph),
    [paragraph]
  );

  /** Complete answer detected → arm edit window before next question */
  const pendingStoryAdvance = useMemo(() => {
    if (!guideStoryQa || !continuousFlow) return null;
    if (flowStatus.type !== "advance") return null;
    if (!storyUserEditedRef.current && !paragraph.includes("▸")) return null;
    if (
      lastFlowAppendRef.current === flowStatus.prompt.id &&
      storyEndsWithOpenQuestion(paragraph)
    ) {
      return null;
    }
    return flowStatus;
  }, [guideStoryQa, continuousFlow, flowStatus, paragraph]);

  const storySettle = useAnswerSettleCountdown({
    armed: Boolean(pendingStoryAdvance),
    resetKey: paragraph,
    delayMs: conversationDelayMs,
  });

  /** Send — continue conversation immediately (no settle wait, no lock hesitation). */
  function commitStoryAdvanceNow() {
    const action =
      pendingStoryAdvance && pendingStoryAdvance.type === "advance"
        ? pendingStoryAdvance
        : null;
    // Always clear settle state first so UI unblocks immediately
    storySettle.cancel();
    if (!action) return;
    flowLockRef.current = false;
    setParagraph((prev) => {
      if (storyEndsWithOpenQuestion(prev)) return prev;
      return appendFlowQuestion(prev, action.prompt, action.bridge);
    });
    lastFlowAppendRef.current = action.prompt.id;
    // Focus next answer slot without artificial delay
    requestAnimationFrame(() => focusStoryEnd());
  }

  function editStoryAnswer() {
    storySettle.edit();
    requestAnimationFrame(() => focusStoryEnd());
  }

  // Seed opening question promptly (not held by edit window)
  useEffect(() => {
    if (!guideStoryQa || !continuousFlow) return;
    if (flowLockRef.current) return;
    if (flowStatus.type !== "seed") return;
    if (paragraph.trim()) return;
    flowLockRef.current = true;
    setParagraph((prev) => {
      if (prev.trim()) return prev;
      if (flowStatus.type !== "seed") return prev;
      return appendFlowQuestion("", flowStatus.prompt);
    });
    if (flowStatus.type === "seed") {
      lastFlowAppendRef.current = flowStatus.prompt.id;
    }
    focusStoryEnd();
    window.setTimeout(() => {
      flowLockRef.current = false;
    }, 400);
  }, [guideStoryQa, continuousFlow, flowStatus, paragraph]);

  /**
   * After settle countdown: record answer + ask next question immediately.
   * Send uses commitStoryAdvanceNow (same append path, zero hesitation).
   */
  useEffect(() => {
    if (!storySettle.settled || !pendingStoryAdvance) return;
    if (pendingStoryAdvance.type !== "advance") return;
    // Re-use Send path so auto-advance and manual Send behave identically
    commitStoryAdvanceNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once when settled
  }, [storySettle.settled]);

  function askCoach(question?: string) {
    const q = (question ?? coachQuestion).trim();
    if (!q) return;

    // Free-text replies can carry history/sex — parse and fold into profile fields
    const fromAnswerSex = parseSexFromText(q);
    if (fromAnswerSex) setSex((prev) => prev || fromAnswerSex);
    const fromAnswerHist = parseMedicalHistoryFromText(q);
    if (fromAnswerHist.pastMedicalHistory) {
      setPastMedicalHistory((prev) =>
        mergeHistoryText(prev, fromAnswerHist.pastMedicalHistory)
      );
    }
    if (fromAnswerHist.currentMedicalHistory) {
      setCurrentMedicalHistory((prev) =>
        mergeHistoryText(prev, fromAnswerHist.currentMedicalHistory)
      );
    }
    // Fold personal details into the story (not when tapping a full interview prompt)
    const isPrompt = conversationPrompts.some(
      (p) => p.question === q || p.label === q
    );
    if (!isPrompt && q.length >= 24 && !paragraph.toLowerCase().includes(q.toLowerCase().slice(0, 40))) {
      setParagraph((p) => (p.trim() ? `${p.trim()}\n\n${q.trim()}` : q.trim()));
    }

    const { answer, followUp } = answerAssessmentConversation(q, {
      ...coachContext,
      sex: fromAnswerSex || coachContext.sex,
      pastMedicalHistory:
        mergeHistoryText(
          coachContext.pastMedicalHistory || "",
          fromAnswerHist.pastMedicalHistory
        ) || coachContext.pastMedicalHistory,
      currentMedicalHistory:
        mergeHistoryText(
          coachContext.currentMedicalHistory || "",
          fromAnswerHist.currentMedicalHistory
        ) || coachContext.currentMedicalHistory,
    });
    const entry: CoachExchange = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      question: q,
      answer,
      followUp,
      at: new Date().toISOString(),
    };
    setCoachLog((prev) => {
      const next = [...prev, entry].slice(-24);
      saveAssessmentQa(next);
      saveClinicalContext({
        freeText: paragraph,
        preferredName: displayPreferredName(preferredName),
        sex: sex || undefined,
        pastMedicalHistory: pastMedicalHistory.trim() || undefined,
        currentMedicalHistory: currentMedicalHistory.trim() || undefined,
        areas,
        goals,
        descriptorIds,
        qa: next,
      });
      return next;
    });
    setCoachQuestion("");
  }

  function persistRoutine(
    routine: ReturnType<typeof generateHybridPlan>,
    approach: string,
    agreed = planAgreed,
    doc?: PrescribedPlanDocument | null
  ) {
    try {
      localStorage.setItem(`routine:${routine.id}`, JSON.stringify(routine));
      localStorage.setItem("active-routine", JSON.stringify(routine));
      localStorage.setItem(
        "prescribed-plan",
        JSON.stringify({
          approach,
          document: doc || prescribed,
          agreed,
          at: new Date().toISOString(),
        })
      );
    } catch {
      /* ignore */
    }
  }

  function agreeToPlan(agreed: boolean) {
    setPlanAgreed(agreed);
    if (!generated) return;
    const next = {
      ...generated,
      generatedFrom: {
        ...generated.generatedFrom!,
        planAgreed: agreed,
        planAgreedAt: agreed ? new Date().toISOString() : undefined,
        prescribedPlanText: writtenApproach || generated.generatedFrom?.prescribedPlanText,
      },
    };
    setGenerated(next);
    persistRoutine(next, writtenApproach || next.generatedFrom?.writtenApproach || "", agreed);
    if (prescribed) {
      setPrescribed({
        ...prescribed,
        agreedAt: agreed ? new Date().toISOString() : undefined,
      });
    }
  }

  async function adaptPlan() {
    if (!generated || !adaptText.trim()) {
      setAdaptMsg("Describe what you want changed (easier, shorter, more hip focus, etc.).");
      return;
    }
    setAdapting(true);
    setAdaptMsg("");
    try {
      const baseInput = planInputSnapshot || input;
      const result = reconfigurePrescribedPlan({
        baseInput,
        currentRoutine: generated,
        adaptationText: adaptText.trim(),
        coach: coachContext,
      });

      // Refresh modalities with adapted input
      const modPlan = planFromSymptomInput({
        ...result.input,
        painDescriptorIds:
          result.routine.generatedFrom?.painDescriptorIds ||
          result.input.painDescriptorIds ||
          descriptorIds,
      });
      modPlan.source = "assess";

      result.routine.generatedFrom = {
        ...result.routine.generatedFrom!,
        modalityPlanId: modPlan.id,
        planAgreed: false,
        planAgreedAt: undefined,
        planAdaptationNotes: [
          ...((generated.generatedFrom?.planAdaptationNotes as string[] | undefined) || []),
          adaptText.trim(),
        ],
        planVersion: result.prescribed.version,
        prescribedPlanText: result.prescribed.fullText,
        writtenApproach: result.prescribed.fullText,
      };

      setPlanAgreed(false);
      setPlanInputSnapshot(result.input);
      setPrescribed(result.prescribed);
      setWrittenApproach(result.prescribed.fullText);
      setGenerated(result.routine);
      setModalityPlan(modPlan);
      setRoutineId(result.routine.id);
      setAdaptMsg(result.changeSummary);
      setAdaptText("");
      persistRoutine(result.routine, result.prescribed.fullText, false, result.prescribed);
      saveClinicalContext({
        freeText: paragraph,
        writtenApproach: result.prescribed.fullText,
        routineId: result.routine.id,
        qa: coachLog,
      });

      try {
        localStorage.setItem("modality-plan", JSON.stringify(modPlan));
        await fetch("/api/routines", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(result.routine),
        }).catch(() => {});
      } catch {
        /* offline ok */
      }
    } finally {
      setAdapting(false);
    }
  }

  async function createPlan() {
    setPlanAgreed(false);
    setAdaptMsg("");
    setAdaptText("");
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
    const doc = buildPrescribedPlanDocument({
      routine,
      input,
      coach: coachContext,
    });
    const approach = doc.fullText;
    routine.generatedFrom = {
      ...routine.generatedFrom!,
      modalityPlanId: modPlan.id,
      suggestedModalityIds,
      writtenApproach: approach,
      prescribedPlanText: approach,
      planAgreed: false,
      planVersion: 1,
      preferredName: displayPreferredName(preferredName),
      sex: sex || undefined,
      pastMedicalHistory: pastMedicalHistory.trim() || undefined,
      currentMedicalHistory: currentMedicalHistory.trim() || undefined,
    };
    setWrittenApproach(approach);
    setPrescribed(doc);
    setPlanInputSnapshot(input);
    setGenerated(routine);
    setModalityPlan(modPlan);
    setStep(5);
    setSaving(true);
    persistRoutine(routine, approach);
    saveClinicalContext({
      freeText: paragraph,
      preferredName: displayPreferredName(preferredName),
      sex: sex || undefined,
      pastMedicalHistory: pastMedicalHistory.trim() || undefined,
      currentMedicalHistory: currentMedicalHistory.trim() || undefined,
      areas,
      goals,
      descriptorIds,
      conditionIds: paragraphConditions,
      overallPain: averagePainFromAreas(
        painLevels,
        areas.length ? areas : (["full-body"] as BodyPart[])
      ),
      qa: coachLog,
      writtenApproach: approach,
      routineId: routine.id,
    });
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
      occupations,
      sportIds: sportSurgery.sportIds,
      surgeryId: sportSurgery.surgeryId,
      surgeryDate: sportSurgery.surgeryDate,
      activityLevel:
        sportSurgery.activityLevel && sportSurgery.activityLevel !== "unknown"
          ? sportSurgery.activityLevel
          : undefined,
      clinicalSymptomIds,
      adlEntries,
      sex: sex || undefined,
      pastMedicalHistory: pastMedicalHistory.trim() || undefined,
      currentMedicalHistory: currentMedicalHistory.trim() || undefined,
    });
    try {
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
          sex: sex || undefined,
          pastMedicalHistory: pastMedicalHistory.trim() || undefined,
          currentMedicalHistory: currentMedicalHistory.trim() || undefined,
          freeText: paragraph,
          at: new Date().toISOString(),
        })
      );
      localStorage.setItem(
        "clinical-history-profile",
        JSON.stringify({
          sex: sex || undefined,
          pastMedicalHistory: pastMedicalHistory.trim() || undefined,
          currentMedicalHistory: currentMedicalHistory.trim() || undefined,
          freeText: paragraph,
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

  return (
    <div className="page-narrow stack pb-8">
      <header className="pt-1">
        <p className="section-label">Assessment</p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-brand-950 dark:text-brand-50">
          Clinical intake
        </h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-brand-600 dark:text-brand-300">
          One calm step at a time. Most fields are optional.
        </p>
      </header>

      <StepNav step={step} generated={Boolean(generated)} onStep={setStep} />

      {/* ─── Step 1: Story ─── */}
      {step === 1 && (
        <div className="stack">
          <section className="card space-y-5 p-5 sm:p-6">
            <SubSection
              title="Your story"
              hint={storyPriorPrompt.question}
              action={
                coachLog.length > 0 ? (
                  <span className="text-xs text-brand-500">{coachLog.length} turns</span>
                ) : null
              }
            >
              <div className="space-y-3">
                {!paragraph.trim() && nextGuidedQuestion ? (
                  <button
                    type="button"
                    className="text-xs font-semibold text-brand-700 hover:underline dark:text-brand-200"
                    onClick={() => insertQuestionIntoStory(nextGuidedQuestion)}
                  >
                    Use guided question →
                  </button>
                ) : null}

                <label className="block">
                  <span className="sr-only">Free-text story</span>
                  <ConversationComposer
                    settling={storySettle.settling}
                    editing={storySettle.editing}
                    remainingSec={storySettle.remainingSec}
                    onSend={commitStoryAdvanceNow}
                    onEdit={editStoryAnswer}
                  >
                    <textarea
                      ref={storyTextareaRef}
                      className="input conversation-text-box-field min-h-[200px] resize-y rounded-none text-base leading-relaxed"
                      value={paragraph}
                      onChange={(e) => {
                        storyUserEditedRef.current = true;
                      setParagraph(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      // Enter on a finished short answer nudges flow sooner (still debounced)
                      if (e.key === "Enter" && !e.shiftKey) {
                        storyUserEditedRef.current = true;
                      }
                    }}
                    placeholder={
                      continuousFlow && guideStoryQa
                        ? "Answer under each ▸ line — or type Skip to pass a question. Next question appears when you pause…"
                        : storyPriorPrompt.placeholder
                    }
                    aria-label="Describe your issue"
                    autoComplete="off"
                    spellCheck
                  />
                </ConversationComposer>
              </label>

              {/* Quiet conversation controls */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-brand-600 dark:text-brand-300">
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-brand-600"
                    checked={guideStoryQa}
                    onChange={(e) => setGuideStoryQa(e.target.checked)}
                  />
                  Guide questions
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-brand-600"
                    checked={continuousFlow}
                    onChange={(e) => setContinuousFlow(e.target.checked)}
                  />
                  Continuous flow
                </label>
                <ConversationSpeedControl
                  compact
                  settling={storySettle.settling}
                  settleRemainingSec={storySettle.remainingSec}
                />
              </div>
              {openStoryQuestion ? (
                <p className="text-sm text-brand-700 dark:text-brand-200">
                  <span className="font-medium text-brand-500">Now: </span>
                  {openStoryQuestion}
                </p>
              ) : nextGuidedQuestion ? (
                <p className="text-sm text-brand-600 dark:text-brand-300">
                  <span className="font-medium text-brand-500">Up next: </span>
                  {nextGuidedQuestion.question}{" "}
                  <button
                    type="button"
                    className="font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-200"
                    onClick={() => insertQuestionIntoStory(nextGuidedQuestion)}
                  >
                    Drop in
                  </button>
                </p>
              ) : null}

              {/* Live clinical intelligence from free text (drives Plan & adaptive Q&A) */}
              {storyIntel.richness !== "empty" ? (
                <div className="rounded-xl bg-brand-50/50 px-3.5 py-3 text-xs leading-relaxed text-brand-700 dark:bg-brand-900/30 dark:text-brand-200">
                  <p className="section-label">
                    Live read
                    {typeof storyIntel.completeness === "number"
                      ? ` · ${storyIntel.completeness}/100`
                      : ""}
                    {storyIntel.irritability !== "unknown"
                      ? ` · ${storyIntel.irritability} irritability`
                      : ""}
                  </p>
                  <ul className="mt-2 list-inside list-disc space-y-0.5">
                    {storyIntel.liveReadLines.slice(0, 4).map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                  <p className="mt-1.5 text-[11px] text-brand-600 dark:text-brand-300">
                    {storyIntel.elite?.evidence?.length
                      ? `Evidence: ${storyIntel.elite.evidence.length} stated item${
                          storyIntel.elite.evidence.length === 1 ? "" : "s"
                        }`
                      : "Evidence: sparse"}
                    {storyIntel.assumptions?.length
                      ? ` · Assumptions: ${storyIntel.assumptions.length} (gap-fill only)`
                      : " · Assumptions: none"}
                    {storyIntel.elite?.doseEnvelope
                      ? ` · dose ${storyIntel.elite.doseEnvelope.mode}`
                      : ""}
                    {storyIntel.trajectory && storyIntel.trajectory !== "unknown"
                      ? ` · trajectory ${storyIntel.trajectory}`
                      : ""}
                  </p>
                  {storyIntel.conflicts && storyIntel.conflicts.length > 0 ? (
                    <p className="mt-1 text-[11px] font-medium text-amber-800 dark:text-amber-200">
                      Conflict check: {storyIntel.conflicts[0]}
                    </p>
                  ) : null}
                  {storyIntel.missingThemes.length > 0 ? (
                    <p className="mt-1.5 text-[11px] text-brand-500">
                      Still open (not assumed):{" "}
                      {storyIntel.missingThemes.slice(0, 6).join(", ")}
                      {storyIntel.elite?.criticalGaps?.[0]
                        ? ` · highest-value gap: ${storyIntel.elite.criticalGaps[0].theme}`
                        : ""}
                    </p>
                  ) : (
                    <p className="mt-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                      Interview themes look solid — Plan can dose from stated evidence.
                    </p>
                  )}
                </div>
              ) : null}

              {/* Auto-appearing open-ended questions (answer-adaptive) */}
              <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50/40 p-3 dark:border-brand-700 dark:bg-brand-900/30">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-500">
                    Adaptive queue (also auto-flows into the box)
                    {autoAppearingQuestions.length > 0
                      ? ` · ${autoAppearingQuestions.length} ready`
                      : " · story looks complete"}
                  </p>
                  {nextGuidedQuestion ? (
                    <button
                      type="button"
                      className="rounded-full border border-brand-300 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-brand-800 shadow-sm hover:border-brand-500 hover:bg-brand-50 dark:border-brand-600 dark:bg-brand-950 dark:text-brand-100"
                      onClick={() => insertQuestionIntoStory(nextGuidedQuestion)}
                    >
                      Add next question
                    </button>
                  ) : null}
                </div>
                {autoAppearingQuestions.length > 0 ? (
                  <ul className="space-y-2">
                    {autoAppearingQuestions.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          title="Insert into free-text box and answer there"
                          className="group flex w-full items-start gap-2 rounded-lg border border-brand-100 bg-white px-2.5 py-2 text-left text-sm shadow-sm transition hover:border-brand-400 hover:bg-brand-50 dark:border-brand-800 dark:bg-brand-950 dark:hover:bg-brand-900"
                          onClick={() => insertQuestionIntoStory(p)}
                        >
                          <MessageCircleQuestion className="mt-0.5 h-4 w-4 shrink-0 text-brand-500 group-hover:text-brand-700" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[11px] font-bold uppercase tracking-wide text-brand-500">
                              {p.label}
                              <span className="ml-1.5 font-medium normal-case tracking-normal text-brand-400">
                                {p.category}
                              </span>
                            </span>
                            <span className="mt-0.5 block leading-snug text-brand-900 dark:text-brand-50">
                              {p.question}
                            </span>
                            {p.reason ? (
                              <span className="mt-1 block text-[10px] italic text-brand-500">
                                Why this: {p.reason}
                              </span>
                            ) : null}
                            <span className="mt-1 block text-[10px] font-semibold text-brand-600 opacity-80 group-hover:opacity-100">
                              Tap to drop into free text → answer below the ▸ line
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs leading-relaxed text-brand-600 dark:text-brand-300">
                    Nice work—your free text already covers the main interview themes. Keep editing
                    anytime, or ask the coach below for a friendly clinical reflection.
                  </p>
                )}
              </div>

              <label className="flex items-center gap-2.5 text-sm text-brand-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-brand-600"
                  checked={autoApplyDesc}
                  onChange={(e) => setAutoApplyDesc(e.target.checked)}
                />
                Auto-detect clinical details from my text (meds, conditions, pain language)
              </label>
              <label className="flex items-center gap-2.5 text-sm text-brand-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-brand-600"
                  checked={autoApplyHistory}
                  onChange={(e) => setAutoApplyHistory(e.target.checked)}
                />
                Auto-detect past/current medical history from this paragraph
              </label>
              <p className="text-xs text-brand-500">
                One story box is enough — guided questions and free narrative live together. The app
                parses PMH/CMH, meds, occupation, and sex cues in the background for Plan, Journal,
                and Jeffery (no separate sex/occupation fields).
              </p>
              {(pastMedicalHistory || currentMedicalHistory) && (
                <div className="rounded-xl border border-brand-100 bg-brand-50/50 px-3 py-2.5 text-xs text-brand-800 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-100">
                  <p className="font-semibold text-brand-900 dark:text-brand-50">
                    Detected from your story
                  </p>
                  {pastMedicalHistory ? (
                    <p className="mt-1">Past medical history: {pastMedicalHistory}</p>
                  ) : null}
                  {currentMedicalHistory ? (
                    <p className="mt-1">Current medical history: {currentMedicalHistory}</p>
                  ) : null}
                </div>
              )}

              {/* Lightweight coach reflection on the free-text story */}
              <div className="rounded-xl border border-brand-200 bg-white p-3 dark:border-brand-700 dark:bg-brand-950/50 sm:p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-500">
                  Coach reflection (optional)
                </p>
                <p className="mt-1 text-xs leading-relaxed text-brand-600 dark:text-brand-300">
                  Prefer typing everything above? You still can. Use this for a medically specific
                  read-back of your free text, or to answer one more open-ended question.
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-800 hover:border-brand-400 dark:border-brand-700 dark:bg-brand-900 dark:text-brand-100"
                    disabled={!paragraph.trim()}
                    onClick={() =>
                      askCoach(
                        paragraph.trim().length > 400
                          ? paragraph.trim().slice(-400)
                          : paragraph.trim() || "What’s bothering me is in my story above."
                      )
                    }
                  >
                    Reflect on my story
                  </button>
                  {conversationPrompts.slice(0, 4).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      title={p.question}
                      className="rounded-full border border-brand-200 bg-white px-2.5 py-1 text-[11px] font-medium text-brand-800 hover:border-brand-400 hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-950 dark:text-brand-100"
                      onClick={() => {
                        insertQuestionIntoStory(p);
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    className="input flex-1"
                    value={coachQuestion}
                    onChange={(e) => setCoachQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        askCoach();
                      }
                    }}
                    placeholder="Ask the coach anything—or paste a free-text answer for a clinical reflection…"
                    aria-label="Continue the assessment conversation"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    className="btn-primary shrink-0 px-3"
                    onClick={() => askCoach()}
                    disabled={!coachQuestion.trim()}
                    aria-label="Send reply"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
                {coachLog.length > 0 ? (
                  <ul className="mt-3 max-h-64 space-y-3 overflow-y-auto rounded-xl border border-brand-100 bg-brand-50/50 p-3 dark:border-brand-800 dark:bg-brand-900/30">
                    {coachLog.map((ex) => (
                      <li key={ex.id} className="space-y-2 text-sm">
                        <div className="ml-6 rounded-2xl bg-brand-600 px-3 py-2 text-white">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-brand-100">
                            You
                          </p>
                          <p className="mt-0.5 leading-relaxed">{ex.question}</p>
                        </div>
                        <div className="mr-4 rounded-2xl border border-brand-100 bg-white px-3 py-2 dark:border-brand-800 dark:bg-brand-950">
                          <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-brand-500">
                            <MessageCircleQuestion className="h-3 w-3" />
                            Coach
                          </p>
                          <p className="mt-1 whitespace-pre-wrap leading-relaxed text-brand-900 dark:text-brand-50">
                            {ex.answer}
                          </p>
                          {ex.followUp ? (
                            <button
                              type="button"
                              className="mt-2 text-left text-xs font-semibold text-brand-700 underline-offset-2 hover:underline"
                              onClick={() => {
                                const match = autoAppearingQuestions.find(
                                  (p) => p.question === ex.followUp
                                );
                                if (match) insertQuestionIntoStory(match);
                                else {
                                  setParagraph((prev) => {
                                    const line = `\n\n▸ ${ex.followUp}\n`;
                                    if (prev.includes(ex.followUp || "")) return prev;
                                    return `${prev.trimEnd()}${line}`;
                                  });
                                  requestAnimationFrame(() => {
                                    const el = storyTextareaRef.current;
                                    if (!el) return;
                                    el.focus();
                                    const len = el.value.length;
                                    el.setSelectionRange(len, len);
                                  });
                                }
                              }}
                            >
                              Put follow-up in free text: {ex.followUp.slice(0, 72)}
                              {ex.followUp.length > 72 ? "…" : ""}
                            </button>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p className="text-[11px] leading-relaxed text-brand-400">
                  Educational only—not a diagnosis.
                </p>
              </div>
              </div>
            </SubSection>
          </section>

          {/* Optional add-ons — collapsed by default */}
          <OptionalSection
            title="Activity, sport & surgery"
            hint="Optional return-to-sport or post-op context"
            badge={
              sportSurgery.sportIds.length || sportSurgery.surgeryId ? (
                <span className="text-xs text-brand-500">
                  {[
                    sportSurgery.sportIds.length
                      ? `${sportSurgery.sportIds.length} sport`
                      : null,
                    sportSurgery.surgeryId ? "surgery" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              ) : null
            }
          >
            <SportSurgeryPickers
              value={sportSurgery}
              onChange={setSportSurgery}
              concernParagraph={debouncedParagraph}
              compact
            />
          </OptionalSection>

          <OptionalSection
            title="Vitals & labs"
            hint="Optional readiness signals"
          >
            <VitalsLabsPanel sex={sex || null} compact />
          </OptionalSection>

          <OptionalSection
            title="Medications"
            hint="Search library or add custom doses"
            badge={
              medications.length > 0 ? (
                <span className="text-xs text-brand-500">{medications.length}</span>
              ) : null
            }
          >
            <MedicationPicker
              value={medications}
              onChange={setMedications}
              concernParagraph={debouncedParagraph}
              compact
              onInsertParagraph={(snippet) => {
                setParagraph((p) => {
                  if (p.includes(snippet.trim())) return p;
                  return p.trim() ? `${p.trim()}\n\n${snippet}` : snippet;
                });
              }}
            />
          </OptionalSection>

          {paragraph.trim().length >= 12 ? (
            <OptionalSection
              title="What we noticed"
              hint="Review detections from your story"
              badge={
                insightCount > 0 ? (
                  <span className="text-xs text-brand-500">
                    {descriptorIds.length + paragraphConditions.length}
                  </span>
                ) : null
              }
            >
              <div className="space-y-4">
                {paragraphDescDetails.length > 0 && (
                  <div>
                    <p className="section-label">Pain descriptors</p>
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
                    <p className="section-label">Conditions</p>
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
                    <p className="section-label">Language cues</p>
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
            </OptionalSection>
          ) : null}

          <OptionalSection title="Pain descriptor library" hint="Browse the full list">
            <PainDescriptorPicker
              value={descriptorIds}
              onChange={(ids) => {
                setAutoApplyDesc(false);
                setDescriptorIds(ids);
              }}
            />
          </OptionalSection>

          <FooterNav onNext={() => setStep(2)} />
        </div>
      )}

      {/* ─── Step 2: Body & pain ─── */}
      {step === 2 && (
        <div className="stack">
          <section className="card space-y-5 p-5 sm:p-6">
          <SubSection
            title="Body regions"
            hint="Tap a category, then select areas."
            action={
              areas.length > 0 ? (
                <span className="text-xs text-brand-500">{areas.length} selected</span>
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
            title="Goals"
            hint="Auto-fills from your story—edit anytime."
            action={
              <label className="flex items-center gap-1.5 text-[11px] font-medium text-brand-600">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 accent-brand-600"
                  checked={goalsAutoFill}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setGoalsAutoFill(on);
                    if (on) {
                      goalsUserEditedRef.current = false;
                      const next = buildAutoGoalsFreeText({
                        statedGoals: storyIntel.goals,
                        assumedGoals: storyIntel.assumedGoals,
                        areas,
                        functionalLimits: storyIntel.functionalLimits,
                      });
                      setGoalsText(next);
                      setGoals(parseGoalsFreeText(next));
                    }
                  }}
                />
                Auto
              </label>
            }
          >
            <input
              type="text"
              className="input w-full text-base"
              value={goalsText}
              onChange={(e) => {
                goalsUserEditedRef.current = true;
                const v = e.target.value;
                setGoalsText(v);
                setGoals(parseGoalsFreeText(v));
              }}
              placeholder="e.g. Walk 20 minutes without flare"
              aria-label="Goals free text"
              autoComplete="off"
              spellCheck
            />
          </SubSection>
          </section>

          <OptionalSection
            title="Clinical symptoms"
            hint="Optional dosing cues"
            badge={
              clinicalSymptomIds.length ? (
                <span className="text-xs text-brand-500">{clinicalSymptomIds.length}</span>
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
          </OptionalSection>

          <OptionalSection
            title="Daily activities (ADLs)"
            hint="Optional function ratings"
            badge={
              adlEntries.length ? (
                <span className="text-xs text-brand-500">{adlEntries.length}</span>
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
          </OptionalSection>

          <FooterNav onBack={() => setStep(1)} onNext={() => setStep(3)} />
        </div>
      )}

      {/* ─── Step 3: Safety ─── */}
      {step === 3 && (
        <div className="stack">
          <section className="card space-y-5 p-5 sm:p-6">
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
          </section>

          <OptionalSection title="Protocol notes" hint="Optional free text from your care team">
            <textarea
              className="input min-h-[72px]"
              value={protocolNotes}
              onChange={(e) => setProtocolNotes(e.target.value)}
              placeholder="e.g. NWB right leg 4 weeks; 10 lb lift limit…"
              autoComplete="off"
            />
          </OptionalSection>

          <OptionalSection
            title="Medications"
            hint="Same list as Story step"
            badge={
              medications.length > 0 ? (
                <span className="text-xs text-brand-500">{medications.length}</span>
              ) : null
            }
          >
            <MedicationPicker
              value={medications}
              onChange={setMedications}
              concernParagraph={debouncedParagraph}
              onInsertParagraph={(snippet) => {
                setParagraph((p) => {
                  if (p.includes(snippet.trim())) return p;
                  return p.trim() ? `${p.trim()}\n\n${snippet}` : snippet;
                });
              }}
            />
          </OptionalSection>

          <FooterNav onBack={() => setStep(2)} onNext={() => setStep(4)} />
        </div>
      )}

      {/* ─── Step 4: Preferences ─── */}
      {step === 4 && (
        <div className="stack">
          <section className="card space-y-5 p-5 sm:p-6">
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

          <FooterNav
            onBack={() => setStep(3)}
            showGenerate
            onGenerate={createPlan}
            saving={saving}
            canGenerate={canGenerate}
          />
          </section>
        </div>
      )}

      {/* ─── Step 5: Plan ─── */}
      {step === 5 && (
        <div className="stack">
          {!generated ? (
            <section className="card space-y-5 p-6 text-center sm:p-8">
              <h2 className="text-lg font-semibold text-brand-950 dark:text-brand-50">
                Ready to generate
              </h2>
              <p className="text-sm text-brand-600 dark:text-brand-300">
                Review earlier steps if needed, then build your plan.
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
                      {preferredName
                        ? ` · for ${displayPreferredName(preferredName)}`
                        : ""}
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

                {/* Intelligent recovery dynamics (mechanism + stage + efficiency) */}
                {generated.generatedFrom?.rehabDynamics && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                      Intelligent recovery path
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {generated.generatedFrom.rehabDynamics.primaryMechanism && (
                        <span className="rounded-full bg-emerald-700 px-2.5 py-0.5 font-semibold capitalize text-white">
                          {String(
                            generated.generatedFrom.rehabDynamics.primaryMechanism
                          ).replace(/-/g, " ")}
                        </span>
                      )}
                      <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 font-semibold capitalize text-white">
                        {String(generated.generatedFrom.rehabDynamics.tissueStage).replace(
                          /-/g,
                          " "
                        )}
                      </span>
                      <span className="rounded-full border border-emerald-300 bg-white px-2.5 py-0.5 font-medium capitalize text-emerald-900 dark:border-emerald-700 dark:bg-brand-950 dark:text-emerald-100">
                        {String(generated.generatedFrom.rehabDynamics.phase).replace(/-/g, " ")}
                      </span>
                      <span className="rounded-full border border-brand-200 bg-white/80 px-2.5 py-0.5 capitalize text-brand-700 dark:border-brand-700 dark:bg-brand-950 dark:text-brand-200">
                        Outlook:{" "}
                        {String(generated.generatedFrom.rehabDynamics.prognosisBand).replace(
                          /-/g,
                          " "
                        )}
                      </span>
                    </div>
                    {(generated.generatedFrom.rehabDynamics.primaryAreas?.length ||
                      generated.generatedFrom.rehabDynamics.chainAreas?.length) && (
                      <p className="mt-2 text-xs text-brand-600 dark:text-brand-300">
                        {generated.generatedFrom.rehabDynamics.primaryAreas?.length
                          ? `Focus: ${generated.generatedFrom.rehabDynamics.primaryAreas
                              .map((a) => String(a).replace(/-/g, " "))
                              .join(", ")}`
                          : ""}
                        {generated.generatedFrom.rehabDynamics.primaryAreas?.length &&
                        generated.generatedFrom.rehabDynamics.chainAreas?.length
                          ? " · "
                          : ""}
                        {generated.generatedFrom.rehabDynamics.chainAreas?.length
                          ? `Chain: ${generated.generatedFrom.rehabDynamics.chainAreas
                              .map((a) => String(a).replace(/-/g, " "))
                              .join(", ")}`
                          : ""}
                      </p>
                    )}
                    {(generated.generatedFrom.rehabDynamics.weeksSince != null ||
                      generated.generatedFrom.rehabDynamics.postOpWeeks != null) && (
                      <p className="mt-1 text-xs text-brand-600 dark:text-brand-300">
                        {generated.generatedFrom.rehabDynamics.weeksSince != null
                          ? `Onset ~${generated.generatedFrom.rehabDynamics.weeksSince} weeks`
                          : ""}
                        {generated.generatedFrom.rehabDynamics.weeksSince != null &&
                        generated.generatedFrom.rehabDynamics.postOpWeeks != null
                          ? " · "
                          : ""}
                        {generated.generatedFrom.rehabDynamics.postOpWeeks != null
                          ? `Post-op week ~${generated.generatedFrom.rehabDynamics.postOpWeeks}`
                          : ""}
                      </p>
                    )}
                    <ul className="mt-3 space-y-1.5 text-xs text-brand-800 dark:text-brand-100">
                      {(
                        generated.generatedFrom.rehabDynamics.efficiencyLines ||
                        generated.generatedFrom.rehabDynamics.summaryLines ||
                        []
                      )
                        .slice(0, 4)
                        .map((line) => (
                          <li key={line} className="flex gap-2">
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-500" />
                            <span>{line}</span>
                          </li>
                        ))}
                      {(generated.generatedFrom.rehabDynamics.evidenceLines || [])
                        .slice(0, 3)
                        .map((line) => (
                          <li key={line} className="flex gap-2 text-brand-600 dark:text-brand-300">
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-400" />
                            <span>{line}</span>
                          </li>
                        ))}
                    </ul>
                    <p className="mt-2 text-[11px] text-brand-500">
                      Smarter program generation: mechanism + tissue stage + kinetic chain +
                      minimal-effective-dose selection for efficient recovery. Educational only —
                      your clinician or surgeon protocol always overrides.
                    </p>
                  </div>
                )}

                {/* Prescribed written plan of care (PT-style) */}
                <div className="rounded-xl border border-brand-300 bg-brand-50/60 p-4 dark:border-brand-600 dark:bg-brand-950/50">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
                    <Stethoscope className="h-3.5 w-3.5" />
                    Prescribed plan of care
                    {prescribed?.phase ? ` · ${prescribed.phase.replace(/-/g, " ")}` : ""}
                  </p>
                  <div className="max-h-80 space-y-3 overflow-y-auto text-sm leading-relaxed text-brand-900 dark:text-brand-100">
                    {(prescribed?.sections || []).map((sec) => (
                      <div key={sec.heading}>
                        <p className="font-semibold text-brand-950 dark:text-brand-50">
                          {sec.heading}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-brand-800 dark:text-brand-100">
                          {sec.body}
                        </p>
                      </div>
                    ))}
                    {!prescribed?.sections?.length &&
                      (writtenApproach || generated.generatedFrom?.writtenApproach || "")
                        .split(/\n\n+/)
                        .map((block, i) => (
                          <p key={i} className="whitespace-pre-wrap">
                            {block}
                          </p>
                        ))}
                  </div>

                  {prescribed?.outcomeMeasures?.length ? (
                    <div className="mt-3 rounded-lg border border-brand-100 bg-white/70 p-3 dark:border-brand-800 dark:bg-brand-950/40">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-500">
                        Functional outcome measures (track for faster recovery)
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {prescribed.outcomeMeasures.map((o) => (
                          <li key={o.label} className="text-xs text-brand-800 dark:text-brand-100">
                            <span className="font-semibold">{o.label}</span>
                            <span className="text-brand-600">
                              {" "}
                              · {o.timeframe} · {o.baselineHint}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-xs text-brand-700">
                        Pain goal: ~{prescribed.painGoals.currentOverall}/10 → ≤
                        {prescribed.painGoals.targetOverall}/10 while improving task ease.{" "}
                        {prescribed.painGoals.rule}
                      </p>
                      <p className="mt-1 text-xs text-brand-600">
                        Frequency: {prescribed.frequency} · {prescribed.durationWeeks}
                      </p>
                    </div>
                  ) : null}

                  <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-brand-200 bg-white p-3 dark:border-brand-700 dark:bg-brand-950">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-5 w-5 accent-brand-600"
                      checked={planAgreed}
                      onChange={(e) => agreeToPlan(e.target.checked)}
                    />
                    <span className="text-sm leading-relaxed text-brand-900 dark:text-brand-50">
                      <span className="font-semibold">I agree with this prescribed plan.</span> I
                      understand the goals, dosing, and safety rules. This is educational support—not
                      a medical diagnosis—and I can request changes below.
                      {planAgreed && prescribed?.agreedAt ? (
                        <span className="mt-1 block text-xs text-emerald-700">
                          Agreed {new Date(prescribed.agreedAt).toLocaleString()}
                        </span>
                      ) : null}
                    </span>
                  </label>
                </div>

                {/* User adaptation free-text → reconfigure plan */}
                <div className="rounded-xl border border-brand-200 p-4 dark:border-brand-700">
                  <p className="text-sm font-semibold text-brand-950">
                    Request changes (free text)
                  </p>
                  <p className="mt-1 text-xs text-brand-600">
                    Examples: “make it easier, my low back flared,” “shorter sessions,” “more hip
                    strength,” “too hard,” “focus more on neck.” The app reconfigures the routine
                    using PT-style rules (pain, irritability, injury pattern).
                  </p>
                  <textarea
                    className="input mt-2 min-h-[88px]"
                    value={adaptText}
                    onChange={(e) => setAdaptText(e.target.value)}
                    placeholder="Describe how you want the plan adapted…"
                    aria-label="Adapt prescribed plan"
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={adapting || !adaptText.trim()}
                      onClick={() => void adaptPlan()}
                    >
                      {adapting ? "Reconfiguring…" : "Reconfigure plan"}
                    </button>
                    <button
                      type="button"
                      className="btn-ghost text-sm"
                      onClick={() => {
                        setGenerated(null);
                        setPrescribed(null);
                        setPlanAgreed(false);
                        createPlan();
                      }}
                    >
                      Regenerate from Assessment
                    </button>
                  </div>
                  {adaptMsg ? (
                    <p className="mt-2 text-sm text-brand-700" role="status">
                      {adaptMsg} Agreement reset—please review and re-check the box if you accept the
                      updated plan.
                    </p>
                  ) : null}
                </div>

                <details className="rounded-xl border border-brand-100 dark:border-brand-800">
                  <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-brand-900">
                    Why this plan was dosed this way (clinical reasoning)
                  </summary>
                  <div className="space-y-2 border-t border-brand-100 px-3 py-2 text-xs text-brand-700 dark:border-brand-800">
                    {generated.selfAdjustHistory.slice(-3).map((h, i) => (
                      <p key={`${h.at}-${i}`}>
                        <span className="font-semibold">{h.action}</span>: {h.details}
                      </p>
                    ))}
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
                    className={`btn-primary ${!planAgreed ? "pointer-events-none opacity-50" : ""}`}
                    aria-disabled={!planAgreed}
                    title={
                      planAgreed
                        ? "Start your prescribed session"
                        : "Agree to the prescribed plan first"
                    }
                    onClick={(e) => {
                      if (!planAgreed) e.preventDefault();
                    }}
                  >
                    Start prescribed session
                  </Link>
                  <Link href="/builder" className="btn-secondary">
                    Customize in builder
                  </Link>
                  <Link href="/modalities" className="btn-ghost text-sm">
                    Modalities
                  </Link>
                  <Link href="/jeffery" className="btn-ghost text-sm">
                    Jeffery
                  </Link>
                </div>
                {!planAgreed ? (
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    Check “I agree with this prescribed plan” above before starting a session—or
                    request changes to reconfigure first.
                  </p>
                ) : null}
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
