"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PainScale } from "@/components/PainScale";
import { PainDescriptorPicker } from "@/components/PainDescriptorPicker";
import { ClinicalSymptomPicker } from "@/components/ClinicalSymptomPicker";
import { AdlPicker } from "@/components/AdlPicker";
import { ModalityMiniList } from "@/components/ModalitySuggestions";
import type {
  BodyPart,
  JournalEntry,
  ModalityRecommendation,
  Routine,
} from "@/lib/types";
import { BODY_PART_LABELS } from "@/data/stretch-library";
import { getDescriptorById } from "@/data/pain-descriptors";
import type { UserAdlEntry } from "@/data/adls";
import { recommendModalities } from "@/lib/modality-engine";
import { loadLocalPainProfile, saveLocalPainProfile } from "@/lib/pain-profile";
import {
  JOURNAL_IMPORTANT_FIELDS,
  JOURNAL_STARTERS,
  analyzeJournalEntry,
  applyJournalToRoutine,
  buildJournalJefferyReply,
  painTrendLabel,
} from "@/lib/journal-engine";
import {
  JOURNAL_SAFETY_NOTE,
  analyzeJournalIntelligence,
  appendJournalFlowQuestion,
  countCompletedJournalTurns,
  currentOpenJournalQuestion,
  decideJournalFlow,
  journalEndsWithOpenQuestion,
  journalQuestionBankChips,
  journalAdaptiveAsPrompts,
} from "@/lib/journal-intelligence";
import { useDebouncedValue } from "@/lib/hooks";
import type { ConversationPrompt } from "@/lib/assessment-story-conversation";
import {
  ConversationSettleActions,
  ConversationSpeedControl,
} from "@/components/ConversationSpeedControl";
import {
  useAnswerSettleCountdown,
  useConversationSpeed,
} from "@/lib/use-conversation-speed";
import { ClinicalCorrelationCard } from "@/components/ClinicalCorrelationCard";
import {
  BookOpen,
  Bot,
  Check,
  ChevronLeft,
  ChevronRight,
  MessageCircleQuestion,
  Share2,
  Sparkles,
} from "lucide-react";
import { v4 as uuid } from "uuid";

const AREA_GROUPS: Array<{ label: string; parts: BodyPart[] }> = [
  { label: "Spine & trunk", parts: ["neck", "upper-back", "thoracic", "lower-back", "pelvis", "core"] },
  { label: "Upper body", parts: ["shoulders", "scapular", "chest", "elbow", "forearm", "wrists", "hand"] },
  { label: "Lower body", parts: ["hips", "glutes", "hamstrings", "quadriceps", "knee", "calves", "ankles", "foot"] },
];

const STEPS = [
  { id: 1, title: "Write" },
  { id: 2, title: "Scores" },
  { id: 3, title: "Reflect" },
  { id: 4, title: "Review & save" },
] as const;

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mood, setMood] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [pain, setPain] = useState(3);
  const [energy, setEnergy] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [sleepQuality, setSleepQuality] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [parts, setParts] = useState<BodyPart[]>([]);
  const [flexibilityNote, setFlexibilityNote] = useState("");
  const [didWell, setDidWell] = useState("");
  const [improveNext, setImproveNext] = useState("");
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [share, setShare] = useState(false);
  const [adjustPlan, setAdjustPlan] = useState(true);
  const [descriptorIds, setDescriptorIds] = useState<string[]>([]);
  const [clinicalSymptomIds, setClinicalSymptomIds] = useState<string[]>([]);
  const [adlEntries, setAdlEntries] = useState<UserAdlEntry[]>([]);
  const [suggestedMods, setSuggestedMods] = useState<ModalityRecommendation[]>([]);
  const [promptId, setPromptId] = useState<string | undefined>();
  const [lastSaved, setLastSaved] = useState<JournalEntry | null>(null);
  const [jefferyPreview, setJefferyPreview] = useState("");
  const [planNote, setPlanNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [guideJournalQa, setGuideJournalQa] = useState(true);
  const [continuousFlow, setContinuousFlow] = useState(true);
  const [preferredName, setPreferredName] = useState("");
  const journalTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const journalUserEditedRef = useRef(false);
  const flowLockRef = useRef(false);
  const lastFlowAppendRef = useRef("");
  /** Short detect pause; full edit window uses conversation speed (default 5s). */
  const flowBody = useDebouncedValue(body, 300);
  const { delayMs: conversationDelayMs } = useConversationSpeed();

  useEffect(() => {
    const scored = recommendModalities({
      painScore: pain,
      descriptorIds,
      experienceText: `${title} ${body} ${flexibilityNote} ${didWell} ${improveNext}`,
      timing: pain >= 6 ? "acute-flare" : "between-visits",
      limit: 4,
    });
    setSuggestedMods(
      scored.map((s) => ({
        modalityId: s.modality.id,
        name: s.modality.name,
        category: s.modality.category,
        setting: s.modality.setting,
        timing: s.timing,
        score: Math.round(s.score * 10) / 10,
        confidence: s.confidence,
        reasons: s.reasons,
        plainLanguage: s.modality.plainLanguage,
        howTo: s.modality.howTo,
        evidenceNotes: s.modality.evidenceNotes,
        durationMinutes: s.modality.durationMinutes,
        frequency: s.modality.frequency,
        precautions: s.modality.precautions,
        contraindications: s.modality.contraindications,
        outcomeLinks: s.modality.outcomeLinks,
        homeSafe: s.modality.setting === "home" || s.modality.setting === "either",
      }))
    );
  }, [pain, descriptorIds, title, body, flexibilityNote, didWell, improveNext]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("preferredName");
      if (stored?.trim()) setPreferredName(stored.trim());
    } catch {
      /* ignore */
    }
    let local: JournalEntry[] = [];
    try {
      const raw = localStorage.getItem("journal-entries");
      if (raw) local = JSON.parse(raw);
    } catch {
      local = [];
    }
    setEntries(local);
    const profile = loadLocalPainProfile();
    if (profile?.descriptorIds?.length) setDescriptorIds(profile.descriptorIds);
    if (profile?.areas?.length) setParts(profile.areas.slice(0, 6));
    if (typeof profile?.overallPain === "number") setPain(profile.overallPain);
    if (profile?.clinicalSymptomIds?.length) setClinicalSymptomIds(profile.clinicalSymptomIds);
    if (profile?.adlEntries?.length) setAdlEntries(profile.adlEntries);

    fetch("/api/journal")
      .then((r) => r.json())
      .then((d) => {
        const server: JournalEntry[] = Array.isArray(d.entries) ? d.entries : [];
        const map = new Map<string, JournalEntry>();
        for (const e of local) map.set(e.id, e);
        for (const e of server) {
          const prev = map.get(e.id);
          if (
            !prev ||
            new Date(e.updatedAt || e.createdAt) >= new Date(prev.updatedAt || prev.createdAt)
          ) {
            map.set(e.id, e);
          }
        }
        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setEntries(merged);
        localStorage.setItem("journal-entries", JSON.stringify(merged));
      })
      .catch(() => {});
  }, []);

  const analysis = useMemo(
    () =>
      analyzeJournalEntry({
        title: title || "Today",
        body,
        painOverall: pain,
        mood,
        energy,
        sleepQuality,
        didWell,
        improveNext,
        flexibilityNote,
        sessionCompleted,
        previousEntries: entries,
        clinicalSymptomIds,
        adlEntries,
      }),
    [
      title,
      body,
      pain,
      mood,
      energy,
      sleepQuality,
      didWell,
      improveNext,
      flexibilityNote,
      sessionCompleted,
      entries,
      clinicalSymptomIds,
      adlEntries,
    ]
  );

  const journalIntel = useMemo(
    () =>
      analyzeJournalIntelligence(body, {
        preferredName: preferredName || undefined,
        title,
        painOverall: pain,
        mood,
        energy,
        sleepQuality,
        areas: parts,
      }),
    [body, preferredName, title, pain, mood, energy, sleepQuality, parts]
  );

  const autoAppearingQuestions = useMemo(
    () => journalAdaptiveAsPrompts(journalIntel),
    [journalIntel]
  );

  const flowCtx = useMemo(
    () => ({
      body: flowBody,
      preferredName: preferredName || undefined,
      title,
      painOverall: pain,
      mood,
      energy,
      sleepQuality,
      areas: parts,
    }),
    [flowBody, preferredName, title, pain, mood, energy, sleepQuality, parts]
  );

  const flowStatus = useMemo(() => decideJournalFlow(flowCtx), [flowCtx]);
  const openJournalQuestion = useMemo(() => currentOpenJournalQuestion(body), [body]);
  const completedTurns = useMemo(() => countCompletedJournalTurns(body), [body]);
  const therapeuticChips = useMemo(() => journalQuestionBankChips(14), []);
  const nextGuidedQuestion = autoAppearingQuestions[0] || null;

  function focusJournalEnd() {
    requestAnimationFrame(() => {
      const el = journalTextareaRef.current;
      if (!el) return;
      el.focus();
      const len = el.value.length;
      el.setSelectionRange(len, len);
      el.scrollTop = el.scrollHeight;
    });
  }

  function insertQuestionIntoJournal(prompt: ConversationPrompt, bridge?: string) {
    setBody((prev) => appendJournalFlowQuestion(prev, prompt, bridge));
    lastFlowAppendRef.current = prompt.id;
    journalUserEditedRef.current = true;
    focusJournalEnd();
  }

  const pendingJournalAdvance = useMemo(() => {
    if (!guideJournalQa || !continuousFlow || step !== 1) return null;
    if (flowStatus.type !== "advance") return null;
    if (!journalUserEditedRef.current && !body.includes("▸")) return null;
    if (
      lastFlowAppendRef.current === flowStatus.prompt.id &&
      journalEndsWithOpenQuestion(body)
    ) {
      return null;
    }
    return flowStatus;
  }, [guideJournalQa, continuousFlow, step, flowStatus, body]);

  const journalSettle = useAnswerSettleCountdown({
    armed: Boolean(pendingJournalAdvance),
    resetKey: body,
    delayMs: conversationDelayMs,
  });

  function commitJournalAdvanceNow() {
    if (!pendingJournalAdvance || pendingJournalAdvance.type !== "advance") {
      journalSettle.sendNow();
      return;
    }
    if (flowLockRef.current) return;
    const action = pendingJournalAdvance;
    flowLockRef.current = true;
    setBody((prev) => {
      if (journalEndsWithOpenQuestion(prev)) return prev;
      return appendJournalFlowQuestion(prev, action.prompt, action.bridge);
    });
    lastFlowAppendRef.current = action.prompt.id;
    journalSettle.cancel();
    focusJournalEnd();
    window.setTimeout(() => {
      flowLockRef.current = false;
    }, 400);
  }

  function editJournalAnswer() {
    journalSettle.edit();
    focusJournalEnd();
  }

  // Seed opening question promptly
  useEffect(() => {
    if (!guideJournalQa || !continuousFlow || step !== 1) return;
    if (flowLockRef.current) return;
    if (flowStatus.type !== "seed") return;
    if (body.trim()) return;
    flowLockRef.current = true;
    setBody((prev) => {
      if (prev.trim()) return prev;
      if (flowStatus.type !== "seed") return prev;
      return appendJournalFlowQuestion("", flowStatus.prompt);
    });
    if (flowStatus.type === "seed") {
      lastFlowAppendRef.current = flowStatus.prompt.id;
    }
    focusJournalEnd();
    window.setTimeout(() => {
      flowLockRef.current = false;
    }, 400);
  }, [guideJournalQa, continuousFlow, flowStatus, body, step]);

  /** After edit window: record answer and append next clinical question */
  useEffect(() => {
    if (!journalSettle.settled || !pendingJournalAdvance) return;
    if (flowLockRef.current) return;
    if (pendingJournalAdvance.type !== "advance") return;
    const action = pendingJournalAdvance;
    flowLockRef.current = true;
    setBody((prev) => {
      if (journalEndsWithOpenQuestion(prev)) return prev;
      return appendJournalFlowQuestion(prev, action.prompt, action.bridge);
    });
    lastFlowAppendRef.current = action.prompt.id;
    focusJournalEnd();
    window.setTimeout(() => {
      flowLockRef.current = false;
    }, 400);
  }, [journalSettle.settled, pendingJournalAdvance]);

  useEffect(() => {
    if (step < 4 || (!body.trim() && !title.trim())) {
      setJefferyPreview("");
      return;
    }
    let activeName: string | undefined;
    try {
      const active = localStorage.getItem("active-routine");
      if (active) activeName = (JSON.parse(active) as Routine).name;
    } catch {
      /* ignore */
    }
    setJefferyPreview(
      buildJournalJefferyReply({
        entry: {
          title: title || "Today",
          body,
          painOverall: pain,
          mood,
          didWell,
          improveNext,
          energy,
          sleepQuality,
        },
        analysis,
        areas: parts,
        activeRoutineName: activeName,
        recentPainTrend: painTrendLabel(entries),
      })
    );
  }, [step, title, body, pain, mood, didWell, improveNext, energy, sleepQuality, analysis, parts, entries]);

  function persist(next: JournalEntry[]) {
    setEntries(next);
    localStorage.setItem("journal-entries", JSON.stringify(next));
  }

  function applyStarter(id: string) {
    const p = JOURNAL_STARTERS.find((x) => x.id === id);
    if (!p) return;
    setPromptId(id);
    if (!title.trim()) setTitle(p.label);
    if (!body.trim()) setBody(p.text);
    else if (!body.includes(p.text.slice(0, 20))) setBody((b) => `${b.trim()}\n\n${p.text}`);
  }

  async function saveEntry() {
    if (!body.trim() && !title.trim()) return;
    setSaving(true);
    const finalTitle = title.trim() || `Journal · ${new Date().toLocaleDateString()}`;
    const finalBody = body.trim() || "(No written reflection—scores only.)";

    const entry: JournalEntry = {
      id: uuid(),
      userId: "local",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      title: finalTitle,
      body: finalBody,
      mood,
      painOverall: pain,
      energy,
      sleepQuality,
      bodyParts: parts,
      flexibilityNote: flexibilityNote.trim() || undefined,
      didWell: didWell.trim() || undefined,
      improveNext: improveNext.trim() || undefined,
      sessionCompleted,
      sharedWithProvider: share,
      tags: [
        ...analysis.tags,
        ...(share ? ["shared"] : []),
        ...(adjustPlan ? ["plan-linked"] : []),
      ],
      painDescriptorIds: descriptorIds,
      clinicalSymptomIds,
      adlEntries,
      modalityIds: suggestedMods.map((m) => m.modalityId).slice(0, 8),
      progressionSignal: analysis.signal,
      jefferySummary: analysis.jefferySummary,
      jefferyQuestion: analysis.jefferyQuestion,
      winsSuggested: analysis.wins,
      improvementsSuggested: analysis.improvements,
      promptId,
    };

    let planAdjustmentNote: string | undefined;
    if (adjustPlan) {
      try {
        const raw = localStorage.getItem("active-routine");
        if (raw) {
          const routine = JSON.parse(raw) as Routine;
          const result = applyJournalToRoutine(routine, analysis, finalTitle);
          if (result) {
            localStorage.setItem("active-routine", JSON.stringify(result.routine));
            localStorage.setItem(`routine:${result.routine.id}`, JSON.stringify(result.routine));
            planAdjustmentNote = result.note;
            entry.planAdjusted = true;
            entry.planAdjustmentNote = result.note;
            await fetch("/api/routines", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(result.routine),
            }).catch(() => {});
          }
        } else {
          planAdjustmentNote = "No active routine yet—generate one from Assessment to auto-adjust.";
        }
      } catch {
        planAdjustmentNote = "Could not update local plan (still saved journal).";
      }
    }

    const next = [entry, ...entries];
    persist(next);
    setLastSaved(entry);
    setPlanNote(planAdjustmentNote || null);

    saveLocalPainProfile({
      userId: "local",
      descriptorIds,
      freeText: finalBody,
      overallPain: pain,
      areas: parts.length ? parts : loadLocalPainProfile()?.areas || [],
      source: "journal",
      clinicalSymptomIds,
      adlEntries,
    });

    // Seed Jeffery thread snippet for correlation
    try {
      const threadKey = "jeffery-journal-bridge";
      localStorage.setItem(
        threadKey,
        JSON.stringify({
          at: entry.createdAt,
          entryId: entry.id,
          summary: analysis.jefferySummary,
          question: analysis.jefferyQuestion,
          signal: analysis.signal,
          pain,
        })
      );
    } catch {
      /* ignore */
    }

    try {
      await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
      await fetch("/api/pain-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descriptorIds,
          freeText: finalBody,
          overallPain: pain,
          areas: parts,
          source: "journal",
        }),
      });
    } catch {
      /* offline */
    }

    setTitle("");
    setBody("");
    setFlexibilityNote("");
    setDidWell("");
    setImproveNext("");
    setShare(false);
    setSessionCompleted(false);
    setPromptId(undefined);
    setStep(1);
    setSaving(false);
  }

  function chipClass(on: boolean) {
    return on
      ? "border-brand-600 bg-brand-600 text-white"
      : "border-brand-200 bg-white text-brand-800 dark:border-brand-700 dark:bg-brand-950";
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 pb-10 sm:max-w-2xl">
      <header className="text-center sm:text-left">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
          Daily reflection
        </p>
        <h1 className="mt-1 inline-flex items-center gap-2 text-xl font-bold text-brand-950 sm:text-2xl">
          <BookOpen className="h-6 w-6 text-brand-600" />
          Journal
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-brand-600">
          Write freely in a continuous counselor-style interview. Jeffery listens with your full app
          context and can ease or progress your plan from today&apos;s pattern.
        </p>
      </header>

      <ClinicalCorrelationCard section="journal" variant="compact" />

      {/* Step indicator */}
      <nav aria-label="Journal steps">
        <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-brand-100 dark:bg-brand-900">
          <div
            className="h-full rounded-full bg-brand-600 transition-all"
            style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
          />
        </div>
        <ol className="grid grid-cols-4 gap-1">
          {STEPS.map((s) => {
            const active = step === s.id;
            const done = step > s.id;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setStep(s.id)}
                  className={`flex w-full flex-col items-center gap-1 rounded-lg py-1.5 text-xs font-medium ${
                    active ? "text-brand-900" : done ? "text-brand-700" : "text-brand-400"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${
                      active
                        ? "bg-brand-600 text-white"
                        : done
                          ? "bg-brand-200 text-brand-900"
                          : "bg-brand-50 text-brand-500 ring-1 ring-brand-100"
                    }`}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : s.id}
                  </span>
                  {s.title}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Step 1: Write — continuous therapeutic interview */}
      {step === 1 && (
        <section className="card space-y-4 p-5 sm:p-6">
          <div>
            <h2 className="text-base font-semibold text-brand-950">Today&apos;s page</h2>
            <p className="mt-0.5 text-xs text-brand-500">
              Same intelligence style as Describe Your Issue: answer under each ▸ line; the next
              counselor-style question flows in automatically.
            </p>
          </div>

          {/* Prior prompt */}
          <div className="rounded-xl border border-brand-200 bg-gradient-to-br from-brand-600/10 via-white to-brand-50/80 px-3.5 py-3 dark:border-brand-700 dark:from-brand-900/60 dark:via-brand-950 dark:to-brand-950">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-500">
              Prior prompt · therapeutic interview
            </p>
            <p className="mt-1 text-base font-semibold leading-snug text-brand-950 dark:text-brand-50">
              {journalIntel.priorPrompt.heading}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-brand-800 dark:text-brand-100">
              {journalIntel.priorPrompt.question}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-brand-600 dark:text-brand-300">
              {journalIntel.priorPrompt.coachLine}
            </p>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-brand-500">
              Evidence-gathering prompts · clinical constructs (NRS, function, 24h response)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {therapeuticChips.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  title={p.question}
                  onClick={() => {
                    setPromptId(p.id);
                    if (!title.trim()) setTitle(p.label);
                    insertQuestionIntoJournal({
                      id: p.id,
                      label: p.label,
                      question: p.question,
                      category: "bother",
                      reason: p.source,
                    });
                  }}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                    promptId === p.id
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-brand-200 bg-white text-brand-700 hover:border-brand-400 dark:border-brand-700 dark:bg-brand-950"
                  }`}
                >
                  {p.label}
                </button>
              ))}
              {JOURNAL_STARTERS.slice(0, 4).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyStarter(p.id)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                    promptId === p.id
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-dashed border-brand-300 bg-brand-50/50 text-brand-600 hover:border-brand-400 dark:border-brand-700 dark:bg-brand-950"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="journal-paper overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-brand-100/80 px-1 pb-1">
              <input
                className="journal-paper-title !border-0 !pb-0"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title for today…"
                aria-label="Journal title"
              />
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-brand-500">
                {completedTurns > 0 ? `${completedTurns} turns` : "ready"}
                {flowStatus.type === "wait"
                  ? " · waiting"
                  : flowStatus.type === "advance"
                    ? " · next Q…"
                    : continuousFlow && guideJournalQa
                      ? " · flow on"
                      : ""}
              </span>
            </div>
            <textarea
              ref={journalTextareaRef}
              className="journal-paper-input min-h-[240px]"
              value={body}
              onChange={(e) => {
                journalUserEditedRef.current = true;
                setBody(e.target.value);
              }}
              placeholder={
                continuousFlow && guideJournalQa
                  ? "Answer under each ▸ line — the next question appears when you pause…"
                  : journalIntel.priorPrompt.placeholder
              }
              aria-label="Journal reflection"
            />
          </div>

          {/* Continuous conversation strip */}
          <div className="rounded-xl border border-brand-200 bg-brand-50/60 px-3 py-2.5 dark:border-brand-700 dark:bg-brand-900/40">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-500">
                Continuous conversation
                {journalSettle.settling
                  ? ` · edit window ${journalSettle.remainingSec}s`
                  : continuousFlow && guideJournalQa
                    ? " · flow on"
                    : ""}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-1.5 text-[11px] font-medium text-brand-700 dark:text-brand-200">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-brand-600"
                    checked={guideJournalQa}
                    onChange={(e) => setGuideJournalQa(e.target.checked)}
                  />
                  Guide in box
                </label>
                <label className="flex items-center gap-1.5 text-[11px] font-medium text-brand-700 dark:text-brand-200">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-brand-600"
                    checked={continuousFlow}
                    onChange={(e) => setContinuousFlow(e.target.checked)}
                  />
                  Keep flow going
                </label>
              </div>
            </div>
            <div className="mt-2">
              <ConversationSpeedControl
                compact
                settling={journalSettle.settling}
                settleRemainingSec={journalSettle.remainingSec}
              />
            </div>
            {journalSettle.settling || journalSettle.editing ? (
              <div className="mt-2 space-y-2 rounded-lg bg-amber-50 px-2.5 py-2 dark:bg-amber-900/30">
                <p className="text-xs font-medium text-amber-950 dark:text-amber-100">
                  {journalSettle.editing
                    ? "Editing — revise your answer below, then Send or pause and type again to restart the timer."
                    : (
                      <>
                        Answer detected — <strong>{journalSettle.remainingSec}s</strong> left.{" "}
                        <strong>Send</strong> records now; <strong>Edit</strong> pauses so you can
                        revise.
                      </>
                    )}
                </p>
                <ConversationSettleActions
                  settling={journalSettle.settling}
                  editing={journalSettle.editing}
                  remainingSec={journalSettle.remainingSec}
                  onSend={commitJournalAdvanceNow}
                  onEdit={editJournalAnswer}
                  sendLabel="Send"
                  editLabel="Edit"
                />
              </div>
            ) : null}
            {openJournalQuestion ? (
              <p className="mt-1.5 text-sm leading-snug text-brand-900 dark:text-brand-50">
                <span className="font-semibold text-brand-600">Now answering: </span>
                {openJournalQuestion}
              </p>
            ) : nextGuidedQuestion ? (
              <div className="mt-1.5 flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm leading-snug text-brand-800 dark:text-brand-100">
                  <span className="font-semibold text-brand-600">Up next: </span>
                  {nextGuidedQuestion.question}
                </p>
                <button
                  type="button"
                  className="shrink-0 rounded-full border border-brand-300 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-brand-800 shadow-sm hover:border-brand-500 dark:border-brand-600 dark:bg-brand-950 dark:text-brand-100"
                  onClick={() => insertQuestionIntoJournal(nextGuidedQuestion)}
                >
                  Drop in now
                </button>
              </div>
            ) : (
              <p className="mt-1.5 text-xs text-brand-600 dark:text-brand-300">
                {flowStatus.type === "done"
                  ? "Interview themes look solid — keep writing or continue to scores."
                  : "Opening question will appear in the box when continuous flow is on."}
              </p>
            )}
            <p className="mt-1 text-[10px] leading-relaxed text-brand-500">{JOURNAL_SAFETY_NOTE}</p>
          </div>

          {/* Live clinical / therapeutic read */}
          {journalIntel.richness !== "empty" ? (
            <div className="rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-xs leading-relaxed text-brand-800 dark:border-brand-700 dark:bg-brand-950/60 dark:text-brand-100">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-500">
                  Live journal intel · counselor + PT lens
                </p>
                <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-800 dark:bg-brand-900 dark:text-brand-100">
                  {journalIntel.intelligenceGrade} · {journalIntel.completeness}/100
                  {analysis.signal ? ` · plan ${analysis.signal}` : ""}
                </span>
              </div>
              <ul className="mt-1.5 list-inside list-disc space-y-0.5">
                {journalIntel.liveReadLines.slice(0, 6).map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
              {journalIntel.missingThemes.length > 0 ? (
                <p className="mt-1.5 text-[11px] text-brand-500">
                  Still open: {journalIntel.missingThemes.slice(0, 6).join(", ")}
                </p>
              ) : (
                <p className="mt-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                  Themes look solid for today&apos;s note.
                </p>
              )}
            </div>
          ) : null}

          {/* Adaptive queue */}
          <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50/40 p-3 dark:border-brand-700 dark:bg-brand-900/30">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-500">
                Evidence gaps to fill (adaptive)
                {autoAppearingQuestions.length > 0
                  ? ` · ${autoAppearingQuestions.length} ready`
                  : " · complete"}
              </p>
              {nextGuidedQuestion ? (
                <button
                  type="button"
                  className="rounded-full border border-brand-300 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-brand-800 shadow-sm dark:border-brand-600 dark:bg-brand-950 dark:text-brand-100"
                  onClick={() => insertQuestionIntoJournal(nextGuidedQuestion)}
                >
                  Add next question
                </button>
              ) : null}
            </div>
            {autoAppearingQuestions.length > 0 ? (
              <ul className="space-y-2">
                {autoAppearingQuestions.slice(0, 5).map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="group flex w-full items-start gap-2 rounded-lg border border-brand-100 bg-white px-2.5 py-2 text-left text-sm shadow-sm transition hover:border-brand-400 hover:bg-brand-50 dark:border-brand-800 dark:bg-brand-950 dark:hover:bg-brand-900"
                      onClick={() => insertQuestionIntoJournal(p)}
                    >
                      <MessageCircleQuestion className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[11px] font-bold uppercase tracking-wide text-brand-500">
                          {p.label}
                          {p.reason ? (
                            <span className="ml-1.5 font-medium normal-case tracking-normal text-brand-400">
                              {p.category}
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block leading-snug text-brand-900 dark:text-brand-50">
                          {p.question}
                        </span>
                        {p.reason ? (
                          <span className="mt-1 block text-[10px] italic text-brand-500">
                            Clinical why: {p.reason}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-brand-600 dark:text-brand-300">
                Nice work—main interview themes are covered. Continue to scores anytime.
              </p>
            )}
          </div>

          <details className="rounded-xl border border-brand-100 text-sm dark:border-brand-800">
            <summary className="cursor-pointer px-3 py-2.5 font-medium text-brand-800">
              Important details worth including
            </summary>
            <ul className="list-disc space-y-1 border-t border-brand-100 px-5 py-2.5 text-xs text-brand-700 dark:border-brand-800">
              {JOURNAL_IMPORTANT_FIELDS.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </details>

          <div className="flex justify-end">
            <button type="button" className="btn-primary" onClick={() => setStep(2)}>
              Continue
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      )}

      {/* Step 2: Scores */}
      {step === 2 && (
        <section className="card space-y-5 p-5 sm:p-6">
          <div>
            <h2 className="text-base font-semibold text-brand-950">How you feel today</h2>
            <p className="mt-0.5 text-xs text-brand-500">
              These scores help Jeffery and your plan respond realistically.
            </p>
          </div>

          <PainScale
            label="Overall pain today (0–10)"
            value={pain}
            onChange={setPain}
            id="journal-pain"
          />

          <div className="grid gap-4 sm:grid-cols-3">
            {(
              [
                ["Mood", mood, setMood],
                ["Energy", energy, setEnergy],
                ["Sleep", sleepQuality, setSleepQuality],
              ] as const
            ).map(([label, val, setVal]) => (
              <div key={label}>
                <label className="label">
                  {label} ({val}/5)
                </label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={val}
                  onChange={(e) => setVal(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
                  className="w-full accent-brand-600"
                />
              </div>
            ))}
          </div>

          <label className="flex items-center gap-2.5 text-sm text-brand-800">
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand-600"
              checked={sessionCompleted}
              onChange={(e) => setSessionCompleted(e.target.checked)}
            />
            I completed a movement session today
          </label>

          <div>
            <p className="mb-2 text-sm font-medium text-brand-900">Body areas (optional)</p>
            <div className="space-y-3">
              {AREA_GROUPS.map((g) => (
                <div key={g.label}>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-brand-500">
                    {g.label}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {g.parts.map((a) => {
                      const on = parts.includes(a);
                      return (
                        <button
                          key={a}
                          type="button"
                          onClick={() =>
                            setParts((p) => (on ? p.filter((x) => x !== a) : [...p, a]))
                          }
                          className={`rounded-full border px-2.5 py-1 text-xs font-medium ${chipClass(on)}`}
                        >
                          {BODY_PART_LABELS[a]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-brand-100 pt-4 dark:border-brand-800">
            <h3 className="mb-1 text-sm font-semibold text-brand-950">
              Clinical symptoms today
            </h3>
            <p className="mb-2 text-xs text-brand-500">
              Same symptom library as Assessment—these adjust your active routine when you save.
            </p>
            <ClinicalSymptomPicker
              value={clinicalSymptomIds}
              onChange={setClinicalSymptomIds}
              areas={parts}
              concernParagraph={`${title} ${body}`}
              compact
              onInsertParagraph={(snippet) => {
                setBody((b) => (b.trim() ? `${b.trim()}\n\n${snippet}` : snippet));
              }}
            />
          </div>

          <div className="border-t border-brand-100 pt-4 dark:border-brand-800">
            <h3 className="mb-1 text-sm font-semibold text-brand-950">ADLs today</h3>
            <p className="mb-2 text-xs text-brand-500">
              Rate daily activities. Limited ADLs bias the plan toward home-safe, shorter dosing.
            </p>
            <AdlPicker
              value={adlEntries}
              onChange={setAdlEntries}
              areas={parts}
              concernParagraph={`${title} ${body}`}
              onInsertParagraph={(snippet) => {
                setBody((b) => (b.trim() ? `${b.trim()}\n\n${snippet}` : snippet));
              }}
            />
          </div>

          {(analysis.symptomSuggestions.length > 0 || analysis.adlTips.length > 0) && (
            <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-3 text-xs text-brand-800 dark:border-brand-700 dark:bg-brand-950/50 dark:text-brand-100">
              <p className="font-semibold">Live plan cues from symptoms/ADLs</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {[...analysis.symptomSuggestions, ...analysis.adlTips].slice(0, 4).map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
              <p className="mt-1.5 text-brand-600 dark:text-brand-300">
                Today&apos;s signal so far: <strong>{analysis.signal}</strong>
              </p>
            </div>
          )}

          <div className="flex justify-between">
            <button type="button" className="btn-ghost" onClick={() => setStep(1)}>
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            <button type="button" className="btn-primary" onClick={() => setStep(3)}>
              Continue
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      )}

      {/* Step 3: Reflect */}
      {step === 3 && (
        <section className="card space-y-5 p-5 sm:p-6">
          <div>
            <h2 className="text-base font-semibold text-brand-950">Wins & next steps</h2>
            <p className="mt-0.5 text-xs text-brand-500">
              Name what went well and one thing to improve—Jeffery builds on both.
            </p>
          </div>

          <div>
            <label className="label" htmlFor="didWell">
              What I did well
            </label>
            <textarea
              id="didWell"
              className="input min-h-[72px]"
              value={didWell}
              onChange={(e) => setDidWell(e.target.value)}
              placeholder="e.g. Kept my session short and stopped when pain hit 4/10"
            />
          </div>
          <div>
            <label className="label" htmlFor="improve">
              What I want to improve
            </label>
            <textarea
              id="improve"
              className="input min-h-[72px]"
              value={improveNext}
              onChange={(e) => setImproveNext(e.target.value)}
              placeholder="e.g. Take more desk breaks; less end-range forcing"
            />
          </div>
          <div>
            <label className="label" htmlFor="flex">
              Mobility / function note (optional)
            </label>
            <input
              id="flex"
              className="input"
              value={flexibilityNote}
              onChange={(e) => setFlexibilityNote(e.target.value)}
              placeholder="e.g. Stairs felt easier; desk hour still stiff"
            />
          </div>

          <details className="rounded-xl border border-brand-100 dark:border-brand-800">
            <summary className="cursor-pointer px-3 py-2.5 text-sm font-medium text-brand-800">
              Pain descriptors (optional)
            </summary>
            <div className="border-t border-brand-100 px-2 pb-2 pt-1 dark:border-brand-800">
              <PainDescriptorPicker
                value={descriptorIds}
                onChange={setDescriptorIds}
                maxSelect={12}
                compact
              />
            </div>
          </details>

          <div className="flex justify-between">
            <button type="button" className="btn-ghost" onClick={() => setStep(2)}>
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            <button type="button" className="btn-primary" onClick={() => setStep(4)}>
              Review with Jeffery
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      )}

      {/* Step 4: Review & Jeffery */}
      {step === 4 && (
        <div className="space-y-4">
          <section className="card space-y-4 border-brand-200 p-5 sm:p-6">
            <div className="flex items-start gap-2">
              <Bot className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
              <div>
                <h2 className="text-base font-semibold text-brand-950">Jeffery · listening ear</h2>
                <p className="text-xs text-brand-500">
                  Uses your journal plus correlated app data (plan, pain profile, sessions).
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-brand-50/80 p-3.5 text-sm leading-relaxed text-brand-800 dark:bg-brand-900/40">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-500">
                Plan signal: {analysis.signal}
              </p>
              <div className="whitespace-pre-wrap text-sm">
                {jefferyPreview || analysis.jefferySummary}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3 dark:border-emerald-900 dark:bg-emerald-950/20">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                  What you did well
                </p>
                <ul className="mt-2 space-y-1.5 text-xs text-brand-800">
                  {analysis.wins.map((w) => (
                    <li key={w} className="leading-snug">
                      • {w}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-3 dark:border-amber-900 dark:bg-amber-950/20">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">
                  Ways to improve
                </p>
                <ul className="mt-2 space-y-1.5 text-xs text-brand-800">
                  {analysis.improvements.map((w) => (
                    <li key={w} className="leading-snug">
                      • {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-brand-100 p-3 dark:border-brand-800">
              <p className="text-xs font-semibold text-brand-500">Therapist / counselor-style question</p>
              <p className="mt-1 text-sm font-medium italic text-brand-900">
                “{analysis.jefferyQuestion}”
              </p>
              <Link
                href="/jeffery"
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
              >
                <Bot className="h-3.5 w-3.5" />
                Continue this conversation with Jeffery
              </Link>
            </div>

            {suggestedMods.length > 0 && (
              <div className="rounded-xl border border-brand-100 bg-brand-50/30 p-3 dark:border-brand-800">
                <div className="mb-2 flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-900">
                    <Sparkles className="h-4 w-4 text-brand-600" />
                    Modalities for today&apos;s notes
                  </p>
                  <Link href="/modalities" className="text-xs font-semibold text-brand-700">
                    Hub
                  </Link>
                </div>
                <ModalityMiniList title="" items={suggestedMods} />
              </div>
            )}

            <label className="flex items-start gap-2.5 text-sm text-brand-800">
              <input
                type="checkbox"
                className="mt-0.5 accent-brand-600"
                checked={adjustPlan}
                onChange={(e) => setAdjustPlan(e.target.checked)}
              />
              <span>
                <span className="font-semibold">Let this entry adjust my active plan</span>
                <span className="mt-0.5 block text-xs text-brand-600">
                  Progress / maintain / regress / flare based on pain, language, mood, and energy.
                </span>
              </span>
            </label>

            <label className="flex items-center gap-2 text-sm text-brand-800">
              <input
                type="checkbox"
                checked={share}
                onChange={(e) => setShare(e.target.checked)}
                className="accent-brand-600"
              />
              <Share2 className="h-4 w-4" />
              Mark shareable with a healthcare professional
            </label>

            <div className="flex flex-wrap justify-between gap-2 border-t border-brand-100 pt-4 dark:border-brand-800">
              <button type="button" className="btn-ghost" onClick={() => setStep(3)}>
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="button"
                className="btn-primary min-w-[10rem]"
                disabled={saving || (!body.trim() && !title.trim())}
                onClick={() => void saveEntry()}
              >
                {saving ? "Saving…" : "Save journal entry"}
              </button>
            </div>
          </section>
        </div>
      )}

      {lastSaved && (
        <section className="card space-y-2 border-emerald-200 p-4 dark:border-emerald-900">
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
            Saved: {lastSaved.title}
          </p>
          {planNote && <p className="text-xs text-brand-700">{planNote}</p>}
          <p className="text-xs text-brand-600">
            Signal: {lastSaved.progressionSignal} · Pain {lastSaved.painOverall}/10
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link href="/routines/session" className="btn-secondary text-xs">
              Open session
            </Link>
            <Link href="/jeffery" className="btn-ghost text-xs">
              Talk with Jeffery
            </Link>
            <Link href="/insights" className="btn-ghost text-xs">
              Insights
            </Link>
          </div>
        </section>
      )}

      {/* History */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-brand-900">Recent entries</h2>
        {entries.length === 0 && (
          <p className="card p-5 text-sm text-brand-600">
            No entries yet—your first page starts the story Jeffery and your plan can learn from.
          </p>
        )}
        {entries.slice(0, 12).map((entry) => (
          <article key={entry.id} className="card overflow-hidden p-0">
            <div className="journal-paper border-0 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2 pl-8">
                <h3 className="font-semibold text-brand-900">{entry.title}</h3>
                <time className="text-[11px] text-brand-500">
                  {new Date(entry.createdAt).toLocaleString()}
                </time>
              </div>
              <p className="mt-2 whitespace-pre-wrap pl-8 text-sm leading-7 text-brand-800">
                {entry.body}
              </p>
            </div>
            <div className="space-y-2 border-t border-brand-100 px-4 py-3 dark:border-brand-800">
              <div className="flex flex-wrap gap-1.5 text-xs">
                <span className="chip">Pain {entry.painOverall}/10</span>
                <span className="chip">Mood {entry.mood}/5</span>
                {entry.progressionSignal && (
                  <span className="chip capitalize">{entry.progressionSignal}</span>
                )}
                {entry.planAdjusted && (
                  <span className="chip bg-brand-100 text-brand-900">Plan updated</span>
                )}
                {entry.sharedWithProvider && (
                  <span className="chip bg-accent-400/20 text-accent-700">Shareable</span>
                )}
                {entry.bodyParts.map((bp) => (
                  <span key={bp} className="chip">
                    {BODY_PART_LABELS[bp]}
                  </span>
                ))}
                {(entry.painDescriptorIds || []).slice(0, 4).map((id) => (
                  <span key={id} className="chip">
                    {getDescriptorById(id)?.label || id}
                  </span>
                ))}
              </div>
              {entry.jefferyQuestion && (
                <p className="text-xs italic text-brand-600">
                  Jeffery asked: “{entry.jefferyQuestion}”
                </p>
              )}
              {entry.planAdjustmentNote && (
                <p className="text-xs text-brand-700">{entry.planAdjustmentNote}</p>
              )}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
