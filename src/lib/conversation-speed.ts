/**
 * Shared conversation-flow pacing for Assessment, Journal, and Jeffery.
 * Default: 5s settle after a complete answer before the next question advances,
 * so users can still edit. Stored in localStorage and shared app-wide.
 */

export const CONVERSATION_SPEED_KEY = "motionrx-conversation-speed-ms";

/** Default settle time before next question / answer commit (ms). */
export const DEFAULT_CONVERSATION_DELAY_MS = 5000;

export const MIN_CONVERSATION_DELAY_MS = 1000;
export const MAX_CONVERSATION_DELAY_MS = 20000;
export const CONVERSATION_DELAY_STEP_MS = 1000;

export type ConversationSpeedPreset = {
  id: string;
  label: string;
  delayMs: number;
  description: string;
};

export const CONVERSATION_SPEED_PRESETS: ConversationSpeedPreset[] = [
  {
    id: "fast",
    label: "Faster",
    delayMs: 2000,
    description: "2s to edit before the next question",
  },
  {
    id: "default",
    label: "Default",
    delayMs: 5000,
    description: "5s to edit before the next question",
  },
  {
    id: "slow",
    label: "Slower",
    delayMs: 8000,
    description: "8s to edit before the next question",
  },
  {
    id: "relaxed",
    label: "Relaxed",
    delayMs: 12000,
    description: "12s to edit before the next question",
  },
];

export function clampConversationDelayMs(ms: number): number {
  if (!Number.isFinite(ms)) return DEFAULT_CONVERSATION_DELAY_MS;
  const stepped = Math.round(ms / CONVERSATION_DELAY_STEP_MS) * CONVERSATION_DELAY_STEP_MS;
  return Math.min(
    MAX_CONVERSATION_DELAY_MS,
    Math.max(MIN_CONVERSATION_DELAY_MS, stepped)
  );
}

export function loadConversationDelayMs(): number {
  if (typeof window === "undefined") return DEFAULT_CONVERSATION_DELAY_MS;
  try {
    const raw = localStorage.getItem(CONVERSATION_SPEED_KEY);
    if (raw == null || raw === "") return DEFAULT_CONVERSATION_DELAY_MS;
    return clampConversationDelayMs(Number(raw));
  } catch {
    return DEFAULT_CONVERSATION_DELAY_MS;
  }
}

export function saveConversationDelayMs(ms: number): number {
  const next = clampConversationDelayMs(ms);
  if (typeof window === "undefined") return next;
  try {
    localStorage.setItem(CONVERSATION_SPEED_KEY, String(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function conversationDelaySeconds(ms: number): number {
  return Math.round(clampConversationDelayMs(ms) / 1000);
}

export function nearestSpeedPreset(ms: number): ConversationSpeedPreset | null {
  const d = clampConversationDelayMs(ms);
  return CONVERSATION_SPEED_PRESETS.find((p) => p.delayMs === d) || null;
}
