/**
 * Return-to-sport catalog (PhysioPath-inspired).
 * Educational — late-phase HEP bias only, not RTP clearance.
 */

export type SportImpact = "low" | "moderate" | "high" | "collision";
export type SportDemand =
  | "running"
  | "cutting"
  | "jumping"
  | "overhead"
  | "throwing"
  | "endurance"
  | "strength"
  | "balance"
  | "flexibility"
  | "contact"
  | "racket"
  | "cycling"
  | "swimming"
  | "lifting";

export type Sport = {
  id: string;
  name: string;
  aliases?: string[];
  impact: SportImpact;
  demands: SportDemand[];
  /** Prefer tags for late-phase HEP */
  preferTags: string[];
  bodyPartsHint: string[];
  /** Typical return education (not a guarantee) */
  rtpNote: string;
};

function s(
  id: string,
  name: string,
  impact: SportImpact,
  demands: SportDemand[],
  preferTags: string[],
  bodyPartsHint: string[],
  rtpNote: string,
  aliases?: string[]
): Sport {
  return { id, name, impact, demands, preferTags, bodyPartsHint, rtpNote, aliases };
}

export const SPORTS: Sport[] = [
  s("soccer", "Soccer", "high", ["running", "cutting", "jumping", "contact"], ["functional", "agility", "single-leg", "hip", "ankle"], ["knee", "ankles", "hips", "core"], "Cutting + single-leg control before full match play.", ["football (soccer)", "futbol"]),
  s("basketball", "Basketball", "high", ["running", "jumping", "cutting"], ["plyo-prep", "single-leg", "ankle", "hip"], ["knee", "ankles", "hips"], "Jump-land mechanics and ankle stiffness before full court.", ["hoops"]),
  s("american-football", "American football", "collision", ["running", "cutting", "contact", "strength"], ["strength", "core", "functional", "contact-prep"], ["shoulders", "knee", "core"], "Contact clearance is clinician/sport-medicine driven.", ["football"]),
  s("rugby", "Rugby", "collision", ["running", "contact", "strength"], ["strength", "core", "functional"], ["shoulders", "neck", "knee"], "Contact and tackle progressions need specialist clearance."),
  s("volleyball", "Volleyball", "high", ["jumping", "overhead"], ["jump-land", "shoulder", "scapular", "ankle"], ["shoulders", "knee", "ankles"], "Landing control + overhead endurance for spike/serve."),
  s("baseball", "Baseball", "moderate", ["throwing", "overhead", "running"], ["rotator-cuff", "scapular", "hip", "core"], ["shoulders", "elbow", "hips"], "Throwing volume and kinetic chain before full mound work."),
  s("softball", "Softball", "moderate", ["throwing", "overhead", "running"], ["rotator-cuff", "scapular", "hip"], ["shoulders", "elbow", "hips"], "Windmill or overhead throwing load managed carefully."),
  s("tennis", "Tennis", "high", ["racket", "cutting", "overhead", "running"], ["rotator-cuff", "lateral-hip", "ankle", "wrist"], ["shoulders", "elbow", "wrists", "knee"], "Serve + lateral change of direction after base capacity."),
  s("pickleball", "Pickleball", "moderate", ["racket", "cutting", "balance"], ["lateral-hip", "ankle", "rotator-cuff"], ["knee", "ankles", "shoulders"], "Quick lateral steps and reaction drills late phase."),
  s("golf", "Golf", "low", ["flexibility", "balance", "strength"], ["thoracic", "hip", "core", "rotation"], ["thoracic", "hips", "lower-back", "shoulders"], "Rotational control and hip turn before full swings."),
  s("running", "Running", "moderate", ["running", "endurance"], ["calf", "hip", "foot", "endurance"], ["knee", "ankles", "hips", "calves"], "Walk-run and cadence before mileage spikes.", ["jogging"]),
  s("marathon", "Marathon training", "moderate", ["running", "endurance"], ["endurance", "hip", "calf", "foot"], ["knee", "ankles", "hips"], "Volume builds only when tissue tolerance is green."),
  s("trail-running", "Trail running", "high", ["running", "balance", "endurance"], ["balance", "ankle", "hip", "endurance"], ["ankles", "knee", "hips"], "Uneven terrain needs ankle proprioception first."),
  s("cycling", "Cycling", "low", ["cycling", "endurance"], ["hip", "quad", "endurance", "posture"], ["hips", "knee", "lower-back"], "Bike fit + hip/knee comfort before long rides.", ["road cycling", "spinning"]),
  s("mountain-biking", "Mountain biking", "moderate", ["cycling", "balance", "strength"], ["core", "shoulder", "balance"], ["wrists", "shoulders", "core"], "Impact and grip load—progress trail difficulty slowly."),
  s("swimming", "Swimming", "low", ["swimming", "endurance", "overhead"], ["rotator-cuff", "scapular", "endurance", "thoracic"], ["shoulders", "thoracic", "hips"], "Stroke volume after pain-free overhead mobility.", ["laps"]),
  s("triathlon", "Triathlon", "moderate", ["running", "cycling", "swimming", "endurance"], ["endurance", "hip", "rotator-cuff"], ["shoulders", "hips", "knee"], "Stack disciplines only when each is independently green."),
  s("rowing", "Rowing", "moderate", ["endurance", "strength"], ["hinge", "core", "scapular", "endurance"], ["lower-back", "shoulders", "hips"], "Hinge pattern and lumbar control before hard erg pieces."),
  s("crossfit", "CrossFit", "high", ["lifting", "jumping", "strength", "endurance"], ["strength", "hinge", "overhead", "motor-control"], ["shoulders", "hips", "lower-back", "knee"], "Scale Rx—technique and irritability before intensity.", ["functional fitness"]),
  s("powerlifting", "Powerlifting", "high", ["lifting", "strength"], ["hinge", "squat", "core", "strength"], ["lower-back", "hips", "knee", "shoulders"], "Rebuild competition lifts after pain-free form volumes."),
  s("weightlifting", "Olympic weightlifting", "high", ["lifting", "overhead", "jumping"], ["overhead", "hip", "ankle", "motor-control"], ["shoulders", "hips", "ankles", "wrists"], "Mobility + positions before snatch/clean intensity."),
  s("yoga", "Yoga", "low", ["flexibility", "balance", "strength"], ["mobility", "balance", "core", "gentle"], ["hips", "shoulders", "spine"], "Avoid end-range forcing during irritable phases."),
  s("pilates", "Pilates", "low", ["strength", "flexibility", "balance"], ["core", "motor-control", "mobility"], ["core", "hips", "shoulders"], "Control quality over advanced repertoire early."),
  s("hiking", "Hiking", "moderate", ["endurance", "balance"], ["endurance", "hip", "ankle", "balance"], ["knee", "ankles", "hips"], "Grade pack weight and elevation after base walking."),
  s("climbing", "Rock climbing", "high", ["strength", "overhead", "flexibility"], ["finger", "scapular", "core", "shoulder"], ["shoulders", "elbow", "wrists", "fingers"], "Finger/shoulder load management is critical.", ["bouldering"]),
  s("skiing", "Skiing", "high", ["strength", "balance", "cutting"], ["quad", "hip", "balance", "core"], ["knee", "hips", "ankles"], "Quad endurance and edge control before steep terrain.", ["alpine skiing"]),
  s("snowboarding", "Snowboarding", "high", ["balance", "strength"], ["hip", "ankle", "balance", "core"], ["knee", "ankles", "hips"], "Edge balance and fall-prep after base strength."),
  s("skating", "Ice skating", "moderate", ["balance", "strength"], ["hip", "ankle", "balance"], ["hips", "ankles", "knee"], "Single-leg edge control before hockey/freestyle."),
  s("hockey", "Ice hockey", "collision", ["running", "cutting", "contact", "strength"], ["hip", "core", "strength", "contact-prep"], ["hips", "shoulders", "knee"], "Skating + contact progressions with clearance."),
  s("dance", "Dance", "moderate", ["flexibility", "jumping", "balance", "strength"], ["balance", "hip", "ankle", "mobility"], ["ankles", "hips", "knee", "spine"], "Technique and turnout control before full choreography."),
  s("martial-arts", "Martial arts", "high", ["contact", "strength", "flexibility"], ["hip", "core", "balance", "strength"], ["hips", "shoulders", "knee"], "Sparring only after clinician/sport clearance.", ["mma", "karate", "judo", "bjj"]),
  s("boxing", "Boxing", "high", ["contact", "strength", "endurance"], ["rotator-cuff", "core", "endurance"], ["shoulders", "wrists", "core"], "Punch volume after shoulder/wrist comfort."),
  s("tennis-table", "Table tennis", "low", ["racket", "balance"], ["wrist", "scapular", "rotation"], ["shoulders", "wrists", "elbow"], "Reaction and shoulder endurance late phase."),
  s("badminton", "Badminton", "high", ["racket", "jumping", "overhead"], ["rotator-cuff", "ankle", "lateral-hip"], ["shoulders", "ankles", "knee"], "Overhead smash load after scapular endurance."),
  s("surfing", "Surfing", "moderate", ["balance", "swimming", "strength"], ["shoulder", "core", "balance", "hip"], ["shoulders", "lower-back", "hips"], "Paddle endurance and pop-up control."),
  s("paddleboarding", "Stand-up paddleboarding", "low", ["balance", "strength", "endurance"], ["core", "shoulder", "balance"], ["core", "shoulders", "hips"], "Balance and paddle volume progress slowly."),
  s("equestrian", "Equestrian / riding", "moderate", ["balance", "strength"], ["hip", "core", "balance"], ["hips", "lower-back", "core"], "Seat and hip mobility; fall risk awareness."),
  s("gym-general", "General gym training", "moderate", ["strength", "endurance"], ["strength", "hinge", "motor-control"], ["full-body"], "Rebuild compound patterns with traffic-light dosing."),
  s("walking", "Fitness walking", "low", ["endurance"], ["endurance", "hip", "gentle"], ["hips", "knee", "ankles"], "Often the first green-light activity after flare."),
  s("gardening", "Gardening / yard work", "moderate", ["lifting", "flexibility"], ["hinge", "knee", "functional"], ["lower-back", "knees", "shoulders"], "Hinge and knee-pad strategies for real life.", ["yard work"]),
];

export function searchSports(query: string, limit = 20): Sport[] {
  const q = (query || "").toLowerCase().trim();
  if (!q) return SPORTS.slice(0, limit);
  const scored = SPORTS.map((sp) => {
    let score = 0;
    const n = sp.name.toLowerCase();
    if (n === q) score += 100;
    if (n.startsWith(q)) score += 60;
    if (n.includes(q)) score += 40;
    for (const a of sp.aliases || []) {
      const al = a.toLowerCase();
      if (al === q) score += 90;
      if (al.includes(q)) score += 35;
    }
    for (const d of sp.demands) if (d.includes(q)) score += 8;
    return { sp, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.sp);
}

export function getSportById(id: string): Sport | undefined {
  return SPORTS.find((s) => s.id === id);
}

export function matchSportsFromText(text: string, limit = 5): Sport[] {
  const t = (text || "").toLowerCase();
  if (t.length < 3) return [];
  const hits: Array<{ sp: Sport; score: number }> = [];
  for (const sp of SPORTS) {
    let score = 0;
    if (t.includes(sp.name.toLowerCase())) score += 20;
    for (const a of sp.aliases || []) {
      if (a.length >= 4 && t.includes(a.toLowerCase())) score += 15;
    }
    if (score) hits.push({ sp, score });
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit).map((h) => h.sp);
}

export const SPORT_STATS = {
  count: SPORTS.length,
  description:
    "Return-to-sport catalog for late-phase HEP bias. Not clearance for competition.",
};
