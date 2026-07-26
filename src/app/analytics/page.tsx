"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  BarChart3,
  BookOpen,
  Calendar,
  Flame,
  Gauge,
  Mail,
  Shield,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import type { AnalyticsSummary } from "@/lib/analytics";
import type { AdminSignupBucket, AdminSummary, AdminUserRow } from "@/lib/admin";

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">{label}</p>
        <Icon className="h-4 w-4 text-brand-500" />
      </div>
      <p className="mt-2 text-2xl font-bold text-brand-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-brand-600">{hint}</p>}
    </div>
  );
}

function MiniBarChart({
  title,
  buckets,
  emptyLabel = "No data yet",
}: {
  title: string;
  buckets: AdminSignupBucket[];
  emptyLabel?: string;
}) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const hasAny = buckets.some((b) => b.count > 0);
  return (
    <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-3 dark:border-brand-800 dark:bg-brand-900/30">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-brand-500">
        {title}
      </p>
      {!hasAny ? (
        <p className="text-xs text-brand-500">{emptyLabel}</p>
      ) : (
        <div className="flex h-28 items-end gap-1">
          {buckets.map((b) => (
            <div key={b.key} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span className="text-[10px] font-semibold tabular-nums text-brand-700 dark:text-brand-200">
                {b.count > 0 ? b.count : ""}
              </span>
              <div
                className="w-full rounded-t bg-brand-500/80 dark:bg-brand-400/80"
                style={{ height: `${Math.max(b.count > 0 ? 8 : 2, (b.count / max) * 100)}%` }}
                title={`${b.label}: ${b.count}`}
              />
              <span className="w-full truncate text-center text-[9px] text-brand-500">
                {b.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function exportAdminCsv(users: AdminUserRow[]) {
  const headers = [
    "username",
    "email",
    "name",
    "preferredName",
    "createdAt",
    "role",
    "sessionCount",
    "journalCount",
    "routineCount",
    "modalityLogCount",
    "lastActivityAt",
    "biometricsEnabled",
    "twoFactorEnabled",
    "avatarSource",
  ];
  const escape = (v: string | number | boolean | null | undefined) => {
    const s = v == null ? "" : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const rows = users.map((u) =>
    [
      u.username,
      u.email,
      u.name,
      u.preferredName,
      u.createdAt,
      u.role,
      u.sessionCount,
      u.journalCount,
      u.routineCount,
      u.modalityLogCount,
      u.lastActivityAt,
      u.biometricsEnabled,
      u.twoFactorEnabled,
      u.avatarSource,
    ]
      .map(escape)
      .join(",")
  );
  const blob = new Blob([[headers.join(","), ...rows].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `motionrx-admin-users-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function formatDelta(n: number | null): string {
  if (n == null) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n}`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function UserAnalyticsPage() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminSummary, setAdminSummary] = useState<AdminSummary | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUserRow[]>([]);
  const [adminErr, setAdminErr] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminFilter, setAdminFilter] = useState("");
  const [primaryAdmin, setPrimaryAdmin] = useState("Christopher Stainberg");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const meRes = await apiFetch("/api/auth/me");
        const me = await meRes.json();
        if (cancelled) return;
        const admin = Boolean(me.user?.isAdmin);
        setIsAdmin(admin);

        const analyticsRes = await apiFetch("/api/analytics");
        const analyticsData = await analyticsRes.json();
        if (cancelled) return;
        if (analyticsData.analytics) setData(analyticsData.analytics);
        else setErr(analyticsData.error || "No analytics data");

        if (admin) {
          setAdminLoading(true);
          try {
            const adminRes = await apiFetch("/api/admin/users");
            const adminData = await adminRes.json();
            if (cancelled) return;
            if (adminRes.ok && adminData.ok) {
              setAdminSummary(adminData.summary || null);
              setAdminUsers(Array.isArray(adminData.users) ? adminData.users : []);
              if (typeof adminData.primaryAdmin === "string" && adminData.primaryAdmin) {
                setPrimaryAdmin(adminData.primaryAdmin);
              }
            } else {
              setAdminErr(adminData.error || "Could not load admin directory");
            }
          } catch {
            if (!cancelled) setAdminErr("Could not load admin directory");
          } finally {
            if (!cancelled) setAdminLoading(false);
          }
        }
      } catch {
        if (!cancelled) setErr("Could not load user analytics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const maxWeekday = data
    ? Math.max(1, ...data.sessions.byWeekday.map((d) => d.count))
    : 1;

  const filteredUsers = adminUsers.filter((u) => {
    const q = adminFilter.trim().toLowerCase();
    if (!q) return true;
    return (
      u.email.toLowerCase().includes(q) ||
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      (u.preferredName || "").toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-brand-950">
          <BarChart3 className="h-7 w-7 text-brand-600" />
          User Analytics
        </h1>
        <p className="mt-1 text-sm text-brand-700/85">
          Your personal mobility metrics
          {isAdmin ? " · Administrator directory for registered accounts" : ""}.
        </p>
      </div>

      {isAdmin && (
        <section className="card space-y-5 border-brand-200 p-5 ring-1 ring-brand-100 dark:border-brand-700 dark:ring-brand-800">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 font-semibold text-brand-900">
                <Shield className="h-5 w-5 text-brand-600" />
                Administrator analytics
              </h2>
              <p className="mt-1 text-xs text-brand-600">
                Primary admin: <strong>{primaryAdmin}</strong>. Accounts created, usernames,
                emails, engagement, and security posture for every registered user.
              </p>
            </div>
            <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-800 dark:bg-brand-900 dark:text-brand-100">
              Admin
            </span>
          </div>

          {adminLoading && (
            <p className="text-sm text-brand-600">Loading administrator directory…</p>
          )}
          {adminErr && (
            <p className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {adminErr}
            </p>
          )}

          {adminSummary && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  icon={Users}
                  label="Accounts created"
                  value={String(adminSummary.totalUsers)}
                  hint={`${adminSummary.adminCount} admin · +${adminSummary.createdLast7Days} this week`}
                />
                <StatCard
                  icon={Mail}
                  label="Emails on file"
                  value={String(adminSummary.emails?.length ?? adminSummary.totalUsers)}
                  hint="Unique registered emails"
                />
                <StatCard
                  icon={Calendar}
                  label="New (30 days)"
                  value={String(adminSummary.createdLast30Days)}
                  hint={`${adminSummary.createdLast90Days} in last 90 days`}
                />
                <StatCard
                  icon={Activity}
                  label="Active users (7d)"
                  value={String(adminSummary.activeUsersLast7Days)}
                  hint={`${adminSummary.activeUsersLast30Days} active in 30 days`}
                />
                <StatCard
                  icon={Calendar}
                  label="Newest account"
                  value={
                    adminSummary.newestAccountCreatedAt
                      ? new Date(adminSummary.newestAccountCreatedAt).toLocaleDateString()
                      : "—"
                  }
                  hint={formatDate(adminSummary.newestAccountCreatedAt)}
                />
                <StatCard
                  icon={Calendar}
                  label="Oldest account"
                  value={
                    adminSummary.oldestAccountCreatedAt
                      ? new Date(adminSummary.oldestAccountCreatedAt).toLocaleDateString()
                      : "—"
                  }
                  hint={formatDate(adminSummary.oldestAccountCreatedAt)}
                />
                <StatCard
                  icon={Target}
                  label="Platform sessions"
                  value={String(adminSummary.totalSessions)}
                  hint={`Avg ${adminSummary.avgSessionsPerUser}/user · ${adminSummary.totalRoutines} routines`}
                />
                <StatCard
                  icon={BookOpen}
                  label="Journal entries"
                  value={String(adminSummary.totalJournalEntries)}
                  hint={`Avg ${adminSummary.avgJournalPerUser}/user · ${adminSummary.totalCommunityPosts} community posts`}
                />
                <StatCard
                  icon={Shield}
                  label="Security posture"
                  value={`${adminSummary.withBiometrics} bio`}
                  hint={`${adminSummary.withTwoFactor} 2FA · ${adminSummary.withAvatar} with photo`}
                />
                <StatCard
                  icon={Gauge}
                  label="Modality logs"
                  value={String(adminSummary.totalModalityLogs)}
                  hint="Recorded modality uses across accounts"
                />
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <MiniBarChart
                  title="Accounts created (last 12 months)"
                  buckets={adminSummary.signupsByMonth || []}
                />
                <MiniBarChart
                  title="Accounts created (last 14 days)"
                  buckets={adminSummary.signupsByDay || []}
                />
              </div>

              {(adminSummary.usernames?.length || adminSummary.emails?.length) ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-brand-100 p-3 dark:border-brand-800">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-500">
                      Usernames ({adminSummary.usernames.length})
                    </p>
                    <ul className="mt-2 max-h-36 space-y-1 overflow-y-auto text-sm text-brand-800 dark:text-brand-100">
                      {adminSummary.usernames.map((name, i) => (
                        <li key={`${name}-${i}`} className="truncate">
                          {name}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-brand-100 p-3 dark:border-brand-800">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-500">
                      Email addresses ({adminSummary.emails.length})
                    </p>
                    <ul className="mt-2 max-h-36 space-y-1 overflow-y-auto text-sm text-brand-800 dark:text-brand-100">
                      {adminSummary.emails.map((email) => (
                        <li key={email} className="truncate">
                          <a href={`mailto:${email}`} className="hover:underline">
                            {email}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
            </>
          )}

          {adminUsers.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-brand-900">User directory</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    className="input max-w-xs py-2 text-sm"
                    placeholder="Filter by email, username, name…"
                    value={adminFilter}
                    onChange={(e) => setAdminFilter(e.target.value)}
                    aria-label="Filter users"
                  />
                  <button
                    type="button"
                    className="btn-secondary !py-2 text-xs"
                    onClick={() => exportAdminCsv(filteredUsers)}
                  >
                    Export CSV
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-brand-100 dark:border-brand-800">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-brand-50/80 text-xs uppercase tracking-wide text-brand-600 dark:bg-brand-900/50">
                    <tr>
                      <th className="px-3 py-2.5 font-semibold">Username</th>
                      <th className="px-3 py-2.5 font-semibold">Email</th>
                      <th className="px-3 py-2.5 font-semibold">Name</th>
                      <th className="px-3 py-2.5 font-semibold">Created</th>
                      <th className="px-3 py-2.5 font-semibold">Last active</th>
                      <th className="px-3 py-2.5 font-semibold">Activity</th>
                      <th className="px-3 py-2.5 font-semibold">Security</th>
                      <th className="px-3 py-2.5 font-semibold">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-50 dark:divide-brand-800">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="text-brand-800">
                        <td className="px-3 py-2.5 font-medium text-brand-900">{u.username}</td>
                        <td className="px-3 py-2.5 font-medium text-brand-900">
                          <a
                            href={`mailto:${u.email}`}
                            className="underline-offset-2 hover:underline"
                          >
                            {u.email}
                          </a>
                        </td>
                        <td className="px-3 py-2.5">
                          {u.name}
                          {u.preferredName && u.preferredName !== u.name ? (
                            <span className="block text-xs text-brand-500">
                              Preferred: {u.preferredName}
                            </span>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-xs text-brand-600">
                          {formatDate(u.createdAt)}
                          <span className="mt-0.5 block text-[10px] text-brand-400">
                            {u.daysSinceCreated}d ago
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-xs text-brand-600">
                          {formatDate(u.lastActivityAt)}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-brand-600">
                          <span className="block">{u.sessionCount} sessions</span>
                          <span className="block">{u.journalCount} journal · {u.routineCount} routines</span>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-brand-600">
                          {u.biometricsEnabled ? "Biometrics · " : ""}
                          {u.twoFactorEnabled ? "2FA · " : ""}
                          <span className="capitalize">{u.avatarSource}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={
                              u.role === "admin"
                                ? "rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-semibold text-brand-800 dark:bg-brand-900"
                                : "text-xs text-brand-500"
                            }
                          >
                            {u.role}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredUsers.length === 0 && (
                  <p className="px-3 py-4 text-sm text-brand-600">No users match that filter.</p>
                )}
              </div>
              <p className="text-[11px] text-brand-500">
                Showing {filteredUsers.length} of {adminUsers.length} registered accounts.
                Passwords are never shown.
              </p>
            </div>
          )}
        </section>
      )}

      <div>
        <h2 className="text-lg font-semibold text-brand-900">Your mobility metrics</h2>
        <p className="mt-0.5 text-xs text-brand-600">
          Private to your signed-in account on this device.
        </p>
      </div>

      {loading && (
        <p className="text-sm text-brand-600">Loading your user analytics…</p>
      )}
      {err && (
        <p className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {err}
        </p>
      )}

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Activity}
              label="Completed sessions"
              value={String(data.sessions.completed)}
              hint={`${data.sessions.totalMinutes} min total · ${data.sessions.avgDuration} min avg`}
            />
            <StatCard
              icon={Flame}
              label="Practice streak"
              value={`${data.sessions.streakDays}d`}
              hint={`${data.sessions.last7Days} sessions in last 7 days`}
            />
            <StatCard
              icon={Gauge}
              label="Pain change"
              value={formatDelta(data.sessions.avgPainDelta)}
              hint={
                data.sessions.avgPainBefore != null
                  ? `Avg ${data.sessions.avgPainBefore} → ${data.sessions.avgPainAfter} (after − before)`
                  : "Complete sessions with pain ratings"
              }
            />
            <StatCard
              icon={Calendar}
              label="Active days (30d)"
              value={String(data.consistency.activeDaysLast30)}
              hint={
                data.consistency.sessionCompletionRate != null
                  ? `${data.consistency.sessionCompletionRate}% session completion`
                  : "Log sessions to unlock rate"
              }
            />
          </div>

          <section className="card space-y-4 p-5">
            <h2 className="flex items-center gap-2 font-semibold text-brand-900">
              <BarChart3 className="h-5 w-5 text-brand-600" />
              Sessions by weekday
            </h2>
            <div className="flex items-end gap-2 sm:gap-3">
              {data.sessions.byWeekday.map((d) => (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[11px] font-medium text-brand-700">{d.count}</span>
                  <div
                    className="w-full max-w-[2.5rem] rounded-t-md bg-brand-500/90 dark:bg-brand-400"
                    style={{
                      height: `${Math.max(6, Math.round((d.count / maxWeekday) * 96))}px`,
                    }}
                    title={`${d.day}: ${d.count}`}
                  />
                  <span className="text-[11px] text-brand-500">{d.day}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-brand-500">
              Last 30 days: {data.sessions.last30Days} completed sessions
            </p>
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <section className="card space-y-3 p-5">
              <h2 className="flex items-center gap-2 font-semibold text-brand-900">
                <BookOpen className="h-5 w-5 text-brand-600" />
                Journal
              </h2>
              <ul className="space-y-2 text-sm text-brand-800">
                <li>
                  Entries: <strong>{data.journal.total}</strong> ({data.journal.last7Days} last 7d)
                </li>
                <li>
                  Avg mood:{" "}
                  <strong>{data.journal.avgMood != null ? data.journal.avgMood : "—"}</strong> / 5
                </li>
                <li>
                  Avg journal pain:{" "}
                  <strong>{data.journal.avgPain != null ? data.journal.avgPain : "—"}</strong>
                </li>
              </ul>
              {Object.keys(data.journal.progressionCounts).length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {Object.entries(data.journal.progressionCounts).map(([k, v]) => (
                    <span
                      key={k}
                      className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-800 dark:bg-brand-900"
                    >
                      {k}: {v}
                    </span>
                  ))}
                </div>
              )}
            </section>

            <section className="card space-y-3 p-5">
              <h2 className="flex items-center gap-2 font-semibold text-brand-900">
                <Target className="h-5 w-5 text-brand-600" />
                Plan & pain profile
              </h2>
              <ul className="space-y-2 text-sm text-brand-800">
                <li>
                  Routines: <strong>{data.plan.routineCount}</strong>
                </li>
                <li>
                  Active:{" "}
                  <strong>{data.plan.activeRoutineName || "None yet"}</strong>
                </li>
                <li>
                  Latest overall pain:{" "}
                  <strong>
                    {data.pain.latestOverall != null ? data.pain.latestOverall : "—"}
                  </strong>
                </li>
                <li>
                  Descriptors tracked: <strong>{data.pain.descriptorCount}</strong>
                </li>
              </ul>
              {data.plan.focusAreas.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {data.plan.focusAreas.map((a) => (
                    <span
                      key={a}
                      className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium capitalize text-brand-800 dark:bg-brand-900"
                    >
                      {a.replace(/-/g, " ")}
                    </span>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="card space-y-3 p-5">
            <h2 className="flex items-center gap-2 font-semibold text-brand-900">
              <Sparkles className="h-5 w-5 text-brand-600" />
              Modalities
            </h2>
            <p className="text-sm text-brand-800">
              Logged uses: <strong>{data.modalities.logCount}</strong> · Last 7 days:{" "}
              <strong>{data.modalities.last7Days}</strong>
            </p>
          </section>

          <section className="card space-y-3 p-5">
            <h2 className="font-semibold text-brand-900">Recent sessions</h2>
            {data.sessions.recent.length === 0 ? (
              <p className="text-sm text-brand-600">
                No sessions yet.{" "}
                <Link href="/routines" className="font-semibold text-brand-700 underline">
                  Start a plan session
                </Link>
                .
              </p>
            ) : (
              <ul className="divide-y divide-brand-50 dark:divide-brand-800">
                {data.sessions.recent.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                  >
                    <div>
                      <p className="font-medium text-brand-900">
                        {new Date(s.startedAt).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                      <p className="text-xs text-brand-500">
                        {s.durationMinutes} min · pain {s.painBefore}→{s.painAfter}
                        {!s.completed && " · incomplete"}
                      </p>
                    </div>
                    <span
                      className={
                        s.painAfter - s.painBefore <= 0
                          ? "text-xs font-semibold text-emerald-700"
                          : "text-xs font-semibold text-amber-700"
                      }
                    >
                      {formatDelta(Math.round((s.painAfter - s.painBefore) * 10) / 10)} pain
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="text-center text-[11px] text-brand-400">
            Generated {new Date(data.generatedAt).toLocaleString()} · Private to your account
            session
          </p>
        </>
      )}
    </div>
  );
}
