/**
 * Multi-format lab report parsing (CSV, TSV, TXT, JSON, pasted text).
 * Deterministic, no OCR dependency. PDF/image: extract plain text client-side when possible.
 */

import {
  LAB_TESTS,
  LAB_TEST_BY_KEY,
  interpretLabValue,
  type LabReport,
  type LabValueEntry,
} from "@/data/labs";

export type ParseLabsResult = {
  values: LabValueEntry[];
  warnings: string[];
  format: string;
  collectedAt?: string;
};

type AliasRow = { key: string; alias: string; re: RegExp };

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const ALIAS_LIST: AliasRow[] = (() => {
  const list: AliasRow[] = [];
  for (const t of LAB_TESTS) {
    for (const a of t.aliases) {
      list.push({
        key: t.key,
        alias: a,
        re: new RegExp(`(?<![a-z0-9])${escapeRe(a)}(?![a-z0-9])`, "i"),
      });
    }
  }
  return list.sort((x, y) => y.alias.length - x.alias.length);
})();

function firstNumber(s: string): number | null {
  const re = /-?\d+(?:\.\d+)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const start = m.index;
    const end = start + m[0].length;
    const before = s[start - 1] || " ";
    const after = s[end] || " ";
    const after2 = s[end + 1] || " ";
    if (/[a-z]/i.test(before)) continue;
    if (after === "-" && /[a-z]/i.test(after2)) continue;
    // skip years like 2024 alone on a line with date context
    const n = parseFloat(m[0]);
    if (!Number.isFinite(n)) continue;
    if (n >= 1900 && n <= 2100 && /date|collected|drawn/i.test(s)) continue;
    return n;
  }
  return null;
}

function detectCollectedAt(text: string): string | undefined {
  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const us = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](20\d{2})\b/);
  if (us) {
    const mm = us[1]!.padStart(2, "0");
    const dd = us[2]!.padStart(2, "0");
    return `${us[3]}-${mm}-${dd}`;
  }
  return undefined;
}

/** Parse plain report text line-by-line (longest alias wins per line). */
export function parseLabText(text: string, sex?: string | null): ParseLabsResult {
  const warnings: string[] = [];
  const byKey = new Map<string, LabValueEntry>();
  const lines = (text || "").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 3) continue;
    let best: { key: string; alias: string; idx: number } | null = null;
    for (const a of ALIAS_LIST) {
      const m = a.re.exec(trimmed);
      if (!m) continue;
      if (!best || m.index <= best.idx) {
        // prefer longer alias already sorted; keep first (longest) match
        if (!best || a.alias.length > best.alias.length || m.index < best.idx) {
          best = { key: a.key, alias: a.alias, idx: m.index };
        }
      }
    }
    if (!best) continue;
    // number after the alias
    const after = trimmed.slice(best.idx + best.alias.length);
    const n = firstNumber(after) ?? firstNumber(trimmed);
    if (n == null) continue;
    const def = LAB_TEST_BY_KEY[best.key];
    if (!def) continue;
    const interp = interpretLabValue(def, n, sex);
    byKey.set(best.key, {
      key: best.key,
      value: n,
      unit: def.unit,
      status: interp.status,
      source: "parsed",
      rawLabel: best.alias,
    });
  }

  if (!byKey.size) {
    warnings.push(
      "No recognized lab names found. Try CSV with columns like “Test,Value” or paste lines such as “Hemoglobin 13.2”."
    );
  }

  return {
    values: Array.from(byKey.values()),
    warnings,
    format: "text",
    collectedAt: detectCollectedAt(text),
  };
}

/** Parse CSV/TSV — header row optional. */
export function parseLabCsv(text: string, sex?: string | null): ParseLabsResult {
  const warnings: string[] = [];
  const lines = (text || "").split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) {
    return { values: [], warnings: ["Empty CSV/TSV"], format: "csv" };
  }

  const delim = lines[0]!.includes("\t")
    ? "\t"
    : lines[0]!.includes(";")
      ? ";"
      : ",";

  const rows = lines.map((l) =>
    l.split(delim).map((c) => c.trim().replace(/^"|"$/g, ""))
  );

  // Detect header
  const header = rows[0]!.map((h) => h.toLowerCase());
  let nameIdx = header.findIndex((h) =>
    /test|analyte|name|component|assay|lab/.test(h)
  );
  let valueIdx = header.findIndex((h) =>
    /result|value|val|amount|level|quant/.test(h)
  );
  let start = 0;
  if (nameIdx >= 0 && valueIdx >= 0) {
    start = 1;
  } else {
    // no header — assume col0 name, col1 value
    nameIdx = 0;
    valueIdx = 1;
    start = 0;
  }

  const byKey = new Map<string, LabValueEntry>();
  for (let i = start; i < rows.length; i++) {
    const row = rows[i]!;
    const name = (row[nameIdx] || "").trim();
    const valRaw = (row[valueIdx] || "").trim();
    if (!name || !valRaw) continue;
    const n = firstNumber(valRaw);
    if (n == null) continue;
    // match alias against name cell
    let matchedKey: string | null = null;
    let matchedAlias = "";
    for (const a of ALIAS_LIST) {
      if (a.re.test(name)) {
        matchedKey = a.key;
        matchedAlias = a.alias;
        break;
      }
    }
    if (!matchedKey) continue;
    const def = LAB_TEST_BY_KEY[matchedKey];
    if (!def) continue;
    const interp = interpretLabValue(def, n, sex);
    byKey.set(matchedKey, {
      key: matchedKey,
      value: n,
      unit: def.unit,
      status: interp.status,
      source: "parsed",
      rawLabel: matchedAlias || name,
    });
  }

  if (!byKey.size) {
    warnings.push("CSV/TSV parsed but no known tests matched. Check column headers.");
    // fall back to free-text parser on whole blob
    const fb = parseLabText(text, sex);
    if (fb.values.length) return { ...fb, format: "csv+text-fallback" };
  }

  return {
    values: Array.from(byKey.values()),
    warnings,
    format: delim === "\t" ? "tsv" : "csv",
    collectedAt: detectCollectedAt(text),
  };
}

/** Parse JSON array or object of lab values */
export function parseLabJson(text: string, sex?: string | null): ParseLabsResult {
  const warnings: string[] = [];
  try {
    const data = JSON.parse(text) as unknown;
    const byKey = new Map<string, LabValueEntry>();

    const ingest = (obj: Record<string, unknown>) => {
      // { key/name/test, value/result }
      const name = String(
        obj.key || obj.name || obj.test || obj.analyte || obj.label || ""
      );
      const val = obj.value ?? obj.result ?? obj.val ?? obj.amount;
      const n =
        typeof val === "number"
          ? val
          : firstNumber(String(val ?? ""));
      if (!name || n == null) return;
      for (const a of ALIAS_LIST) {
        if (a.re.test(name) || a.key === name.toLowerCase()) {
          const def = LAB_TEST_BY_KEY[a.key];
          if (!def) return;
          const interp = interpretLabValue(def, n, sex);
          byKey.set(a.key, {
            key: a.key,
            value: n,
            unit: def.unit,
            status: interp.status,
            source: "parsed",
            rawLabel: name,
          });
          return;
        }
      }
      // direct key map { hemoglobin: 13.2 }
    };

    if (Array.isArray(data)) {
      for (const item of data) {
        if (item && typeof item === "object") ingest(item as Record<string, unknown>);
      }
    } else if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>;
      if (Array.isArray(obj.values)) {
        for (const item of obj.values) {
          if (item && typeof item === "object") ingest(item as Record<string, unknown>);
        }
      } else if (Array.isArray(obj.labs)) {
        for (const item of obj.labs) {
          if (item && typeof item === "object") ingest(item as Record<string, unknown>);
        }
      } else {
        // flat map of keys to numbers
        for (const [k, v] of Object.entries(obj)) {
          if (k === "date" || k === "collectedAt" || k === "notes") continue;
          const n =
            typeof v === "number" ? v : firstNumber(String(v ?? ""));
          if (n == null) continue;
          const def =
            LAB_TEST_BY_KEY[k] ||
            LAB_TESTS.find((t) =>
              t.aliases.some((a) => a.toLowerCase() === k.toLowerCase())
            );
          if (!def) continue;
          const interp = interpretLabValue(def, n, sex);
          byKey.set(def.key, {
            key: def.key,
            value: n,
            unit: def.unit,
            status: interp.status,
            source: "parsed",
            rawLabel: k,
          });
        }
      }
    }

    if (!byKey.size) {
      warnings.push("JSON parsed but no known lab keys found.");
    }

    const collectedAt =
      data && typeof data === "object"
        ? String(
            (data as { collectedAt?: string; date?: string }).collectedAt ||
              (data as { date?: string }).date ||
              ""
          ) || detectCollectedAt(text)
        : detectCollectedAt(text);

    return {
      values: Array.from(byKey.values()),
      warnings,
      format: "json",
      collectedAt: collectedAt || undefined,
    };
  } catch {
    warnings.push("Invalid JSON — tried free-text fallback.");
    const fb = parseLabText(text, sex);
    return { ...fb, format: "json-fallback-text", warnings: [...warnings, ...fb.warnings] };
  }
}

export function parseLabContent(
  text: string,
  opts?: { fileName?: string; mimeType?: string; sex?: string | null }
): ParseLabsResult {
  const name = (opts?.fileName || "").toLowerCase();
  const mime = (opts?.mimeType || "").toLowerCase();
  const sex = opts?.sex;

  if (
    name.endsWith(".json") ||
    mime.includes("json") ||
    /^\s*[\{\[]/.test(text.trim())
  ) {
    return parseLabJson(text, sex);
  }
  if (
    name.endsWith(".csv") ||
    name.endsWith(".tsv") ||
    mime.includes("csv") ||
    mime.includes("tab-separated") ||
    (text.includes(",") && text.split("\n")[0]?.toLowerCase().includes("value"))
  ) {
    return parseLabCsv(text, sex);
  }
  if (name.endsWith(".tsv") || (text.includes("\t") && text.includes("\n"))) {
    return parseLabCsv(text, sex);
  }
  return parseLabText(text, sex);
}

/** Read uploaded File as text for supported formats */
export async function readLabFileAsText(file: File): Promise<{
  text: string;
  format: string;
  warning?: string;
}> {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  if (
    name.endsWith(".csv") ||
    name.endsWith(".tsv") ||
    name.endsWith(".txt") ||
    name.endsWith(".json") ||
    type.startsWith("text/") ||
    type.includes("json") ||
    type.includes("csv")
  ) {
    const text = await file.text();
    return { text, format: name.split(".").pop() || "text" };
  }

  if (name.endsWith(".pdf") || type.includes("pdf")) {
    // Best-effort: read as binary string and pull printable ASCII runs
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let raw = "";
    for (let i = 0; i < bytes.length; i++) {
      const c = bytes[i]!;
      if (c === 9 || c === 10 || c === 13 || (c >= 32 && c < 127)) {
        raw += String.fromCharCode(c);
      } else {
        raw += " ";
      }
    }
    // Collapse PDF noise
    const text = raw
      .replace(/\\n/g, "\n")
      .replace(/\(([^)]{2,80})\)/g, " $1 ")
      .replace(/\s+/g, " ")
      .replace(/ (Hemoglobin|Hematocrit|Platelets|Sodium|Potassium|Creatinine|Glucose|TSH|WBC|INR|ALT|AST|Cholesterol|Triglycerides|eGFR|BUN|Ferritin|Vitamin) /gi, "\n$1 ")
      .trim();
    return {
      text,
      format: "pdf-text-extract",
      warning:
        "PDF text extraction is best-effort. If values are missing, paste the report text or upload CSV/TXT.",
    };
  }

  if (
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".webp") ||
    type.startsWith("image/")
  ) {
    return {
      text: "",
      format: "image",
      warning:
        "Image OCR is not embedded offline. Paste report text, or upload CSV/TXT/JSON/PDF with text layer.",
    };
  }

  // Unknown — try text
  try {
    const text = await file.text();
    return {
      text,
      format: "unknown-text",
      warning: "Unknown file type — attempted as text.",
    };
  } catch {
    return {
      text: "",
      format: "unsupported",
      warning: "Unsupported file. Use CSV, TSV, TXT, JSON, or paste text.",
    };
  }
}

export function buildLabReportFromParse(
  parsed: ParseLabsResult,
  opts?: { fileName?: string; fileType?: string; notes?: string }
): LabReport {
  return {
    id: `lab-${Date.now()}`,
    collectedAt: parsed.collectedAt || new Date().toISOString().slice(0, 10),
    uploadedAt: new Date().toISOString(),
    fileName: opts?.fileName,
    fileType: opts?.fileType || parsed.format,
    values: parsed.values,
    notes: opts?.notes,
    parseWarnings: parsed.warnings,
  };
}

export const LAB_ACCEPTED_EXTENSIONS =
  ".csv,.tsv,.txt,.json,.pdf,text/csv,text/plain,application/json,application/pdf";

export const LAB_ACCEPTED_LABEL =
  "CSV, TSV, TXT, JSON, PDF (text layer). Images: paste text instead.";
