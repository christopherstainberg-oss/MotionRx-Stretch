/**
 * Clinically significant conditions catalog for Assessment paragraph intake.
 * Bases cover MSK injuries, surgeries, and complex medical conditions.
 * Expanded to 250k+ capacity via laterality × phase × severity × context × population.
 * Sub-categories refine MSK/cardiac/neuro/etc. Educational only — not diagnostic.
 */

import type { BodyPart, Difficulty } from "@/lib/types";
import type { ProgramBias } from "@/data/pain-descriptors";
import { foldKeyboardPunctuation, stripDangerousInvisible } from "@/lib/input-normalize";

export type ClinicalCategory =
  | "musculoskeletal-injury"
  | "musculoskeletal-condition"
  | "post-surgical"
  | "neurological"
  | "cardiac"
  | "pulmonary"
  | "pediatric"
  | "vestibular"
  | "rheumatologic"
  | "oncologic"
  | "endocrine-metabolic"
  | "vascular"
  | "integumentary"
  | "multi-system-complex"
  | "pain-psychosocial";

/** Finer sub-categories within each major clinical category */
export type ClinicalSubcategory =
  | "ligament"
  | "tendon-overuse"
  | "muscle-strain"
  | "cartilage-meniscus"
  | "bone-stress-fracture"
  | "joint-capsule-instability"
  | "spine-disc-nerve"
  | "spine-mechanical"
  | "joint-replacement"
  | "soft-tissue-repair"
  | "fracture-fixation"
  | "arthroscopy"
  | "cns"
  | "pns-radicular"
  | "neurodegenerative"
  | "ischemic-heart"
  | "heart-failure-rhythm"
  | "post-cardiac-surgery"
  | "obstructive-lung"
  | "restrictive-pulmonary"
  | "pediatric-ortho"
  | "pediatric-neuro-dev"
  | "inner-ear-balance"
  | "inflammatory-arthritis"
  | "degenerative-arthritis"
  | "cancer-survivorship"
  | "metabolic-bone"
  | "metabolic-systemic"
  | "arterial-venous"
  | "wound-skin"
  | "complex-multisystem"
  | "nociplastic-pain"
  | "general";

export const CLINICAL_CATEGORY_LABELS: Record<ClinicalCategory, string> = {
  "musculoskeletal-injury": "Musculoskeletal injuries",
  "musculoskeletal-condition": "Musculoskeletal conditions",
  "post-surgical": "Surgical / post-operative",
  neurological: "Neurological",
  cardiac: "Cardiac / cardiovascular",
  pulmonary: "Pulmonary / respiratory",
  pediatric: "Pediatric",
  vestibular: "Vestibular / balance",
  rheumatologic: "Rheumatologic / inflammatory",
  oncologic: "Oncologic / cancer-related",
  "endocrine-metabolic": "Endocrine / metabolic",
  vascular: "Vascular",
  integumentary: "Integumentary / wound",
  "multi-system-complex": "Multi-system / complex medical",
  "pain-psychosocial": "Pain science / psychosocial",
};

export const CLINICAL_SUBCATEGORY_LABELS: Record<ClinicalSubcategory, string> = {
  ligament: "Ligament injury",
  "tendon-overuse": "Tendon / overuse",
  "muscle-strain": "Muscle strain",
  "cartilage-meniscus": "Cartilage / meniscus",
  "bone-stress-fracture": "Bone stress / fracture",
  "joint-capsule-instability": "Joint capsule / instability",
  "spine-disc-nerve": "Spine disc / nerve",
  "spine-mechanical": "Spine mechanical",
  "joint-replacement": "Joint replacement",
  "soft-tissue-repair": "Soft-tissue repair",
  "fracture-fixation": "Fracture fixation (ORIF)",
  arthroscopy: "Arthroscopic surgery",
  cns: "Central nervous system",
  "pns-radicular": "Peripheral / radicular nerve",
  neurodegenerative: "Neurodegenerative",
  "ischemic-heart": "Ischemic heart disease",
  "heart-failure-rhythm": "Heart failure / rhythm",
  "post-cardiac-surgery": "Post–cardiac surgery",
  "obstructive-lung": "Obstructive lung disease",
  "restrictive-pulmonary": "Restrictive / recovery lung",
  "pediatric-ortho": "Pediatric orthopedics",
  "pediatric-neuro-dev": "Pediatric neurodevelopment",
  "inner-ear-balance": "Inner ear / balance",
  "inflammatory-arthritis": "Inflammatory arthritis",
  "degenerative-arthritis": "Degenerative arthritis (OA)",
  "cancer-survivorship": "Cancer survivorship",
  "metabolic-bone": "Metabolic bone",
  "metabolic-systemic": "Metabolic / systemic",
  "arterial-venous": "Arterial / venous",
  "wound-skin": "Wound / skin",
  "complex-multisystem": "Complex multi-system",
  "nociplastic-pain": "Nociplastic / chronic pain",
  general: "General",
};

export interface ClinicalOutcomeTarget {
  /** Short outcome label used in routines / HEP */
  label: string;
  /** Evidence-informed outpatient framing (educational) */
  evidenceNote: string;
  /** Realistic timeframe language */
  timeframe: string;
  /** How success is observed clinically */
  measureHint: string;
}

export interface ClinicalCondition {
  id: string;
  label: string;
  clinicalTerm: string;
  category: ClinicalCategory;
  subcategory: ClinicalSubcategory;
  plainLanguage: string;
  kidFriendly: string;
  bodyPartsHint: BodyPart[];
  programBiases: ProgramBias[];
  stretchBias: number;
  exerciseBias: number;
  irritabilityBoost: number;
  maxDifficulty?: Difficulty;
  avoidTags: string[];
  preferTags: string[];
  redFlagEducation?: string;
  /** Prefer professional clearance before progressive loading */
  clearanceRequired?: boolean;
  searchTerms: string[];
  /** Short outcome labels (legacy + UI chips) */
  outcomeFocus: string[];
  /** Richer evidence-based outcome targets for routines */
  clinicalOutcomes?: ClinicalOutcomeTarget[];
}

type Seed = Omit<
  ClinicalCondition,
  "searchTerms" | "avoidTags" | "preferTags" | "subcategory" | "clinicalOutcomes"
> & {
  searchTerms?: string[];
  avoidTags?: string[];
  preferTags?: string[];
  subcategory?: ClinicalSubcategory;
  clinicalOutcomes?: ClinicalOutcomeTarget[];
};

/** Infer a sensible subcategory when seed omitted one */
export function inferSubcategory(c: {
  id: string;
  category: ClinicalCategory;
  label: string;
  searchTerms?: string[];
}): ClinicalSubcategory {
  const blob = `${c.id} ${c.label} ${(c.searchTerms || []).join(" ")}`.toLowerCase();
  if (c.category === "post-surgical") {
    if (/replacement|arthroplasty|tka|tha|tsa/.test(blob)) return "joint-replacement";
    if (/orif|fracture|fixation/.test(blob)) return "fracture-fixation";
    if (/arthroscopy/.test(blob)) return "arthroscopy";
    if (/repair|reconstruction|aclr|cuff|tendon|menisc/.test(blob)) return "soft-tissue-repair";
    return "soft-tissue-repair";
  }
  if (c.category === "neurological") {
    if (/parkinson|multiple sclerosis|\bms\b/.test(blob)) return "neurodegenerative";
    if (/radicul|neuropathy|nerve|carpal|sciatica|bell/.test(blob)) return "pns-radicular";
    if (/stroke|cva|tbi|spinal cord|cerebral|concussion|guillain/.test(blob)) return "cns";
    return "cns";
  }
  if (c.category === "cardiac") {
    if (/cabg|sternal|bypass|valve surgery|open heart/.test(blob)) return "post-cardiac-surgery";
    if (/failure|chf|afib|fibrillation|pacemaker|icd/.test(blob)) return "heart-failure-rhythm";
    return "ischemic-heart";
  }
  if (c.category === "pulmonary") {
    if (/copd|asthma|obstruct/.test(blob)) return "obstructive-lung";
    return "restrictive-pulmonary";
  }
  if (c.category === "pediatric") {
    if (/delay|cerebral palsy|motor/.test(blob)) return "pediatric-neuro-dev";
    return "pediatric-ortho";
  }
  if (c.category === "vestibular") return "inner-ear-balance";
  if (c.category === "rheumatologic") {
    if (/oa|osteoarthritis|spondylosis/.test(blob)) return "degenerative-arthritis";
    return "inflammatory-arthritis";
  }
  if (c.category === "oncologic") return "cancer-survivorship";
  if (c.category === "endocrine-metabolic") {
    if (/osteo|bone density/.test(blob)) return "metabolic-bone";
    return "metabolic-systemic";
  }
  if (c.category === "vascular") return "arterial-venous";
  if (c.category === "integumentary") return "wound-skin";
  if (c.category === "pain-psychosocial") return "nociplastic-pain";
  if (c.category === "multi-system-complex") return "complex-multisystem";
  if (/tendon|tendin|epicondyl|achilles|plantar|de quervain|jumper/.test(blob))
    return "tendon-overuse";
  if (/ligament|acl|mcl|sprain|tfcc|collateral|bankart/.test(blob)) return "ligament";
  if (/strain|pulled|contusion|hamstring|quad|calf|adductor/.test(blob)) return "muscle-strain";
  if (/menisc|labral|cartilage|chondral/.test(blob)) return "cartilage-meniscus";
  if (/fracture|stress fracture|orif|bone stress/.test(blob)) return "bone-stress-fracture";
  if (/instability|dislocation|subluxation|frozen|adhesive/.test(blob))
    return "joint-capsule-instability";
  if (/disc|radicul|sciatica|stenosis|herniat/.test(blob)) return "spine-disc-nerve";
  if (/lumbar|thoracic|cervical|back|neck|si joint|spondyl/.test(blob)) return "spine-mechanical";
  return "general";
}

function defaultOutcomes(labels: string[], category: ClinicalCategory): ClinicalOutcomeTarget[] {
  return labels.map((label) => ({
    label,
    evidenceNote:
      category === "post-surgical"
        ? "Outpatient protocols emphasize criterion-based progression, tissue healing timelines, and surgeon/PT co-management—not calendar-only milestones."
        : category === "cardiac" || category === "pulmonary"
          ? "Cardiac/pulmonary rehab principles use symptom-limited dosing (RPE/dyspnea scales), gradual aerobic progression, and medical clearance when indicated."
          : category === "neurological"
            ? "Neuro rehab outcomes favor task-specific practice, motor learning dose, and safety (falls, skin, autonomic) over aggressive passive stretching alone."
            : category === "pain-psychosocial"
              ? "For persistent pain, graded activity and self-efficacy often improve function even when pain scores change slowly."
              : "Outpatient MSK care pairs load management with progressive capacity building; short-term comfort modalities support—not replace—active rehab.",
    timeframe:
      category === "post-surgical"
        ? "Phase-dependent (often weeks to months; follow protocol)"
        : category === "cardiac" || category === "pulmonary"
          ? "Weeks of graded conditioning with medical oversight as needed"
          : "Typically 2–6+ weeks of consistent practice for meaningful function change",
    measureHint: label,
  }));
}

function withSearch(c: Seed): ClinicalCondition {
  const subcategory =
    c.subcategory && c.subcategory !== "general"
      ? c.subcategory
      : inferSubcategory({
          id: c.id,
          category: c.category,
          label: c.label,
          searchTerms: c.searchTerms,
        });
  const outcomeFocus = c.outcomeFocus?.length ? c.outcomeFocus : ["Function", "Pain-aware activity"];
  const clinicalOutcomes =
    c.clinicalOutcomes?.length ? c.clinicalOutcomes : defaultOutcomes(outcomeFocus, c.category);
  const terms = new Set<string>([
    c.label.toLowerCase(),
    c.clinicalTerm.toLowerCase(),
    subcategory.replace(/-/g, " "),
    CLINICAL_SUBCATEGORY_LABELS[subcategory].toLowerCase(),
    ...(c.searchTerms || []),
    ...c.label.toLowerCase().split(/[\s,/()-]+/).filter((t) => t.length > 2),
  ]);
  return {
    ...c,
    subcategory,
    outcomeFocus,
    clinicalOutcomes,
    avoidTags: c.avoidTags || [],
    preferTags: c.preferTags || [],
    searchTerms: Array.from(terms),
  };
}

/** Core clinician-authored condition seeds */
const SEEDS: Seed[] = [
  // —— MSK injuries ——
  { id: "cond-acl-sprain", label: "ACL sprain / tear", clinicalTerm: "Anterior cruciate ligament injury", category: "musculoskeletal-injury", plainLanguage: "Knee ligament injury that can make the knee feel unstable.", kidFriendly: "A stretchy band inside the knee got hurt.", bodyPartsHint: ["knee"], programBiases: ["controlled-strength", "motor-control", "short-volume"], stretchBias: -0.2, exerciseBias: 0.6, irritabilityBoost: 1.2, maxDifficulty: "beginner", avoidTags: ["plyometric", "cutting"], preferTags: ["quad", "hamstring", "neuromuscular"], searchTerms: ["acl", "anterior cruciate", "knee giving way"], outcomeFocus: ["Knee stability", "Quad control", "Return to sport criteria"] },
  { id: "cond-mcl-sprain", label: "MCL sprain", clinicalTerm: "Medial collateral ligament sprain", category: "musculoskeletal-injury", plainLanguage: "Inner knee ligament strain, often from a side hit or twist.", kidFriendly: "The inner knee rope is sore.", bodyPartsHint: ["knee"], programBiases: ["controlled-strength", "short-volume"], stretchBias: 0, exerciseBias: 0.4, irritabilityBoost: 0.8, avoidTags: ["valgus-load"], preferTags: ["closed-chain"], searchTerms: ["mcl", "medial collateral", "inner knee"], outcomeFocus: ["Medial knee comfort", "Gait"] },
  { id: "cond-meniscus", label: "Meniscus injury", clinicalTerm: "Meniscal tear / injury", category: "musculoskeletal-injury", plainLanguage: "Cartilage cushion in the knee is irritated or torn.", kidFriendly: "The knee's shock pad is grumpy.", bodyPartsHint: ["knee"], programBiases: ["controlled-strength", "prefer-unloaded", "short-volume"], stretchBias: 0.1, exerciseBias: 0.4, irritabilityBoost: 1, maxDifficulty: "beginner", avoidTags: ["deep-squat", "twist"], preferTags: ["quad-set", "bike"], searchTerms: ["meniscus", "meniscal", "knee locking", "clicking knee"], outcomeFocus: ["Pain-free ROM", "Quad activation"] },
  { id: "cond-patellofemoral", label: "Patellofemoral pain", clinicalTerm: "Patellofemoral pain syndrome", category: "musculoskeletal-condition", plainLanguage: "Front-of-knee pain often with stairs, squats, or sitting long.", kidFriendly: "Kneecap path feels cranky on stairs.", bodyPartsHint: ["knee", "quadriceps", "hips"], programBiases: ["controlled-strength", "motor-control"], stretchBias: 0.2, exerciseBias: 0.5, irritabilityBoost: 0.6, avoidTags: ["deep-knee-flexion-load"], preferTags: ["hip-abduction", "quad-iso"], searchTerms: ["pfps", "patellofemoral", "kneecap pain", "runner's knee", "runners knee"], outcomeFocus: ["Stair tolerance", "Hip-knee control"] },
  { id: "cond-patellar-tendinopathy", label: "Patellar tendinopathy", clinicalTerm: "Patellar tendinopathy (jumper's knee)", category: "musculoskeletal-condition", plainLanguage: "Pain at the tendon below the kneecap with jumping or load.", kidFriendly: "The rope under the kneecap is angry after jumps.", bodyPartsHint: ["knee", "quadriceps"], programBiases: ["controlled-strength", "short-volume"], stretchBias: -0.1, exerciseBias: 0.7, irritabilityBoost: 0.9, preferTags: ["isometric", "heavy-slow"], searchTerms: ["patellar tendon", "jumper's knee", "jumpers knee"], outcomeFocus: ["Load tolerance", "Tendon capacity"] },
  { id: "cond-ankle-sprain", label: "Lateral ankle sprain", clinicalTerm: "Inversion ankle sprain", category: "musculoskeletal-injury", plainLanguage: "Rolled ankle injuring outer ligaments.", kidFriendly: "Ankle rolled like a twisted ice cream cone.", bodyPartsHint: ["ankles", "foot"], programBiases: ["balance-focus", "controlled-strength", "short-volume"], stretchBias: 0.2, exerciseBias: 0.5, irritabilityBoost: 0.8, preferTags: ["proprioception", "peroneal"], searchTerms: ["ankle sprain", "rolled ankle", "inversion"], outcomeFocus: ["Balance", "Return to sport"] },
  { id: "cond-achilles-tendinopathy", label: "Achilles tendinopathy", clinicalTerm: "Achilles tendinopathy", category: "musculoskeletal-condition", plainLanguage: "Pain and stiffness in the Achilles tendon with walking or running.", kidFriendly: "The heel rope is sore.", bodyPartsHint: ["calves", "ankles", "foot"], programBiases: ["controlled-strength", "warm-up-heavy"], stretchBias: 0.1, exerciseBias: 0.7, irritabilityBoost: 0.7, preferTags: ["calf-raise", "isometric"], searchTerms: ["achilles", "heel cord"], outcomeFocus: ["Walking tolerance", "Calf strength"] },
  { id: "cond-plantar-fasciopathy", label: "Plantar fasciopathy", clinicalTerm: "Plantar fasciopathy / plantar fasciitis", category: "musculoskeletal-condition", plainLanguage: "Bottom-of-foot pain, often first steps in the morning.", kidFriendly: "Foot bottom band is tight in the morning.", bodyPartsHint: ["foot", "calves", "ankles"], programBiases: ["controlled-strength", "warm-up-heavy"], stretchBias: 0.4, exerciseBias: 0.4, irritabilityBoost: 0.6, preferTags: ["calf", "intrinsic-foot"], searchTerms: ["plantar fascia", "plantar fasciitis", "heel pain morning"], outcomeFocus: ["Morning first-step pain", "Walking"] },
  { id: "cond-hamstring-strain", label: "Hamstring strain", clinicalTerm: "Hamstring muscle strain", category: "musculoskeletal-injury", plainLanguage: "Back-of-thigh muscle pull, often with sprinting.", kidFriendly: "Back thigh muscle got a boo-boo from running fast.", bodyPartsHint: ["hamstrings", "glutes"], programBiases: ["controlled-strength", "short-volume", "gentle-mobility"], stretchBias: 0.3, exerciseBias: 0.5, irritabilityBoost: 1, maxDifficulty: "beginner", avoidTags: ["endrange-hamstring-stretch", "sprint"], preferTags: ["nordic-progress", "bridge"], searchTerms: ["hamstring strain", "pulled hamstring", "hammy"], outcomeFocus: ["Pain-free stride", "Strength symmetry"] },
  { id: "cond-quad-strain", label: "Quadriceps strain", clinicalTerm: "Quadriceps muscle strain", category: "musculoskeletal-injury", plainLanguage: "Front thigh muscle strain.", kidFriendly: "Front thigh muscle got overstretched.", bodyPartsHint: ["quadriceps", "knee"], programBiases: ["controlled-strength", "short-volume"], stretchBias: 0.2, exerciseBias: 0.5, irritabilityBoost: 0.9, searchTerms: ["quad strain", "pulled quad", "thigh strain"], outcomeFocus: ["Knee extension strength"] },
  { id: "cond-calf-strain", label: "Calf strain", clinicalTerm: "Gastrocnemius / soleus strain", category: "musculoskeletal-injury", plainLanguage: "Calf muscle tear or pull, often with push-off.", kidFriendly: "Calf muscle said ouch when you pushed off.", bodyPartsHint: ["calves", "ankles"], programBiases: ["controlled-strength", "short-volume", "gentle-mobility"], stretchBias: 0.3, exerciseBias: 0.4, irritabilityBoost: 0.9, searchTerms: ["calf strain", "pulled calf", "tennis leg"], outcomeFocus: ["Push-off comfort", "Calf endurance"] },
  { id: "cond-hip-flexor-strain", label: "Hip flexor strain", clinicalTerm: "Iliopsoas / hip flexor strain", category: "musculoskeletal-injury", plainLanguage: "Front hip muscle strain, common in kicking sports.", kidFriendly: "Front hip zipper muscle is sore.", bodyPartsHint: ["hips", "groin"], programBiases: ["gentle-mobility", "controlled-strength"], stretchBias: 0.4, exerciseBias: 0.3, irritabilityBoost: 0.7, searchTerms: ["hip flexor", "iliopsoas", "psoas"], outcomeFocus: ["Hip extension comfort"] },
  { id: "cond-adductor-strain", label: "Groin / adductor strain", clinicalTerm: "Adductor strain", category: "musculoskeletal-injury", plainLanguage: "Inner thigh muscle injury.", kidFriendly: "Inner thigh got a pull.", bodyPartsHint: ["groin", "hips"], programBiases: ["controlled-strength", "short-volume"], stretchBias: 0.2, exerciseBias: 0.5, irritabilityBoost: 0.9, searchTerms: ["groin strain", "adductor", "pulled groin"], outcomeFocus: ["Side-step tolerance"] },
  { id: "cond-gtps", label: "Greater trochanteric pain", clinicalTerm: "Greater trochanteric pain syndrome / gluteal tendinopathy", category: "musculoskeletal-condition", plainLanguage: "Outer hip pain, often lying on that side or climbing stairs.", kidFriendly: "Outer hip bone bump is cranky.", bodyPartsHint: ["hips", "glutes"], programBiases: ["controlled-strength", "motor-control"], stretchBias: -0.1, exerciseBias: 0.6, irritabilityBoost: 0.7, avoidTags: ["itb-stretch-aggressive", "cross-leg"], preferTags: ["glute-med", "isometric"], searchTerms: ["trochanteric", "gtps", "outer hip", "bursitis hip"], outcomeFocus: ["Side-lying comfort", "Stair pain"] },
  { id: "cond-faiship", label: "Hip FAI / labral symptoms", clinicalTerm: "Femoroacetabular impingement / labral irritation", category: "musculoskeletal-condition", plainLanguage: "Hip pinching with deep flexion or twist.", kidFriendly: "Hip joint feels pinched when you fold up small.", bodyPartsHint: ["hips", "groin"], programBiases: ["motor-control", "avoid-endrange", "controlled-strength"], stretchBias: -0.2, exerciseBias: 0.4, irritabilityBoost: 0.8, avoidTags: ["deep-flexion", "pivot"], searchTerms: ["fai", "labrum", "hip impingement", "hip labral"], outcomeFocus: ["Pinch-free ROM", "Hip control"] },
  { id: "cond-itbs", label: "IT band syndrome", clinicalTerm: "Iliotibial band syndrome", category: "musculoskeletal-condition", plainLanguage: "Outer knee pain with running or downhill.", kidFriendly: "Outer knee zipper rubs and gets sore.", bodyPartsHint: ["knee", "hips", "glutes"], programBiases: ["controlled-strength", "motor-control"], stretchBias: 0.2, exerciseBias: 0.5, irritabilityBoost: 0.5, preferTags: ["glute-med", "step-down"], searchTerms: ["it band", "itbs", "iliotibial"], outcomeFocus: ["Run/walk tolerance"] },
  { id: "cond-low-back-strain", label: "Lumbar strain", clinicalTerm: "Lumbar muscle strain", category: "musculoskeletal-injury", plainLanguage: "Low back muscle strain from lift, twist, or overload.", kidFriendly: "Low back muscles got a tired ouch.", bodyPartsHint: ["lower-back", "core", "hips"], programBiases: ["motor-control", "gentle-mobility", "short-volume"], stretchBias: 0.3, exerciseBias: 0.4, irritabilityBoost: 0.8, searchTerms: ["lumbar strain", "pulled back", "back strain"], outcomeFocus: ["Pain with sit-to-stand", "Walking"] },
  { id: "cond-discogenic-lbp", label: "Disc-related low back pain", clinicalTerm: "Lumbar discogenic pain / disc herniation symptoms", category: "musculoskeletal-condition", plainLanguage: "Back pain that may shoot into the leg; often worse with sitting or bending.", kidFriendly: "Back cushion is grumpy and may send zings down the leg.", bodyPartsHint: ["lower-back", "hips", "hamstrings"], programBiases: ["prefer-extension", "motor-control", "neural-caution", "short-volume"], stretchBias: 0.2, exerciseBias: 0.3, irritabilityBoost: 1.3, maxDifficulty: "beginner", avoidTags: ["sit-flexion-bias", "sit-up"], preferTags: ["extension", "core-control"], searchTerms: ["herniated disc", "disc bulge", "sciatica", "radiculopathy", "slipped disc"], outcomeFocus: ["Leg symptom calm", "Sitting tolerance"], redFlagEducation: "Progressive weakness, saddle numbness, or bowel/bladder change needs urgent care." },
  { id: "cond-stenosis", label: "Lumbar stenosis pattern", clinicalTerm: "Lumbar spinal stenosis (clinical pattern)", category: "musculoskeletal-condition", plainLanguage: "Leg heaviness or pain with standing/walking that eases with sitting or flexion.", kidFriendly: "Legs get tired walking but feel better sitting like a shopping cart lean.", bodyPartsHint: ["lower-back", "hips", "calves"], programBiases: ["prefer-flexion", "short-volume", "controlled-strength"], stretchBias: 0.3, exerciseBias: 0.4, irritabilityBoost: 0.7, avoidTags: ["prolonged-extension"], preferTags: ["flexion", "bike"], searchTerms: ["stenosis", "neurogenic claudication", "shopping cart sign"], outcomeFocus: ["Walking distance", "Standing tolerance"] },
  { id: "cond-si-joint", label: "SI joint pain pattern", clinicalTerm: "Sacroiliac joint pain", category: "musculoskeletal-condition", plainLanguage: "Pain near the dimple of the low back/buttock, often with single-leg load.", kidFriendly: "The belt buckle joint in the back is cranky.", bodyPartsHint: ["pelvis", "lower-back", "glutes", "hips"], programBiases: ["motor-control", "controlled-strength"], stretchBias: 0.2, exerciseBias: 0.4, irritabilityBoost: 0.6, searchTerms: ["si joint", "sacroiliac", "tailbone side pain"], outcomeFocus: ["Single-leg stability"] },
  { id: "cond-thoracic-pain", label: "Thoracic spine pain", clinicalTerm: "Thoracic mechanical pain", category: "musculoskeletal-condition", plainLanguage: "Mid-back stiffness or pain, often with posture or rotation.", kidFriendly: "Middle back hinges feel rusty.", bodyPartsHint: ["thoracic", "upper-back", "scapular"], programBiases: ["gentle-mobility", "postural-endurance"], stretchBias: 0.5, exerciseBias: 0.4, irritabilityBoost: 0.4, searchTerms: ["thoracic pain", "mid back", "between shoulder blades"], outcomeFocus: ["Rotation ROM", "Desk comfort"] },
  { id: "cond-cervical-strain", label: "Neck strain", clinicalTerm: "Cervical strain", category: "musculoskeletal-injury", plainLanguage: "Neck muscle strain from posture, sleep, or sudden load.", kidFriendly: "Neck muscles got a cranky kink.", bodyPartsHint: ["neck", "shoulders", "scapular"], programBiases: ["gentle-mobility", "motor-control", "postural-endurance"], stretchBias: 0.4, exerciseBias: 0.3, irritabilityBoost: 0.7, searchTerms: ["neck strain", "whiplash", "cervical strain"], outcomeFocus: ["Rotation comfort", "Desk tolerance"] },
  { id: "cond-cervical-radiculopathy", label: "Cervical radiculopathy", clinicalTerm: "Cervical radiculopathy", category: "neurological", plainLanguage: "Neck problem sending pain, tingling, or weakness into the arm.", kidFriendly: "Neck wire is zinging the arm.", bodyPartsHint: ["neck", "shoulders", "elbow", "hand"], programBiases: ["neural-caution", "gentle-mobility", "short-volume", "motor-control"], stretchBias: 0.1, exerciseBias: 0.2, irritabilityBoost: 1.4, maxDifficulty: "beginner", avoidTags: ["endrange-cervical", "overhead-heavy"], preferTags: ["nerve-glide-gentle", "scapular"], searchTerms: ["pinched nerve neck", "cervical radiculopathy", "arm numbness neck"], outcomeFocus: ["Arm symptom calm", "Neck ROM"], redFlagEducation: "Progressive arm weakness or gait change needs prompt clinical review." },
  { id: "cond-rotator-cuff", label: "Rotator cuff related shoulder pain", clinicalTerm: "Rotator cuff related shoulder pain / tendinopathy", category: "musculoskeletal-condition", plainLanguage: "Shoulder pain with reach, lift, or sleep on that side.", kidFriendly: "Shoulder team of tiny muscles is grumpy.", bodyPartsHint: ["shoulders", "scapular"], programBiases: ["controlled-strength", "motor-control", "short-volume"], stretchBias: 0.2, exerciseBias: 0.6, irritabilityBoost: 0.8, preferTags: ["er-iso", "scapular"], searchTerms: ["rotator cuff", "shoulder impingement", "supraspinatus"], outcomeFocus: ["Elevation comfort", "Night pain"] },
  { id: "cond-frozen-shoulder", label: "Adhesive capsulitis (frozen shoulder)", clinicalTerm: "Adhesive capsulitis", category: "musculoskeletal-condition", plainLanguage: "Stiff, painful shoulder with limited rotation and reach.", kidFriendly: "Shoulder feels frozen like ice cream too hard to scoop.", bodyPartsHint: ["shoulders", "scapular"], programBiases: ["gentle-mobility", "short-volume", "warm-up-heavy"], stretchBias: 0.6, exerciseBias: 0.3, irritabilityBoost: 1, maxDifficulty: "beginner", preferTags: ["pendulum", "er-stretch-gentle"], searchTerms: ["frozen shoulder", "adhesive capsulitis"], outcomeFocus: ["External rotation ROM", "Function reach"] },
  { id: "cond-shoulder-instability", label: "Shoulder instability", clinicalTerm: "Glenohumeral instability", category: "musculoskeletal-condition", plainLanguage: "Shoulder feels loose, slips, or has dislocation history.", kidFriendly: "Shoulder ball feels like it might pop out of the cup.", bodyPartsHint: ["shoulders", "scapular"], programBiases: ["motor-control", "controlled-strength", "avoid-endrange"], stretchBias: -0.4, exerciseBias: 0.7, irritabilityBoost: 0.9, avoidTags: ["endrange-stretch", "overhead-lax"], preferTags: ["scapular", "er-strength"], searchTerms: ["shoulder dislocation", "shoulder subluxation", "unstable shoulder"], outcomeFocus: ["Stability confidence", "Scapular control"] },
  { id: "cond-lateral-epicondylalgia", label: "Lateral elbow tendinopathy", clinicalTerm: "Lateral epicondylalgia (tennis elbow)", category: "musculoskeletal-condition", plainLanguage: "Outer elbow pain with gripping or lifting.", kidFriendly: "Outer elbow gets ouchy when you squeeze.", bodyPartsHint: ["elbow", "forearm", "wrists"], programBiases: ["controlled-strength", "short-volume"], stretchBias: 0.2, exerciseBias: 0.6, irritabilityBoost: 0.7, preferTags: ["isometric", "eccentric"], searchTerms: ["tennis elbow", "lateral epicondylitis", "lateral epicondylalgia"], outcomeFocus: ["Grip pain", "Load capacity"] },
  { id: "cond-medial-epicondylalgia", label: "Medial elbow tendinopathy", clinicalTerm: "Medial epicondylalgia (golfer's elbow)", category: "musculoskeletal-condition", plainLanguage: "Inner elbow pain with wrist flexion or grip.", kidFriendly: "Inner elbow is sore from gripping.", bodyPartsHint: ["elbow", "forearm", "wrists"], programBiases: ["controlled-strength", "short-volume"], stretchBias: 0.2, exerciseBias: 0.6, irritabilityBoost: 0.7, searchTerms: ["golfer's elbow", "golfers elbow", "medial epicondylitis"], outcomeFocus: ["Grip comfort"] },
  { id: "cond-carpal-tunnel", label: "Carpal tunnel symptoms", clinicalTerm: "Carpal tunnel syndrome (symptoms)", category: "neurological", plainLanguage: "Hand numbness/tingling especially at night or with typing.", kidFriendly: "Hand wires fall asleep a lot.", bodyPartsHint: ["hand", "wrists", "forearm"], programBiases: ["neural-caution", "gentle-mobility", "postural-endurance"], stretchBias: 0.2, exerciseBias: 0.2, irritabilityBoost: 0.8, preferTags: ["nerve-glide-gentle", "ergonomics"], searchTerms: ["carpal tunnel", "median nerve", "night hand numbness"], outcomeFocus: ["Night symptoms", "Typing tolerance"] },
  { id: "cond-dequervain", label: "De Quervain tendinopathy", clinicalTerm: "De Quervain's tenosynovitis", category: "musculoskeletal-condition", plainLanguage: "Thumb-side wrist pain with lift or pinch.", kidFriendly: "Thumb wrist pulley is angry.", bodyPartsHint: ["wrists", "hand", "forearm"], programBiases: ["short-volume", "controlled-strength"], stretchBias: 0.2, exerciseBias: 0.3, irritabilityBoost: 0.7, searchTerms: ["de quervain", "dequervain", "thumb tendon"], outcomeFocus: ["Thumb lift comfort"] },
  { id: "cond-tmj", label: "TMJ disorder symptoms", clinicalTerm: "Temporomandibular disorder", category: "musculoskeletal-condition", plainLanguage: "Jaw pain, clicking, or limited opening.", kidFriendly: "Jaw hinge is clicky or sore.", bodyPartsHint: ["jaw", "neck"], programBiases: ["gentle-mobility", "motor-control", "short-volume"], stretchBias: 0.3, exerciseBias: 0.2, irritabilityBoost: 0.6, searchTerms: ["tmj", "tmd", "jaw pain", "jaw clicking"], outcomeFocus: ["Opening ROM", "Pain with chew"] },

  // —— Post-surgical ——
  { id: "cond-tka", label: "Total knee arthroplasty (TKA)", clinicalTerm: "Total knee replacement post-op", category: "post-surgical", plainLanguage: "Recovery after total knee replacement surgery.", kidFriendly: "Knee got new metal/plastic parts and needs gentle superhero training.", bodyPartsHint: ["knee", "quadriceps", "hips"], programBiases: ["controlled-strength", "gentle-mobility", "short-volume", "motor-control"], stretchBias: 0.4, exerciseBias: 0.6, irritabilityBoost: 1, maxDifficulty: "beginner", clearanceRequired: true, preferTags: ["quad-set", "heel-slide", "gait"], searchTerms: ["knee replacement", "tka", "total knee"], outcomeFocus: ["ROM", "Quad strength", "Gait"], redFlagEducation: "Follow surgeon/PT protocol; infection signs need urgent care." },
  { id: "cond-tha", label: "Total hip arthroplasty (THA)", clinicalTerm: "Total hip replacement post-op", category: "post-surgical", plainLanguage: "Recovery after hip replacement.", kidFriendly: "Hip joint got a new ball-and-socket set.", bodyPartsHint: ["hips", "glutes", "quadriceps"], programBiases: ["controlled-strength", "motor-control", "short-volume", "avoid-endrange"], stretchBias: 0.2, exerciseBias: 0.6, irritabilityBoost: 1, maxDifficulty: "beginner", clearanceRequired: true, searchTerms: ["hip replacement", "tha", "total hip"], outcomeFocus: ["Precaution adherence", "Gait", "Hip strength"] },
  { id: "cond-aclr", label: "ACL reconstruction post-op", clinicalTerm: "ACL reconstruction rehabilitation", category: "post-surgical", plainLanguage: "Rehab after ACL reconstruction surgery.", kidFriendly: "Knee's ACL got rebuilt—train by the coach's plan.", bodyPartsHint: ["knee", "quadriceps", "hamstrings", "hips"], programBiases: ["controlled-strength", "motor-control", "short-volume"], stretchBias: 0.3, exerciseBias: 0.7, irritabilityBoost: 1.1, maxDifficulty: "beginner", clearanceRequired: true, searchTerms: ["acl reconstruction", "aclr", "acl surgery"], outcomeFocus: ["ROM", "Quad lag", "Criteria-based return"] },
  { id: "cond-rc-repair", label: "Rotator cuff repair post-op", clinicalTerm: "Rotator cuff repair post-operative rehab", category: "post-surgical", plainLanguage: "Protected rehab after rotator cuff repair.", kidFriendly: "Shoulder repair needs careful baby steps.", bodyPartsHint: ["shoulders", "scapular"], programBiases: ["gentle-mobility", "short-volume", "motor-control", "defer-to-provider"], stretchBias: 0.2, exerciseBias: 0.2, irritabilityBoost: 1.2, maxDifficulty: "beginner", clearanceRequired: true, avoidTags: ["active-elevation-early", "resistance-early"], searchTerms: ["rotator cuff repair", "cuff repair surgery"], outcomeFocus: ["Protection phase adherence", "Scapular set"] },
  { id: "cond-tsa", label: "Total shoulder arthroplasty", clinicalTerm: "Total / reverse shoulder arthroplasty", category: "post-surgical", plainLanguage: "Rehab after shoulder replacement.", kidFriendly: "Shoulder got a new joint—follow the special rules.", bodyPartsHint: ["shoulders", "scapular"], programBiases: ["gentle-mobility", "defer-to-provider", "short-volume"], stretchBias: 0.2, exerciseBias: 0.2, irritabilityBoost: 1.1, maxDifficulty: "beginner", clearanceRequired: true, searchTerms: ["shoulder replacement", "reverse shoulder", "tsa"], outcomeFocus: ["Protocol ROM", "Function"] },
  { id: "cond-spinal-fusion", label: "Spinal fusion post-op", clinicalTerm: "Lumbar / cervical fusion post-operative", category: "post-surgical", plainLanguage: "Recovery after spinal fusion—movement rules from your surgical team apply.", kidFriendly: "Spine segments got stuck together on purpose—move only how the surgeon coach says.", bodyPartsHint: ["lower-back", "neck", "core"], programBiases: ["motor-control", "defer-to-provider", "short-volume", "gentle-mobility"], stretchBias: 0.1, exerciseBias: 0.2, irritabilityBoost: 1.2, maxDifficulty: "beginner", clearanceRequired: true, searchTerms: ["spinal fusion", "lumbar fusion", "acdf"], outcomeFocus: ["Precautions", "Walking program"] },
  { id: "cond-discectomy", label: "Discectomy / microdiscectomy post-op", clinicalTerm: "Lumbar discectomy post-op", category: "post-surgical", plainLanguage: "Rehab after disc surgery.", kidFriendly: "Back disc surgery—gentle comeback plan.", bodyPartsHint: ["lower-back", "hips", "core"], programBiases: ["motor-control", "neural-caution", "short-volume", "gentle-mobility"], stretchBias: 0.2, exerciseBias: 0.3, irritabilityBoost: 1.1, maxDifficulty: "beginner", clearanceRequired: true, searchTerms: ["discectomy", "microdiscectomy"], outcomeFocus: ["Leg symptom status", "Walking"] },
  { id: "cond-meniscectomy", label: "Meniscectomy / meniscus repair post-op", clinicalTerm: "Meniscal surgery post-op", category: "post-surgical", plainLanguage: "Rehab after meniscus surgery (repair protocols differ from trim).", kidFriendly: "Knee cushion surgery—follow the special homework.", bodyPartsHint: ["knee", "quadriceps"], programBiases: ["controlled-strength", "short-volume", "gentle-mobility"], stretchBias: 0.3, exerciseBias: 0.5, irritabilityBoost: 1, maxDifficulty: "beginner", clearanceRequired: true, searchTerms: ["meniscus surgery", "meniscectomy", "meniscus repair"], outcomeFocus: ["ROM", "Quad", "WB status"] },
  { id: "cond-achilles-repair", label: "Achilles tendon repair post-op", clinicalTerm: "Achilles tendon repair", category: "post-surgical", plainLanguage: "Protected loading after Achilles repair.", kidFriendly: "Heel rope was sewn—careful steps only as allowed.", bodyPartsHint: ["calves", "ankles", "foot"], programBiases: ["controlled-strength", "defer-to-provider", "short-volume"], stretchBias: 0.1, exerciseBias: 0.3, irritabilityBoost: 1.2, maxDifficulty: "beginner", clearanceRequired: true, searchTerms: ["achilles repair", "achilles surgery"], outcomeFocus: ["Protocol progression"] },
  { id: "cond-fracture-orif", label: "ORIF fracture fixation post-op", clinicalTerm: "Open reduction internal fixation post-op", category: "post-surgical", plainLanguage: "Rehab after surgically fixed fracture—weight-bearing rules matter.", kidFriendly: "Broken bone got metal helpers—listen to the weight rules.", bodyPartsHint: ["full-body"], programBiases: ["defer-to-provider", "short-volume", "controlled-strength"], stretchBias: 0.2, exerciseBias: 0.3, irritabilityBoost: 1, maxDifficulty: "beginner", clearanceRequired: true, searchTerms: ["orif", "fracture fixation", "plates and screws"], outcomeFocus: ["WB status", "Adjacent joint motion"] },
  { id: "cond-carpal-tunnel-release", label: "Carpal tunnel release post-op", clinicalTerm: "Carpal tunnel release post-op", category: "post-surgical", plainLanguage: "Hand therapy principles after carpal tunnel release.", kidFriendly: "Wrist tunnel surgery—gentle hand homework.", bodyPartsHint: ["hand", "wrists", "forearm"], programBiases: ["gentle-mobility", "short-volume", "neural-caution"], stretchBias: 0.3, exerciseBias: 0.3, irritabilityBoost: 0.6, clearanceRequired: true, searchTerms: ["carpal tunnel release", "ctr surgery"], outcomeFocus: ["Tendon gliding", "Scar comfort"] },

  // —— Neurological ——
  { id: "cond-cva", label: "Stroke (CVA) residual deficits", clinicalTerm: "Cerebrovascular accident — residual impairment", category: "neurological", plainLanguage: "Movement, balance, or strength changes after a stroke.", kidFriendly: "Brain traffic jam left some body parts needing retraining.", bodyPartsHint: ["full-body", "core", "shoulders", "hips"], programBiases: ["motor-control", "balance-focus", "short-volume", "defer-to-provider"], stretchBias: 0.3, exerciseBias: 0.5, irritabilityBoost: 0.5, maxDifficulty: "beginner", clearanceRequired: true, searchTerms: ["stroke", "cva", "hemiparesis", "hemiplegia"], outcomeFocus: ["Transfers", "Gait", "UE use"], redFlagEducation: "New stroke-like symptoms are emergency care." },
  { id: "cond-tbi", label: "Traumatic brain injury residual", clinicalTerm: "TBI residual deficits", category: "neurological", plainLanguage: "Balance, fatigue, or coordination issues after brain injury.", kidFriendly: "Brain got a big bump—training is slow and careful.", bodyPartsHint: ["full-body", "neck", "core"], programBiases: ["balance-focus", "short-volume", "motor-control", "defer-to-provider"], stretchBias: 0.2, exerciseBias: 0.3, irritabilityBoost: 0.6, maxDifficulty: "beginner", clearanceRequired: true, searchTerms: ["tbi", "brain injury", "concussion prolonged"], outcomeFocus: ["Balance", "Exertion tolerance"] },
  { id: "cond-concussion", label: "Concussion / mild TBI", clinicalTerm: "Sport-related concussion / mTBI", category: "neurological", plainLanguage: "Head injury with headache, fogginess, or exertional symptoms.", kidFriendly: "Brain got shaken—rest smart, then return step by step.", bodyPartsHint: ["neck", "full-body"], programBiases: ["short-volume", "gentle-mobility", "defer-to-provider"], stretchBias: 0.2, exerciseBias: 0.1, irritabilityBoost: 0.8, maxDifficulty: "beginner", clearanceRequired: true, avoidTags: ["high-intensity", "collision"], searchTerms: ["concussion", "mild traumatic brain"], outcomeFocus: ["Symptom-limited activity", "Cervical comfort"], redFlagEducation: "Worsening neuro signs need urgent evaluation." },
  { id: "cond-parkinson", label: "Parkinson disease related mobility", clinicalTerm: "Parkinson disease", category: "neurological", plainLanguage: "Stiffness, smaller steps, balance changes related to Parkinson disease.", kidFriendly: "Body movements got smaller and stiffer—big moves help.", bodyPartsHint: ["full-body", "core", "hips", "ankles"], programBiases: ["balance-focus", "controlled-strength", "motor-control", "warm-up-heavy"], stretchBias: 0.4, exerciseBias: 0.5, irritabilityBoost: 0.3, preferTags: ["amplitude", "gait", "rotation"], searchTerms: ["parkinson", "parkinson's", "pd"], outcomeFocus: ["Step length", "Transfers", "Falls risk"] },
  { id: "cond-ms", label: "Multiple sclerosis related symptoms", clinicalTerm: "Multiple sclerosis", category: "neurological", plainLanguage: "Fatigue, weakness, balance, or sensory changes with MS.", kidFriendly: "Body messages get fuzzy sometimes—pace energy like a battery.", bodyPartsHint: ["full-body", "core", "ankles"], programBiases: ["short-volume", "balance-focus", "prefer-unloaded", "defer-to-provider"], stretchBias: 0.3, exerciseBias: 0.3, irritabilityBoost: 0.5, maxDifficulty: "beginner", clearanceRequired: true, searchTerms: ["multiple sclerosis", " ms ", "ms fatigue"], outcomeFocus: ["Fatigue management", "Balance"] },
  { id: "cond-peripheral-neuropathy", label: "Peripheral neuropathy", clinicalTerm: "Peripheral neuropathy", category: "neurological", plainLanguage: "Foot/hand numbness, tingling, or balance issues from nerve disease.", kidFriendly: "Foot sensors are sleepy—balance practice is careful.", bodyPartsHint: ["foot", "ankles", "hand", "calves"], programBiases: ["balance-focus", "neural-caution", "short-volume"], stretchBias: 0.2, exerciseBias: 0.3, irritabilityBoost: 0.5, preferTags: ["balance", "foot-intrinsic"], searchTerms: ["neuropathy", "diabetic neuropathy", "numb feet"], outcomeFocus: ["Balance", "Fall risk"] },
  { id: "cond-peripheral-nerve-injury", label: "Peripheral nerve injury", clinicalTerm: "Peripheral nerve injury", category: "neurological", plainLanguage: "Weakness or sensory loss from a specific nerve injury.", kidFriendly: "One body wire got hurt.", bodyPartsHint: ["full-body"], programBiases: ["neural-caution", "motor-control", "short-volume"], stretchBias: 0.1, exerciseBias: 0.4, irritabilityBoost: 0.8, clearanceRequired: true, searchTerms: ["nerve injury", "neuropraxia", "axonotmesis"], outcomeFocus: ["Motor return", "Sensory protection"] },
  { id: "cond-sci", label: "Spinal cord injury related", clinicalTerm: "Spinal cord injury", category: "neurological", plainLanguage: "Paralysis or weakness below a spinal injury level—highly individualized care.", kidFriendly: "Spinal superhighway was injured—programs are custom.", bodyPartsHint: ["full-body", "core"], programBiases: ["defer-to-provider", "motor-control", "short-volume"], stretchBias: 0.2, exerciseBias: 0.2, irritabilityBoost: 0.5, maxDifficulty: "beginner", clearanceRequired: true, searchTerms: ["spinal cord injury", "paraplegia", "tetraplegia", "quadriplegia"], outcomeFocus: ["Skin", "ROM", "Function per level"], redFlagEducation: "Autonomic dysreflexia signs need emergency response protocols." },

  // —— Cardiac ——
  { id: "cond-cad", label: "Coronary artery disease / post-MI", clinicalTerm: "CAD / s/p myocardial infarction", category: "cardiac", plainLanguage: "Heart blood-flow disease or recovery after heart attack—exercise must follow cardiac guidance.", kidFriendly: "Heart pipes need careful exercise rules from heart doctors.", bodyPartsHint: ["full-body", "core"], programBiases: ["short-volume", "defer-to-provider", "controlled-strength"], stretchBias: 0.2, exerciseBias: 0.3, irritabilityBoost: 0.3, maxDifficulty: "beginner", clearanceRequired: true, avoidTags: ["valsalva", "isometric-max"], searchTerms: ["heart attack", "myocardial infarction", "cad", "coronary"], outcomeFocus: ["RPE-guided activity", "Walking program"], redFlagEducation: "Chest pain, severe SOB, syncope → emergency care." },
  { id: "cond-chf", label: "Heart failure (CHF)", clinicalTerm: "Congestive heart failure", category: "cardiac", plainLanguage: "Heart pumping weakness with activity limits and fluid issues.", kidFriendly: "Heart pump is tired—exercise is gentle and watched.", bodyPartsHint: ["full-body"], programBiases: ["short-volume", "defer-to-provider", "prefer-unloaded"], stretchBias: 0.2, exerciseBias: 0.2, irritabilityBoost: 0.4, maxDifficulty: "beginner", clearanceRequired: true, searchTerms: ["heart failure", "chf", "chf exacerbation"], outcomeFocus: ["Tolerance", "Edema watch"] },
  { id: "cond-afib", label: "Atrial fibrillation", clinicalTerm: "Atrial fibrillation", category: "cardiac", plainLanguage: "Irregular heart rhythm—monitor symptoms with activity.", kidFriendly: "Heart beat dance is irregular—keep effort sensible.", bodyPartsHint: ["full-body"], programBiases: ["short-volume", "defer-to-provider"], stretchBias: 0.2, exerciseBias: 0.2, irritabilityBoost: 0.3, clearanceRequired: true, searchTerms: ["atrial fibrillation", "a-fib", "afib"], outcomeFocus: ["Symptom-aware pacing"] },
  { id: "cond-cabg", label: "CABG / cardiac surgery post-op", clinicalTerm: "Coronary artery bypass graft post-op", category: "cardiac", plainLanguage: "Sternal precautions and gradual conditioning after heart surgery.", kidFriendly: "Heart surgery—protect the chest zipper and grow strength slowly.", bodyPartsHint: ["chest", "shoulders", "full-body"], programBiases: ["defer-to-provider", "short-volume", "gentle-mobility"], stretchBias: 0.2, exerciseBias: 0.2, irritabilityBoost: 0.5, maxDifficulty: "beginner", clearanceRequired: true, avoidTags: ["push-pull-heavy", "valsalva"], searchTerms: ["cabg", "bypass surgery", "open heart", "sternal"], outcomeFocus: ["Sternal protection", "Walking"] },
  { id: "cond-hypertension", label: "Hypertension (exercise considerations)", clinicalTerm: "Hypertension", category: "cardiac", plainLanguage: "High blood pressure—prefer steady aerobic and avoid heavy breath-holding strain.", kidFriendly: "Blood pressure runs high—no heavy holding-your-breath lifts.", bodyPartsHint: ["full-body"], programBiases: ["controlled-strength", "short-volume"], stretchBias: 0.2, exerciseBias: 0.4, irritabilityBoost: 0.2, avoidTags: ["valsalva", "max-isometric"], searchTerms: ["high blood pressure", "hypertension", "htn"], outcomeFocus: ["Aerobic habit", "Safe strength"] },

  // —— Pulmonary ——
  { id: "cond-copd", label: "COPD", clinicalTerm: "Chronic obstructive pulmonary disease", category: "pulmonary", plainLanguage: "Breathing disease with activity-related shortness of breath.", kidFriendly: "Lungs work harder—breathe strategies and gentle walk goals.", bodyPartsHint: ["chest", "full-body", "shoulders"], programBiases: ["short-volume", "prefer-unloaded", "defer-to-provider"], stretchBias: 0.2, exerciseBias: 0.3, irritabilityBoost: 0.4, maxDifficulty: "beginner", clearanceRequired: true, preferTags: ["pursed-lip", "walking"], searchTerms: ["copd", "emphysema", "chronic bronchitis"], outcomeFocus: ["Dyspnea scale", "Walk distance"] },
  { id: "cond-asthma", label: "Asthma (exercise-induced considerations)", clinicalTerm: "Asthma", category: "pulmonary", plainLanguage: "Airway sensitivity—warm-up and symptom awareness matter.", kidFriendly: "Breathing tubes get twitchy—warm up and have your plan ready.", bodyPartsHint: ["chest", "full-body"], programBiases: ["warm-up-heavy", "short-volume"], stretchBias: 0.2, exerciseBias: 0.3, irritabilityBoost: 0.3, searchTerms: ["asthma", "exercise induced bronchospasm"], outcomeFocus: ["Symptom-free activity"] },
  { id: "cond-pneumonia-recovery", label: "Pneumonia recovery", clinicalTerm: "Post-pneumonia deconditioning", category: "pulmonary", plainLanguage: "Weakness and breathlessness while recovering from pneumonia.", kidFriendly: "After lung germs, body is tired—rebuild slowly.", bodyPartsHint: ["chest", "full-body"], programBiases: ["short-volume", "gentle-mobility", "defer-to-provider"], stretchBias: 0.2, exerciseBias: 0.3, irritabilityBoost: 0.4, maxDifficulty: "beginner", clearanceRequired: true, searchTerms: ["pneumonia", "post pneumonia"], outcomeFocus: ["Endurance", "Breathing comfort"] },

  // —— Pediatric ——
  { id: "cond-pediatric-torticollis", label: "Congenital muscular torticollis", clinicalTerm: "Congenital muscular torticollis", category: "pediatric", plainLanguage: "Baby neck tilt/turn preference from tight neck muscle—needs guided care.", kidFriendly: "Baby neck muscle is short on one side—gentle stretch games help with a coach.", bodyPartsHint: ["neck"], programBiases: ["gentle-mobility", "motor-control", "defer-to-provider"], stretchBias: 0.6, exerciseBias: 0.3, irritabilityBoost: 0.3, maxDifficulty: "beginner", clearanceRequired: true, searchTerms: ["torticollis", "twisted neck baby"], outcomeFocus: ["ROM", "Head shape / positioning"] },
  { id: "cond-pediatric-osgood", label: "Osgood-Schlatter", clinicalTerm: "Osgood-Schlatter disease", category: "pediatric", plainLanguage: "Adolescent knee apophysitis at tibial tubercle with growth and sport.", kidFriendly: "Growing knee bump gets sore with sports.", bodyPartsHint: ["knee", "quadriceps"], programBiases: ["short-volume", "controlled-strength", "gentle-mobility"], stretchBias: 0.3, exerciseBias: 0.3, irritabilityBoost: 0.7, maxDifficulty: "beginner", searchTerms: ["osgood", "osgood-schlatter", "tibial tubercle"], outcomeFocus: ["Activity modification", "Quad flexibility"] },
  { id: "cond-pediatric-severs", label: "Sever's disease", clinicalTerm: "Calcaneal apophysitis (Sever's)", category: "pediatric", plainLanguage: "Heel growth-plate pain in active kids.", kidFriendly: "Growing heel is sore after running.", bodyPartsHint: ["foot", "calves", "ankles"], programBiases: ["short-volume", "gentle-mobility", "controlled-strength"], stretchBias: 0.4, exerciseBias: 0.2, irritabilityBoost: 0.6, maxDifficulty: "beginner", searchTerms: ["sever's", "severs", "heel growth plate"], outcomeFocus: ["Heel pain with sport"] },
  { id: "cond-pediatric-scoliosis", label: "Adolescent idiopathic scoliosis related", clinicalTerm: "Adolescent idiopathic scoliosis", category: "pediatric", plainLanguage: "Spinal curve in youth—exercise is adjunctive to medical plan.", kidFriendly: "Spine curves like a banana—special exercises may help posture.", bodyPartsHint: ["thoracic", "lower-back", "core"], programBiases: ["motor-control", "postural-endurance", "defer-to-provider"], stretchBias: 0.3, exerciseBias: 0.4, irritabilityBoost: 0.3, clearanceRequired: true, searchTerms: ["scoliosis", "spinal curve"], outcomeFocus: ["Posture endurance", "Schroth-informed if prescribed"] },
  { id: "cond-developmental-delay-motor", label: "Pediatric motor delay considerations", clinicalTerm: "Developmental motor delay", category: "pediatric", plainLanguage: "Delayed motor milestones—play-based guided movement.", kidFriendly: "Learning moves a bit later—play is the practice.", bodyPartsHint: ["full-body", "core", "hips"], programBiases: ["motor-control", "balance-focus", "gentle-mobility", "defer-to-provider"], stretchBias: 0.2, exerciseBias: 0.4, irritabilityBoost: 0.2, maxDifficulty: "beginner", clearanceRequired: true, searchTerms: ["motor delay", "developmental delay", "late walker"], outcomeFocus: ["Milestone progress"] },

  // —— Vestibular ——
  { id: "cond-bppv", label: "BPPV (positional vertigo)", clinicalTerm: "Benign paroxysmal positional vertigo", category: "vestibular", plainLanguage: "Brief spinning with head position changes—canalith repositioning is clinician-guided.", kidFriendly: "Inner ear pebbles make the room spin when you tip your head.", bodyPartsHint: ["neck", "full-body"], programBiases: ["defer-to-provider", "short-volume", "balance-focus"], stretchBias: 0.1, exerciseBias: 0.1, irritabilityBoost: 0.5, maxDifficulty: "beginner", clearanceRequired: true, avoidTags: ["rapid-head-turns-unsupervised"], searchTerms: ["bppv", "positional vertigo", "room spinning"], outcomeFocus: ["Dix-Hallpike response", "Symptom free ADLs"] },
  { id: "cond-uvh", label: "Unilateral vestibular hypofunction", clinicalTerm: "Unilateral vestibular hypofunction", category: "vestibular", plainLanguage: "One-sided inner ear balance weakness with gaze and balance issues.", kidFriendly: "One balance antenna is weak—gaze and balance games help with a coach.", bodyPartsHint: ["full-body", "ankles", "neck"], programBiases: ["balance-focus", "motor-control", "short-volume"], stretchBias: 0.1, exerciseBias: 0.4, irritabilityBoost: 0.4, preferTags: ["gaze-stability", "balance"], searchTerms: ["vestibular hypofunction", "inner ear imbalance", "vestibular neuritis"], outcomeFocus: ["DHI", "Gaze stability"] },

  // —— Rheumatologic ——
  { id: "cond-oa-knee", label: "Knee osteoarthritis", clinicalTerm: "Knee OA", category: "rheumatologic", plainLanguage: "Wear-and-repair changes in the knee with stiffness and load-related pain.", kidFriendly: "Knee hinge is worn and stiff like an old door.", bodyPartsHint: ["knee", "quadriceps", "hips"], programBiases: ["controlled-strength", "prefer-unloaded", "warm-up-heavy"], stretchBias: 0.3, exerciseBias: 0.6, irritabilityBoost: 0.6, preferTags: ["quad", "bike", "sit-to-stand"], searchTerms: ["knee arthritis", "knee oa", "osteoarthritis knee"], outcomeFocus: ["Pain with stairs", "30s STS"] },
  { id: "cond-oa-hip", label: "Hip osteoarthritis", clinicalTerm: "Hip OA", category: "rheumatologic", plainLanguage: "Hip joint arthritis with groin/buttock pain and stiffness.", kidFriendly: "Hip hinge is stiff and creaky.", bodyPartsHint: ["hips", "glutes", "groin"], programBiases: ["controlled-strength", "gentle-mobility", "prefer-unloaded"], stretchBias: 0.3, exerciseBias: 0.5, irritabilityBoost: 0.6, searchTerms: ["hip arthritis", "hip oa"], outcomeFocus: ["Walk tolerance", "Hip ROM"] },
  { id: "cond-oa-spine", label: "Spinal osteoarthritis / spondylosis", clinicalTerm: "Spinal OA / spondylosis", category: "rheumatologic", plainLanguage: "Age-related spine joint changes with stiffness.", kidFriendly: "Spine hinges got rusty.", bodyPartsHint: ["lower-back", "thoracic", "neck"], programBiases: ["gentle-mobility", "motor-control", "postural-endurance"], stretchBias: 0.4, exerciseBias: 0.4, irritabilityBoost: 0.5, searchTerms: ["spondylosis", "spine arthritis", "degenerative disc"], outcomeFocus: ["Morning stiffness", "Function"] },
  { id: "cond-ra", label: "Rheumatoid arthritis", clinicalTerm: "Rheumatoid arthritis", category: "rheumatologic", plainLanguage: "Systemic inflammatory arthritis—respect flares and joint protection.", kidFriendly: "Immune system makes joints puffy—move gentle on loud days.", bodyPartsHint: ["hand", "wrists", "full-body"], programBiases: ["short-volume", "gentle-mobility", "defer-to-provider", "prefer-unloaded"], stretchBias: 0.3, exerciseBias: 0.3, irritabilityBoost: 0.9, maxDifficulty: "beginner", clearanceRequired: true, searchTerms: ["rheumatoid", " ra ", "inflammatory arthritis"], outcomeFocus: ["Joint protection", "Flare pacing"] },
  { id: "cond-as", label: "Axial spondyloarthritis / AS", clinicalTerm: "Ankylosing spondylitis / axial SpA", category: "rheumatologic", plainLanguage: "Inflammatory back pain, morning stiffness improving with movement.", kidFriendly: "Back stiffness in the morning that likes to move.", bodyPartsHint: ["lower-back", "thoracic", "hips", "chest"], programBiases: ["gentle-mobility", "postural-endurance", "warm-up-heavy"], stretchBias: 0.6, exerciseBias: 0.4, irritabilityBoost: 0.6, preferTags: ["extension", "rotation", "breathing"], searchTerms: ["ankylosing spondylitis", "axial spondyloarthritis", "inflammatory back pain"], outcomeFocus: ["Morning stiffness duration", "Spinal mobility"] },
  { id: "cond-fibromyalgia", label: "Fibromyalgia", clinicalTerm: "Fibromyalgia", category: "pain-psychosocial", plainLanguage: "Widespread pain and fatigue—graded activity and pacing are central.", kidFriendly: "Body volume knob for pain is turned up—tiny consistent practice wins.", bodyPartsHint: ["full-body"], programBiases: ["short-volume", "gentle-mobility", "warm-up-heavy", "cooldown-heavy"], stretchBias: 0.4, exerciseBias: 0.3, irritabilityBoost: 0.8, maxDifficulty: "beginner", preferTags: ["pacing", "aerobic-gentle"], searchTerms: ["fibromyalgia", "widespread pain"], outcomeFocus: ["Pacing", "Function", "Sleep"] },

  // —— Oncologic / endocrine / vascular / multi-system ——
  { id: "cond-cancer-related-fatigue", label: "Cancer-related fatigue / deconditioning", clinicalTerm: "Cancer-related fatigue", category: "oncologic", plainLanguage: "Fatigue and deconditioning during or after cancer treatment.", kidFriendly: "Body battery drains fast during cancer care—gentle top-ups.", bodyPartsHint: ["full-body"], programBiases: ["short-volume", "defer-to-provider", "prefer-unloaded"], stretchBias: 0.3, exerciseBias: 0.3, irritabilityBoost: 0.4, maxDifficulty: "beginner", clearanceRequired: true, searchTerms: ["cancer fatigue", "chemo deconditioning", "oncology rehab"], outcomeFocus: ["Energy conservation", "Function"] },
  { id: "cond-breast-cancer-postop", label: "Breast cancer surgery related", clinicalTerm: "Post-mastectomy / lumpectomy / reconstruction considerations", category: "oncologic", plainLanguage: "Shoulder/chest mobility and lymphatic precautions after breast surgery.", kidFriendly: "Chest/shoulder need gentle open-up moves after surgery—follow care team rules.", bodyPartsHint: ["shoulders", "chest", "scapular"], programBiases: ["gentle-mobility", "short-volume", "defer-to-provider", "motor-control"], stretchBias: 0.5, exerciseBias: 0.3, irritabilityBoost: 0.6, maxDifficulty: "beginner", clearanceRequired: true, searchTerms: ["mastectomy", "lumpectomy", "breast reconstruction", "axillary dissection"], outcomeFocus: ["Shoulder ROM", "Scar comfort"] },
  { id: "cond-diabetes", label: "Diabetes mellitus (exercise considerations)", clinicalTerm: "Diabetes mellitus", category: "endocrine-metabolic", plainLanguage: "Blood sugar considerations with exercise; protect feet if neuropathy present.", kidFriendly: "Sugar control and foot care matter when you exercise.", bodyPartsHint: ["full-body", "foot"], programBiases: ["controlled-strength", "balance-focus", "short-volume"], stretchBias: 0.2, exerciseBias: 0.4, irritabilityBoost: 0.3, searchTerms: ["diabetes", "type 2 diabetes", "type 1 diabetes", "dm2"], outcomeFocus: ["Activity habit", "Foot skin checks"] },
  { id: "cond-osteoporosis", label: "Osteoporosis / osteopenia", clinicalTerm: "Osteoporosis", category: "endocrine-metabolic", plainLanguage: "Low bone density—avoid high-risk flexion/twist loading; favor safe strength and balance.", kidFriendly: "Bones are more breakable—smart strength and balance, not spine crunching.", bodyPartsHint: ["full-body", "hips", "thoracic", "core"], programBiases: ["controlled-strength", "balance-focus", "avoid-endrange", "postural-endurance"], stretchBias: 0.2, exerciseBias: 0.6, irritabilityBoost: 0.3, avoidTags: ["loaded-flexion", "crunch", "twist-load"], preferTags: ["extension", "hip-hinge-safe", "balance"], searchTerms: ["osteoporosis", "osteopenia", "low bone density"], outcomeFocus: ["Fall risk", "Safe strength"] },
  { id: "cond-obesity-deconditioning", label: "Obesity-related deconditioning", clinicalTerm: "Obesity with deconditioning", category: "endocrine-metabolic", plainLanguage: "Higher joint load and lower endurance—prefer joint-friendly dosing.", kidFriendly: "Joints carry more load—pick friendlier moves and build slowly.", bodyPartsHint: ["full-body", "knee", "hips", "lower-back"], programBiases: ["prefer-unloaded", "short-volume", "controlled-strength"], stretchBias: 0.3, exerciseBias: 0.4, irritabilityBoost: 0.4, preferTags: ["aquatic", "bike", "sit-to-stand"], searchTerms: ["obesity", "high bmi", "deconditioned"], outcomeFocus: ["Walk tolerance", "STS"] },
  { id: "cond-pad", label: "Peripheral artery disease", clinicalTerm: "Peripheral arterial disease", category: "vascular", plainLanguage: "Leg pain with walking from poor blood flow—supervised walking principles apply.", kidFriendly: "Leg pipes narrow—walk-rest-walk is a common training game with medical guidance.", bodyPartsHint: ["calves", "hips", "full-body"], programBiases: ["short-volume", "defer-to-provider", "controlled-strength"], stretchBias: 0.2, exerciseBias: 0.3, irritabilityBoost: 0.5, clearanceRequired: true, searchTerms: ["pad", "peripheral artery", "claudication"], outcomeFocus: ["Pain-free walking distance"] },
  { id: "cond-dvt-history", label: "History of DVT / VTE considerations", clinicalTerm: "History of deep vein thrombosis", category: "vascular", plainLanguage: "Past clot—follow medical clearance and watch for new clot signs.", kidFriendly: "Past blood clot—doctors decide exercise safety.", bodyPartsHint: ["calves", "full-body"], programBiases: ["defer-to-provider", "short-volume"], stretchBias: 0.1, exerciseBias: 0.2, irritabilityBoost: 0.3, clearanceRequired: true, searchTerms: ["dvt", "blood clot", "pe history", "vte"], outcomeFocus: ["Safe activity"], redFlagEducation: "New unilateral swelling, chest pain, or SOB needs urgent care." },
  { id: "cond-chronic-pain", label: "Chronic primary pain pattern", clinicalTerm: "Chronic primary pain", category: "pain-psychosocial", plainLanguage: "Long-standing pain with sensitivity—graded exposure and self-efficacy matter.", kidFriendly: "Pain alarm stays loud a long time—tiny brave steps help retrain it.", bodyPartsHint: ["full-body"], programBiases: ["short-volume", "gentle-mobility", "motor-control", "warm-up-heavy"], stretchBias: 0.4, exerciseBias: 0.3, irritabilityBoost: 0.7, maxDifficulty: "beginner", preferTags: ["graded-exposure", "pacing"], searchTerms: ["chronic pain", "persistent pain", "central sensitization"], outcomeFocus: ["Function", "Fear reduction"] },
  { id: "cond-post-covid", label: "Post-COVID condition / long COVID related", clinicalTerm: "Post-COVID condition", category: "multi-system-complex", plainLanguage: "Fatigue, breathlessness, or brain fog after COVID—pace carefully.", kidFriendly: "After COVID, energy can be weird—don't boom-and-bust.", bodyPartsHint: ["full-body", "chest"], programBiases: ["short-volume", "defer-to-provider", "prefer-unloaded"], stretchBias: 0.2, exerciseBias: 0.2, irritabilityBoost: 0.5, maxDifficulty: "beginner", clearanceRequired: true, searchTerms: ["long covid", "post covid", "pasc"], outcomeFocus: ["PEM avoidance", "Function"] },
  { id: "cond-eds-hypermobility", label: "Hypermobility spectrum / hEDS related", clinicalTerm: "Hypermobility spectrum disorder / hEDS", category: "multi-system-complex", plainLanguage: "Extra flexible joints needing control more than aggressive stretching.", kidFriendly: "Joints bend extra—strength and control beat floppy stretches.", bodyPartsHint: ["full-body"], programBiases: ["motor-control", "controlled-strength", "avoid-endrange", "balance-focus"], stretchBias: -0.5, exerciseBias: 0.7, irritabilityBoost: 0.6, avoidTags: ["endrange-stretch", "passive-overstretch"], preferTags: ["stability", "proprioception"], searchTerms: ["hypermobility", "ehlers danlos", "heds", "hsd"], outcomeFocus: ["Stability", "Proprioception"] },
  { id: "cond-pregnancy-postpartum", label: "Pregnancy / postpartum related", clinicalTerm: "Pregnancy or postpartum musculoskeletal care", category: "multi-system-complex", plainLanguage: "Body changes with pregnancy/postpartum—screening and modifications matter.", kidFriendly: "Body is building or recovering a baby—special move rules apply.", bodyPartsHint: ["pelvis", "core", "hips", "lower-back"], programBiases: ["motor-control", "short-volume", "gentle-mobility", "defer-to-provider"], stretchBias: 0.3, exerciseBias: 0.3, irritabilityBoost: 0.5, maxDifficulty: "beginner", clearanceRequired: true, avoidTags: ["supine-long-late-pregnancy", "valsalva"], searchTerms: ["pregnancy", "postpartum", "post partum", "pelvic girdle pain pregnancy"], outcomeFocus: ["Pelvic girdle comfort", "Safe activity"] },
  { id: "cond-amputation", label: "Limb loss / prosthesis training related", clinicalTerm: "Amputation / prosthetic gait training context", category: "multi-system-complex", plainLanguage: "Strength, balance, and residual limb care with prosthetic goals.", kidFriendly: "Learning to move with a helper limb—balance and strength heroes.", bodyPartsHint: ["full-body", "hips", "core"], programBiases: ["balance-focus", "controlled-strength", "motor-control", "defer-to-provider"], stretchBias: 0.2, exerciseBias: 0.6, irritabilityBoost: 0.4, clearanceRequired: true, searchTerms: ["amputation", "prosthesis", "prosthetic", "residual limb"], outcomeFocus: ["Transfers", "Gait", "Skin"] },
];

// Additional compact MSK injury seeds generated for catalog breadth
const MSK_EXTRA: Array<
  [id: string, label: string, clinical: string, parts: BodyPart[], terms: string[]]
> = [
  ["cond-labral-shoulder", "Shoulder labral injury", "Glenoid labrum injury", ["shoulders"], ["labrum shoulder", "slap tear", "bankart"]],
  ["cond-ac-joint", "AC joint sprain", "Acromioclavicular sprain", ["shoulders"], ["ac joint", "separated shoulder"]],
  ["cond-biceps-tendinopathy", "Long head biceps tendinopathy", "LHBT tendinopathy", ["shoulders"], ["biceps tendon", "bicipital"]],
  ["cond-subacromial", "Subacromial pain syndrome", "Subacromial pain", ["shoulders"], ["subacromial", "impingement"]],
  ["cond-wrist-sprain", "Wrist sprain", "Wrist ligament sprain", ["wrists", "hand"], ["wrist sprain"]],
  ["cond-tfcc", "TFCC injury", "Triangular fibrocartilage complex injury", ["wrists"], ["tfcc"]],
  ["cond-trigger-finger", "Trigger finger", "Stenosing tenosynovitis digit", ["hand"], ["trigger finger", "trigger thumb"]],
  ["cond-cmc-oa", "Thumb CMC osteoarthritis", "1st CMC OA", ["hand", "wrists"], ["thumb arthritis", "cmc oa"]],
  ["cond-hip-oa-secondary", "Secondary hip OA pattern", "Secondary hip osteoarthritis", ["hips"], ["secondary hip oa"]],
  ["cond-gt-bursitis", "Trochanteric bursitis pattern", "Trochanteric bursitis", ["hips", "glutes"], ["hip bursitis"]],
  ["cond-piriformis", "Deep gluteal / piriformis pattern", "Deep gluteal syndrome", ["glutes", "hips", "pelvis"], ["piriformis", "deep gluteal"]],
  ["cond-mtss", "Medial tibial stress syndrome", "Shin splints", ["shins", "calves"], ["shin splints", "mtss"]],
  ["cond-stress-fracture", "Bone stress injury", "Stress fracture / BSI", ["foot", "shins", "hips"], ["stress fracture", "bone stress"]],
  ["cond-turf-toe", "Turf toe", "1st MTP sprain", ["toes", "foot"], ["turf toe"]],
  ["cond-hallux-limitus", "Hallux limitus / rigidus", "1st MTP OA / limitus", ["toes", "foot"], ["hallux rigidus", "big toe arthritis"]],
  ["cond-morton", "Morton's neuroma symptoms", "Interdigital neuroma", ["foot", "toes"], ["morton's", "mortons neuroma"]],
  ["cond-rib-dysfunction", "Rib dysfunction pain pattern", "Costovertebral / rib pain", ["chest", "thoracic"], ["rib pain", "costochondritis"]],
  ["cond-spondylolysis", "Spondylolysis / spondylolisthesis related", "Pars stress / listhesis", ["lower-back"], ["spondylolysis", "spondylolisthesis"]],
  ["cond-whiplash", "Whiplash associated disorder", "WAD", ["neck", "shoulders"], ["whiplash", "wad"]],
  ["cond-coccyx", "Coccydynia", "Coccyx pain", ["pelvis", "lower-back"], ["tailbone", "coccydynia"]],
];

for (const row of MSK_EXTRA) {
  const [id, label, clinical, parts, terms] = row;
  SEEDS.push({
    id,
    label,
    clinicalTerm: clinical,
    category: "musculoskeletal-injury",
    plainLanguage: `${label}: clinical rehab pattern matched from your description.`,
    kidFriendly: `A ${label.toLowerCase()} ouch that needs careful practice.`,
    bodyPartsHint: parts,
    programBiases: ["controlled-strength", "gentle-mobility", "short-volume"],
    stretchBias: 0.25,
    exerciseBias: 0.4,
    irritabilityBoost: 0.7,
    maxDifficulty: "beginner",
    avoidTags: [],
    preferTags: [],
    searchTerms: terms,
    outcomeFocus: ["Pain with function", "Capacity"],
  });
}

const SURGICAL_EXTRA: Array<
  [id: string, label: string, clinical: string, parts: BodyPart[], terms: string[]]
> = [
  ["cond-ankle-orif", "Ankle ORIF post-op", "Ankle fracture ORIF", ["ankles", "foot"], ["ankle orif", "ankle fracture surgery"]],
  ["cond-wrist-orif", "Wrist ORIF / distal radius post-op", "Distal radius ORIF", ["wrists", "hand"], ["distal radius", "wrist orif"]],
  ["cond-hip-arthroscopy", "Hip arthroscopy post-op", "Hip arthroscopy", ["hips"], ["hip arthroscopy"]],
  ["cond-knee-arthroscopy", "Knee arthroscopy post-op", "Knee arthroscopy", ["knee"], ["knee arthroscopy"]],
  ["cond-ulnar-nerve", "Ulnar nerve transposition post-op", "Cubital tunnel release / transposition", ["elbow", "hand"], ["ulnar nerve surgery", "cubital tunnel surgery"]],
  ["cond-laminectomy", "Laminectomy post-op", "Lumbar laminectomy", ["lower-back"], ["laminectomy"]],
  ["cond-rcrsp", "Reverse total shoulder post-op", "Reverse TSA", ["shoulders"], ["reverse total shoulder"]],
  ["cond-patellar-tendon-repair", "Patellar / quad tendon repair", "Extensor mechanism repair", ["knee", "quadriceps"], ["patellar tendon repair", "quad tendon repair"]],
];

for (const row of SURGICAL_EXTRA) {
  const [id, label, clinical, parts, terms] = row;
  SEEDS.push({
    id,
    label,
    clinicalTerm: clinical,
    category: "post-surgical",
    plainLanguage: `Post-operative considerations for ${label}.`,
    kidFriendly: `After ${label.toLowerCase()}, follow the surgery coach rules.`,
    bodyPartsHint: parts,
    programBiases: ["defer-to-provider", "short-volume", "gentle-mobility", "controlled-strength"],
    stretchBias: 0.2,
    exerciseBias: 0.3,
    irritabilityBoost: 1,
    maxDifficulty: "beginner",
    clearanceRequired: true,
    avoidTags: [],
    preferTags: [],
    searchTerms: terms,
    outcomeFocus: ["Protocol adherence", "Function"],
  });
}

// Extra breadth seeds to push virtual capacity over 100,000
const REGION_INJURY_PAIRS: Array<{ region: string; bp: BodyPart[]; injury: string }> = [
  { region: "cervical", bp: ["neck"], injury: "facet sprain" },
  { region: "thoracic", bp: ["thoracic"], injury: "extension strain" },
  { region: "lumbar", bp: ["lower-back"], injury: "extension overload" },
  { region: "shoulder", bp: ["shoulders"], injury: "contusion" },
  { region: "elbow", bp: ["elbow"], injury: "hyperextension sprain" },
  { region: "wrist", bp: ["wrists"], injury: "FOOSH sprain" },
  { region: "hip", bp: ["hips"], injury: "contusion" },
  { region: "knee", bp: ["knee"], injury: "contusion" },
  { region: "ankle", bp: ["ankles"], injury: "high ankle sprain pattern" },
  { region: "foot", bp: ["foot"], injury: "midfoot sprain" },
  { region: "hand", bp: ["hand"], injury: "collateral ligament sprain" },
  { region: "ribs", bp: ["chest", "thoracic"], injury: "costal cartilage strain" },
  { region: "pelvis", bp: ["pelvis"], injury: "osteitis pubis pattern" },
  { region: "gluteal", bp: ["glutes"], injury: "strain" },
  { region: "hamstring", bp: ["hamstrings"], injury: "proximal tendinopathy" },
  { region: "quadriceps", bp: ["quadriceps"], injury: "contusion" },
  { region: "calf", bp: ["calves"], injury: "soleus strain" },
  { region: "achilles", bp: ["calves", "ankles"], injury: "paratenonitis" },
  { region: "plantar", bp: ["foot"], injury: "fat pad contusion" },
  { region: "tmj", bp: ["jaw"], injury: "myalgia" },
  { region: "scapular", bp: ["scapular"], injury: "dyskinesis pattern" },
  { region: "SI", bp: ["pelvis"], injury: "sprain pattern" },
  { region: "pubic", bp: ["groin", "pelvis"], injury: "symphysis irritation" },
  { region: "ITB", bp: ["knee", "hips"], injury: "friction syndrome" },
  { region: "patellar", bp: ["knee"], injury: "fat pad irritation" },
];

const MEDICAL_EXTRA: Array<[string, string, ClinicalCategory, string[]]> = [
  ["cond-ckd", "Chronic kidney disease considerations", "multi-system-complex", ["ckd", "kidney disease"]],
  ["cond-liver", "Chronic liver disease considerations", "multi-system-complex", ["cirrhosis", "liver disease"]],
  ["cond-anemia", "Anemia-related fatigue", "multi-system-complex", ["anemia", "low iron fatigue"]],
  ["cond-hypothyroid", "Hypothyroid-related stiffness", "endocrine-metabolic", ["hypothyroid", "underactive thyroid"]],
  ["cond-hyperthyroid", "Hyperthyroid-related considerations", "endocrine-metabolic", ["hyperthyroid"]],
  ["cond-lupus", "Systemic lupus erythematosus related", "rheumatologic", ["lupus", "sle"]],
  ["cond-gout", "Gout flare considerations", "rheumatologic", ["gout", "uric acid joint"]],
  ["cond-psoriatic-arthritis", "Psoriatic arthritis", "rheumatologic", ["psoriatic arthritis"]],
  ["cond-crps", "Complex regional pain syndrome", "pain-psychosocial", ["crps", "rsd", "complex regional"]],
  ["cond-pots", "POTS / dysautonomia related", "multi-system-complex", ["pots", "dysautonomia"]],
  ["cond-me-cfs", "ME/CFS related activity limits", "multi-system-complex", ["mecfs", "chronic fatigue syndrome", "myalgic encephalomyelitis"]],
  ["cond-lymphedema", "Lymphedema considerations", "vascular", ["lymphedema", "lymphoedema"]],
  ["cond-varicose", "Venous insufficiency considerations", "vascular", ["varicose", "venous insufficiency"]],
  ["cond-interstitial-lung", "Interstitial lung disease related", "pulmonary", ["ild", "interstitial lung"]],
  ["cond-pulmonary-htn", "Pulmonary hypertension related", "pulmonary", ["pulmonary hypertension"]],
  ["cond-valve", "Valvular heart disease considerations", "cardiac", ["heart valve", "aortic stenosis", "mitral regurgitation"]],
  ["cond-pacemaker", "Pacemaker / ICD activity considerations", "cardiac", ["pacemaker", "icd", "defibrillator"]],
  ["cond-epilepsy", "Epilepsy / seizure history considerations", "neurological", ["epilepsy", "seizure disorder"]],
  ["cond-cp", "Cerebral palsy related mobility", "neurological", ["cerebral palsy"]],
  ["cond-gb", "Guillain-Barre recovery related", "neurological", ["guillain barre", "guillain-barré"]],
  ["cond-bells", "Bell's palsy related", "neurological", ["bell's palsy", "bells palsy"]],
  ["cond-trigeminal", "Trigeminal neuralgia related caution", "neurological", ["trigeminal neuralgia"]],
  ["cond-burn", "Burn injury rehabilitation related", "integumentary", ["burn injury", "burn rehab"]],
  ["cond-wound", "Chronic wound precautions", "integumentary", ["chronic wound", "pressure ulcer"]],
  ["cond-scleroderma", "Scleroderma / systemic sclerosis related", "rheumatologic", ["scleroderma", "systemic sclerosis"]],
];

let extraIdx = 0;
for (const p of REGION_INJURY_PAIRS) {
  for (const side of ["", "traumatic", "overuse", "sports"]) {
    extraIdx += 1;
    const id = `cond-gen-${p.region.replace(/\s+/g, "-")}-${side || "gen"}-${extraIdx}`;
    SEEDS.push({
      id,
      label: `${p.region} ${p.injury}${side ? ` (${side})` : ""}`,
      clinicalTerm: `${p.region} ${p.injury}`,
      category: "musculoskeletal-injury",
      plainLanguage: `Clinical rehab pattern for ${p.region} ${p.injury}.`,
      kidFriendly: `A careful plan for a ${p.region} ${p.injury}.`,
      bodyPartsHint: p.bp,
      programBiases: ["controlled-strength", "gentle-mobility", "short-volume"],
      stretchBias: 0.25,
      exerciseBias: 0.35,
      irritabilityBoost: 0.6,
      maxDifficulty: "beginner",
      searchTerms: [p.region, p.injury, side].filter(Boolean),
      outcomeFocus: ["Pain with function", "Load tolerance"],
    });
  }
}

for (const [id, label, cat, terms] of MEDICAL_EXTRA) {
  SEEDS.push({
    id,
    label,
    clinicalTerm: label,
    category: cat,
    plainLanguage: `${label}: adjust dosing and precautions when mentioned in your story.`,
    kidFriendly: `A medical condition that means we keep practice smart and safe.`,
    bodyPartsHint: ["full-body"],
    programBiases: ["short-volume", "defer-to-provider", "gentle-mobility"],
    stretchBias: 0.2,
    exerciseBias: 0.25,
    irritabilityBoost: 0.4,
    maxDifficulty: "beginner",
    clearanceRequired: true,
    searchTerms: terms,
    outcomeFocus: ["Safe activity", "Symptom-aware pacing"],
  });
}

export const BASE_CLINICAL_CONDITIONS: ClinicalCondition[] = SEEDS.map(withSearch);

/**
 * Expansion axes → 250k+ virtual catalog capacity.
 * laterality × phase × severity × context × population
 */
const LATERALITY = [
  { tag: "unspec", label: "", search: [] as string[] },
  { tag: "left", label: "left", search: ["left", "l "] },
  { tag: "right", label: "right", search: ["right", "r "] },
  { tag: "bilateral", label: "bilateral", search: ["bilateral", "both sides"] },
] as const;

const PHASES = [
  { tag: "unspec", label: "", boost: 0, biases: [] as ProgramBias[] },
  { tag: "acute", label: "acute", boost: 0.8, biases: ["short-volume", "gentle-mobility"] as ProgramBias[] },
  { tag: "subacute", label: "subacute", boost: 0.4, biases: ["short-volume"] as ProgramBias[] },
  { tag: "chronic", label: "chronic", boost: 0.2, biases: ["motor-control"] as ProgramBias[] },
  { tag: "postop-0-2w", label: "post-op 0–2 weeks", boost: 1.2, biases: ["defer-to-provider", "short-volume"] as ProgramBias[] },
  { tag: "postop-2-6w", label: "post-op 2–6 weeks", boost: 0.9, biases: ["defer-to-provider", "short-volume"] as ProgramBias[] },
  { tag: "postop-6-12w", label: "post-op 6–12 weeks", boost: 0.5, biases: ["controlled-strength"] as ProgramBias[] },
  { tag: "postop-3-6m", label: "post-op 3–6 months", boost: 0.3, biases: ["controlled-strength"] as ProgramBias[] },
] as const;

const SEVERITIES = [
  { tag: "mild", label: "mild", boost: 0, maxDiff: undefined as Difficulty | undefined },
  { tag: "moderate", label: "moderate", boost: 0.4, maxDiff: "intermediate" as Difficulty | undefined },
  { tag: "severe", label: "severe", boost: 1.0, maxDiff: "beginner" as Difficulty },
  { tag: "high-irr", label: "high irritability", boost: 1.2, maxDiff: "beginner" as Difficulty },
] as const;

const CONTEXTS = [
  { tag: "primary", label: "" },
  { tag: "recurrent", label: "recurrent" },
  { tag: "post-traumatic", label: "post-traumatic" },
  { tag: "overuse", label: "overuse" },
  { tag: "degenerative", label: "degenerative" },
] as const;

/** Population / presentation variations */
const POPULATIONS = [
  {
    tag: "typical",
    label: "",
    boost: 0,
    biases: [] as ProgramBias[],
    outcomeSuffix: "",
  },
  {
    tag: "athletic",
    label: "athletic presentation",
    boost: 0.1,
    biases: ["controlled-strength"] as ProgramBias[],
    outcomeSuffix: "sport-specific capacity",
  },
  {
    tag: "older-adult",
    label: "older adult",
    boost: 0.3,
    biases: ["balance-focus", "short-volume"] as ProgramBias[],
    outcomeSuffix: "fall-risk reduction and independence",
  },
  {
    tag: "complex-comorbid",
    label: "complex / comorbid",
    boost: 0.5,
    biases: ["short-volume", "defer-to-provider"] as ProgramBias[],
    outcomeSuffix: "safe function with medical complexity",
  },
] as const;

export const CLINICAL_CONDITION_CAPACITY =
  BASE_CLINICAL_CONDITIONS.length *
  LATERALITY.length *
  PHASES.length *
  SEVERITIES.length *
  CONTEXTS.length *
  POPULATIONS.length;

function mergeBiases(a: ProgramBias[], b: ProgramBias[]): ProgramBias[] {
  return Array.from(new Set([...a, ...b]));
}

function augmentOutcomes(
  base: ClinicalCondition,
  pop: (typeof POPULATIONS)[number],
  phase: (typeof PHASES)[number],
  sev: (typeof SEVERITIES)[number]
): ClinicalOutcomeTarget[] {
  const core = (base.clinicalOutcomes || defaultOutcomes(base.outcomeFocus, base.category)).map(
    (o) => ({ ...o })
  );
  if (pop.outcomeSuffix) {
    core.push({
      label: pop.outcomeSuffix,
      evidenceNote:
        pop.tag === "older-adult"
          ? "In older adults, balance + progressive strength reduce fall risk; avoid aggressive end-range loading without screening."
          : pop.tag === "athletic"
            ? "Return-to-sport decisions are criterion-based (strength symmetry, hop tests, confidence)—not pain absence alone."
            : "With multi-morbidity, prioritize function, symptom stability, and medical red-flag surveillance over aggressive progressions.",
      timeframe: pop.tag === "athletic" ? "Often 6–12+ weeks depending on tissue and sport demands" : "Graded over several weeks with reassessment",
      measureHint: pop.outcomeSuffix,
    });
  }
  if (phase.tag.startsWith("postop")) {
    core.unshift({
      label: "Protocol-phase adherence",
      evidenceNote:
        "Post-operative outcomes improve when load and ROM progress match tissue healing and surgeon/PT criteria rather than fixed calendars only.",
      timeframe: phase.label || "phase-specific",
      measureHint: "Meeting phase criteria (ROM, pain rules, WB status)",
    });
  }
  if (sev.tag === "severe" || sev.tag === "high-irr") {
    core.unshift({
      label: "Irritability reduction & session tolerance",
      evidenceNote:
        "High-irritability presentations respond better to short, frequent, low-threat doses before capacity building.",
      timeframe: "Often first 1–3 weeks of calm dosing",
      measureHint: "24-hour symptom response, session completion",
    });
  }
  // de-dupe by label
  const seen = new Set<string>();
  return core.filter((o) => {
    if (seen.has(o.label)) return false;
    seen.add(o.label);
    return true;
  });
}

/** Expand one base into editions (used for catalog generation / ID resolution) */
export function expandConditionEditions(base: ClinicalCondition): ClinicalCondition[] {
  const out: ClinicalCondition[] = [];
  for (const lat of LATERALITY) {
    for (const phase of PHASES) {
      for (const sev of SEVERITIES) {
        for (const ctx of CONTEXTS) {
          for (const pop of POPULATIONS) {
            const isBase =
              lat.tag === "unspec" &&
              phase.tag === "unspec" &&
              sev.tag === "mild" &&
              ctx.tag === "primary" &&
              pop.tag === "typical";
            if (isBase) {
              out.push(base);
              continue;
            }
            const bits = [lat.label, phase.label, sev.label, ctx.label, pop.label].filter(
              Boolean
            );
            const id = `${base.id}__${lat.tag}_${phase.tag}_${sev.tag}_${ctx.tag}_${pop.tag}`;
            const label = bits.length ? `${base.label} (${bits.join(", ")})` : base.label;
            const clinicalOutcomes = augmentOutcomes(base, pop, phase, sev);
            out.push(
              withSearch({
                ...base,
                id,
                label,
                subcategory: base.subcategory,
                clinicalTerm: `${base.clinicalTerm}${bits.length ? ` — ${bits.join(", ")}` : ""}`,
                plainLanguage: `${base.plainLanguage}${bits.length ? ` Variation: ${bits.join(", ")}.` : ""}`,
                irritabilityBoost: Math.min(
                  3,
                  base.irritabilityBoost + phase.boost + sev.boost + pop.boost
                ),
                maxDifficulty: sev.maxDiff || base.maxDifficulty,
                programBiases: mergeBiases(
                  mergeBiases(base.programBiases, phase.biases),
                  pop.biases
                ),
                clearanceRequired:
                  base.clearanceRequired ||
                  phase.tag.startsWith("postop") ||
                  pop.tag === "complex-comorbid" ||
                  base.category === "cardiac" ||
                  base.category === "post-surgical",
                outcomeFocus: clinicalOutcomes.map((o) => o.label),
                clinicalOutcomes,
                searchTerms: [
                  ...(base.searchTerms || []),
                  ...lat.search,
                  phase.label,
                  sev.label,
                  ctx.label,
                  pop.label,
                  base.subcategory,
                ].filter(Boolean),
              })
            );
          }
        }
      }
    }
  }
  return out;
}

/**
 * Expanded catalog is virtual (capacity math) to avoid loading 250k+ objects into RAM.
 * Bases are used for matching; expanded IDs resolve on demand per base.
 */
export const CLINICAL_CONDITION_STATS = {
  baseCount: BASE_CLINICAL_CONDITIONS.length,
  /** Total virtual editions */
  capacity: CLINICAL_CONDITION_CAPACITY,
  totalCount: CLINICAL_CONDITION_CAPACITY,
  categories: Object.keys(CLINICAL_CATEGORY_LABELS).length,
  subcategories: Object.keys(CLINICAL_SUBCATEGORY_LABELS).length,
  variationAxes: {
    laterality: LATERALITY.length,
    phase: PHASES.length,
    severity: SEVERITIES.length,
    context: CONTEXTS.length,
    population: POPULATIONS.length,
  },
};

const baseById = new Map(BASE_CLINICAL_CONDITIONS.map((c) => [c.id, c]));

export function getConditionById(id: string): ClinicalCondition | undefined {
  if (baseById.has(id)) return baseById.get(id);
  const baseId = id.split("__")[0]!;
  const base = baseById.get(baseId);
  if (!base) return undefined;
  return expandConditionEditions(base).find((c) => c.id === id);
}

export function getConditionsByIds(ids: string[]): ClinicalCondition[] {
  return ids.map((id) => getConditionById(id)).filter(Boolean) as ClinicalCondition[];
}

/**
 * Match clinical conditions from free text.
 * Uses base search terms (fast) and returns base IDs for routine linking.
 */
export function matchConditionsFromText(text: string, limit = 12): string[] {
  const t = foldKeyboardPunctuation(stripDangerousInvisible(text)).toLowerCase();
  if (t.trim().length < 3) return [];
  const scored: Array<{ id: string; score: number }> = [];
  for (const c of BASE_CLINICAL_CONDITIONS) {
    let score = 0;
    for (const term of c.searchTerms) {
      if (term.length < 3) continue;
      if (t.includes(term.toLowerCase())) {
        score += term.length >= 8 ? 3 : 2;
      }
    }
    // Laterality bump when user specifies side
    if (score > 0) {
      if (/\bleft\b/.test(t)) score += 0.2;
      if (/\bright\b/.test(t)) score += 0.2;
      if (/post[-\s]?op|surgery|replacement|reconstruction/.test(t)) {
        if (c.category === "post-surgical") score += 1.5;
      }
      if (/child|kid|pediatric|teen|adolescent|growth/.test(t) && c.category === "pediatric") {
        score += 1.2;
      }
      scored.push({ id: c.id, score });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.id);
}

export interface ConditionProgramHints {
  effectivePainBoost: number;
  stretchBias: number;
  exerciseBias: number;
  avoidTags: string[];
  preferTags: string[];
  biases: ProgramBias[];
  redFlags: string[];
  clearanceRequired: boolean;
  maxDifficulty?: Difficulty;
  summaryLines: string[];
  bodyParts: BodyPart[];
  categories: ClinicalCategory[];
  subcategories: ClinicalSubcategory[];
  /** Distinct outcome labels for HEP / routine tracking */
  outcomeFocus: string[];
  /** Evidence-framed outcome targets */
  clinicalOutcomes: ClinicalOutcomeTarget[];
  preferKinds: ("stretch" | "exercise")[] | "auto";
}

export function summarizeConditions(ids: string[]): ConditionProgramHints {
  const list = getConditionsByIds(ids);
  if (!list.length) {
    return {
      effectivePainBoost: 0,
      stretchBias: 0,
      exerciseBias: 0,
      avoidTags: [],
      preferTags: [],
      biases: [],
      redFlags: [],
      clearanceRequired: false,
      summaryLines: [],
      bodyParts: [],
      categories: [],
      subcategories: [],
      outcomeFocus: [],
      clinicalOutcomes: [],
      preferKinds: "auto",
    };
  }
  let stretch = 0;
  let exercise = 0;
  let boost = 0;
  const avoid = new Set<string>();
  const prefer = new Set<string>();
  const biases = new Set<ProgramBias>();
  const redFlags: string[] = [];
  const bodyParts = new Set<BodyPart>();
  const categories = new Set<ClinicalCategory>();
  const subcategories = new Set<ClinicalSubcategory>();
  const outcomeFocus = new Set<string>();
  const outcomeByLabel = new Map<string, ClinicalOutcomeTarget>();
  let maxDiff: Difficulty | undefined;
  let clearance = false;
  const rank = { beginner: 1, intermediate: 2, advanced: 3 };

  for (const c of list) {
    stretch += c.stretchBias;
    exercise += c.exerciseBias;
    boost += c.irritabilityBoost;
    c.avoidTags.forEach((t) => avoid.add(t));
    c.preferTags.forEach((t) => prefer.add(t));
    c.programBiases.forEach((b) => biases.add(b));
    c.bodyPartsHint.forEach((bp) => bodyParts.add(bp));
    categories.add(c.category);
    subcategories.add(c.subcategory);
    c.outcomeFocus.forEach((o) => outcomeFocus.add(o));
    for (const o of c.clinicalOutcomes || defaultOutcomes(c.outcomeFocus, c.category)) {
      if (!outcomeByLabel.has(o.label)) outcomeByLabel.set(o.label, o);
    }
    if (c.redFlagEducation) redFlags.push(`${c.label}: ${c.redFlagEducation}`);
    if (c.clearanceRequired) clearance = true;
    if (c.maxDifficulty) {
      if (!maxDiff || rank[c.maxDifficulty] < rank[maxDiff]) maxDiff = c.maxDifficulty;
    }
  }
  const n = list.length;
  stretch /= n;
  exercise /= n;
  boost = boost / Math.sqrt(n);
  if (clearance) {
    biases.add("defer-to-provider");
    maxDiff = "beginner";
  }
  let preferKinds: ("stretch" | "exercise")[] | "auto" = "auto";
  if (stretch - exercise > 0.25) preferKinds = ["stretch", "exercise"];
  else if (exercise - stretch > 0.25) preferKinds = ["exercise", "stretch"];

  return {
    effectivePainBoost: boost,
    stretchBias: stretch,
    exerciseBias: exercise,
    avoidTags: Array.from(avoid),
    preferTags: Array.from(prefer),
    biases: Array.from(biases),
    redFlags,
    clearanceRequired: clearance,
    maxDifficulty: maxDiff,
    summaryLines: list.slice(0, 10).map((c) => c.label),
    bodyParts: Array.from(bodyParts),
    categories: Array.from(categories),
    subcategories: Array.from(subcategories),
    outcomeFocus: Array.from(outcomeFocus).slice(0, 16),
    clinicalOutcomes: Array.from(outcomeByLabel.values()).slice(0, 12),
    preferKinds,
  };
}

export function searchClinicalConditions(opts: {
  query?: string;
  category?: ClinicalCategory | "all";
  subcategory?: ClinicalSubcategory | "all";
  limit?: number;
  /** Prefer bases for UI/search; set false to sample expanded editions of matched bases */
  basesOnly?: boolean;
}): ClinicalCondition[] {
  const basesOnly = opts.basesOnly !== false;
  const q = opts.query?.toLowerCase().trim();
  const limit = Math.min(opts.limit ?? 40, 100);
  const baseHits = BASE_CLINICAL_CONDITIONS.filter((c) => {
    if (opts.category && opts.category !== "all" && c.category !== opts.category) return false;
    if (opts.subcategory && opts.subcategory !== "all" && c.subcategory !== opts.subcategory)
      return false;
    if (!q) return true;
    return (
      c.searchTerms.some((t) => t.includes(q)) ||
      c.label.toLowerCase().includes(q) ||
      c.clinicalTerm.toLowerCase().includes(q) ||
      c.subcategory.includes(q)
    );
  });
  baseHits.sort((a, b) => a.label.localeCompare(b.label));
  if (basesOnly) return baseHits.slice(0, limit);

  // Sample expanded editions for matched bases (not full 250k materialization)
  const out: ClinicalCondition[] = [];
  for (const b of baseHits.slice(0, 12)) {
    const editions = expandConditionEditions(b);
    for (const e of editions) {
      if (out.length >= limit) break;
      if (!q) {
        out.push(e);
        continue;
      }
      if (
        e.searchTerms.some((t) => t.includes(q)) ||
        e.label.toLowerCase().includes(q)
      ) {
        out.push(e);
      }
    }
    if (out.length >= limit) break;
  }
  return out.slice(0, limit);
}


