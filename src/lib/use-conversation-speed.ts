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
    // Same-tab listeners (other mounts) via custom event
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
 * Any change to `resetKey` restarts the countdown (user is editing).
 * **Edit** pauses until the next keystroke; **Send** settles immediately.
 */
export function useAnswerSettleCountdown(opts: {
  /** When true, countdown runs toward commit */
  armed: boolean;
  /** Changes reset the timer (user is still editing) */
  resetKey: string;
  delayMs: number;
  /** Fires once when countdown reaches 0 while armed */
  onSettled?: () => void;
}): {
  remainingMs: number;
  remainingSec: number;
  settling: boolean;
  settled: boolean;
  /** Paused via Edit — waiting for user to type again */
  editing: boolean;
  /** Pause countdown; stay paused until resetKey changes */
  edit: () => void;
  /** Commit immediately (Send) */
  sendNow: () => void;
  cancel: () => void;
} {
  const { armed, resetKey, delayMs, onSettled } = opts;
  const [remainingMs, setRemainingMs] = useState(0);
  const [settled, setSettled] = useState(false);
  const [editing, setEditing] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const settledOnceRef = useRef(false);

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

  const sendNow = useCallback(() => {
    setEditing(false);
    setRemainingMs(0);
    settledOnceRef.current = true;
    setSettled(true);
    onSettled?.();
  }, [onSettled]);

  // User typed after Edit → clear pause and restart countdown
  useEffect(() => {
    if (editing) {
      setEditing(false);
    }
    settledOnceRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when content changes
  }, [resetKey]);

  useEffect(() => {
    if (!armed) {
      setRemainingMs(0);
      setSettled(false);
      setEditing(false);
      settledOnceRef.current = false;
      return;
    }

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
        settledOnceRef.current = true;
        setSettled(true);
        onSettled?.();
      }
    }, 100);

    return () => {
      window.clearInterval(tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armed, resetKey, delayMs, epoch, editing]);

  return {
    remainingMs,
    remainingSec: Math.ceil(remainingMs / 1000),
    settling: armed && !editing && remainingMs > 0 && !settled,
    settled: armed && settled,
    editing: armed && editing,
    edit,
    sendNow,
    cancel,
  };
}
