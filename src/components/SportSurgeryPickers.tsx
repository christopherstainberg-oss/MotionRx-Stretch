"use client";

import { useMemo, useState } from "react";
import {
  searchSports,
  getSportById,
  matchSportsFromText,
  type Sport,
} from "@/data/sports";
import {
  searchSurgeries,
  getSurgeryById,
  detectSurgeriesFromText,
  weeksSinceSurgery,
  surgeryPhaseLabel,
  type Surgery,
  type SurgeryTextMatch,
} from "@/data/surgeries";
import {
  ACTIVITY_LEVELS,
  type ActivityLevelId,
} from "@/lib/activity-level";
import { Activity, Search, Trophy, X } from "lucide-react";

export type SportSurgeryValue = {
  sportIds: string[];
  surgeryId?: string;
  surgeryDate?: string;
  activityLevel?: ActivityLevelId | "unknown";
};

export function SportSurgeryPickers({
  value,
  onChange,
  concernParagraph = "",
  compact = false,
}: {
  value: SportSurgeryValue;
  onChange: (v: SportSurgeryValue) => void;
  concernParagraph?: string;
  compact?: boolean;
}) {
  const [sportQ, setSportQ] = useState("");
  const [surgQ, setSurgQ] = useState("");

  const sportResults = useMemo(
    () => searchSports(sportQ, sportQ.trim() ? 12 : 8),
    [sportQ]
  );
  const surgResults = useMemo(
    () => searchSurgeries(surgQ, surgQ.trim() ? 12 : 8),
    [surgQ]
  );

  const textSports = useMemo(
    () => matchSportsFromText(concernParagraph, 4),
    [concernParagraph]
  );
  const textSurgeryMatches = useMemo(
    () => detectSurgeriesFromText(concernParagraph, 3),
    [concernParagraph]
  );

  const selectedSports = value.sportIds
    .map((id) => getSportById(id))
    .filter(Boolean) as Sport[];
  const selectedSurgery = value.surgeryId
    ? getSurgeryById(value.surgeryId)
    : undefined;
  const weeks = weeksSinceSurgery(value.surgeryDate);

  function toggleSport(sp: Sport) {
    const has = value.sportIds.includes(sp.id);
    onChange({
      ...value,
      sportIds: has
        ? value.sportIds.filter((id) => id !== sp.id)
        : [...value.sportIds, sp.id].slice(0, 4),
    });
  }

  function pickSurgery(su: Surgery) {
    onChange({ ...value, surgeryId: su.id });
    setSurgQ("");
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {/* Activity level */}
      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-500">
          <Activity className="h-3.5 w-3.5" />
          Current activity level
        </p>
        <select
          className="input text-sm"
          value={value.activityLevel || "unknown"}
          onChange={(e) =>
            onChange({
              ...value,
              activityLevel: e.target.value as ActivityLevelId | "unknown",
            })
          }
        >
          <option value="unknown">Not specified</option>
          {ACTIVITY_LEVELS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label} — {a.hint}
            </option>
          ))}
        </select>
      </div>

      {/* Sports */}
      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-500">
          <Trophy className="h-3.5 w-3.5" />
          Return-to-sport goals
        </p>
        {selectedSports.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {selectedSports.map((sp) => (
              <button
                key={sp.id}
                type="button"
                onClick={() => toggleSport(sp)}
                className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-900 dark:bg-brand-900 dark:text-brand-100"
              >
                {sp.name}
                <X className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}
        {textSports.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {textSports.map((sp) => (
              <button
                key={`t-${sp.id}`}
                type="button"
                disabled={value.sportIds.includes(sp.id)}
                onClick={() => toggleSport(sp)}
                className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-900 disabled:opacity-50 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100"
              >
                {value.sportIds.includes(sp.id) ? "✓ " : "+ "}
                {sp.name}
              </button>
            ))}
          </div>
        )}
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-brand-400" />
          <input
            value={sportQ}
            onChange={(e) => setSportQ(e.target.value)}
            placeholder="Search sports (soccer, running, pickleball…)"
            className="input w-full pl-8 text-sm"
          />
        </div>
        {(sportQ.trim() || !selectedSports.length) && (
          <ul className="mt-1.5 max-h-36 overflow-y-auto rounded-lg border border-brand-100 dark:border-brand-800">
            {sportResults.map((sp) => (
              <li key={sp.id}>
                <button
                  type="button"
                  onClick={() => {
                    toggleSport(sp);
                    setSportQ("");
                  }}
                  className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-brand-50 dark:hover:bg-brand-900/40"
                >
                  <span className="font-medium">{sp.name}</span>
                  <span className="text-[11px] text-brand-500">
                    {sp.impact} impact · {sp.rtpNote.slice(0, 72)}
                    {sp.rtpNote.length > 72 ? "…" : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Surgery */}
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-brand-500">
          Surgery (if any)
        </p>
        {selectedSurgery ? (
          <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900 dark:bg-amber-950/30">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-brand-950 dark:text-brand-50">
                  {selectedSurgery.name}
                </p>
                <p className="text-xs text-brand-600">
                  {surgeryPhaseLabel(weeks, selectedSurgery)}
                </p>
                <p className="mt-1 text-xs text-brand-500">
                  {selectedSurgery.education}
                </p>
              </div>
              <button
                type="button"
                className="text-brand-500"
                onClick={() =>
                  onChange({
                    ...value,
                    surgeryId: undefined,
                    surgeryDate: undefined,
                  })
                }
                aria-label="Clear surgery"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="mt-2 block text-xs">
              <span className="font-medium text-brand-700">Surgery date</span>
              <input
                type="date"
                className="input mt-0.5 w-full text-sm"
                value={value.surgeryDate || ""}
                onChange={(e) =>
                  onChange({ ...value, surgeryDate: e.target.value || undefined })
                }
              />
            </label>
          </div>
        ) : (
          <>
            {textSurgeryMatches.length > 0 && (
              <div className="mb-2 space-y-1.5">
                <p className="text-[11px] text-brand-500">
                  From Your Story (tap only if correct — nothing auto-selected)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {textSurgeryMatches.map((m: SurgeryTextMatch) => (
                    <button
                      key={m.surgery.id}
                      type="button"
                      onClick={() => pickSurgery(m.surgery)}
                      title={m.reason}
                      className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
                    >
                      + {m.surgery.name}
                      <span className="ml-1 opacity-70">
                        · “{m.matchedPhrase}” · {m.confidence}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-brand-400" />
              <input
                value={surgQ}
                onChange={(e) => setSurgQ(e.target.value)}
                placeholder="Search surgeries (ACL, TKA, rotator cuff…)"
                className="input w-full pl-8 text-sm"
              />
            </div>
            {surgQ.trim().length >= 1 && (
              <ul className="mt-1.5 max-h-36 overflow-y-auto rounded-lg border border-brand-100 dark:border-brand-800">
                {surgResults.map((su) => (
                  <li key={su.id}>
                    <button
                      type="button"
                      onClick={() => pickSurgery(su)}
                      className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-brand-50 dark:hover:bg-brand-900/40"
                    >
                      <span className="font-medium">{su.name}</span>
                      <span className="text-[11px] text-brand-500">
                        {su.region} · ~{su.protectWeeksTypical} wk protective education
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
