/**
 * Common orthopedic / spine surgery catalog (PhysioPath-inspired, curated).
 * Educational post-op framing only — surgeon protocol always wins.
 */

export type SurgeryFlag =
  | "post-op-conservative"
  | "nwb-possible"
  | "hip-precautions"
  | "sternal-precautions"
  | "spinal-blt"
  | "shoulder-protection"
  | "acl-style"
  | "meniscus-protect"
  | "rotator-cuff-protect"
  | "no-impact"
  | "no-heavy-lift";

export type Surgery = {
  id: string;
  name: string;
  aliases?: string[];
  region: string;
  /** Typical protective window education (weeks) — not a protocol */
  protectWeeksTypical: number;
  flags: SurgeryFlag[];
  preferTags: string[];
  avoidTags: string[];
  minutesScale: number;
  maxDifficulty: "beginner" | "intermediate" | "advanced";
  education: string;
  searchTerms: string[];
};

function surg(
  id: string,
  name: string,
  region: string,
  protectWeeksTypical: number,
  flags: SurgeryFlag[],
  preferTags: string[],
  avoidTags: string[],
  minutesScale: number,
  education: string,
  searchTerms: string[],
  aliases?: string[]
): Surgery {
  return {
    id,
    name,
    region,
    protectWeeksTypical,
    flags,
    preferTags,
    avoidTags,
    minutesScale,
    maxDifficulty: "beginner",
    education,
    searchTerms,
    aliases,
  };
}

export const SURGERIES: Surgery[] = [
  surg("tka", "Total knee arthroplasty (TKA)", "knee", 6, ["post-op-conservative", "no-impact"], ["quad", "gentle", "ROM", "functional", "protected"], ["plyo", "impact", "deep-kneel-load"], 0.75, "Early focus: swelling control, quad set, gait; impact sports often delayed long-term.", ["tka", "total knee", "knee replacement"], ["knee replacement"]),
  surg("tha", "Total hip arthroplasty (THA)", "hip", 6, ["post-op-conservative", "hip-precautions", "no-impact"], ["glute", "gentle", "functional", "protected"], ["deep-flexion-load", "impact", "crossing-legs-force"], 0.75, "Approach-specific hip precautions (posterior vs anterior) — follow surgeon rules.", ["tha", "total hip", "hip replacement"], ["hip replacement"]),
  surg("acl-r", "ACL reconstruction", "knee", 12, ["post-op-conservative", "acl-style", "no-impact"], ["quad", "hamstring", "motor-control", "protected"], ["cutting", "plyo", "impact", "open-chain-heavy"], 0.7, "Criteria-based RTP often 9–12 months; early phases protect graft.", ["acl", "acl reconstruction", "acl repair"], ["ACL surgery"]),
  surg("meniscus-repair", "Meniscus repair", "knee", 8, ["post-op-conservative", "meniscus-protect", "nwb-possible"], ["quad", "gentle", "protected", "ROM"], ["deep-squat", "impact", "twist-load"], 0.7, "Repairs are protected longer than simple meniscectomy—WB and flexion limits are protocol-specific.", ["meniscus repair", "meniscal repair"]),
  surg("meniscectomy", "Meniscectomy (partial)", "knee", 3, ["post-op-conservative"], ["quad", "gentle", "functional", "ROM"], ["impact-early"], 0.85, "Often faster than repair, but swelling and quad lag still guide pace.", ["meniscectomy", "scope meniscus"]),
  surg("rotator-cuff-repair", "Rotator cuff repair", "shoulder", 12, ["post-op-conservative", "rotator-cuff-protect", "shoulder-protection"], ["scapular", "gentle", "protected", "isometric"], ["overhead-load", "end-range", "heavy-lift"], 0.65, "Tendon-to-bone healing is slow; active elevation often delayed weeks.", ["rotator cuff repair", "cuff repair", "RCR"]),
  surg("shoulder-scope", "Shoulder arthroscopy (general)", "shoulder", 4, ["post-op-conservative", "shoulder-protection"], ["scapular", "gentle", "ROM", "protected"], ["overhead-aggressive"], 0.8, "Timeline depends on what was done inside (debridement vs repair).", ["shoulder scope", "shoulder arthroscopy"]),
  surg("labrum-repair", "Labral repair (shoulder)", "shoulder", 10, ["post-op-conservative", "shoulder-protection"], ["scapular", "protected", "isometric"], ["overhead-load", "throwing"], 0.7, "Position and load limits protect the labrum early.", ["labrum repair", "SLAP repair", "Bankart"]),
  surg("lumbar-fusion", "Lumbar fusion", "spine", 12, ["post-op-conservative", "spinal-blt", "no-heavy-lift"], ["gentle", "walking", "core-gentle", "protected"], ["end-range-flexion", "twist-load", "heavy-lift", "impact"], 0.65, "BLT (bend/lift/twist) limits are common teaching—surgeon-specific duration.", ["spinal fusion", "lumbar fusion", "back fusion"]),
  surg("lumbar-discectomy", "Lumbar discectomy / microdiscectomy", "spine", 6, ["post-op-conservative", "spinal-blt"], ["gentle", "walking", "nerve-gentle", "protected"], ["end-range-flexion-load", "heavy-lift"], 0.7, "Walking and nerve-friendly mobility often early; avoid aggressive flexion loading.", ["discectomy", "microdiscectomy"]),
  surg("cervical-fusion", "Cervical fusion", "spine", 12, ["post-op-conservative", "no-heavy-lift"], ["gentle", "posture", "protected", "walking"], ["end-range-cervical", "heavy-lift", "impact"], 0.65, "Collar use and motion limits are surgeon-specific.", ["neck fusion", "ACDF"]),
  surg("ankle-orif", "Ankle ORIF / fracture fixation", "ankle", 8, ["post-op-conservative", "nwb-possible", "no-impact"], ["gentle", "ROM", "protected", "quad"], ["impact", "running", "jump"], 0.7, "WB status is the key driver—never advance without written order.", ["ankle orif", "ankle fracture surgery", "broken ankle surgery"]),
  surg("achilles-repair", "Achilles tendon repair", "ankle", 12, ["post-op-conservative", "nwb-possible", "no-impact"], ["gentle", "protected", "calf-gentle"], ["push-off-load", "running", "jump"], 0.65, "Push-off and running return late after protected healing.", ["achilles repair", "achilles surgery"]),
  surg("carpal-tunnel-release", "Carpal tunnel release", "hand", 3, ["post-op-conservative"], ["gentle", "nerve-gentle", "tendon-glide"], ["heavy-grip-early"], 0.9, "Early tendon glides often used; heavy gripping delayed.", ["CTR", "carpal tunnel surgery"]),
  surg("trigger-finger-release", "Trigger finger release", "hand", 2, ["post-op-conservative"], ["gentle", "tendon-glide"], ["forceful-grip-early"], 0.95, "Light motion early; avoid forceful gripping until comfortable.", ["trigger finger surgery"]),
  surg("spinal-cord-stim", "Spinal cord stimulator implant", "spine", 6, ["post-op-conservative"], ["gentle", "walking", "protected"], ["MRI-restrictions-education", "heavy-lift"], 0.75, "Activity limits and device education are implant-specific.", ["SCS", "stimulator"]),
  surg("cabg", "CABG / open-heart surgery", "cardiac", 8, ["post-op-conservative", "sternal-precautions", "no-heavy-lift"], ["walking", "gentle", "breathing", "protected"], ["heavy-lift", "push-pull-arms", "impact"], 0.6, "Sternal precautions and cardiac rehab pathways—clinician clearance required.", ["bypass surgery", "open heart", "CABG"]),
  surg("appendectomy", "Appendectomy", "abdomen", 3, ["post-op-conservative", "no-heavy-lift"], ["walking", "gentle", "breathing"], ["heavy-lift", "valsalva-heavy"], 0.85, "Core loading and heavy lifting usually delayed briefly.", ["appendix surgery"]),
  surg("hernia-repair", "Hernia repair", "abdomen", 6, ["post-op-conservative", "no-heavy-lift"], ["walking", "gentle", "breathing"], ["heavy-lift", "sit-up-load"], 0.75, "Lifting limits are common early—surgeon timeline varies.", ["hernia surgery"]),
  surg("bariatric", "Bariatric surgery", "abdomen", 6, ["post-op-conservative", "no-heavy-lift"], ["walking", "gentle", "breathing"], ["heavy-lift"], 0.8, "Nutrition and gradual activity—coordinate with bariatric team.", ["gastric bypass", "sleeve gastrectomy"]),
  surg("hip-arthroscopy", "Hip arthroscopy", "hip", 8, ["post-op-conservative", "hip-precautions"], ["gentle", "glute", "protected", "ROM"], ["deep-flexion-load", "impact"], 0.7, "Flexion and pivot limits often protocol-based early.", ["hip scope"]),
  surg("patellar-realignment", "Patellar realignment / MPFL", "knee", 10, ["post-op-conservative", "no-impact"], ["quad", "protected", "motor-control"], ["cutting", "impact", "deep-squat-early"], 0.7, "Quad control and patellar tracking before cutting sports.", ["MPFL", "patella surgery"]),
  surg("total-shoulder", "Total shoulder arthroplasty", "shoulder", 12, ["post-op-conservative", "shoulder-protection"], ["scapular", "protected", "gentle", "isometric"], ["overhead-load", "push-up", "heavy-lift"], 0.65, "Deltoid and subscapularis protection rules are implant-specific.", ["shoulder replacement", "TSA"]),
  surg("reverse-tsa", "Reverse total shoulder arthroplasty", "shoulder", 12, ["post-op-conservative", "shoulder-protection"], ["deltoid", "protected", "gentle"], ["internal-rotation-force", "heavy-lift"], 0.65, "Different mechanics than anatomic TSA—follow reverse-specific protocol.", ["reverse shoulder"]),
  surg("lumbar-lami", "Lumbar laminectomy", "spine", 6, ["post-op-conservative", "spinal-blt"], ["walking", "gentle", "core-gentle"], ["heavy-lift", "end-range-extension-force"], 0.75, "Walking programs are common; respect residual nerve irritability.", ["laminectomy"]),
  surg("fracture-orif-general", "ORIF / fracture fixation (general)", "general", 8, ["post-op-conservative", "nwb-possible", "no-impact"], ["gentle", "protected", "ROM"], ["impact", "heavy-load"], 0.7, "Bone healing and WB orders drive everything—never guess load.", ["orif", "fracture surgery", "plates and screws"]),
  surg("other-surgery", "Recent surgery (general precautions)", "general", 6, ["post-op-conservative", "no-heavy-lift"], ["gentle", "walking", "protected"], ["plyo", "heavy-load", "impact"], 0.7, "When procedure is unclear, stay conservative until written protocol is available.", ["surgery", "post-op", "postoperative"]),
];

export function searchSurgeries(query: string, limit = 20): Surgery[] {
  const q = (query || "").toLowerCase().trim();
  if (!q) return SURGERIES.slice(0, limit);
  const scored = SURGERIES.map((su) => {
    let score = 0;
    const n = su.name.toLowerCase();
    if (n === q) score += 100;
    if (n.startsWith(q)) score += 50;
    if (n.includes(q)) score += 35;
    for (const t of su.searchTerms) {
      if (t === q) score += 80;
      if (t.includes(q) || q.includes(t)) score += 25;
    }
    for (const a of su.aliases || []) {
      if (a.toLowerCase().includes(q)) score += 30;
    }
    if (su.region.includes(q)) score += 8;
    return { su, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.su);
}

export function getSurgeryById(id: string): Surgery | undefined {
  return SURGERIES.find((s) => s.id === id);
}

export function matchSurgeriesFromText(text: string, limit = 5): Surgery[] {
  const t = (text || "").toLowerCase();
  if (t.length < 4) return [];
  const hits: Array<{ su: Surgery; score: number }> = [];
  for (const su of SURGERIES) {
    let score = 0;
    for (const term of su.searchTerms) {
      if (term.length >= 3 && t.includes(term.toLowerCase())) score += term.length >= 8 ? 14 : 8;
    }
    if (t.includes(su.name.toLowerCase())) score += 20;
    if (score) hits.push({ su, score });
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit).map((h) => h.su);
}

/** Weeks since surgery date (local calendar) */
export function weeksSinceSurgery(isoDate: string | undefined | null): number | null {
  if (!isoDate) return null;
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const ms = Date.now() - d.getTime();
  if (ms < 0) return 0;
  return Math.round(ms / (7 * 864e5));
}

export function surgeryPhaseLabel(weeks: number | null, surgery?: Surgery): string {
  if (weeks == null) return "Post-op timeline not set";
  const protect = surgery?.protectWeeksTypical ?? 6;
  if (weeks < 2) return `Hyperacute post-op (~${weeks} wk) — protection-first`;
  if (weeks < protect)
    return `Early post-op (~${weeks} wk of ~${protect} wk protective window education)`;
  if (weeks < protect + 6) return `Intermediate post-op (~${weeks} wk) — graded capacity if cleared`;
  return `Later post-op (~${weeks} wk) — function focus only with clearance`;
}

export const SURGERY_STATS = {
  count: SURGERIES.length,
  description:
    "Curated post-op surgery catalog for HEP protection bias. Surgeon protocol always overrides.",
};
