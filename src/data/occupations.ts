/**
 * Occupation catalog: realistic job bases × work-setting / seniority /
 * employment / shift editions.
 *
 * Capacity: 100,000 educational catalog entries for Assessment autocomplete
 * and free-text matching. Not a job analysis or workplace medical clearance.
 */

import {
  OCCUPATION_BASE_COUNT,
  OCCUPATION_BASE_SEEDS,
} from "@/data/occupation-bases";
import type {
  Occupation,
  OccupationBase,
  OccupationCategory,
  OccupationEmployment,
  OccupationPhysicalLoad,
  OccupationSeniority,
  OccupationSetting,
  OccupationShift,
  UserOccupationEntry,
} from "@/data/occupations-types";
import type { OccupationDemand, OccupationProfile } from "@/lib/occupation";
import { parseOccupation } from "@/lib/occupation";

export type {
  Occupation,
  OccupationBase,
  OccupationCategory,
  OccupationEmployment,
  OccupationPhysicalLoad,
  OccupationSeniority,
  OccupationSetting,
  OccupationShift,
  UserOccupationEntry,
} from "@/data/occupations-types";

export const OCCUPATION_CATALOG_CAPACITY = 100_000;

export const OCCUPATION_CATEGORY_LABELS: Record<OccupationCategory, string> = {
  desk: "Desk / seated work",
  standing: "On-feet / standing work",
  labor: "Manual / labor work",
  healthcare: "Healthcare / patient care",
  driving: "Driving / vehicle work",
  athlete: "Athlete / training",
  student: "Student",
  retired: "Retired / home-based",
  caregiver: "Caregiver",
  mixed: "Mixed demands",
  unknown: "Unknown / not stated",
};

export const OCCUPATION_PHYSICAL_LOAD_LABELS: Record<
  OccupationPhysicalLoad,
  string
> = {
  sedentary: "Sedentary",
  light: "Light",
  medium: "Medium",
  heavy: "Heavy",
  "very-heavy": "Very heavy",
};

export const OCCUPATION_SETTING_LABELS: Record<OccupationSetting, string> = {
  office: "Office",
  "remote-home": "Remote / home office",
  "clinic-hospital": "Clinic / hospital",
  "school-campus": "School / campus",
  "retail-floor": "Retail floor",
  warehouse: "Warehouse",
  "factory-plant": "Factory / plant",
  "construction-site": "Construction site",
  "field-outdoors": "Field / outdoors",
  "vehicle-cab": "Vehicle cab",
  "kitchen-foodservice": "Kitchen / food service",
  "lab-cleanroom": "Lab / cleanroom",
  "client-home": "Client / patient home",
  "studio-gym": "Studio / gym",
  "farm-ranch": "Farm / ranch",
  "airport-terminal": "Airport / terminal",
  "call-center": "Call center",
  "court-public": "Court / public venue",
  "hotel-hospitality": "Hotel / hospitality",
  "data-center": "Data center",
  "mine-energy": "Mine / energy site",
  "ship-yard": "Ship / yard",
  "military-base": "Military base",
  "mixed-sites": "Mixed sites",
};

export const OCCUPATION_SENIORITY_LABELS: Record<OccupationSeniority, string> = {
  "intern-trainee": "Intern / trainee",
  entry: "Entry level",
  junior: "Junior",
  mid: "Mid-level",
  senior: "Senior",
  lead: "Lead",
  supervisor: "Supervisor",
  manager: "Manager",
  director: "Director",
  "owner-principal": "Owner / principal",
};

export const OCCUPATION_EMPLOYMENT_LABELS: Record<OccupationEmployment, string> =
  {
    "full-time": "Full-time",
    "part-time": "Part-time",
    contract: "Contract",
    temporary: "Temporary",
    seasonal: "Seasonal",
    "gig-on-demand": "Gig / on-demand",
    intern: "Internship",
    volunteer: "Volunteer",
  };

export const OCCUPATION_SHIFT_LABELS: Record<OccupationShift, string> = {
  day: "Day shift",
  evening: "Evening shift",
  night: "Night shift",
  rotating: "Rotating shifts",
  weekend: "Weekend schedule",
  "on-call": "On-call",
  "split-shift": "Split shift",
  flexible: "Flexible hours",
};

const SETTINGS = Object.keys(OCCUPATION_SETTING_LABELS) as OccupationSetting[];
const SENIORITIES = Object.keys(
  OCCUPATION_SENIORITY_LABELS
) as OccupationSeniority[];
const EMPLOYMENTS = Object.keys(
  OCCUPATION_EMPLOYMENT_LABELS
) as OccupationEmployment[];
const SHIFTS = Object.keys(OCCUPATION_SHIFT_LABELS) as OccupationShift[];

export const BASE_OCCUPATIONS: OccupationBase[] = OCCUPATION_BASE_SEEDS;

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s/.+-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function baseToOccupation(
  base: OccupationBase,
  opts?: {
    setting?: OccupationSetting;
    seniority?: OccupationSeniority;
    employment?: OccupationEmployment;
    shift?: OccupationShift;
    catalogIndex?: number;
    isBase?: boolean;
    series?: number;
  }
): Occupation {
  const setting =
    opts?.setting ||
    base.commonSettings[0] ||
    ("mixed-sites" as OccupationSetting);
  const seniority = opts?.seniority || "mid";
  const employment = opts?.employment || "full-time";
  const shift = opts?.shift || "day";
  const isBase = opts?.isBase ?? true;
  const series = opts?.series ?? 1;

  const displayTitle = isBase
    ? base.title
    : [
        base.title,
        OCCUPATION_SENIORITY_LABELS[seniority],
        OCCUPATION_SETTING_LABELS[setting],
        OCCUPATION_EMPLOYMENT_LABELS[employment],
        OCCUPATION_SHIFT_LABELS[shift],
        series > 1 ? `series ${series}` : "",
      ]
        .filter(Boolean)
        .join(" · ");

  const id = isBase
    ? base.id
    : `${base.id}__${setting}__${seniority}__${employment}__${shift}${
        series > 1 ? `__s${series}` : ""
      }${opts?.catalogIndex != null ? `__i${opts.catalogIndex}` : ""}`;

  return {
    id,
    baseId: base.id,
    slug: base.slug,
    title: base.title,
    displayTitle,
    category: base.category,
    categoryLabel: OCCUPATION_CATEGORY_LABELS[base.category] || base.category,
    sector: base.sector,
    demands: base.demands,
    physicalLoad: base.physicalLoad,
    physicalLoadLabel:
      OCCUPATION_PHYSICAL_LOAD_LABELS[base.physicalLoad] || base.physicalLoad,
    setting,
    settingLabel: OCCUPATION_SETTING_LABELS[setting] || setting,
    seniority,
    seniorityLabel: OCCUPATION_SENIORITY_LABELS[seniority] || seniority,
    employment,
    employmentLabel: OCCUPATION_EMPLOYMENT_LABELS[employment] || employment,
    shift,
    shiftLabel: OCCUPATION_SHIFT_LABELS[shift] || shift,
    mskNotes: base.mskNotes,
    searchTerms: base.searchTerms,
    isBase,
    catalogIndex: opts?.catalogIndex,
  };
}

/**
 * Map any index 0..OCCUPATION_CATALOG_CAPACITY-1 to a realistic catalog edition.
 */
export function getOccupationByIndex(index: number): Occupation | undefined {
  if (index < 0 || index >= OCCUPATION_CATALOG_CAPACITY) return undefined;
  const baseCount = BASE_OCCUPATIONS.length;
  if (!baseCount) return undefined;

  const base = BASE_OCCUPATIONS[index % baseCount]!;
  const cycle = Math.floor(index / baseCount);

  if (cycle === 0) {
    return baseToOccupation(base, { catalogIndex: index, isBase: true });
  }

  const settings =
    base.commonSettings.length > 0 ? base.commonSettings : SETTINGS;
  const setting = settings[cycle % settings.length]!;
  const seniority =
    SENIORITIES[Math.floor(cycle / settings.length) % SENIORITIES.length]!;
  const employment =
    EMPLOYMENTS[
      Math.floor(cycle / (settings.length * SENIORITIES.length)) %
        EMPLOYMENTS.length
    ]!;
  const shift =
    SHIFTS[
      Math.floor(
        cycle / (settings.length * SENIORITIES.length * EMPLOYMENTS.length)
      ) % SHIFTS.length
    ]!;
  const series =
    Math.floor(
      cycle /
        (settings.length *
          SENIORITIES.length *
          EMPLOYMENTS.length *
          SHIFTS.length)
    ) + 1;

  return baseToOccupation(base, {
    setting,
    seniority,
    employment,
    shift,
    series,
    catalogIndex: index,
    isBase: false,
  });
}

export function getOccupationById(id: string): Occupation | undefined {
  if (!id) return undefined;
  const base = BASE_OCCUPATIONS.find((b) => b.id === id);
  if (base) return baseToOccupation(base, { isBase: true });

  const idxMatch = id.match(/__i(\d+)$/);
  if (idxMatch) {
    return getOccupationByIndex(Number(idxMatch[1]));
  }

  // Expanded id: base__setting__seniority__employment__shift
  const parts = id.split("__");
  if (parts[0]) {
    const b = BASE_OCCUPATIONS.find((x) => x.id === parts[0]);
    if (b) {
      const setting = (parts[1] as OccupationSetting) || b.commonSettings[0];
      const seniority = (parts[2] as OccupationSeniority) || "mid";
      const employment = (parts[3] as OccupationEmployment) || "full-time";
      const shift = (parts[4] as OccupationShift) || "day";
      return baseToOccupation(b, {
        setting,
        seniority,
        employment,
        shift,
        isBase: false,
      });
    }
  }
  return undefined;
}

export function getBaseOccupation(id: string): OccupationBase | undefined {
  const occ = getOccupationById(id);
  if (!occ) return undefined;
  return BASE_OCCUPATIONS.find((b) => b.id === occ.baseId);
}

export function searchOccupations(opts: {
  query?: string;
  category?: OccupationCategory | "all";
  sector?: string | "all";
  physicalLoad?: OccupationPhysicalLoad | "all";
  basesOnly?: boolean;
  limit?: number;
}): Occupation[] {
  const limit = Math.min(opts.limit ?? 40, 100);
  const q = normalize(opts.query || "");
  const tokens = q.split(" ").filter(Boolean);
  const basesOnly = opts.basesOnly !== false || !q;

  const scored: Array<{ occ: Occupation; score: number }> = [];

  for (let i = 0; i < BASE_OCCUPATIONS.length; i++) {
    const base = BASE_OCCUPATIONS[i]!;
    if (
      opts.category &&
      opts.category !== "all" &&
      base.category !== opts.category
    )
      continue;
    if (
      opts.sector &&
      opts.sector !== "all" &&
      normalize(base.sector) !== normalize(opts.sector)
    )
      continue;
    if (
      opts.physicalLoad &&
      opts.physicalLoad !== "all" &&
      base.physicalLoad !== opts.physicalLoad
    )
      continue;

    const occ = baseToOccupation(base, { catalogIndex: i, isBase: true });
    if (!q) {
      scored.push({ occ, score: 1 });
      continue;
    }

    const hay = normalize(
      [
        occ.title,
        occ.displayTitle,
        occ.categoryLabel,
        occ.sector,
        occ.physicalLoadLabel,
        occ.mskNotes,
        (base.aliases || []).join(" "),
        occ.searchTerms.join(" "),
      ].join(" ")
    );

    let score = 0;
    const t = normalize(occ.title);
    if (t === q) score += 100;
    if (t.startsWith(q)) score += 60;
    if (t.includes(q)) score += 40;
    if ((base.aliases || []).some((a) => normalize(a) === q)) score += 80;
    if ((base.aliases || []).some((a) => normalize(a).startsWith(q))) score += 50;
    if ((base.aliases || []).some((a) => normalize(a).includes(q))) score += 30;
    if (hay.includes(q)) score += 20;
    for (const tok of tokens) {
      if (t.includes(tok)) score += 12;
      if ((base.aliases || []).some((a) => normalize(a).includes(tok))) score += 10;
      if (normalize(occ.sector).includes(tok)) score += 6;
      if (normalize(occ.categoryLabel).includes(tok)) score += 5;
      if (occ.searchTerms.some((s) => s.includes(tok))) score += 4;
    }
    if (score > 0) scored.push({ occ, score });
  }

  scored.sort(
    (a, b) => b.score - a.score || a.occ.title.localeCompare(b.occ.title)
  );
  const out = scored.slice(0, limit).map((x) => x.occ);

  // When querying, sample edition variants of top matches
  if (!basesOnly && q && out.length) {
    const extras: Occupation[] = [];
    for (const m of out.slice(0, 6)) {
      const base = BASE_OCCUPATIONS.find((b) => b.id === m.baseId);
      if (!base) continue;
      const settings = (base.commonSettings.length
        ? base.commonSettings
        : SETTINGS
      ).slice(0, 3);
      for (const setting of settings) {
        for (const seniority of SENIORITIES.slice(0, 3)) {
          extras.push(
            baseToOccupation(base, {
              setting,
              seniority,
              employment: "full-time",
              shift: "day",
              isBase: false,
            })
          );
          if (extras.length >= 24) break;
        }
        if (extras.length >= 24) break;
      }
      if (extras.length >= 24) break;
    }
    return [...out, ...extras].slice(0, limit);
  }

  return out;
}

/**
 * Detect catalog occupations mentioned in free text.
 * Returns base IDs ranked by match strength.
 */
export function matchOccupationsFromText(text: string, limit = 10): string[] {
  const t = text.toLowerCase();
  if (t.length < 3) return [];

  const hits: Array<{ id: string; score: number }> = [];
  for (const base of BASE_OCCUPATIONS) {
    let score = 0;
    const title = base.title.toLowerCase();
    if (title.length >= 4 && t.includes(title)) {
      score += title.length >= 12 ? 16 : title.length >= 8 ? 12 : 8;
    }
    for (const alias of base.aliases || []) {
      const a = alias.toLowerCase();
      if (a.length >= 3 && t.includes(a)) {
        score += a.length >= 8 ? 14 : 9;
      }
    }
    // Multi-word: require substantial token hit with work framing nearby
    const first = title.split(/\s+/)[0] || "";
    if (
      !score &&
      first.length >= 5 &&
      t.includes(first) &&
      /\b(work|job|i am|i'm|occupation|as a)\b/i.test(t)
    ) {
      score += 5;
    }
    if (score > 0) hits.push({ id: base.id, score });
  }

  hits.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const out: string[] = [];
  const seen = new Set<string>();
  for (const h of hits) {
    if (seen.has(h.id)) continue;
    seen.add(h.id);
    out.push(h.id);
    if (out.length >= limit) break;
  }
  return out;
}

/** Build Assessment story snippet from selected occupations */
export function buildOccupationParagraphSnippet(
  entries: UserOccupationEntry[]
): string {
  if (!entries.length) return "";
  const bits = entries.map((e) => {
    const dims = [
      e.settingLabel,
      e.seniority ? OCCUPATION_SENIORITY_LABELS[e.seniority] : null,
      e.employment ? OCCUPATION_EMPLOYMENT_LABELS[e.employment] : null,
      e.shift ? OCCUPATION_SHIFT_LABELS[e.shift] : null,
      e.hoursNote,
    ]
      .filter(Boolean)
      .join(", ");
    const notes = e.notes ? ` [${e.notes}]` : "";
    return `${e.displayTitle || e.title}${dims ? ` (${dims})` : ""}${notes}`;
  });
  return `Occupation / daily role: ${bits.join("; ")}.`;
}

export function userOccupationFromCatalog(
  occ: Occupation,
  extras?: Partial<UserOccupationEntry>
): UserOccupationEntry {
  return {
    occupationId: occ.id,
    baseId: occ.baseId,
    title: occ.title,
    displayTitle: occ.displayTitle,
    category: occ.category,
    categoryLabel: occ.categoryLabel,
    sector: occ.sector,
    physicalLoad: occ.physicalLoad,
    setting: occ.setting,
    settingLabel: occ.settingLabel,
    seniority: occ.seniority,
    employment: occ.employment,
    shift: occ.shift,
    ...extras,
  };
}

export function createCustomOccupationEntry(
  title: string,
  opts?: Partial<UserOccupationEntry>
): UserOccupationEntry {
  const t = title.trim() || "Custom occupation";
  const inferred = parseOccupation(`I work as a ${t}`);
  const category =
    inferred.source === "stated" ? inferred.category : opts?.category || "mixed";
  return {
    occupationId: `custom-${slugify(t)}-${Date.now().toString(36)}`,
    baseId: "custom",
    title: t,
    displayTitle: t,
    category,
    categoryLabel: OCCUPATION_CATEGORY_LABELS[category],
    ...opts,
  };
}

/**
 * Resolve free text + optional selected entries into an OccupationProfile
 * for plan/routine intelligence (catalog wins when matched).
 */
export function resolveOccupationProfile(opts: {
  freeText?: string;
  selected?: UserOccupationEntry[];
}): OccupationProfile {
  const selected = opts.selected?.[0];
  if (selected) {
    const fromCatalog = getOccupationById(selected.occupationId);
    const category = selected.category || fromCatalog?.category || "mixed";
    // Reuse free-text engine for category HEP bundle, then stamp label
    const base = parseOccupation(
      `I work as a ${selected.title}. ${selected.displayTitle}. ${
        selected.hoursNote || ""
      } ${selected.notes || ""}`
    );
    if (base.source === "stated" || category !== "unknown") {
      return {
        ...base,
        category: category === "unknown" ? base.category : category,
        label: selected.displayTitle || selected.title,
        quote: selected.title,
        source: "stated",
        demands: (fromCatalog?.demands as OccupationDemand[]) || base.demands,
        confidence: Math.max(base.confidence, 85),
        summaryLines: [
          `Occupation (catalog): ${selected.displayTitle || selected.title}${
            selected.sector || fromCatalog?.sector
              ? ` · ${selected.sector || fromCatalog?.sector}`
              : ""
          }.`,
          fromCatalog?.mskNotes || base.sessionNotes[0] || "",
          selected.hoursNote ? `Hours/notes: ${selected.hoursNote}.` : "",
        ].filter(Boolean),
        promptBlob: [
          `Occupation (catalog): ${selected.displayTitle || selected.title} (category ${category}).`,
          fromCatalog
            ? `Physical load: ${fromCatalog.physicalLoadLabel}; setting ${fromCatalog.settingLabel}; shift ${fromCatalog.shiftLabel}.`
            : "",
          fromCatalog?.mskNotes || "",
          "Tailor HEP to occupational load; irritability still overrides.",
        ]
          .filter(Boolean)
          .join("\n"),
      };
    }
  }

  const text = opts.freeText || "";
  const ids = matchOccupationsFromText(text, 3);
  if (ids[0]) {
    const occ = getOccupationById(ids[0]);
    if (occ) {
      const profile = parseOccupation(
        `I work as a ${occ.title}. ${occ.mskNotes}`
      );
      return {
        ...profile,
        category: occ.category,
        label: occ.title,
        quote: occ.title,
        source: "stated",
        demands: occ.demands.length ? occ.demands : profile.demands,
        confidence: Math.max(profile.confidence, 70),
        summaryLines: [
          `Occupation (matched catalog): ${occ.title} · ${occ.categoryLabel}.`,
          occ.mskNotes,
        ],
      };
    }
  }

  return parseOccupation(text);
}

export const OCCUPATION_STATS = {
  baseCount: OCCUPATION_BASE_COUNT,
  totalCount: OCCUPATION_CATALOG_CAPACITY,
  capacity: OCCUPATION_CATALOG_CAPACITY,
  categories: OCCUPATION_CATEGORY_LABELS,
  settings: OCCUPATION_SETTING_LABELS,
  physicalLoads: OCCUPATION_PHYSICAL_LOAD_LABELS,
  description:
    "Educational catalog of occupations with physical-demand categories, settings, seniority, employment type, and shift editions. Expanded to 100,000 virtual catalog entries for Assessment search and free-text matching. Not a complete national SOC database, not a job analysis, and not workplace medical clearance.",
};
