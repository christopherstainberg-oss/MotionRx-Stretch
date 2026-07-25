"use client";

import { useEffect, useState } from "react";
import { PainScale } from "@/components/PainScale";
import type { BodyPart, JournalEntry } from "@/lib/types";
import { BODY_PART_LABELS } from "@/data/stretch-library";
import { BookOpen, Share2 } from "lucide-react";
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

  useEffect(() => {
    const raw = localStorage.getItem("journal-entries");
    if (raw) setEntries(JSON.parse(raw));
    fetch("/api/journal")
      .then((r) => r.json())
      .then((d) => {
        if (d.entries?.length) {
          setEntries(d.entries);
          localStorage.setItem("journal-entries", JSON.stringify(d.entries));
        }
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
    };
    const next = [entry, ...entries];
    persist(next);
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
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
