"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CONVERSATION_DELAY_STEP_MS,
  DEFAULT_CONVERSATION_DELAY_MS,
  loadConversationDelayMs,
  saveConversationDelayMs,
  clampConversationDelayMs,
} from "@/lib/conversation-speed";

/**
 * App-wide conversation settle delay (default 5s).
 * Changing speed in one section updates all sections via storage event + same key.
 */
export function useConversationSpeed() {
  const [delayMs, setDelayMsState] = useState(DEFAULT_CONVERSATION_DELAY_MS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDelayMsState(loadConversationDelayMs());
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === "motionrx-conversation-speed-ms" && e.newValue != null) {
        setDelayMsState(clampConversationDelayMs(Number(e.newValue)));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setDelayMs = useCallback((ms: number) => {
    const next = saveConversationDelayMs(ms);
    setDelayMsState(next);
    try {
      window.dispatchEvent(
        new CustomEvent("motionrx-conversation-speed", { detail: next })
      );
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const onLocal = (e: Event) => {
      const detail = (e as CustomEvent<number>).detail;
      if (typeof detail === "number") setDelayMsState(clampConversationDelayMs(detail));
    };
    window.addEventListener("motionrx-conversation-speed", onLocal);
    return () => window.removeEventListener("motionrx-conversation-speed", onLocal);
  }, []);

  const faster = useCallback(() => {
    setDelayMs(delayMs - CONVERSATION_DELAY_STEP_MS);
  }, [delayMs, setDelayMs]);

  const slower = useCallback(() => {
    setDelayMs(delayMs + CONVERSATION_DELAY_STEP_MS);
  }, [delayMs, setDelayMs]);

  return {
    delayMs,
    delaySec: Math.round(delayMs / 1000),
    setDelayMs,
    faster,
    slower,
    ready,
  };
}

/**
 * After a complete answer is detected (`armed`), wait `delayMs` before `settled`.
 * Any change to `resetKey` restarts the countdown (user is editing content).
 *
 * Send/Edit UI lives permanently in the text-box chrome (not show/hide).
 * **Edit** pauses the auto-timer; **Send** settles immediately.
 */
export function useAnswerSettleCountdown(opts: {
  /** When true, countdown runs toward commit */
  armed: boolean;
  /** Changes reset the timer (user is still editing content) */
  resetKey: string;
  delayMs: number;
  /** Fires once when countdown reaches 0 while armed (not used for Send — Send is immediate in callers) */
  onSettled?: () => void;
}): {
  remainingMs: number;
  remainingSec: number;
  settling: boolean;
  settled: boolean;
  /** Paused via Edit — waiting for user to type again */
  editing: boolean;
  /**
   * @deprecated Send/Edit are always visible in the text box. Kept for compatibility.
   * True while settle is active or after Edit.
   */
  showControls: boolean;
  /** Pause countdown until type/Send */
  edit: () => void;
  /** Commit immediately (Send) — no delay */
  sendNow: () => void;
  cancel: () => void;
} {
  const { armed, resetKey, delayMs, onSettled } = opts;
  const [remainingMs, setRemainingMs] = useState(0);
  const [settled, setSettled] = useState(false);
  const [editing, setEditing] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const settledOnceRef = useRef(false);
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;

  const cancel = useCallback(() => {
    setRemainingMs(0);
    setSettled(false);
    setEditing(false);
    settledOnceRef.current = false;
    setEpoch((e) => e + 1);
  }, []);

  const edit = useCallback(() => {
    setRemainingMs(0);
    setSettled(false);
    setEditing(true);
    settledOnceRef.current = false;
    setEpoch((e) => e + 1);
  }, []);

  /** Immediate commit — no settle delay, clear edit hold, fire settled once */
  const sendNow = useCallback(() => {
    setEditing(false);
    setRemainingMs(0);
    if (!settledOnceRef.current) {
      settledOnceRef.current = true;
      setSettled(true);
      // Synchronous callback so callers can advance in the same turn
      onSettledRef.current?.();
    } else {
      setSettled(true);
    }
  }, []);

  // User typed after Edit → release pause, restart countdown
  useEffect(() => {
    if (editing) {
      setEditing(false);
    }
    // Typing means not yet committed
    settledOnceRef.current = false;
    setSettled(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when content changes
  }, [resetKey]);

  // Clear settle state when answer is no longer complete (disarmed)
  useEffect(() => {
    if (!armed) {
      setRemainingMs(0);
      setSettled(false);
      setEditing(false);
      settledOnceRef.current = false;
    }
  }, [armed]);

  useEffect(() => {
    if (!armed) {
      return;
    }

    // Edit pause: no auto-timer; user can still Send from the text-box bar
    if (editing) {
      setRemainingMs(0);
      setSettled(false);
      return;
    }

    if (settledOnceRef.current) {
      return;
    }

    setSettled(false);
    const total = Math.max(0, delayMs);
    setRemainingMs(total);
    const started = Date.now();
    let done = false;

    const tick = window.setInterval(() => {
      const left = Math.max(0, total - (Date.now() - started));
      setRemainingMs(left);
      if (left <= 0 && !done) {
        done = true;
        window.clearInterval(tick);
        if (!settledOnceRef.current) {
          settledOnceRef.current = true;
          setSettled(true);
          onSettledRef.current?.();
        }
      }
    }, 50); // snappier tick so last second feels responsive

    return () => {
      window.clearInterval(tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armed, resetKey, delayMs, epoch, editing]);

  const settling = Boolean(armed && !editing && remainingMs > 0 && !settled);
  // Compatibility: formerly gated UI; buttons are always mounted now
  const showControls = Boolean(editing || settling || (armed && !settled));

  return {
    remainingMs,
    remainingSec: Math.ceil(remainingMs / 1000),
    settling,
    settled: Boolean(settled),
    editing: Boolean(editing),
    showControls,
    edit,
    sendNow,
    cancel,
  };
}
