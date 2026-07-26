"use client";

import {
  CONVERSATION_SPEED_PRESETS,
  MAX_CONVERSATION_DELAY_MS,
  MIN_CONVERSATION_DELAY_MS,
  conversationDelaySeconds,
} from "@/lib/conversation-speed";
import { useConversationSpeed } from "@/lib/use-conversation-speed";
import { Gauge, Minus, Pencil, Plus, Send } from "lucide-react";

type Props = {
  /** Compact inline control for continuous-flow strips */
  compact?: boolean;
  className?: string;
  /** Optional settle countdown (seconds) to show while answer is pending */
  settleRemainingSec?: number;
  settling?: boolean;
  /** Edit paused the auto-timer */
  editing?: boolean;
  /** Immediate commit (Send) */
  onSend?: () => void;
  /** Pause timer and keep editing */
  onEdit?: () => void;
  sendLabel?: string;
  editLabel?: string;
};

/** Send / Edit actions shown during the answer settle window */
export function ConversationSettleActions({
  settling,
  editing,
  remainingSec,
  onSend,
  onEdit,
  sendLabel = "Send",
  editLabel = "Edit",
  className = "",
}: {
  settling?: boolean;
  editing?: boolean;
  remainingSec?: number;
  onSend?: () => void;
  onEdit?: () => void;
  sendLabel?: string;
  editLabel?: string;
  className?: string;
}) {
  if (!onSend && !onEdit) return null;
  if (!settling && !editing) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {onSend ? (
        <button
          type="button"
          className="btn-primary !px-3 !py-1.5 text-xs"
          onClick={onSend}
          aria-label={sendLabel}
        >
          <Send className="h-3.5 w-3.5" />
          {sendLabel}
          {settling && remainingSec != null && remainingSec > 0 ? (
            <span className="opacity-90">({remainingSec}s)</span>
          ) : null}
        </button>
      ) : null}
      {onEdit ? (
        <button
          type="button"
          className="btn-secondary !px-3 !py-1.5 text-xs"
          onClick={onEdit}
          aria-label={editLabel}
        >
          <Pencil className="h-3.5 w-3.5" />
          {editLabel}
        </button>
      ) : null}
    </div>
  );
}

/**
 * Shared control to increase/decrease conversation settle delay app-wide
 * (Assessment Describe Your Issue, Journal, Jeffery).
 */
export function ConversationSpeedControl({
  compact = false,
  className = "",
  settleRemainingSec,
  settling,
}: Props) {
  const { delayMs, delaySec, setDelayMs, faster, slower } = useConversationSpeed();

  if (compact) {
    return (
      <div
        className={`flex flex-wrap items-center gap-1.5 ${className}`}
        title="Time to edit your answer before the next question is added"
      >
        <Gauge className="h-3.5 w-3.5 text-brand-500" aria-hidden />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-500">
          Speed
        </span>
        <button
          type="button"
          className="rounded-full border border-brand-300 bg-white px-1.5 py-0.5 text-[11px] font-bold text-brand-800 hover:border-brand-500 dark:border-brand-600 dark:bg-brand-950 dark:text-brand-100"
          onClick={slower}
          aria-label="Slower conversation (more time to edit)"
          title="Slower — more time to edit"
        >
          <Minus className="h-3 w-3" />
        </button>
        <span className="min-w-[2.5rem] text-center text-[11px] font-semibold tabular-nums text-brand-800 dark:text-brand-100">
          {delaySec}s
        </span>
        <button
          type="button"
          className="rounded-full border border-brand-300 bg-white px-1.5 py-0.5 text-[11px] font-bold text-brand-800 hover:border-brand-500 dark:border-brand-600 dark:bg-brand-950 dark:text-brand-100"
          onClick={faster}
          aria-label="Faster conversation (less time to edit)"
          title="Faster — less time to edit"
        >
          <Plus className="h-3 w-3" />
        </button>
        {settling && settleRemainingSec != null && settleRemainingSec > 0 ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
            Edit window: {settleRemainingSec}s
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-brand-200 bg-white px-3 py-2.5 dark:border-brand-700 dark:bg-brand-950/50 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-500">
          <Gauge className="h-3.5 w-3.5" />
          Conversation speed
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="btn-secondary !px-2 !py-1 text-[11px]"
            onClick={slower}
            aria-label="Slower"
          >
            <Minus className="h-3.5 w-3.5" />
            Slower
          </button>
          <span className="min-w-[3rem] text-center text-sm font-bold tabular-nums text-brand-900 dark:text-brand-50">
            {delaySec}s
          </span>
          <button
            type="button"
            className="btn-secondary !px-2 !py-1 text-[11px]"
            onClick={faster}
            aria-label="Faster"
          >
            <Plus className="h-3.5 w-3.5" />
            Faster
          </button>
        </div>
      </div>
      <p className="mt-1.5 text-[11px] leading-relaxed text-brand-600 dark:text-brand-300">
        After you finish an answer, wait this long before it is recorded and the next question is
        asked. Keep typing to edit — the timer restarts. Shared across Describe Your Issue, Journal,
        and Jeffery.
      </p>
      <input
        type="range"
        min={MIN_CONVERSATION_DELAY_MS}
        max={MAX_CONVERSATION_DELAY_MS}
        step={1000}
        value={delayMs}
        onChange={(e) => setDelayMs(Number(e.target.value))}
        className="mt-2 w-full accent-brand-600"
        aria-label="Conversation settle delay in seconds"
      />
      <div className="mt-1.5 flex flex-wrap gap-1">
        {CONVERSATION_SPEED_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            title={p.description}
            onClick={() => setDelayMs(p.delayMs)}
            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
              delayMs === p.delayMs
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-900 dark:text-brand-100"
            }`}
          >
            {p.label} ({conversationDelaySeconds(p.delayMs)}s)
          </button>
        ))}
      </div>
      {settling && settleRemainingSec != null && settleRemainingSec > 0 ? (
        <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-950 dark:bg-amber-900/30 dark:text-amber-100">
          Recording answer in <strong>{settleRemainingSec}s</strong> — edit freely to adjust; the
          next question waits until you pause.
        </p>
      ) : null}
    </div>
  );
}
