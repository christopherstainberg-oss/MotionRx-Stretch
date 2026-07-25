"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  MODALITY_CATEGORY_LABELS,
  MODALITY_STATS,
  type Modality,
  type ModalityCategory,
  type ModalitySetting,
  type ModalityTiming,
} from "@/data/modalities";
import { loadLocalPainProfile } from "@/lib/pain-profile";
import type { ModalityPlan } from "@/lib/types";
import { ModalityCard, ModalityPlanPanels } from "@/components/ModalitySuggestions";
import { AddModalitiesToProgram } from "@/components/AddModalitiesToProgram";
import { PageHeader } from "@/components/PageHeader";
import { PainScale } from "@/components/PainScale";
import { PainDescriptorPicker } from "@/components/PainDescriptorPicker";
import { ClinicalCorrelationCard } from "@/components/ClinicalCorrelationCard";
import { loadClinicalContext } from "@/lib/clinical-context";
import {
  BookOpen,
  Filter,
  ListPlus,
  Sparkles,
  Stethoscope,
} from "lucide-react";

const TIMINGS: Array<{ id: ModalityTiming | "all"; label: string }> = [
  { id: "all", label: "All timings" },
  { id: "pre-visit", label: "Pre-visit" },
  { id: "post-visit", label: "Post-visit" },
  { id: "pre-session", label: "Pre-session" },
  { id: "post-session", label: "Post-session" },
  { id: "between-visits", label: "Between visits" },
  { id: "acute-flare", label: "Acute flare" },
  { id: "recovery-day", label: "Recovery day" },
];

const SETTINGS: Array<{ id: ModalitySetting | "all"; label: string }> = [
  { id: "all", label: "Home + clinic" },
  { id: "home", label: "Home-safe" },
  { id: "clinic", label: "Clinic education" },
  { id: "either", label: "Either setting" },
];

function ModalitiesInner() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as "suggest" | "browse" | "program") || "suggest";
  const categoryParam = searchParams.get("category");
  const timingParam = searchParams.get("timing");
  const deepLinkBrowse =
    Boolean(categoryParam || timingParam) ||
    initialTab === "program" ||
    initialTab === "browse";
  const [tab, setTab] = useState<"suggest" | "browse" | "program">(
    initialTab === "program" ? "program" : deepLinkBrowse ? "browse" : "suggest"
  );
  const [pain, setPain] = useState(4);
  const [experience, setExperience] = useState("");
  const [descriptorIds, setDescriptorIds] = useState<string[]>([]);
  const [plan, setPlan] = useState<ModalityPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ModalityCategory | "all">(() => {
    if (categoryParam && categoryParam in MODALITY_CATEGORY_LABELS) {
      return categoryParam as ModalityCategory;
    }
    return "all";
  });
  const [timing, setTiming] = useState<ModalityTiming | "all">(() => {
    const valid = TIMINGS.some((t) => t.id === timingParam);
    return valid && timingParam && timingParam !== "all"
      ? (timingParam as ModalityTiming)
      : "all";
  });
  const [setting, setSetting] = useState<ModalitySetting | "all">("all");
  const [catalog, setCatalog] = useState<Modality[]>([]);

  useEffect(() => {
    const local = loadLocalPainProfile();
    const clinical = loadClinicalContext();
    if (local?.descriptorIds?.length) setDescriptorIds(local.descriptorIds);
    else if (clinical?.descriptorIds?.length) setDescriptorIds(clinical.descriptorIds);
    const story =
      clinical?.freeText ||
      local?.freeText ||
      [
        clinical?.pastMedicalHistory ? `PMH: ${clinical.pastMedicalHistory}` : "",
        clinical?.currentMedicalHistory ? `Current: ${clinical.currentMedicalHistory}` : "",
      ]
        .filter(Boolean)
        .join(". ");
    if (story) setExperience(story);
    if (typeof local?.overallPain === "number") setPain(local.overallPain);
    else if (typeof clinical?.overallPain === "number") setPain(clinical.overallPain);
    fetch("/api/pain-profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.profile?.descriptorIds?.length) setDescriptorIds(d.profile.descriptorIds);
        if (d.profile?.freeText) setExperience((e) => e || d.profile.freeText);
        if (typeof d.profile?.overallPain === "number") setPain(d.profile.overallPain);
      })
      .catch(() => {});
  }, []);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/modalities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "recommend",
          painScore: pain,
          descriptorIds,
          experienceText: experience,
          source: "modalities",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setPlan(data.plan);
      try {
        localStorage.setItem("modality-plan", JSON.stringify(data.plan));
      } catch {
        /* ignore */
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not build suggestions");
    } finally {
      setLoading(false);
    }
  }, [pain, descriptorIds, experience]);

  // Auto-load a plan from profile on first paint
  useEffect(() => {
    try {
      const cached = localStorage.getItem("modality-plan");
      if (cached) setPlan(JSON.parse(cached) as ModalityPlan);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (tab !== "browse") return;
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (category !== "all") params.set("category", category);
    if (timing !== "all") params.set("timing", timing);
    if (setting !== "all") params.set("setting", setting);
    fetch(`/api/modalities?${params}`)
      .then((r) => r.json())
      .then((d) => setCatalog(d.items || []))
      .catch(() => setCatalog([]));
  }, [tab, query, category, timing, setting]);

  const logModality = useCallback(
    async (modalityId: string, modTiming: string, helpful: boolean) => {
      await fetch("/api/modality-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modalityId,
          timing: modTiming,
          helpful,
          painBefore: pain,
          descriptorIds,
          context: modTiming.includes("visit")
            ? modTiming.includes("pre")
              ? "pre-visit"
              : "post-visit"
            : modTiming.includes("flare")
              ? "flare"
              : "home",
        }),
      }).catch(() => {});
    },
    [pain, descriptorIds]
  );

  const categoryOptions = useMemo(
    () =>
      (Object.keys(MODALITY_CATEGORY_LABELS) as ModalityCategory[]).map((id) => ({
        id,
        label: MODALITY_CATEGORY_LABELS[id],
      })),
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Clinical adjuncts"
        title="Physical therapy modalities"
        description={`Evidence-informed suggestions for pre-visit, post-visit, sessions, and flares—matched to your pain rating, descriptors, and experience. ${MODALITY_STATS.total} modalities · ${MODALITY_STATS.home} home-capable · ${MODALITY_STATS.clinic} clinic education.`}
        actions={
          <Link href="/assessment" className="btn-secondary text-sm">
            <Stethoscope className="h-4 w-4" />
            Update Assessment
          </Link>
        }
      />

      <ClinicalCorrelationCard section="modalities" variant="compact" />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={tab === "suggest" ? "btn-primary" : "btn-secondary"}
          onClick={() => setTab("suggest")}
        >
          <Sparkles className="h-4 w-4" />
          Suggest for me
        </button>
        <button
          type="button"
          className={tab === "program" ? "btn-primary" : "btn-secondary"}
          onClick={() => setTab("program")}
        >
          <ListPlus className="h-4 w-4" />
          Add to program
        </button>
        <button
          type="button"
          className={tab === "browse" ? "btn-primary" : "btn-secondary"}
          onClick={() => setTab("browse")}
        >
          <Filter className="h-4 w-4" />
          Browse catalog
        </button>
        <Link href="/learn" className="btn-ghost text-sm">
          <BookOpen className="h-4 w-4" />
          Safety & learn
        </Link>
      </div>

      {tab === "program" && (
        <AddModalitiesToProgram
          presetIds={
            plan
              ? [
                  ...plan.preVisit.map((m) => m.modalityId),
                  ...plan.postVisit.map((m) => m.modalityId),
                ].slice(0, 12)
              : undefined
          }
        />
      )}

      {tab === "suggest" && (
        <div className="space-y-5">
          <section className="card space-y-4 p-4 sm:p-6">
            <h2 className="text-lg font-bold text-brand-950">Your reported experience</h2>
            <p className="text-sm text-brand-700/85">
              Suggestions use your pain score, clinical descriptors, free-text experience, and
              recent sessions/journal when available—same data thread as Assessment, sessions, and
              Jeffery.
            </p>
            <PainScale
              label="Overall pain right now (0–10)"
              value={pain}
              onChange={setPain}
              id="mod-pain"
            />
            <div>
              <label className="label" htmlFor="mod-exp">
                How has it felt? (pre-visit notes, flares, what helps)
              </label>
              <textarea
                id="mod-exp"
                className="input min-h-[100px]"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="Example: Morning stiffness in my low back, worse after long desk days. Heat helps; sharp after yard work. PT visit Friday."
              />
            </div>
            <PainDescriptorPicker
              value={descriptorIds}
              onChange={setDescriptorIds}
              maxSelect={16}
            />
            <button
              type="button"
              className="btn-primary w-full py-3"
              onClick={generate}
              disabled={loading}
            >
              {loading ? "Building modality plan…" : "Generate pre- & post-visit suggestions"}
            </button>
            {error && <p className="text-sm text-rose-700">{error}</p>}
          </section>

          {plan && (
            <ModalityPlanPanels plan={plan} onLogModality={logModality} />
          )}

          {!plan && !loading && (
            <div className="card p-6 text-center text-sm text-brand-700">
              Generate a plan to see pre-visit prep, post-visit HEP support, session, and flare
              modalities tailored to you.
            </div>
          )}
        </div>
      )}

      {tab === "browse" && (
        <div className="space-y-4">
          <section className="card space-y-3 p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="mod-q">
                  Search
                </label>
                <input
                  id="mod-q"
                  className="input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="heat, ice, TENS, pacing…"
                />
              </div>
              <div>
                <label className="label" htmlFor="mod-cat">
                  Category
                </label>
                <select
                  id="mod-cat"
                  className="input"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ModalityCategory | "all")}
                >
                  <option value="all">All categories</option>
                  {categoryOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="mod-time">
                  Timing
                </label>
                <select
                  id="mod-time"
                  className="input"
                  value={timing}
                  onChange={(e) => setTiming(e.target.value as ModalityTiming | "all")}
                >
                  {TIMINGS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="mod-set">
                  Setting
                </label>
                <select
                  id="mod-set"
                  className="input"
                  value={setting}
                  onChange={(e) => setSetting(e.target.value as ModalitySetting | "all")}
                >
                  {SETTINGS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-xs text-brand-600">{catalog.length} modalities shown</p>
          </section>

          <div className="grid gap-3 sm:grid-cols-2">
            {catalog.map((m) => (
              <div key={m.id} className="space-y-2">
                <ModalityCard
                  rec={{
                    modalityId: m.id,
                    name: m.name,
                    category: m.category,
                    setting: m.setting,
                    timing: m.timings[0] || "between-visits",
                    score: 0,
                    confidence: "exploratory",
                    reasons: m.outcomeLinks.slice(0, 2),
                    plainLanguage: m.plainLanguage,
                    howTo: m.howTo,
                    evidenceNotes: m.evidenceNotes,
                    durationMinutes: m.durationMinutes,
                    frequency: m.frequency,
                    precautions: m.precautions,
                    contraindications: m.contraindications,
                    outcomeLinks: m.outcomeLinks,
                    homeSafe: m.setting === "home" || m.setting === "either",
                  }}
                />
                <Link
                  href={`/modalities/${m.id}`}
                  className="inline-flex text-sm font-semibold text-brand-700 hover:underline"
                >
                  Full set-up, settings & kid-friendly guide →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-center text-xs text-brand-500">
        Modalities are short-term comfort or education tools. Progressive movement and licensed
        care drive durable outcomes. Not medical advice.
      </p>
    </div>
  );
}

export default function ModalitiesPage() {
  return (
    <Suspense fallback={<div className="card p-8 text-center">Loading modalities…</div>}>
      <ModalitiesInner />
    </Suspense>
  );
}
