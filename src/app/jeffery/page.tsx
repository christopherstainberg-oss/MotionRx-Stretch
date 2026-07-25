"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { JefferyMessage, Routine } from "@/lib/types";
import { Bot, Send } from "lucide-react";

export default function JefferyPage() {
  const [messages, setMessages] = useState<JefferyMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [adjusted, setAdjusted] = useState<Routine | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
              "Hi, I'm Jeffery (offline mode). Describe your concerns in a paragraph—I'll still coach with clinical education when the API is available.",
            createdAt: new Date().toISOString(),
          },
        ]);
      });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const text = input.trim();
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
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (data.message) setMessages((m) => [...m, data.message]);
      if (data.adjustedRoutine) {
        setAdjusted(data.adjustedRoutine);
        localStorage.setItem("active-routine", JSON.stringify(data.adjustedRoutine));
        localStorage.setItem(
          `routine:${data.adjustedRoutine.id}`,
          JSON.stringify(data.adjustedRoutine)
        );
      }
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: `e-${Date.now()}`,
          role: "jeffery",
          content:
            "I couldn't reach the server. Try again online—or use Assess to build a plan from a written paragraph.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-brand-950">
          <Bot className="h-7 w-7 text-brand-600" />
          Jeffery — clinical AI coach
        </h1>
        <p className="mt-1 text-sm text-brand-700/85">
          Ask about pain, progress, stretches, or exercises. Jeffery knows your adjustments,
          custom routines, sessions, and journal signals—and can modify your program based on the
          discussion. Optional live model: set <code className="rounded bg-brand-50 px-1">XAI_API_KEY</code>{" "}
          (SpaceXAI / xAI). Works offline with a built-in clinical coach.
        </p>
      </div>

      <div className="card flex max-h-[60vh] flex-col overflow-hidden">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "ml-8 bg-brand-600 text-white"
                  : "mr-4 bg-brand-50 text-brand-900"
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
            <p className="text-sm text-brand-600">Jeffery is thinking with your clinical data…</p>
          )}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={send} className="flex gap-2 border-t border-brand-100 p-3">
          <input
            className="input"
            placeholder="e.g. My low back is stiff after sitting; pain is 4/10. What should I change?"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="btn-primary shrink-0" disabled={loading}>
            <Send className="h-4 w-4" />
            Send
          </button>
        </form>
      </div>

      {adjusted && (
        <div className="card border-brand-300 bg-brand-50/50 p-4 text-sm">
          <p className="font-semibold text-brand-900">Program updated from this chat</p>
          <p className="mt-1">{adjusted.name}</p>
          <p className="text-brand-700">{adjusted.description}</p>
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

      <div className="rounded-xl border border-dashed border-brand-200 p-4 text-xs text-brand-600">
        Jeffery provides educational guidance based on outpatient PT principles. Not a substitute for
        licensed evaluation. For red-flag symptoms, seek urgent care.
      </div>
    </div>
  );
}
