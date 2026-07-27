"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  VITAL_DEFS,
  addVitalReading,
  analyzeVitals,
  loadVitals,
  type VitalReading,
} from "@/lib/vitals";
import {
  LAB_TESTS,
  LAB_TEST_BY_KEY,
  interpretLabValue,
  resolveRange,
  type LabReport,
  type LabValueEntry,
} from "@/data/labs";
import {
  LAB_ACCEPTED_EXTENSIONS,
  LAB_ACCEPTED_LABEL,
  buildLabReportFromParse,
  parseLabContent,
  readLabFileAsText,
} from "@/lib/lab-parse";
import {
  addLabReport,
  deleteLabReport,
  labsPlanHints,
  loadLabReports,
} from "@/lib/labs-store";
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  FileUp,
  HeartPulse,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

function statusColor(status?: string) {
  if (!status || status === "normal") return "text-emerald-700 dark:text-emerald-300";
  if (status.startsWith("critical")) return "text-rose-700 font-bold dark:text-rose-300";
  if (status === "high" || status === "low")
    return "text-amber-800 dark:text-amber-200";
  return "text-brand-600";
}

export function VitalsLabsPanel({
  sex,
  compact = false,
}: {
  sex?: string | null;
  compact?: boolean;
}) {
  const [tab, setTab] = useState<"vitals" | "labs">("vitals");
  /** All Labs catalog card — collapsed when Labs tab is opened */
  const [allLabsExpanded, setAllLabsExpanded] = useState(false);
  const [vitals, setVitals] = useState<VitalReading[]>([]);
  const [labs, setLabs] = useState<LabReport[]>([]);
  const [hr, setHr] = useState("");
  const [sys, setSys] = useState("");
  const [dia, setDia] = useState("");
  const [spo2, setSpo2] = useState("");
  const [temp, setTemp] = useState("");
  const [weight, setWeight] = useState("");
  const [paste, setPaste] = useState("");
  const [parseNote, setParseNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [manualKey, setManualKey] = useState("hemoglobin");
  const [manualVal, setManualVal] = useState("");

  const refresh = useCallback(() => {
    setVitals(loadVitals());
    setLabs(loadLabReports());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const analysis = useMemo(() => analyzeVitals(vitals), [vitals]);
  const labHints = useMemo(() => labsPlanHints(labs, sex), [labs, sex]);

  const labsByCategory = useMemo(() => {
    const map = new Map<string, typeof LAB_TESTS>();
    for (const t of LAB_TESTS) {
      const list = map.get(t.category) || [];
      list.push(t);
      map.set(t.category, list);
    }
    return Array.from(map.entries());
  }, []);

  function openTab(next: "vitals" | "labs") {
    setTab(next);
    if (next === "labs") {
      // Keep All Labs card collapsed when Labs is selected
      setAllLabsExpanded(false);
    }
  }

  function saveVitals() {
    const num = (s: string) => {
      const n = Number(s);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    };
    addVitalReading({
      heart_rate: num(hr),
      systolic: num(sys),
      diastolic: num(dia),
      spo2: num(spo2),
      temperature_f: num(temp),
      weight_lb: num(weight),
    });
    setHr("");
    setSys("");
    setDia("");
    setSpo2("");
    setTemp("");
    setWeight("");
    refresh();
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setParseNote("");
    try {
      for (const file of Array.from(files)) {
        const { text, warning, format } = await readLabFileAsText(file);
        if (warning && !text) {
          setParseNote(warning);
          continue;
        }
        const parsed = parseLabContent(text, {
          fileName: file.name,
          mimeType: file.type,
          sex,
        });
        if (warning) parsed.warnings.push(warning);
        if (format) parsed.warnings.push(`Read as ${format}`);
        // also try server parse for consistency
        try {
          const res = await fetch("/api/labs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text,
              fileName: file.name,
              mimeType: file.type,
              sex,
            }),
          });
          if (res.ok) {
            const data = (await res.json()) as {
              values?: LabValueEntry[];
              warnings?: string[];
              collectedAt?: string;
            };
            if (data.values?.length) {
              parsed.values = data.values;
              parsed.warnings = [
                ...parsed.warnings,
                ...(data.warnings || []),
              ];
              if (data.collectedAt) parsed.collectedAt = data.collectedAt;
            }
          }
        } catch {
          /* client parse already done */
        }
        const report = buildLabReportFromParse(parsed, {
          fileName: file.name,
          fileType: file.type || format,
        });
        addLabReport(report);
        setParseNote(
          report.values.length
            ? `Parsed ${report.values.length} value(s) from ${file.name}.`
            : `No values from ${file.name}. ${report.parseWarnings?.join(" ") || ""}`
        );
      }
      refresh();
    } finally {
      setBusy(false);
    }
  }

  function parsePaste() {
    if (!paste.trim()) return;
    const parsed = parseLabContent(paste, { fileName: "paste.txt", sex });
    const report = buildLabReportFromParse(parsed, {
      fileName: "pasted-report.txt",
      fileType: "text/plain",
    });
    addLabReport(report);
    setParseNote(
      report.values.length
        ? `Parsed ${report.values.length} value(s) from paste.`
        : `No values found. ${report.parseWarnings?.join(" ") || ""}`
    );
    setPaste("");
    refresh();
  }

  function addManualLab() {
    const n = Number(manualVal);
    if (!Number.isFinite(n)) return;
    const def = LAB_TEST_BY_KEY[manualKey];
    if (!def) return;
    const interp = interpretLabValue(def, n, sex);
    const report: LabReport = {
      id: `lab-manual-${Date.now()}`,
      collectedAt: new Date().toISOString().slice(0, 10),
      uploadedAt: new Date().toISOString(),
      fileName: "manual-entry",
      fileType: "manual",
      values: [
        {
          key: def.key,
          value: n,
          unit: def.unit,
          status: interp.status,
          source: "manual",
        },
      ],
    };
    addLabReport(report);
    setManualVal("");
    refresh();
  }

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => openTab("vitals")}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold ring-1",
            tab === "vitals"
              ? "bg-brand-600 text-white ring-brand-600"
              : "bg-white text-brand-700 ring-brand-200 dark:bg-brand-950 dark:ring-brand-700"
          )}
        >
          <HeartPulse className="mr-1 inline h-3.5 w-3.5" />
          Vitals
        </button>
        <button
          type="button"
          onClick={() => openTab("labs")}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold ring-1",
            tab === "labs"
              ? "bg-brand-600 text-white ring-brand-600"
              : "bg-white text-brand-700 ring-brand-200 dark:bg-brand-950 dark:ring-brand-700"
          )}
        >
          <Activity className="mr-1 inline h-3.5 w-3.5" />
          Labs
        </button>
      </div>

      {tab === "vitals" && (
        <div className="space-y-3">
          <p className="text-xs text-brand-600">
            Quick home vitals for session readiness — educational ranges, not a medical device.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <label className="text-xs">
              Resting HR
              <input
                className="input mt-0.5 w-full text-sm"
                inputMode="numeric"
                placeholder="bpm"
                value={hr}
                onChange={(e) => setHr(e.target.value)}
              />
            </label>
            <label className="text-xs">
              Systolic
              <input
                className="input mt-0.5 w-full text-sm"
                inputMode="numeric"
                placeholder="mmHg"
                value={sys}
                onChange={(e) => setSys(e.target.value)}
              />
            </label>
            <label className="text-xs">
              Diastolic
              <input
                className="input mt-0.5 w-full text-sm"
                inputMode="numeric"
                placeholder="mmHg"
                value={dia}
                onChange={(e) => setDia(e.target.value)}
              />
            </label>
            <label className="text-xs">
              SpO₂
              <input
                className="input mt-0.5 w-full text-sm"
                inputMode="numeric"
                placeholder="%"
                value={spo2}
                onChange={(e) => setSpo2(e.target.value)}
              />
            </label>
            <label className="text-xs">
              Temp °F
              <input
                className="input mt-0.5 w-full text-sm"
                inputMode="decimal"
                placeholder="°F"
                value={temp}
                onChange={(e) => setTemp(e.target.value)}
              />
            </label>
            <label className="text-xs">
              Weight Lb
              <input
                className="input mt-0.5 w-full text-sm"
                inputMode="decimal"
                placeholder="lb"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </label>
          </div>
          <button type="button" className="btn-primary text-sm" onClick={saveVitals}>
            Save Vitals Reading
          </button>

          {analysis.length > 0 && (
            <ul className="space-y-2">
              {analysis.map((a) => (
                <li
                  key={a.key}
                  className="rounded-lg border border-brand-100 px-3 py-2 text-sm dark:border-brand-800"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">{a.label}</span>
                    <span className={cn("font-semibold", statusColor(a.status))}>
                      {a.latest} {a.unit}
                      <span className="ml-1 text-[11px] font-normal text-brand-500">
                        ({a.status}
                        {a.rangeLabel !== "—" ? ` · ref ${a.rangeLabel}` : ""})
                      </span>
                    </span>
                  </div>
                  {a.tip && (
                    <p className="mt-1 text-xs text-brand-600">{a.tip}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
          {!analysis.length && (
            <p className="text-xs text-brand-500">No vitals logged yet.</p>
          )}
          <p className="text-[11px] text-brand-500">
            Tracks: {VITAL_DEFS.map((d) => d.label).join(" · ")}
          </p>
        </div>
      )}

      {tab === "labs" && (
        <div className="space-y-3">
          <p className="text-xs text-brand-600">
            Upload or paste lab reports. Supported: {LAB_ACCEPTED_LABEL}. Educational
            ranges only — not a diagnosis.
          </p>

          {/* All Labs catalog — expandable; starts collapsed when Labs is opened */}
          <div className="overflow-hidden rounded-xl border border-brand-200 dark:border-brand-700">
            <button
              type="button"
              onClick={() => setAllLabsExpanded((o) => !o)}
              className="flex w-full items-center justify-between gap-2 bg-brand-50/80 px-3 py-2.5 text-left dark:bg-brand-950/50"
              aria-expanded={allLabsExpanded}
            >
              <span className="text-sm font-semibold text-brand-950 dark:text-brand-50">
                All Labs
                <span className="ml-2 text-[11px] font-normal text-brand-500">
                  {LAB_TESTS.length} Tests
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-brand-600 transition-transform",
                  allLabsExpanded && "rotate-180"
                )}
              />
            </button>
            {allLabsExpanded && (
              <div className="max-h-72 space-y-3 overflow-y-auto border-t border-brand-100 p-3 dark:border-brand-800">
                {labsByCategory.map(([category, tests]) => (
                  <div key={category}>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-500">
                      {category}
                    </p>
                    <ul className="space-y-1">
                      {tests.map((t) => {
                        const range = resolveRange(t, sex);
                        const rangeLabel =
                          range.low != null && range.high != null
                            ? `${range.low}–${range.high}`
                            : range.high != null
                              ? `< ${range.high}`
                              : range.low != null
                                ? `> ${range.low}`
                                : "—";
                        return (
                          <li
                            key={t.key}
                            className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 rounded-lg px-2 py-1.5 text-xs hover:bg-brand-50/60 dark:hover:bg-brand-900/30"
                          >
                            <span className="font-medium text-brand-900 dark:text-brand-100">
                              {t.label}
                            </span>
                            <span className="text-brand-500">
                              {t.unit || "—"}
                              {rangeLabel !== "—" ? ` · Ref ${rangeLabel}` : ""}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          {(labHints.caution || labHints.critical) && (
            <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/40">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <div className="space-y-1 text-xs text-amber-950 dark:text-amber-100">
                {labHints.critical && (
                  <p className="font-bold">Critical-Range Value(s) On File — Seek Clinician Care.</p>
                )}
                {labHints.evidenceLines.map((l) => (
                  <p key={l}>{l}</p>
                ))}
              </div>
            </div>
          )}

          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-brand-300 bg-brand-50/40 px-4 py-6 text-center dark:border-brand-700 dark:bg-brand-950/40">
            <FileUp className="h-6 w-6 text-brand-600" />
            <span className="text-sm font-semibold text-brand-900 dark:text-brand-50">
              {busy ? "Parsing…" : "Upload Lab File(s)"}
            </span>
            <span className="text-[11px] text-brand-500">
              CSV · TSV · TXT · JSON · PDF (Text) · Multi-Select
            </span>
            <input
              type="file"
              className="hidden"
              multiple
              accept={LAB_ACCEPTED_EXTENSIONS}
              disabled={busy}
              onChange={(e) => onFiles(e.target.files)}
            />
          </label>

          <div>
            <label className="text-xs font-medium text-brand-700">
              Or Paste Report Text / CSV
            </label>
            <textarea
              className="input mt-1 min-h-[88px] w-full text-sm"
              placeholder={"Hemoglobin 13.2\nPlatelets 220\nSodium 140\n..."}
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
            />
            <button
              type="button"
              className="btn-secondary mt-2 text-xs"
              onClick={parsePaste}
            >
              Parse Paste
            </button>
          </div>

          <div className="flex flex-wrap items-end gap-2 rounded-lg border border-brand-100 p-3 dark:border-brand-800">
            <label className="min-w-[10rem] flex-1 text-xs">
              Manual Test
              <select
                className="input mt-0.5 w-full text-sm"
                value={manualKey}
                onChange={(e) => setManualKey(e.target.value)}
              >
                {LAB_TESTS.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="w-28 text-xs">
              Value
              <input
                className="input mt-0.5 w-full text-sm"
                value={manualVal}
                onChange={(e) => setManualVal(e.target.value)}
                inputMode="decimal"
              />
            </label>
            <button type="button" className="btn-primary text-xs" onClick={addManualLab}>
              Add
            </button>
          </div>

          {parseNote && (
            <p className="text-xs text-brand-700 dark:text-brand-200">{parseNote}</p>
          )}

          <p className="text-xs font-semibold text-brand-800 dark:text-brand-200">
            Your Lab Reports
          </p>
          {labs.length > 0 ? (
            <ul className="space-y-3">
              {labs.slice(0, 8).map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-brand-100 p-3 dark:border-brand-800"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-brand-950 dark:text-brand-50">
                        {r.fileName || "Lab Report"} · {r.collectedAt}
                      </p>
                      <p className="text-[11px] text-brand-500">
                        {r.fileType || "unknown"} · {r.values.length} values
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-brand-500 hover:text-rose-600"
                      onClick={() => {
                        deleteLabReport(r.id);
                        refresh();
                      }}
                      aria-label="Delete Report"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                    {r.values.map((v) => {
                      const def = LAB_TEST_BY_KEY[v.key];
                      return (
                        <li key={v.key} className="text-xs">
                          <span className="font-medium">
                            {def?.label || v.key}:
                          </span>{" "}
                          <span className={statusColor(v.status)}>
                            {v.value}
                            {v.unit ? ` ${v.unit}` : ""}
                            {v.status ? ` (${v.status})` : ""}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  {r.parseWarnings?.length ? (
                    <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                      {r.parseWarnings.join(" ")}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-brand-500">No Lab Reports Stored Yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
