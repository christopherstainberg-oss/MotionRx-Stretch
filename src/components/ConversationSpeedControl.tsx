"use client";

import type { FormEvent, ReactNode } from "react";
import {
  CONVERSATION_SPEED_PRESETS,
  MAX_CONVERSATION_DELAY_MS,
  MIN_CONVERSATION_DELAY_MS,
  conversationDelaySeconds,
} from "@/lib/conversation-speed";
import { useConversationSpeed } from "@/lib/use-conversation-speed";
import { cn } from "@/lib/utils";
import { Clock, Gauge, Minus, Pencil, Plus, Send } from "lucide-react";

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

export type ConversationSettleState = {
  settling?: boolean;
  editing?: boolean;
  remainingSec?: number;
};

/**
 * Compact Send / Edit row that sits inside the text-box chrome.
 * Always visible (not a floating bar, not show/hide). Quiet status on the left;
 * small buttons on the right.
 *
 * Used identically on Describe Your Issue, Journal, and Jeffery via ConversationComposer.
 */
export function ConversationSettleActions({
  settling,
  editing,
  remainingSec,
  onSend,
  onEdit,
  sendLabel = "Send",
  editLabel = "Edit",
  className = "",
  sendDisabled,
  editDisabled,
}: {
  settling?: boolean;
  editing?: boolean;
  remainingSec?: number;
  onSend?: () => void;
  onEdit?: () => void;
  sendLabel?: string;
  editLabel?: string;
  className?: string;
  /** Soft-disable Send (e.g. empty draft) without hiding the control */
  sendDisabled?: boolean;
  editDisabled?: boolean;
}) {
  if (!onSend && !onEdit) return null;

  let status = "Ready when you are";
  if (editing) {
    status = "Editing — type freely";
  } else if (settling && remainingSec != null && remainingSec > 0) {
    status = `Auto-continue in ${remainingSec}s`;
  }

  return (
    <div
      className={cn(
        "flex min-h-[2.25rem] items-center justify-between gap-2",
        className
      )}
      role="toolbar"
      aria-label="Answer actions"
    >
      <p className="min-w-0 flex-1 truncate text-[11px] leading-none text-brand-500 dark:text-brand-400">
        {settling && remainingSec != null && remainingSec > 0 ? (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3 shrink-0" aria-hidden />
            {status}
          </span>
        ) : editing ? (
          <span className="inline-flex items-center gap-1">
            <Pencil className="h-3 w-3 shrink-0" aria-hidden />
            {status}
          </span>
        ) : (
          status
        )}
      </p>

      <div className="flex shrink-0 items-center gap-1.5">
        {onEdit ? (
          <button
            type="button"
            className={cn(
              "btn-settle-edit",
              editing && "btn-settle-edit-active"
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit();
            }}
            disabled={editDisabled}
            aria-label={editLabel}
            aria-pressed={editing || undefined}
            title="Pause auto-continue and revise"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            <span>{editLabel}</span>
          </button>
        ) : null}
        {onSend ? (
          <button
            type="button"
            className="btn-settle-send"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSend();
            }}
            disabled={sendDisabled}
            aria-label={
              settling && remainingSec != null && remainingSec > 0
                ? `${sendLabel}, or wait ${remainingSec} seconds`
                : sendLabel
            }
            title="Continue conversation now"
          >
            <Send className="h-3.5 w-3.5" aria-hidden />
            <span>{sendLabel}</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Text-box shell with a fixed Send/Edit footer layout.
 * - `default` — standard brand field (Describe Your Issue, Jeffery)
 * - `journal` — lined paper, handwriting font, paper-colored action strip
 *
 * Send/Edit button layout is identical on every surface.
 */
export function ConversationComposer({
  children,
  header,
  className = "",
  variant = "default",
  settling,
  editing,
  remainingSec,
  onSend,
  onEdit,
  sendDisabled,
  editDisabled,
  onSubmit,
}: {
  /** Textarea / input (and any in-box content above the actions strip) */
  children: ReactNode;
  /** Optional top meta row inside the same border */
  header?: ReactNode;
  className?: string;
  /** Field chrome only — does not change Send/Edit layout */
  variant?: "default" | "journal";
  settling?: boolean;
  editing?: boolean;
  remainingSec?: number;
  onSend: () => void;
  onEdit: () => void;
  sendDisabled?: boolean;
  editDisabled?: boolean;
  /** When provided, outer element is a form (Jeffery chat) */
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void;
}) {
  const isJournal = variant === "journal";
  const shellClass = cn(
    isJournal ? "journal-paper overflow-hidden" : "conversation-text-box",
    className
  );
  const headerClass = isJournal
    ? "flex items-center justify-between gap-2 border-b border-brand-100/80 px-1 pb-1"
    : "conversation-text-box-header";
  const actionsClass = isJournal
    ? "text-box-actions text-box-actions-journal"
    : "text-box-actions";

  const body = (
    <>
      {header ? <div className={headerClass}>{header}</div> : null}
      {children}
      <div className={actionsClass}>
        <ConversationSettleActions
          settling={settling}
          editing={editing}
          remainingSec={remainingSec}
          onSend={onSend}
          onEdit={onEdit}
          sendLabel="Send"
          editLabel="Edit"
          sendDisabled={sendDisabled}
          editDisabled={editDisabled}
        />
      </div>
    </>
  );

  if (onSubmit) {
    return (
      <form className={shellClass} onSubmit={onSubmit}>
        {body}
      </form>
    );
  }

  return <div className={shellClass}>{body}</div>;
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
        className={cn(
          "flex flex-wrap items-center gap-1.5 rounded-xl border border-brand-100 bg-white/70 px-2 py-1.5 dark:border-brand-800 dark:bg-brand-950/50",
          className
        )}
        title="Time to edit your answer before the next question is added"
      >
        <Gauge className="h-3.5 w-3.5 text-brand-500" aria-hidden />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-500">
          Speed
        </span>
        <button
          type="button"
          className="rounded-full border border-brand-200 bg-brand-50 px-1.5 py-0.5 text-[11px] font-bold text-brand-800 hover:border-brand-500 hover:bg-white dark:border-brand-600 dark:bg-brand-900 dark:text-brand-100"
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
          className="rounded-full border border-brand-200 bg-brand-50 px-1.5 py-0.5 text-[11px] font-bold text-brand-800 hover:border-brand-500 hover:bg-white dark:border-brand-600 dark:bg-brand-900 dark:text-brand-100"
          onClick={faster}
          aria-label="Faster conversation (less time to edit)"
          title="Faster — less time to edit"
        >
          <Plus className="h-3 w-3" />
        </button>
        {settling && settleRemainingSec != null && settleRemainingSec > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold text-white dark:bg-brand-400 dark:text-brand-950">
            <Clock className="h-3 w-3" aria-hidden />
            {settleRemainingSec}s
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-brand-200 bg-white px-3 py-2.5 dark:border-brand-700 dark:bg-brand-950/50",
        className
      )}
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
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
              delayMs === p.delayMs
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-900 dark:text-brand-100"
            )}
          >
            {p.label} ({conversationDelaySeconds(p.delayMs)}s)
          </button>
        ))}
      </div>
      {settling && settleRemainingSec != null && settleRemainingSec > 0 ? (
        <p className="mt-2 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-900 dark:border-brand-700 dark:bg-brand-900/50 dark:text-brand-100">
          Recording answer in <strong>{settleRemainingSec}s</strong> — edit freely to adjust; the
          next question waits until you pause. Or press <strong>Send</strong> to continue now.
        </p>
      ) : null}
    </div>
  );
}
