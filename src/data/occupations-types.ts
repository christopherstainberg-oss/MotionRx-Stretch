/**
 * Shared occupation catalog types.
 * Educational workplace-load framing for PT/HEP personalization — not a job analysis.
 */

import type { OccupationCategory, OccupationDemand } from "@/lib/occupation";

export type { OccupationCategory, OccupationDemand };

/** Physical demand band (DOT / common rehab load framing) */
export type OccupationPhysicalLoad =
  | "sedentary"
  | "light"
  | "medium"
  | "heavy"
  | "very-heavy";

/** Work setting dimension for catalog expansion */
export type OccupationSetting =
  | "office"
  | "remote-home"
  | "clinic-hospital"
  | "school-campus"
  | "retail-floor"
  | "warehouse"
  | "factory-plant"
  | "construction-site"
  | "field-outdoors"
  | "vehicle-cab"
  | "kitchen-foodservice"
  | "lab-cleanroom"
  | "client-home"
  | "studio-gym"
  | "farm-ranch"
  | "airport-terminal"
  | "call-center"
  | "court-public"
  | "hotel-hospitality"
  | "data-center"
  | "mine-energy"
  | "ship-yard"
  | "military-base"
  | "mixed-sites";

export type OccupationSeniority =
  | "intern-trainee"
  | "entry"
  | "junior"
  | "mid"
  | "senior"
  | "lead"
  | "supervisor"
  | "manager"
  | "director"
  | "owner-principal";

export type OccupationEmployment =
  | "full-time"
  | "part-time"
  | "contract"
  | "temporary"
  | "seasonal"
  | "gig-on-demand"
  | "intern"
  | "volunteer";

export type OccupationShift =
  | "day"
  | "evening"
  | "night"
  | "rotating"
  | "weekend"
  | "on-call"
  | "split-shift"
  | "flexible";

/** Seed occupation (canonical job title) */
export type OccupationBase = {
  id: string;
  slug: string;
  title: string;
  /** MotionRx rehab category for HEP bias */
  category: OccupationCategory;
  /** Broader industry / SOC-style sector label */
  sector: string;
  demands: OccupationDemand[];
  physicalLoad: OccupationPhysicalLoad;
  /** Typical settings for this title */
  commonSettings: OccupationSetting[];
  searchTerms: string[];
  /** Short MSK / ergonomic education note */
  mskNotes: string;
  /** Optional alternate titles */
  aliases?: string[];
};

/** Full catalog entry (base × setting × seniority × employment × shift) */
export type Occupation = {
  id: string;
  baseId: string;
  slug: string;
  title: string;
  /** Display title including edition dimensions */
  displayTitle: string;
  category: OccupationCategory;
  categoryLabel: string;
  sector: string;
  demands: OccupationDemand[];
  physicalLoad: OccupationPhysicalLoad;
  physicalLoadLabel: string;
  setting: OccupationSetting;
  settingLabel: string;
  seniority: OccupationSeniority;
  seniorityLabel: string;
  employment: OccupationEmployment;
  employmentLabel: string;
  shift: OccupationShift;
  shiftLabel: string;
  mskNotes: string;
  searchTerms: string[];
  isBase: boolean;
  catalogIndex?: number;
};

/** User-selected occupation (Assessment / profile) */
export type UserOccupationEntry = {
  occupationId: string;
  baseId: string;
  title: string;
  displayTitle: string;
  category: OccupationCategory;
  categoryLabel: string;
  sector?: string;
  physicalLoad?: OccupationPhysicalLoad;
  setting?: OccupationSetting;
  settingLabel?: string;
  seniority?: OccupationSeniority;
  employment?: OccupationEmployment;
  shift?: OccupationShift;
  /** Free-text hours or notes e.g. “40 hrs/week”, “12h shifts” */
  hoursNote?: string;
  notes?: string;
};
