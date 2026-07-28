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
  surg("acl-r", "ACL reconstruction", "knee", 12, ["post-op-conservative", "acl-style", "no-impact"], ["quad", "hamstring", "motor-control", "protected"], ["cutting", "plyo", "impact", "open-chain-heavy"], 0.7, "Criteria-based RTP often 9–12 months; early phases protect graft.", ["acl reconstruction", "acl repair", "aclr", "acl surgery", "acl recon"], ["ACL surgery"]),
  surg("meniscus-repair", "Meniscus repair", "knee", 8, ["post-op-conservative", "meniscus-protect", "nwb-possible"], ["quad", "gentle", "protected", "ROM"], ["deep-squat", "impact", "twist-load"], 0.7, "Repairs are protected longer than simple meniscectomy—WB and flexion limits are protocol-specific.", ["meniscus repair", "meniscal repair", "meniscus surgery repair"]),
  surg("meniscectomy", "Meniscectomy (partial)", "knee", 3, ["post-op-conservative"], ["quad", "gentle", "functional", "ROM"], ["impact-early"], 0.85, "Often faster than repair, but swelling and quad lag still guide pace.", ["meniscectomy", "meniscus trim", "partial meniscectomy", "scope meniscus"]),
  surg("rotator-cuff-repair", "Rotator cuff repair", "shoulder", 12, ["post-op-conservative", "rotator-cuff-protect", "shoulder-protection"], ["scapular", "gentle", "protected", "isometric"], ["overhead-load", "end-range", "heavy-lift"], 0.65, "Tendon-to-bone healing is slow; active elevation often delayed weeks.", ["rotator cuff repair", "cuff repair", "rcr surgery", "rotator cuff surgery"]),
  surg("shoulder-scope", "Shoulder arthroscopy (general)", "shoulder", 4, ["post-op-conservative", "shoulder-protection"], ["scapular", "gentle", "ROM", "protected"], ["overhead-aggressive"], 0.8, "Timeline depends on what was done inside (debridement vs repair).", ["shoulder scope", "shoulder arthroscopy"]),
  surg("labrum-repair", "Labral repair (shoulder)", "shoulder", 10, ["post-op-conservative", "shoulder-protection"], ["scapular", "protected", "isometric"], ["overhead-load", "throwing"], 0.7, "Position and load limits protect the labrum early.", ["labrum repair", "SLAP repair", "Bankart"]),
  surg("lumbar-fusion", "Lumbar fusion", "spine", 12, ["post-op-conservative", "spinal-blt", "no-heavy-lift"], ["gentle", "walking", "core-gentle", "protected"], ["end-range-flexion", "twist-load", "heavy-lift", "impact"], 0.65, "BLT (bend/lift/twist) limits are common teaching—surgeon-specific duration.", ["spinal fusion", "lumbar fusion", "back fusion"]),
  surg("lumbar-discectomy", "Lumbar discectomy / microdiscectomy", "spine", 6, ["post-op-conservative", "spinal-blt"], ["gentle", "walking", "nerve-gentle", "protected"], ["end-range-flexion-load", "heavy-lift"], 0.7, "Walking and nerve-friendly mobility often early; avoid aggressive flexion loading.", ["discectomy", "microdiscectomy"]),
  surg("cervical-fusion", "Cervical fusion", "spine", 12, ["post-op-conservative", "no-heavy-lift"], ["gentle", "posture", "protected", "walking"], ["end-range-cervical", "heavy-lift", "impact"], 0.65, "Collar use and motion limits are surgeon-specific.", ["neck fusion", "ACDF"]),
  surg("ankle-orif", "Ankle ORIF / fracture fixation", "ankle", 8, ["post-op-conservative", "nwb-possible", "no-impact"], ["gentle", "ROM", "protected", "quad"], ["impact", "running", "jump"], 0.7, "WB status is the key driver—never advance without written order.", ["ankle orif", "ankle fracture surgery", "broken ankle surgery"]),
  surg("achilles-repair", "Achilles tendon repair", "ankle", 12, ["post-op-conservative", "nwb-possible", "no-impact"], ["gentle", "protected", "calf-gentle"], ["push-off-load", "running", "jump"], 0.65, "Push-off and running return late after protected healing.", ["achilles repair", "achilles surgery"]),
  surg("carpal-tunnel-release", "Carpal tunnel release", "hand", 3, ["post-op-conservative"], ["gentle", "nerve-gentle", "tendon-glide"], ["heavy-grip-early"], 0.9, "Early tendon glides often used; heavy gripping delayed.", ["CTR", "carpal tunnel surgery"]),
  surg("trigger-finger-release", "Trigger finger release", "hand", 2, ["post-op-conservative"], ["gentle", "tendon-glide"], ["forceful-grip-early"], 0.95, "Light motion early; avoid forceful gripping until comfortable.", ["trigger finger surgery"]),
  surg("spinal-cord-stim", "Spinal cord stimulator implant", "spine", 6, ["post-op-conservative"], ["gentle", "walking", "protected"], ["MRI-restrictions-education", "heavy-lift"], 0.75, "Activity limits and device education are implant-specific.", ["spinal cord stimulator", "scs implant", "stimulator implant"]),
  surg("cabg", "CABG / open-heart surgery", "cardiac", 8, ["post-op-conservative", "sternal-precautions", "no-heavy-lift"], ["walking", "gentle", "breathing", "protected"], ["heavy-lift", "push-pull-arms", "impact"], 0.6, "Sternal precautions and cardiac rehab pathways—clinician clearance required.", ["bypass surgery", "open heart surgery", "open-heart", "cabg"]),
  surg("appendectomy", "Appendectomy", "abdomen", 3, ["post-op-conservative", "no-heavy-lift"], ["walking", "gentle", "breathing"], ["heavy-lift", "valsalva-heavy"], 0.85, "Core loading and heavy lifting usually delayed briefly.", ["appendectomy", "appendix surgery", "appendix removed"]),
  surg("hernia-repair", "Hernia repair", "abdomen", 6, ["post-op-conservative", "no-heavy-lift"], ["walking", "gentle", "breathing"], ["heavy-lift", "sit-up-load"], 0.75, "Lifting limits are common early—surgeon timeline varies.", ["hernia repair", "hernia surgery"]),
  surg("bariatric", "Bariatric surgery", "abdomen", 6, ["post-op-conservative", "no-heavy-lift"], ["walking", "gentle", "breathing"], ["heavy-lift"], 0.8, "Nutrition and gradual activity—coordinate with bariatric team.", ["bariatric surgery", "gastric bypass", "sleeve gastrectomy"]),
  surg("hip-arthroscopy", "Hip arthroscopy", "hip", 8, ["post-op-conservative", "hip-precautions"], ["gentle", "glute", "protected", "ROM"], ["deep-flexion-load", "impact"], 0.7, "Flexion and pivot limits often protocol-based early.", ["hip arthroscopy", "hip scope"]),
  surg("patellar-realignment", "Patellar realignment / MPFL", "knee", 10, ["post-op-conservative", "no-impact"], ["quad", "protected", "motor-control"], ["cutting", "impact", "deep-squat-early"], 0.7, "Quad control and patellar tracking before cutting sports.", ["mpfl reconstruction", "mpfl repair", "patellar realignment", "patella surgery"]),
  surg("total-shoulder", "Total shoulder arthroplasty", "shoulder", 12, ["post-op-conservative", "shoulder-protection"], ["scapular", "protected", "gentle", "isometric"], ["overhead-load", "push-up", "heavy-lift"], 0.65, "Deltoid and subscapularis protection rules are implant-specific.", ["shoulder replacement", "total shoulder", "tsa"]),
  surg("reverse-tsa", "Reverse total shoulder arthroplasty", "shoulder", 12, ["post-op-conservative", "shoulder-protection"], ["deltoid", "protected", "gentle"], ["internal-rotation-force", "heavy-lift"], 0.65, "Different mechanics than anatomic TSA—follow reverse-specific protocol.", ["reverse shoulder", "reverse tsa", "reverse total shoulder"]),
  surg("lumbar-lami", "Lumbar laminectomy", "spine", 6, ["post-op-conservative", "spinal-blt"], ["walking", "gentle", "core-gentle"], ["heavy-lift", "end-range-extension-force"], 0.75, "Walking programs are common; respect residual nerve irritability.", ["laminectomy", "lumbar laminectomy"]),
  surg("fracture-orif-general", "ORIF / fracture fixation (general)", "general", 8, ["post-op-conservative", "nwb-possible", "no-impact"], ["gentle", "protected", "ROM"], ["impact", "heavy-load"], 0.7, "Bone healing and WB orders drive everything—never guess load.", ["orif", "fracture surgery", "plates and screws", "internal fixation"]),
  // Generic fallback — free-text matcher uses dedicated rules (never bare “surgery” alone)
  surg("other-surgery", "Recent surgery (general precautions)", "general", 6, ["post-op-conservative", "no-heavy-lift"], ["gentle", "walking", "protected"], ["plyo", "heavy-load", "impact"], 0.7, "When procedure is unclear, stay conservative until written protocol is available.", ["unspecified surgery", "recent surgery general"]),
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

export type SurgeryTextMatch = {
  surgery: Surgery;
  score: number;
  confidence: "high" | "medium";
  /** Exact phrase found in free text */
  matchedPhrase: string;
  /** Why it matched (for UI / debugging) */
  reason: string;
};

/** User denied / deferred surgery — do not invent post-op */
const SURGERY_NEGATION =
  /\b(?:no surgery|never had (?:any )?surgery|without surgery|haven'?t had surgery|have not had surgery|avoid(?:ing)? surgery|considering surgery|thinking about surgery|might need surgery|may need surgery|could need surgery|surgery (?:is )?(?:an )?option|recommend(?:ed|ing)? surgery|wants? surgery|need(?:s|ed)? surgery(?!\s+(?:for|on|to))|before surgery|pre[-\s]?op(?:erative)?|scheduled for surgery|pending surgery|surgery cancelled|surgery canceled|looking into surgery|talking about surgery)\b/i;

/**
 * Explicit past/recent surgical *event* language (stated, not assumed).
 * Bare injury words (tear, sprain, “ACL”) without op language do not qualify.
 */
const SURGICAL_EVENT =
  /\b(?:had|have had|i'?ve had|underwent|after (?:my |the |a )?|following (?:my |the |a )?|recovering from|recovered from|status post|s\s*\/\s*p|s\.p\.|post[-\s]?op(?:erative)?|post[-\s]?surgical|operated on|operation on|surgery for|surgery on|my (?:knee|hip|shoulder|back|ankle|wrist|neck|spine) (?:surgery|replacement|reconstruction|repair|fusion)|(?:knee|hip|shoulder) replacement|went under the knife)\b/i;

/** Procedure-style words that confirm an operation when paired with anatomy */
const PROCEDURE_WORDS =
  /\b(?:surgery|surgical|replacement|arthroplasty|reconstruction|repair|fusion|arthroscopy|scope|orif|fixation|discectomy|laminectomy|meniscectomy|appendectomy|bypass|implant(?:ed|ation)?|released?|resection)\b/i;

/**
 * Short codes / ambiguous anatomy that must NOT match as surgery alone.
 * e.g. “ACL tear”, “rotator cuff pain”, “fracture” without op language.
 */
const AMBIGUOUS_ALONE = new Set([
  "acl",
  "mcl",
  "lcl",
  "pcl",
  "mpfl",
  "rcr",
  "scs",
  "ctr",
  "tsa",
  "stimulator",
  "meniscus",
  "rotator cuff",
  "labrum",
  "achilles",
  "fracture",
  "orif",
]);

export function hasSurgicalNegation(text: string): boolean {
  return SURGERY_NEGATION.test(text || "");
}

/**
 * True only when free text states a surgical event (had/post-op/s/p/etc.)
 * or a highly specific procedure phrase — never from bare injury names.
 */
export function hasStatedSurgicalEvent(text: string): boolean {
  const t = text || "";
  if (t.trim().length < 6) return false;
  if (hasSurgicalNegation(t)) return false;
  if (SURGICAL_EVENT.test(t) && PROCEDURE_WORDS.test(t)) return true;
  if (SURGICAL_EVENT.test(t) && /\b(?:surgery|replacement|reconstruction|arthroplasty|orif|fusion)\b/i.test(t))
    return true;
  // Specific multi-word procedures without needing “had” (e.g. “TKA 6 weeks ago”)
  if (
    /\b(?:tka|tha|aclr|acdf|cabg|total knee|total hip|knee replacement|hip replacement|acl reconstruction|rotator cuff repair|spinal fusion|lumbar fusion|shoulder replacement)\b/i.test(
      t
    )
  ) {
    return true;
  }
  return false;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Word-boundary include check for multi-word phrases */
function textHasPhrase(haystack: string, phrase: string): boolean {
  const p = phrase.toLowerCase().trim();
  if (p.length < 2) return false;
  const re = new RegExp(
    `(?:^|[^a-z0-9])${escapeRe(p).replace(/\s+/g, "\\s+")}(?![a-z0-9])`,
    "i"
  );
  return re.test(haystack);
}

/**
 * Specific free-text surgery detection — high precision, no invent.
 * Returns ranked matches with phrase evidence; empty when not clearly stated.
 */
export function detectSurgeriesFromText(text: string, limit = 5): SurgeryTextMatch[] {
  const raw = (text || "").trim();
  if (raw.length < 6) return [];
  if (hasSurgicalNegation(raw)) return [];

  const t = raw.toLowerCase();
  const event = hasStatedSurgicalEvent(raw);
  const hits: SurgeryTextMatch[] = [];

  for (const su of SURGERIES) {
    if (su.id === "other-surgery") continue; // handled after specifics

    const candidates = [
      ...su.searchTerms,
      ...(su.aliases || []),
      su.name,
    ]
      .map((x) => x.toLowerCase().trim())
      .filter((x) => x.length >= 3);

    let best: SurgeryTextMatch | null = null;

    for (const phrase of candidates) {
      if (!textHasPhrase(t, phrase)) continue;

      const ambiguous = AMBIGUOUS_ALONE.has(phrase) || phrase.length <= 4;
      // Short/ambiguous tokens need surgical event language nearby
      if (ambiguous && !event) continue;
      // Anatomy + injury without procedure still blocked
      if (
        /^(acl|mcl|meniscus|rotator cuff|labrum|achilles)$/i.test(phrase) &&
        !PROCEDURE_WORDS.test(t)
      ) {
        continue;
      }

      const specificity = phrase.length >= 12 ? 24 : phrase.length >= 8 ? 18 : 12;
      const conf: "high" | "medium" =
        !ambiguous && (phrase.length >= 10 || /replacement|reconstruction|arthroplasty|repair|fusion|orif|discectomy|laminectomy|appendectomy|bypass/i.test(phrase))
          ? "high"
          : event
            ? "medium"
            : "high";
      const score = specificity + (event ? 8 : 0) + (conf === "high" ? 6 : 0);
      const reason = event
        ? `Matched “${phrase}” with surgical-event language in your story`
        : `Matched specific procedure phrase “${phrase}” (not assumed from injury name alone)`;

      if (!best || score > best.score) {
        best = {
          surgery: su,
          score,
          confidence: conf,
          matchedPhrase: phrase,
          reason,
        };
      }
    }

    if (best) hits.push(best);
  }

  // Prefer meniscus repair over meniscectomy when both could fire
  const repairHit = hits.find((h) => h.surgery.id === "meniscus-repair");
  const ectomyHit = hits.find((h) => h.surgery.id === "meniscectomy");
  if (repairHit && ectomyHit && /repair/i.test(t) && !/meniscectomy|trim|partial menisc/i.test(t)) {
    hits.splice(hits.indexOf(ectomyHit), 1);
  }
  // Prefer reverse TSA over anatomic TSA when reverse mentioned
  if (/\breverse\b/i.test(t)) {
    const tsa = hits.find((h) => h.surgery.id === "total-shoulder");
    const rev = hits.find((h) => h.surgery.id === "reverse-tsa");
    if (tsa && rev) hits.splice(hits.indexOf(tsa), 1);
  }

  hits.sort((a, b) => b.score - a.score || b.matchedPhrase.length - a.matchedPhrase.length);

  // Generic “had surgery” only when no specific procedure matched
  if (hits.length === 0 && event) {
    const generic =
      /\b(?:had|underwent|after|following|recovering from|status post|s\s*\/\s*p|post[-\s]?op).{0,48}\b(?:surgery|surgical procedure|operation)\b|\b(?:surgery|operation)\b.{0,24}\b(?:ago|last week|last month|weeks? ago|months? ago|\d{4})\b/i.test(
        raw
      );
    if (generic) {
      const other = getSurgeryById("other-surgery");
      if (other) {
        hits.push({
          surgery: other,
          score: 10,
          confidence: "medium",
          matchedPhrase: "surgery (unspecified)",
          reason:
            "You stated a surgical event without naming the procedure — general precautions only until you pick the specific surgery",
        });
      }
    }
  }

  // Drop weak noise; keep generic only when it was the only hit
  return hits
    .filter((h) => h.score >= 10)
    .slice(0, limit);
}

/**
 * Catalog surgeries clearly stated in free text (no invent).
 * Prefer {@link detectSurgeriesFromText} when confidence / phrase evidence is needed.
 */
export function matchSurgeriesFromText(text: string, limit = 5): Surgery[] {
  return detectSurgeriesFromText(text, limit).map((h) => h.surgery);
}

/** True when free text clearly states post-op / surgical recovery (not bare injury). */
export function storyStatesPostOp(text: string): boolean {
  return detectSurgeriesFromText(text, 1).length > 0 || hasStatedSurgicalEvent(text);
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
