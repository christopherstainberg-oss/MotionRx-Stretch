/**
 * Shared follow-up interview intelligence for Describe Your Issue, Journal, and Jeffery.
 *
 * Goals:
 * - Realism: sound like a careful outpatient clinician, not a form wizard
 * - Accuracy: never re-ask facts the user already stated; deepen partial answers
 * - Specificity: ground questions in the user’s words, regions, and last reply
 * - De-duplication: collapse near-identical prompts across elite + base banks
 *
 * Educational only — not diagnosis or licensed care.
 */

export type PartialAnswerMap = {
  /** Sitting/desk dose already quantified (e.g. “20 minutes”) */
  sittingDose: boolean;
  /** Stairs direction already stated (up / down / both) */
  stairsDirection: boolean;
  /** Primary limiter on stairs already named */
  stairsLimiter: boolean;
  /** Walking distance / time already stated */
  walkingDose: boolean;
  /** Explicit 0–10 pain now and/or worst */
  painNrs: boolean;
  /** Onset style or duration already present */
  onsetOrDuration: boolean;
  /** At least one easer named */
  easers: boolean;
  /** After-activity / 24h response already stated */
  activityResponse: boolean;
  /** Side already clear */
  laterality: boolean;
  /** Sleep pattern already mentioned */
  sleepDetail: boolean;
  /** Goal already stated */
  goals: boolean;
  /** Reaching plane (overhead / behind back / across) already named */
  reachPlane: boolean;
  /** Night pain already described */
  nightPain: boolean;
};

export type AdaptiveQuestionLike = {
  id: string;
  label: string;
  question: string;
  theme?: string;
  category?: string;
  reason?: string;
  priority: number;
};

const STOP_FP = new Set([
  "the",
  "and",
  "you",
  "your",
  "for",
  "with",
  "that",
  "this",
  "what",
  "when",
  "where",
  "how",
  "does",
  "do",
  "is",
  "are",
  "about",
  "before",
  "after",
  "most",
  "more",
  "from",
  "into",
  "than",
  "only",
  "still",
  "feel",
  "feels",
  "pain",
  "symptoms",
]);

/** Soft conversational region phrase for mid-sentence use */
export function conversationalRegion(regionLabel: string): string {
  const raw = (regionLabel || "").trim();
  if (!raw || /what is bothering/i.test(raw)) return "this area";
  // "Lower Back / Lumbar" → "your lower back"
  let s = raw
    .split("/")[0]!
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  // Drop redundant clinical dual labels already split
  s = s.replace(/\b(lumbar|cervical|thoracic)\b/gi, "").replace(/\s+/g, " ").trim() || raw.toLowerCase();
  if (s.startsWith("your ")) return s;
  return `your ${s}`;
}

/** Window of text around a keyword (local co-occurrence, avoids false positives) */
function nearKeyword(text: string, keywordRe: RegExp, window = 48): string {
  const flags = keywordRe.flags.includes("g") ? keywordRe.flags : `${keywordRe.flags}g`;
  const matches = text.matchAll(new RegExp(keywordRe.source, flags));
  const chunks: string[] = [];
  for (const m of matches) {
    const i = m.index ?? 0;
    chunks.push(
      text.slice(Math.max(0, i - window), Math.min(text.length, i + (m[0]?.length || 0) + window))
    );
  }
  return chunks.join(" || ");
}

/** Same-sentence (or clause) context for a keyword */
function sentenceNearKeyword(text: string, keywordRe: RegExp): string {
  const sentences = text.split(/(?<=[.!?])\s+|\n+/);
  return sentences.filter((s) => keywordRe.test(s)).join(" || ");
}

/** Detect facts already present so follow-ups deepen instead of re-ask */
export function detectPartialAnswers(raw: string): PartialAnswerMap {
  const t = (raw || "").toLowerCase().replace(/\s+/g, " ");
  const sitNear = nearKeyword(t, /\b(sit|sitting|desk|computer|chair)\b/);
  const stairSent = sentenceNearKeyword(t, /\b(stair|stairs)\b/);
  const walkNear = nearKeyword(t, /\b(walk|walking)\b/);
  const sleepNear = nearKeyword(t, /\b(sleep|slept|woke|wake|night)\b/);

  return {
    sittingDose:
      /\b(\d{1,3})\s*(min|mins|minutes|hour|hours|hr|hrs)\b/.test(sitNear) ||
      (/\b(\d{1,3})\s*(min|mins|minutes|hour|hours|hr|hrs)\b/.test(t) &&
        /\b(sit|sitting|desk)\b/.test(t) &&
        // same sentence-ish: digit within 40 chars of sit/desk
        /(?:sit|sitting|desk)[^.!?]{0,40}\b\d{1,3}\s*(min|minutes|hour|hours)\b|\b\d{1,3}\s*(min|minutes|hour|hours)\b[^.!?]{0,40}(?:sit|sitting|desk)/.test(
          t
        )),
    stairsDirection:
      /\b(going\s+)?(up|down|upstairs|downstairs)\b/.test(stairSent) ||
      /\b(stair|stairs).{0,40}\b(up|down)\b|\b(up|down).{0,40}\b(stair|stairs)\b/.test(t),
    // Limiter must appear in the same sentence as stairs — not a later “pain is 5/10”
    stairsLimiter:
      /\b(pain|weak|weakness|swell|swelling|giving way|buckl|unstable|stiff|stiffness)\b/.test(
        stairSent
      ),
    walkingDose:
      /\b(\d{1,3})\s*(min|mins|minutes|blocks?|miles?|km)\b/.test(walkNear) ||
      /\b(few|several)\s+(minutes|blocks)\b/.test(walkNear),
    painNrs: /\b([0-9]|10)\s*\/\s*10\b/.test(t) || /\b([0-9]|10)\s*out of\s*10\b/.test(t),
    onsetOrDuration:
      /\b(sudden|suddenly|gradual|gradually|insidious|overnight)\b/.test(t) ||
      /\b(for|since)\s+(\d{1,3}|a|an|few|several)\s*(day|days|week|weeks|month|months|year|years)\b/.test(
        t
      ) ||
      /\b\d{1,3}\s*(day|days|week|weeks|month|months|year|years)\b/.test(t),
    easers:
      /\b(helps?|eases?|relieves?|better with|improves with|settles with)\b/.test(t) ||
      (/\b(heat|ice|rest|walk|walking|stretch|meds?|ibuprofen|tylenol|position)\b/.test(t) &&
        /\b(help|ease|better|relief|settle)\b/.test(t)),
    activityResponse:
      /\b(2\s*[-–]?\s*24|next day|later that|after (i )?(move|exercise|stretch|walk|session))\b/.test(
        t
      ) && /\b(better|worse|same|irritated|sore|settles?)\b/.test(t),
    laterality:
      /\b(left|right|both sides|bilateral|central|midline)\b/.test(t) &&
      !/\bleft (work|job|the house)\b/.test(t),
    sleepDetail:
      /\b(sleep|slept|woke|wake|night pain|can't get comfortable|cannot get comfortable)\b/.test(
        sleepNear || t
      ),
    goals:
      /\b(want to|hoping to|goal is|get back to|return to|so i can|i need to be able)\b/.test(t),
    reachPlane:
      /\b(overhead|above (my |the )?head|behind (my |the )?back|across (my |the )?body|bra|belt)\b/.test(
        t
      ),
    nightPain:
      /\b(night|nighttime|at night|when i (roll|sleep|lie))\b/.test(t) &&
      /\b(pain|hurt|ache)\b/.test(sleepNear || t),
  };
}

/** Fingerprint for near-duplicate detection */
export function questionFingerprint(question: string): string {
  const tokens = question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_FP.has(w));
  // Keep contentful stems that define clinical intent
  const key = tokens
    .filter((w) =>
      /sit|desk|stair|walk|pain|ease|sleep|fear|goal|after|flare|reach|lift|bend|side|left|right|onset|start|weak|numb|mood|stress|dose|minute|hour|up|down/.test(
        w
      )
    )
    .slice(0, 8)
    .join("|");
  return key || tokens.slice(0, 6).join("|");
}

/** Theme-level cluster so elite + base don't both ask the same clinical slot */
function themeCluster(theme: string | undefined, label: string, question: string): string {
  const blob = `${theme || ""} ${label} ${question}`.toLowerCase();
  if (/safety|red.?flag|crisis|saddle|bowel|bladder/.test(blob)) return "safety";
  if (/sit|desk|chair/.test(blob) && /minute|dose|toler|build|stand/.test(blob)) return "sit-dose";
  if (/stair/.test(blob)) return "stairs";
  if (/walk|distance|blocks/.test(blob)) return "walk-dose";
  if (/0\s*[-–/]\s*10|pain scale|nrs|most of the day/.test(blob) && /worst|pain/.test(blob))
    return "pain-nrs";
  if (/2\s*[-–]?\s*24|after you move|after activity|next day|delayed/.test(blob))
    return "activity-response";
  if (/ease|helps|relief|settle/.test(blob) && !/after you move/.test(blob)) return "easers";
  if (/left|right|both|laterality|side/.test(blob) && /mainly|side|central/.test(blob))
    return "laterality";
  if (/onset|how did this start|how long|timeline|sudden|gradual/.test(blob)) return "onset";
  if (/sleep|night|wake/.test(blob)) return "sleep";
  if (/fear|avoid|guard|threaten/.test(blob)) return "fear";
  if (/goal|win|want back|miracle/.test(blob)) return "goals";
  if (/reach|overhead|bra|belt/.test(blob)) return "reach";
  if (/neuro|numb|tingl|radiat|travel/.test(blob)) return "neuro";
  if (/hardest|everyday task|function|psfs/.test(blob)) return "function";
  if (/mood|anxious|stress|overwhelm/.test(blob)) return "mood-stress";
  if (/plan|program|reps|too hard|too easy|progress/.test(blob)) return "plan";
  return `theme:${(theme || label || "other").toLowerCase()}`;
}

/**
 * De-dupe adaptive questions by fingerprint + theme cluster.
 * Keeps highest priority; optional last-answer boost applied first.
 */
export function dedupeAdaptiveQuestions<T extends AdaptiveQuestionLike>(
  questions: T[],
  opts?: { cap?: number; lastAnswer?: string }
): T[] {
  const last = (opts?.lastAnswer || "").toLowerCase();
  const scored = questions.map((q) => {
    let p = q.priority;
    // Slightly boost questions that clearly reference last answer tokens
    if (last.length >= 12) {
      const words = last
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= 4)
        .slice(0, 8);
      let hits = 0;
      for (const w of words) {
        if (q.question.toLowerCase().includes(w)) hits++;
      }
      if (hits >= 2) p += 6;
      if (hits >= 4) p += 4;
    }
    return { q, p };
  });
  scored.sort((a, b) => b.p - a.p);

  const out: T[] = [];
  const seenFp = new Set<string>();
  const seenCluster = new Set<string>();

  for (const { q, p } of scored) {
    const fp = questionFingerprint(q.question);
    const cluster = themeCluster(q.theme, q.label, q.question);
    if (fp && seenFp.has(fp)) continue;
    if (seenCluster.has(cluster)) continue;
    // Skip if user already answered this exact question fragment
    if (last && last.includes(q.question.slice(0, Math.min(28, q.question.length)).toLowerCase())) {
      continue;
    }
    seenFp.add(fp);
    seenCluster.add(cluster);
    out.push({ ...q, priority: p });
    if (out.length >= (opts?.cap ?? 10)) break;
  }
  return out;
}

/**
 * Filter / rewrite story follow-ups so we don't re-ask known facts.
 * When a detail is known, swap to a deeper probe or drop the question.
 */
export function refineStoryFollowUps<T extends AdaptiveQuestionLike>(
  questions: T[],
  opts: {
    raw: string;
    name?: string;
    regionLabel?: string;
    lastAnswer?: string;
    quote?: string;
    cap?: number;
  }
): T[] {
  const partial = detectPartialAnswers(opts.raw);
  const region = conversationalRegion(opts.regionLabel || "this area");
  const name = (opts.name || "").trim() || "friend";
  const quote = (opts.quote || "").trim();
  const last = (opts.lastAnswer || "").trim();

  const refined: T[] = [];

  for (const q of questions) {
    const blob = `${q.label} ${q.question} ${q.theme || ""}`.toLowerCase();
    let next = { ...q };

    // —— Skip or deepen based on partial answers ——
    if (themeCluster(q.theme, q.label, q.question) === "sit-dose" && partial.sittingDose) {
      next = {
        ...next,
        id: `${q.id}-deepen`,
        label: "What ends the sit flare?",
        question: `${name}, you already timed the sitting build-up—what reliably ends that desk flare faster: standing, a short walk, changing lumbar support, or something else—and how long until it settles?`,
        reason: "Sitting dose known — deepen recovery strategy (not re-ask minutes)",
        priority: q.priority + 2,
      };
    } else if (themeCluster(q.theme, q.label, q.question) === "stairs") {
      if (partial.stairsDirection && partial.stairsLimiter) {
        next = {
          ...next,
          id: `${q.id}-deepen`,
          label: "Stairs work-around?",
          question: `You already described stairs direction and the main limit. What do you do differently on stairs now (rail, slower pace, one step at a time), and what would “better stairs” look like in two weeks?`,
          reason: "Stairs direction + limiter known — deepen function goal",
          priority: q.priority + 1,
        };
      } else if (partial.stairsDirection && !partial.stairsLimiter) {
        next = {
          ...next,
          id: `${q.id}-limiter`,
          label: "What limits stairs first?",
          question: `You already said which way on stairs is harder. Is the first limit pain, weakness, swelling, stiffness, or a sense of giving way?`,
          reason: "Stairs direction known — ask limiter only",
          priority: q.priority,
        };
      }
    } else if (themeCluster(q.theme, q.label, q.question) === "pain-nrs" && partial.painNrs) {
      // Already has numbers — don't re-ask NRS
      continue;
    } else if (themeCluster(q.theme, q.label, q.question) === "onset" && partial.onsetOrDuration) {
      next = {
        ...next,
        id: `${q.id}-trend`,
        label: "Getting better or worse?",
        question: `You already gave a timeline. Since then, has ${region} been getting better, worse, or staying about the same week to week?`,
        reason: "Onset/duration known — ask trajectory only",
        priority: Math.max(50, q.priority - 5),
      };
    } else if (themeCluster(q.theme, q.label, q.question) === "easers" && partial.easers) {
      next = {
        ...next,
        id: `${q.id}-dose`,
        label: "How long does relief last?",
        question: `You already named something that helps. How long does that relief last, and does it still work on a bad day?`,
        reason: "Easer known — deepen dose/duration of relief",
        priority: q.priority,
      };
    } else if (
      themeCluster(q.theme, q.label, q.question) === "activity-response" &&
      partial.activityResponse
    ) {
      continue;
    } else if (themeCluster(q.theme, q.label, q.question) === "laterality" && partial.laterality) {
      continue;
    } else if (themeCluster(q.theme, q.label, q.question) === "walk-dose" && partial.walkingDose) {
      next = {
        ...next,
        id: `${q.id}-stop`,
        label: "What stops the walk?",
        question: `You already roughly timed walking. What stops you first—pain, tightness, numbness, swelling, or fatigue—and does rest clear it quickly?`,
        reason: "Walking dose known — ask limiting quality",
        priority: q.priority,
      };
    } else if (themeCluster(q.theme, q.label, q.question) === "goals" && partial.goals) {
      next = {
        ...next,
        id: `${q.id}-measure`,
        label: "How will you know it’s better?",
        question: `You already named what you want back. What’s the first measurable sign of progress (minutes at the desk, stair flights, sleep hours, confidence 0–10)?`,
        reason: "Goal known — make it measurable",
        priority: q.priority,
      };
    } else if (themeCluster(q.theme, q.label, q.question) === "reach" && partial.reachPlane) {
      next = {
        ...next,
        id: `${q.id}-night`,
        label: "Night or strength limit?",
        question: `You already named which reaches bother you. Is night pain, weakness, grinding, or daytime reaching the bigger limiter right now?`,
        reason: "Reach plane known — deepen dominant limiter",
        priority: q.priority,
      };
    } else if (themeCluster(q.theme, q.label, q.question) === "sleep" && partial.sleepDetail) {
      // Keep only if deepening night positions — soften generic re-ask
      if (/how are sleep and stress/i.test(q.question)) {
        next = {
          ...next,
          id: `${q.id}-positions`,
          label: "Sleep positions?",
          question: `Sleep is already in your story. Which positions are worst, how often do you wake, and is it pain or a racing mind that wakes you more?`,
          reason: "Sleep mentioned — deepen positions/wakes",
          priority: q.priority,
        };
      }
    }

    // —— Naturalize robotic region labels in the question text ——
    next.question = naturalizeQuestionWording(next.question, region);

    // —— Ground in last answer or primary quote when still generic ——
    if (last.length >= 20 && !/you (said|mentioned|wrote|already|linked|named|described)/i.test(next.question)) {
      const snipLast = snipForQuestion(last, 56);
      if (snipLast && next.priority >= 70 && refined.length === 0) {
        // Only lightly ground the top upcoming question
        next = {
          ...next,
          question: groundWithLastAnswer(next.question, snipLast, name),
          reason: `${next.reason || "Follow-up"} · grounded in last reply`,
        };
      }
    } else if (
      quote.length >= 12 &&
      refined.length === 0 &&
      !/you (said|mentioned|wrote)/i.test(next.question)
    ) {
      next = {
        ...next,
        question: groundWithQuote(next.question, quote, name),
      };
    }

    // Drop if still a pure re-ask of something fully known
    if (shouldDropFullyAnswered(blob, partial)) continue;

    refined.push(next);
  }

  return dedupeAdaptiveQuestions(refined, {
    cap: opts.cap ?? 10,
    lastAnswer: opts.lastAnswer || opts.raw,
  });
}

function shouldDropFullyAnswered(blob: string, p: PartialAnswerMap): boolean {
  if (/0\s*[-–/]\s*10|pain scale/.test(blob) && p.painNrs && !/safe motion|flare|settles/.test(blob))
    return true;
  if (/left, right, or both|mainly left/.test(blob) && p.laterality) return true;
  if (/2\s*[-–]?\s*24|after you move/.test(blob) && p.activityResponse) return true;
  return false;
}

/** Replace stiff catalog region labels with conversational phrasing */
export function naturalizeQuestionWording(question: string, regionConversational: string): string {
  let q = question;
  // Fix "before Lower Back / Lumbar builds"
  q = q.replace(
    /\bbefore\s+([A-Z][A-Za-z/ ]{2,40})\s+builds\b/g,
    `before symptoms in ${regionConversational} build`
  );
  q = q.replace(/\bLower Back \/ Lumbar\b/g, regionConversational.replace(/^your\s+/i, "lower back"));
  q = q.replace(/\bNeck \/ Cervical\b/gi, "neck");
  q = q.replace(/\bUpper Back \/ Thoracic\b/gi, "upper back");
  // "where does Lower Back sit" → "where does your lower back sit"
  q = q.replace(
    /\bwhere does\s+([A-Z][A-Za-z/ ]{2,40})\s+sit\b/g,
    `where does ${regionConversational} sit`
  );
  q = q.replace(/\bmake\s+([A-Z][A-Za-z/ ]{2,40})\s+worse\b/g, `make ${regionConversational} worse`);
  return q;
}

function snipForQuestion(text: string, max = 56): string {
  const s = text.trim().replace(/\s+/g, " ");
  if (!s) return "";
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function groundWithLastAnswer(question: string, lastSnip: string, name: string): string {
  // Avoid double-preface
  if (/^[^,]{0,40}, you /i.test(question)) return question;
  const body = question.replace(new RegExp(`^${name},\\s*`, "i"), "");
  return `${name}, you just shared “${lastSnip}.” ${body.charAt(0).toUpperCase()}${body.slice(1)}`;
}

function groundWithQuote(question: string, quote: string, name: string): string {
  if (/you (said|mentioned|wrote|linked|already)/i.test(question)) return question;
  // Only ground with a short, specific phrase — not a whole paragraph
  const q = snipForQuestion(quote, 42);
  if (!q || q.length < 12) return question;
  if (question.includes(q)) return question;
  // Skip long paragraph-like quotes (prefer last-answer grounding or clean gap ask)
  if (q.split(/\s+/).length > 8) return question;
  const body = question.replace(new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")},\\s*`, "i"), "");
  return `${name}, you mentioned “${q}.” ${body.charAt(0).toUpperCase()}${body.slice(1)}`;
}

/**
 * Journal/Jeffery: refine bank questions with partial answers + de-dupe + last-answer grounding.
 */
export function refineContinuousInterviewQuestions<T extends AdaptiveQuestionLike>(
  questions: T[],
  opts: {
    raw: string;
    name?: string;
    regionLabel?: string;
    lastAnswer?: string;
    cap?: number;
  }
): T[] {
  return refineStoryFollowUps(questions, {
    raw: opts.raw,
    name: opts.name,
    regionLabel: opts.regionLabel,
    lastAnswer: opts.lastAnswer,
    cap: opts.cap ?? 10,
  });
}

/**
 * Build a short, realistic bridge only when it adds clinical value.
 * Prefer empty bridge (next question alone) unless we can acknowledge a concrete fact.
 */
export function clinicalAckBridge(opts: {
  name?: string;
  lastAnswer?: string;
  partial?: PartialAnswerMap;
}): string {
  const name = (opts.name || "").trim() || "friend";
  const ans = (opts.lastAnswer || "").trim();
  if (ans.length < 12) return "";
  const p = opts.partial || detectPartialAnswers(ans);
  if (p.painNrs) return `${name}, got the numbers—next I need the piece that changes dosing.`;
  if (p.sittingDose) return `${name}, the sitting timeline helps—one more load detail.`;
  if (p.stairsDirection) return `${name}, noted on the stairs—tightening the functional limit next.`;
  if (p.activityResponse) return `${name}, the after-activity response is key for how hard we push.`;
  if (/\b(afraid|scared|worried|avoid)\b/i.test(ans))
    return `${name}, fear around movement matters for how we grade exposure.`;
  return "";
}
