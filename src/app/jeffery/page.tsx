"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { JefferyMessage, Routine } from "@/lib/types";
import { ClinicalCorrelationCard } from "@/components/ClinicalCorrelationCard";
import { clinicalContextPromptBlob, loadClinicalContext } from "@/lib/clinical-context";
import {
  analyzeJefferyIntelligence,
  decideJefferyFlow,
  type JefferyAdaptivePrompt,
} from "@/lib/jeffery-intelligence";
import { Bot, MessageCircleQuestion, Send, Sparkles } from "lucide-react";

export default function JefferyPage() {
  const [messages, setMessages] = useState<JefferyMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [adjusted, setAdjusted] = useState<Routine | null>(null);
  const [continuousFlow, setContinuousFlow] = useState(true);
  const [preferredName, setPreferredName] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastAutoFillRef = useRef("");

  useEffect(() => {
    try {
      const n = localStorage.getItem("preferredName");
      if (n?.trim()) setPreferredName(n.trim());
    } catch {
      /* ignore */
    }
    fetch("/api/jeffery")
      .then((r) => r.json())
      .then((d) => {
        if (d.thread?.messages) setMessages(d.thread.messages);
      })
      .catch(() => {
        setMessages([
          {
            id: "offline",
            role: "jeffery",
            content:
              "Hi, I'm Jeffery (offline mode). Describe your concerns in a paragraph—I'll coach with clinical education when the API is available.\n\n**Question for you:** What is bothering you most right now?",
            createdAt: new Date().toISOString(),
            meta: {
              openEndedQuestion: "What is bothering you most right now?",
            },
          },
        ]);
      });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const clinicalCtx = useMemo(() => {
    try {
      return loadClinicalContext();
    } catch {
      return null;
    }
  }, [messages]);

  const intel = useMemo(() => {
    const assessmentStory =
      clinicalCtx?.freeText ||
      (() => {
        try {
          const blob = clinicalContextPromptBlob();
          const m = blob.match(/Assessment story:\s*([\s\S]*?)(?:\n[A-Z][a-z]+:|$)/i);
          return m?.[1]?.trim();
        } catch {
          return undefined;
        }
      })();

    let journalBridge: string | undefined;
    try {
      const raw = localStorage.getItem("jeffery-journal-bridge");
      if (raw) {
        const j = JSON.parse(raw) as { summary?: string };
        journalBridge = j.summary;
      }
    } catch {
      /* ignore */
    }

    return analyzeJefferyIntelligence(messages, {
      preferredName: preferredName || clinicalCtx?.preferredName || undefined,
      assessmentStory,
      journalBridge,
      areas: clinicalCtx?.areas,
      painOverall: clinicalCtx?.overallPain,
    });
  }, [messages, preferredName, clinicalCtx]);

  const flowStatus = useMemo(() => decideJefferyFlow(messages, intel), [messages, intel]);

  const openQuestion =
    intel.nextOpenQuestion ||
    (flowStatus.type === "wait" ? flowStatus.currentQuestion : null);

  /** Continuous flow: after user reply is answered by Jeffery, stage next question in the input */
  useEffect(() => {
    if (!continuousFlow || loading) return;
    if (flowStatus.type !== "wait" && flowStatus.type !== "seed") return;

    const q =
      flowStatus.type === "wait"
        ? flowStatus.currentQuestion
        : flowStatus.type === "seed"
          ? flowStatus.prompt.question
          : "";
    if (!q) return;
    // Only auto-fill when input is empty so we don't clobber typing
    if (input.trim()) return;
    if (lastAutoFillRef.current === q) return;
    // Don't put Jeffery's full multi-sentence education into the input — only short open Qs
    if (q.length > 220) return;
    lastAutoFillRef.current = q;
    // For seed/wait we show the question as a soft placeholder via state, not forced fill,
    // unless user just finished a turn and Jeffery asked something new
    const last = messages[messages.length - 1];
    if (last?.role === "jeffery" && messages.some((m) => m.role === "user")) {
      // leave input empty; chips handle next answer prompts
    }
  }, [continuousFlow, flowStatus, loading, input, messages]);

  const applyPrompt = useCallback((prompt: JefferyAdaptivePrompt) => {
    setInput(prompt.question.includes("?") ? "" : "");
    // Put a starter answer frame or the question context — better: set input empty and focus
    // Actually for continuous flow, pre-fill a short answer scaffold:
    setInput("");
    // Use the prompt as the *message they can edit* only if it's a short self-report frame
    // Prefer filling nothing and showing "Now answering" — user types their answer.
    // Optional: prefill nothing, store pending question label
    inputRef.current?.focus();
    // If they tap a chip, send the question as context by prepending answer space
    setInput((prev) => {
      if (prev.trim()) return prev;
      // Leave blank for free answer; store hint via selection of chip -> user types answer to open Q
      return prev;
    });
  }, []);

  /** Tap adaptive chip → either send as answer topic or place answer helper */
  function useAdaptiveChip(prompt: JefferyAdaptivePrompt) {
    // Put a reflective lead-in so conversation continues
    const lead = continuousFlow
      ? ``
      : ``;
    setInput(lead);
    // Better UX: send a message that answers by quoting the theme, or fill input with empty and show question
    // Most natural continuous flow: auto-focus for answering the open question; chip inserts a partial answer starter
    const starters: Record<string, string> = {
      pain: "My pain is about /10 most of the day and at worst. ",
      aggravators: "It gets worse when ",
      "activity-response": "After activity I usually feel ",
      function: "The hardest daily task is ",
      goals: "In two weeks I want ",
      "plan-feedback": "The program feels ",
      mood: "My mood and stress are ",
      sleep: "Sleep has been ",
    };
    const key = String(prompt.theme);
    const scaffold = starters[key] || "";
    setInput(scaffold);
    lastAutoFillRef.current = prompt.id;
    inputRef.current?.focus();
  }

  async function sendMessage(textRaw: string) {
    const text = textRaw.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((m) => [
      ...m,
      { id: `u-${Date.now()}`, role: "user", content: text, createdAt: new Date().toISOString() },
    ]);
    setLoading(true);
    try {
      const res = await fetch("/api/jeffery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          clinicalContext: clinicalContextPromptBlob(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((m) => [
          ...m,
          {
            id: `e-${Date.now()}`,
            role: "jeffery",
            content:
              data.error ||
              "I couldn't process that message. Please wait a moment and try again.",
            createdAt: new Date().toISOString(),
          },
        ]);
        return;
      }
      if (data.message) setMessages((m) => [...m, data.message]);
      if (data.adjustedRoutine) {
        setAdjusted(data.adjustedRoutine);
        localStorage.setItem("active-routine", JSON.stringify(data.adjustedRoutine));
        localStorage.setItem(
          `routine:${data.adjustedRoutine.id}`,
          JSON.stringify(data.adjustedRoutine)
        );
      }
      // Continuous flow: after reply, focus for next answer
      if (continuousFlow) {
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: `e-${Date.now()}`,
          role: "jeffery",
          content:
            "I couldn't reach the server. Try again online—or use Assessment to build a plan from a written paragraph.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    await sendMessage(input);
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 pb-8">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-500">
          AI coach · continuous clinical interview
        </p>
        <h1 className="flex items-center gap-2 text-xl font-bold text-brand-950 sm:text-2xl">
          <Bot className="h-6 w-6 shrink-0 text-brand-600 sm:h-7 sm:w-7" />
          Chat with Jeffery
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-brand-700/85">
          Same intelligence style as <strong>Describe Your Issue</strong>: data-first live read,
          adaptive follow-ups, and a conversation that keeps flowing until themes are solid.
        </p>
      </div>

      <ClinicalCorrelationCard section="jeffery" variant="compact" />

      {/* Prior prompt + continuous flow controls */}
      <div className="rounded-xl border border-brand-200 bg-gradient-to-br from-brand-600/10 via-white to-brand-50/80 px-3.5 py-3 dark:border-brand-700 dark:from-brand-900/60 dark:via-brand-950 dark:to-brand-950">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-500">
              Prior prompt · interview focus
            </p>
            <p className="mt-1 text-base font-semibold leading-snug text-brand-950 dark:text-brand-50">
              {intel.priorPrompt.heading}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-brand-800 dark:text-brand-100">
              {intel.priorPrompt.question}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-brand-600 dark:text-brand-300">
              {intel.priorPrompt.coachLine}
            </p>
          </div>
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

      {/* Live clinical read */}
      {intel.richness !== "empty" ? (
        <div className="rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-xs leading-relaxed text-brand-800 dark:border-brand-700 dark:bg-brand-950/60 dark:text-brand-100">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-500">
              Live clinical read · powers plan dosing
            </p>
            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-800 dark:bg-brand-900 dark:text-brand-100">
              {intel.intelligenceGrade} · {intel.completeness}/100 · {intel.userTurnCount} turns
              {intel.planFeedback !== "unknown" ? ` · ${intel.planFeedback}` : ""}
            </span>
          </div>
          <ul className="mt-1.5 list-inside list-disc space-y-0.5">
            {intel.liveReadLines.slice(0, 6).map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
          {intel.missingThemes.length > 0 ? (
            <p className="mt-1.5 text-[11px] text-brand-500">
              Still open: {intel.missingThemes.slice(0, 6).join(", ")}
            </p>
          ) : (
            <p className="mt-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
              Interview themes look solid — ask about fine-tuning the plan anytime.
            </p>
          )}
        </div>
      ) : null}

      {/* Continuous conversation strip */}
      <div className="rounded-xl border border-brand-200 bg-brand-50/60 px-3 py-2.5 dark:border-brand-700 dark:bg-brand-900/40">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-500">
          Continuous conversation
          {flowStatus.type === "wait"
            ? " · waiting for your answer"
            : flowStatus.type === "done"
              ? " · themes solid"
              : continuousFlow
                ? " · flow on"
                : " · flow off"}
        </p>
        {openQuestion ? (
          <p className="mt-1.5 text-sm leading-snug text-brand-900 dark:text-brand-50">
            <span className="font-semibold text-brand-600">Now answering: </span>
            {openQuestion}
          </p>
        ) : intel.adaptiveQuestions[0] ? (
          <div className="mt-1.5 flex flex-wrap items-start justify-between gap-2">
            <p className="text-sm leading-snug text-brand-800 dark:text-brand-100">
              <span className="font-semibold text-brand-600">Up next: </span>
              {intel.adaptiveQuestions[0].question}
            </p>
            <button
              type="button"
              className="shrink-0 rounded-full border border-brand-300 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-brand-800 shadow-sm dark:border-brand-600 dark:bg-brand-950 dark:text-brand-100"
              onClick={() => useAdaptiveChip(intel.adaptiveQuestions[0]!)}
            >
              Prep answer
            </button>
          </div>
        ) : (
          <p className="mt-1.5 text-xs text-brand-600 dark:text-brand-300">
            {intel.continuousFlowHint}
          </p>
        )}
      </div>

      {/* Chat */}
      <div
        className="card flex flex-col overflow-hidden"
        style={{ height: "min(52dvh, 480px)" }}
      >
        <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain p-3 sm:p-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "ml-8 bg-brand-600 text-white"
                  : "mr-4 bg-brand-50 text-brand-900 dark:bg-brand-900/50 dark:text-brand-50"
              }`}
            >
              {m.role === "jeffery" && (
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-brand-500">
                  Jeffery
                </p>
              )}
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          ))}
          {loading && (
            <p className="text-sm text-brand-600">
              Jeffery is thinking with your clinical data and conversation intel…
            </p>
          )}
          <div ref={bottomRef} />
        </div>
        <form
          onSubmit={send}
          className="flex gap-2 border-t border-brand-100 bg-brand-50/30 p-3 dark:border-brand-800"
        >
          <input
            ref={inputRef}
            className="input"
            placeholder={
              openQuestion
                ? "Type your answer to the open question…"
                : "Describe how you feel or ask a question…"
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label="Message to Jeffery"
            disabled={loading}
          />
          <button
            type="submit"
            className="btn-primary min-w-[48px] shrink-0 px-3 sm:px-4"
            disabled={loading || !input.trim()}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>

      {/* Adaptive queue */}
      <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50/40 p-3 dark:border-brand-700 dark:bg-brand-900/30">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-500">
            Adaptive follow-ups (react to your answers)
            {intel.adaptiveQuestions.length > 0
              ? ` · ${intel.adaptiveQuestions.length} ready`
              : " · solid"}
          </p>
          {intel.adaptiveQuestions[0] ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-brand-300 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-brand-800 shadow-sm dark:border-brand-600 dark:bg-brand-950 dark:text-brand-100"
              onClick={() => useAdaptiveChip(intel.adaptiveQuestions[0]!)}
            >
              <Sparkles className="h-3 w-3" />
              Prep next answer
            </button>
          ) : null}
        </div>
        {intel.adaptiveQuestions.length > 0 ? (
          <ul className="space-y-2">
            {intel.adaptiveQuestions.slice(0, 6).map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="group flex w-full items-start gap-2 rounded-lg border border-brand-100 bg-white px-2.5 py-2 text-left text-sm shadow-sm transition hover:border-brand-400 hover:bg-brand-50 dark:border-brand-800 dark:bg-brand-950 dark:hover:bg-brand-900"
                  onClick={() => useAdaptiveChip(p)}
                >
                  <MessageCircleQuestion className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
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
                    <span className="mt-1 block text-[10px] italic text-brand-500">
                      Why this: {p.reason}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-brand-600 dark:text-brand-300">
            Main interview themes look covered. Keep chatting about plan tweaks anytime.
          </p>
        )}
      </div>

      {adjusted && (
        <div className="card border-brand-300 bg-brand-50/50 p-4 text-sm dark:border-brand-600">
          <p className="font-semibold text-brand-900 dark:text-brand-50">
            Program updated from this chat
          </p>
          <p className="mt-1">{adjusted.name}</p>
          <p className="text-brand-700 dark:text-brand-200">{adjusted.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/builder" className="btn-primary text-xs">
              Open in builder
            </Link>
            <Link href={`/routines/session?id=${adjusted.id}`} className="btn-secondary text-xs">
              Start session
            </Link>
            <Link href="/insights" className="btn-ghost text-xs">
              View correlated insights
            </Link>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-dashed border-brand-200 p-4 text-xs text-brand-600 dark:border-brand-700 dark:text-brand-300">
        Jeffery provides educational guidance based on outpatient PT principles and counselor-style
        interview structure. Not a substitute for licensed evaluation. For red-flag symptoms, seek
        urgent care.
      </div>
    </div>
  );
}
