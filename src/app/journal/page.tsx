"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PainScale } from "@/components/PainScale";
import { PainDescriptorPicker } from "@/components/PainDescriptorPicker";
import { ModalityMiniList } from "@/components/ModalitySuggestions";
import type { BodyPart, JournalEntry, ModalityRecommendation } from "@/lib/types";
import { BODY_PART_LABELS } from "@/data/stretch-library";
import { getDescriptorById } from "@/data/pain-descriptors";
import { recommendModalities } from "@/lib/modality-engine";
import { loadLocalPainProfile, saveLocalPainProfile } from "@/lib/pain-profile";
import { BookOpen, Share2, Sparkles } from "lucide-react";
import { v4 as uuid } from "uuid";

const AREAS = Object.keys(BODY_PART_LABELS) as BodyPart[];

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mood, setMood] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [pain, setPain] = useState(2);
  const [parts, setParts] = useState<BodyPart[]>([]);
  const [flexibilityNote, setFlexibilityNote] = useState("");
  const [share, setShare] = useState(false);
  const [descriptorIds, setDescriptorIds] = useState<string[]>([]);
  const [suggestedMods, setSuggestedMods] = useState<ModalityRecommendation[]>([]);

  useEffect(() => {
    const scored = recommendModalities({
      painScore: pain,
      descriptorIds,
      experienceText: `${title} ${body} ${flexibilityNote}`,
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
  }, [pain, descriptorIds, title, body, flexibilityNote]);

  useEffect(() => {
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

    fetch("/api/journal")
      .then((r) => r.json())
      .then((d) => {
        const server: JournalEntry[] = Array.isArray(d.entries) ? d.entries : [];
        // Merge by id; prefer newer updatedAt; never wipe local-only offline entries
        const map = new Map<string, JournalEntry>();
        for (const e of local) map.set(e.id, e);
        for (const e of server) {
          const prev = map.get(e.id);
          if (!prev || new Date(e.updatedAt || e.createdAt) >= new Date(prev.updatedAt || prev.createdAt)) {
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

  function persist(next: JournalEntry[]) {
    setEntries(next);
    localStorage.setItem("journal-entries", JSON.stringify(next));
  }

  async function saveEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    const entry: JournalEntry = {
      id: uuid(),
      userId: "local",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      title: title.trim(),
      body: body.trim(),
      mood,
      painOverall: pain,
      bodyParts: parts,
      flexibilityNote: flexibilityNote.trim() || undefined,
      sharedWithProvider: share,
      tags: share ? ["shared"] : [],
      painDescriptorIds: descriptorIds,
      modalityIds: suggestedMods.map((m) => m.modalityId).slice(0, 8),
    };
    const next = [entry, ...entries];
    persist(next);
    saveLocalPainProfile({
      userId: "local",
      descriptorIds,
      freeText: body.trim(),
      overallPain: pain,
      areas: parts,
      source: "journal",
    });
    setTitle("");
    setBody("");
    setFlexibilityNote("");
    setShare(false);
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
          freeText: body.trim(),
          overallPain: pain,
          areas: parts,
          source: "journal",
        }),
      });
    } catch {
      /* offline */
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-brand-950">
          <BookOpen className="h-7 w-7 text-brand-600" />
          Stretch journal
        </h1>
        <p className="mt-1 text-sm text-brand-700/85">
          Log progress, set reflections, and optionally mark entries to share with a healthcare
          professional for personalized feedback.
        </p>
      </div>

      <form onSubmit={saveEntry} className="card space-y-4 p-5">
        <div>
          <label className="label" htmlFor="title">
            Title
          </label>
          <input
            id="title"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. First week of hip focus"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="body">
            Reflection
          </label>
          <textarea
            id="body"
            className="input min-h-[120px]"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="How did movement feel? What improved? What still bothers you?"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="flex">
            Flexibility / mobility note
          </label>
          <input
            id="flex"
            className="input"
            value={flexibilityNote}
            onChange={(e) => setFlexibilityNote(e.target.value)}
            placeholder="e.g. Toe touch closer by a finger-width"
          />
        </div>
        <PainScale label="Overall pain today" value={pain} onChange={setPain} id="journal-pain" />
        <div className="rounded-xl border border-brand-100 p-3">
          <PainDescriptorPicker
            value={descriptorIds}
            onChange={setDescriptorIds}
            maxSelect={12}
            compact
          />
        </div>
        <div>
          <label className="label" htmlFor="mood">
            Mood (1–5)
          </label>
          <input
            id="mood"
            type="range"
            min={1}
            max={5}
            value={mood}
            onChange={(e) => setMood(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
            className="w-full accent-brand-600"
          />
        </div>
        <div>
          <p className="label">Related body areas</p>
          <div className="flex flex-wrap gap-2">
            {AREAS.map((a) => {
              const on = parts.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() =>
                    setParts((p) => (on ? p.filter((x) => x !== a) : [...p, a]))
                  }
                  className={`rounded-full px-2.5 py-1 text-xs ring-1 ${
                    on ? "bg-brand-600 text-white ring-brand-600" : "bg-white ring-brand-200"
                  }`}
                >
                  {BODY_PART_LABELS[a]}
                </button>
              );
            })}
          </div>
        </div>
        {suggestedMods.length > 0 && (
          <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-900">
                <Sparkles className="h-4 w-4 text-brand-600" />
                Modalities matching today&apos;s notes
              </p>
              <Link href="/modalities" className="text-xs font-semibold text-brand-700 hover:underline">
                Full plan
              </Link>
            </div>
            <ModalityMiniList title="" items={suggestedMods} />
          </div>
        )}
        <label className="flex items-center gap-2 text-sm text-brand-800">
          <input
            type="checkbox"
            checked={share}
            onChange={(e) => setShare(e.target.checked)}
            className="accent-brand-600"
          />
          <Share2 className="h-4 w-4" />
          Mark for sharing with healthcare professional
        </label>
        <button type="submit" className="btn-primary w-full">
          Save journal entry
        </button>
      </form>

      <div className="space-y-3">
        <h2 className="font-semibold text-brand-900">Your entries</h2>
        {entries.length === 0 && (
          <p className="card p-6 text-sm text-brand-600">No entries yet—your first reflection starts the story.</p>
        )}
        {entries.map((entry) => (
          <article key={entry.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="font-semibold text-brand-900">{entry.title}</h3>
              <time className="text-xs text-brand-500">
                {new Date(entry.createdAt).toLocaleString()}
              </time>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-brand-800">{entry.body}</p>
            {entry.flexibilityNote && (
              <p className="mt-2 text-sm text-brand-700">
                <strong>Flexibility:</strong> {entry.flexibilityNote}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-brand-600">
              <span className="chip">Pain {entry.painOverall}/10</span>
              <span className="chip">Mood {entry.mood}/5</span>
              {entry.sharedWithProvider && (
                <span className="chip bg-accent-400/20 text-accent-600">Shareable</span>
              )}
              {entry.bodyParts.map((bp) => (
                <span key={bp} className="chip">
                  {BODY_PART_LABELS[bp]}
                </span>
              ))}
              {(entry.painDescriptorIds || []).slice(0, 6).map((id) => (
                <span key={id} className="chip">
                  {getDescriptorById(id)?.label || id}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
