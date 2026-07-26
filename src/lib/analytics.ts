/**
 * Personal mobility analytics from sessions, journal, and related data.
 */

import type {
  JournalEntry,
  ModalityLog,
  PainProfile,
  Routine,
  SessionLog,
} from "@/lib/types";

export interface AnalyticsSummary {
  generatedAt: string;
  sessions: {
    total: number;
    completed: number;
    totalMinutes: number;
    avgDuration: number;
    avgPainBefore: number | null;
    avgPainAfter: number | null;
    avgPainDelta: number | null;
    last7Days: number;
    last30Days: number;
    streakDays: number;
    byWeekday: { day: string; count: number }[];
    recent: {
      id: string;
      startedAt: string;
      durationMinutes: number;
      painBefore: number;
      painAfter: number;
      completed: boolean;
    }[];
  };
  journal: {
    total: number;
    last7Days: number;
    avgMood: number | null;
    avgPain: number | null;
    progressionCounts: Record<string, number>;
  };
  plan: {
    routineCount: number;
    activeRoutineName: string | null;
    focusAreas: string[];
  };
  pain: {
    latestOverall: number | null;
    latestAreas: string[];
    descriptorCount: number;
    historyPoints: { date: string; overall: number }[];
  };
  modalities: {
    logCount: number;
    last7Days: number;
  };
  consistency: {
    activeDaysLast30: number;
    sessionCompletionRate: number | null;
  };
}

function dayKey(iso: string): string {
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

function computeStreak(completedDates: string[]): number {
  if (!completedDates.length) return 0;
  const set = new Set(completedDates);
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  // Allow streak to start from yesterday if no session today yet
  const todayKey = cursor.toISOString().slice(0, 10);
  if (!set.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  for (let i = 0; i < 400; i++) {
    const k = cursor.toISOString().slice(0, 10);
    if (!set.has(k)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function computeAnalytics(input: {
  sessions: SessionLog[];
  journal: JournalEntry[];
  routines: Routine[];
  painProfiles: PainProfile[];
  modalityLogs: ModalityLog[];
}): AnalyticsSummary {
  const { sessions, journal, routines, painProfiles, modalityLogs } = input;
  const completed = sessions.filter((s) => s.completed);
  const now = Date.now();
  const d7 = daysAgo(7).getTime();
  const d30 = daysAgo(30).getTime();

  const painBefore = completed.map((s) => s.averagePainBefore).filter(Number.isFinite);
  const painAfter = completed.map((s) => s.averagePainAfter).filter(Number.isFinite);
  const avgBefore = avg(painBefore);
  const avgAfter = avg(painAfter);

  const completedDates = completed
    .map((s) => dayKey(s.startedAt || s.completedAt || ""))
    .filter(Boolean);

  const weekdayCounts = Array.from({ length: 7 }, (_, i) => ({
    day: WEEKDAYS[i],
    count: 0,
  }));
  for (const s of completed) {
    const t = new Date(s.startedAt).getTime();
    if (!Number.isFinite(t)) continue;
    weekdayCounts[new Date(s.startedAt).getDay()].count += 1;
  }

  const last7Sessions = completed.filter(
    (s) => new Date(s.startedAt).getTime() >= d7
  ).length;
  const last30Sessions = completed.filter(
    (s) => new Date(s.startedAt).getTime() >= d30
  ).length;

  const totalMinutes = completed.reduce(
    (n, s) => n + (Number(s.durationMinutes) || 0),
    0
  );

  const journalRecent = journal.filter(
    (j) => new Date(j.createdAt).getTime() >= d7
  );
  const moods = journal.map((j) => j.mood).filter((m) => m >= 1 && m <= 5);
  const jPains = journal.map((j) => j.painOverall).filter(Number.isFinite);
  const progressionCounts: Record<string, number> = {};
  for (const j of journal) {
    const sig = j.progressionSignal || "none";
    progressionCounts[sig] = (progressionCounts[sig] || 0) + 1;
  }

  const sortedPain = [...painProfiles].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  const latestPain = sortedPain[0] || null;

  const activeDays = new Set<string>();
  for (const s of completed) {
    const t = new Date(s.startedAt).getTime();
    if (t >= d30) activeDays.add(dayKey(s.startedAt));
  }
  for (const j of journal) {
    const t = new Date(j.createdAt).getTime();
    if (t >= d30) activeDays.add(dayKey(j.createdAt));
  }

  const focusSet = new Set<string>();
  for (const r of routines) {
    for (const a of r.focusAreas || []) focusSet.add(a);
  }

  const primaryRoutine =
    [...routines].sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt || 0).getTime() -
        new Date(a.updatedAt || a.createdAt || 0).getTime()
    )[0] || null;

  return {
    generatedAt: new Date(now).toISOString(),
    sessions: {
      total: sessions.length,
      completed: completed.length,
      totalMinutes,
      avgDuration:
        completed.length === 0
          ? 0
          : Math.round((totalMinutes / completed.length) * 10) / 10,
      avgPainBefore: avgBefore,
      avgPainAfter: avgAfter,
      avgPainDelta:
        avgBefore != null && avgAfter != null
          ? Math.round((avgAfter - avgBefore) * 10) / 10
          : null,
      last7Days: last7Sessions,
      last30Days: last30Sessions,
      streakDays: computeStreak(completedDates),
      byWeekday: weekdayCounts,
      recent: [...sessions]
        .sort(
          (a, b) =>
            new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
        )
        .slice(0, 12)
        .map((s) => ({
          id: s.id,
          startedAt: s.startedAt,
          durationMinutes: s.durationMinutes,
          painBefore: s.averagePainBefore,
          painAfter: s.averagePainAfter,
          completed: Boolean(s.completed),
        })),
    },
    journal: {
      total: journal.length,
      last7Days: journalRecent.length,
      avgMood: avg(moods),
      avgPain: avg(jPains),
      progressionCounts,
    },
    plan: {
      routineCount: routines.length,
      activeRoutineName: primaryRoutine?.name || null,
      focusAreas: Array.from(focusSet).slice(0, 12),
    },
    pain: {
      latestOverall: latestPain?.overallPain ?? null,
      latestAreas: latestPain?.areas || [],
      descriptorCount: latestPain?.descriptorIds?.length || 0,
      historyPoints: sortedPain
        .slice(0, 30)
        .reverse()
        .map((p) => ({
          date: p.updatedAt,
          overall: p.overallPain,
        })),
    },
    modalities: {
      logCount: modalityLogs.length,
      last7Days: modalityLogs.filter(
        (m) => new Date(m.usedAt).getTime() >= d7
      ).length,
    },
    consistency: {
      activeDaysLast30: activeDays.size,
      sessionCompletionRate:
        sessions.length === 0
          ? null
          : Math.round((completed.length / sessions.length) * 100),
    },
  };
}
