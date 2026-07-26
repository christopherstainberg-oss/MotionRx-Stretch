"use client";

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

function settleHint(
  editing?: boolean,
  settling?: boolean,
  remainingSec?: number
): string {
  if (editing) {
    return "Editing mode — type freely. Send continues the conversation right away.";
  }
  if (settling && remainingSec != null && remainingSec > 0) {
    return `Answer ready — auto-continues in ${remainingSec}s. Send now, or Edit to revise.`;
  }
  return "Send continues the conversation · Edit pauses the timer while you type.";
}

/**
 * Send / Edit actions during the answer settle window.
 * Brand-themed buttons + panel; `fixed` pins above the mobile tab bar.
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
  /** Pin bar above bottom nav so controls stay visible while typing */
  fixed = false,
  hint,
  /** Show status copy above buttons (default true for fixed, optional for inline) */
  showHint,
}: {
  settling?: boolean;
  editing?: boolean;
  remainingSec?: number;
  onSend?: () => void;
  onEdit?: () => void;
  sendLabel?: string;
  editLabel?: string;
  className?: string;
  fixed?: boolean;
  hint?: string;
  showHint?: boolean;
}) {
  if (!onSend && !onEdit) return null;

  const statusText = hint || settleHint(editing, settling, remainingSec);
  const displayHint = showHint ?? fixed;

  const buttons = (
    <div
      className={cn(
        "grid w-full gap-2.5",
        onSend && onEdit ? "grid-cols-2" : "grid-cols-1",
        fixed ? "sm:max-w-md sm:shrink-0" : ""
      )}
    >
      {onSend ? (
        <button
          type="button"
          className="btn-settle-send"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSend();
          }}
          aria-label={
            settling && remainingSec != null && remainingSec > 0
              ? `${sendLabel}, or wait ${remainingSec} seconds`
              : sendLabel
          }
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
            <Send className="h-3.5 w-3.5" aria-hidden />
          </span>
          <span className="flex flex-col items-start leading-tight">
            <span>{sendLabel}</span>
            {settling && remainingSec != null && remainingSec > 0 ? (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-white/85">
                or wait {remainingSec}s
              </span>
            ) : (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-white/85">
                continue now
              </span>
            )}
          </span>
        </button>
      ) : null}
      {onEdit ? (
        <button
          type="button"
          className={cn("btn-settle-edit", editing && "btn-settle-edit-active")}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit();
          }}
          aria-label={editLabel}
          aria-pressed={editing || undefined}
        >
          <span
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full",
              editing
                ? "bg-brand-600 text-white dark:bg-brand-400 dark:text-brand-950"
                : "bg-brand-100 text-brand-700 dark:bg-brand-800 dark:text-brand-100"
            )}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </span>
          <span className="flex flex-col items-start leading-tight">
            <span>{editLabel}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
              {editing ? "typing…" : "revise"}
            </span>
          </span>
        </button>
      ) : null}
    </div>
  );

  if (fixed) {
    return (
      <div
        className={cn("pointer-events-none fixed inset-x-0 z-[60]", className)}
        style={{
          bottom: "calc(var(--tabbar-h) + env(safe-area-inset-bottom, 0px))",
        }}
        role="toolbar"
        aria-label="Answer actions"
      >
        <div
          className="settle-bar-fixed pointer-events-auto"
          style={{
            paddingBottom: "max(0.65rem, env(safe-area-inset-bottom, 0px))",
          }}
        >
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-2.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                    editing
                      ? "bg-brand-600 text-white dark:bg-brand-400 dark:text-brand-950"
                      : settling
                        ? "bg-brand-100 text-brand-800 dark:bg-brand-800 dark:text-brand-100"
                        : "bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-200"
                  )}
                >
                  {editing ? (
                    <>
                      <Pencil className="h-3 w-3" aria-hidden />
                      Editing
                    </>
                  ) : settling ? (
                    <>
                      <Clock className="h-3 w-3" aria-hidden />
                      Ready
                      {remainingSec != null && remainingSec > 0
                        ? ` · ${remainingSec}s`
                        : ""}
                    </>
                  ) : (
                    "Actions"
                  )}
                </span>
              </div>
              {displayHint ? (
                <p className="text-xs leading-snug text-brand-700 dark:text-brand-200">
                  {statusText}
                </p>
              ) : null}
            </div>
            {buttons}
          </div>
        </div>
      </div>
    );
  }

  // Inline panel (card inside continuous-conversation strip)
  return (
    <div
      className={cn(
        "settle-panel",
        editing && "settle-panel-editing",
        className
      )}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                editing
                  ? "bg-brand-600 text-white dark:bg-brand-400 dark:text-brand-950"
                  : "bg-brand-600/10 text-brand-800 dark:bg-brand-400/15 dark:text-brand-100"
              )}
            >
              {editing ? (
                <>
                  <Pencil className="h-3 w-3" aria-hidden />
                  Editing
                </>
              ) : (
                <>
                  <Clock className="h-3 w-3" aria-hidden />
                  {settling && remainingSec != null && remainingSec > 0
                    ? `${remainingSec}s remaining`
                    : "Answer ready"}
                </>
              )}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-brand-800 dark:text-brand-100">
            {statusText}
          </p>
        </div>
      </div>
      {buttons}
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
