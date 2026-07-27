/**
 * Activity level + return-to-activity framing (PhysioPath-inspired).
 */

export type ActivityLevelId =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "athlete"
  | "unknown";

export type ActivityLevel = {
  id: ActivityLevelId;
  label: string;
  hint: string;
  minutesScale: number;
  exerciseBias: number;
  preferTags: string[];
};

export const ACTIVITY_LEVELS: ActivityLevel[] = [
  {
    id: "sedentary",
    label: "Mostly sedentary",
    hint: "Desk-heavy day, little planned exercise",
    minutesScale: 0.85,
    exerciseBias: -0.1,
    preferTags: ["gentle", "mobility", "posture", "desk"],
  },
  {
    id: "light",
    label: "Lightly active",
    hint: "Walks, light chores, 1–2 easy sessions/week",
    minutesScale: 0.95,
    exerciseBias: 0,
    preferTags: ["functional", "mobility", "walking"],
  },
  {
    id: "moderate",
    label: "Moderately active",
    hint: "Regular exercise or physically demanding work",
    minutesScale: 1,
    exerciseBias: 0.1,
    preferTags: ["strength", "functional", "endurance"],
  },
  {
    id: "active",
    label: "Very active",
    hint: "Training most days or heavy labor",
    minutesScale: 1,
    exerciseBias: 0.2,
    preferTags: ["strength", "capacity", "functional"],
  },
  {
    id: "athlete",
    label: "Competitive / athletic",
    hint: "Sport or high-performance training",
    minutesScale: 1,
    exerciseBias: 0.25,
    preferTags: ["sport", "capacity", "motor-control", "strength"],
  },
];

export function getActivityLevel(id?: string | null): ActivityLevel | undefined {
  if (!id || id === "unknown") return undefined;
  return ACTIVITY_LEVELS.find((a) => a.id === id);
}
