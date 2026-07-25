/**
 * Independent stretch expansions: clinically common HEP items with
 * outcome-oriented notes (function, activity tolerance, pain ratings).
 * Educational synthesis of widely used PT protocols—not a trial database.
 */
import type { BodyPart, Difficulty, Stretch, StretchStep, StretchVariation } from "@/lib/types";
import { videoForTechnique } from "@/data/video-catalog";

type Seed = Omit<Stretch, "durationBucket" | "slug" | "kind" | "clinical"> & {
  slug?: string;
  clinical?: Stretch["clinical"];
};

function steps(
  items: Array<{ instruction: string; kid: string; hold?: number; breaths?: number }>
): StretchStep[] {
  return items.map((item, i) => ({
    order: i + 1,
    instruction: item.instruction,
    kidFriendly: item.kid,
    holdSeconds: item.hold,
    breaths: item.breaths,
    cues: ["Move slow", "Breathe easy", "Stop if sharp pain"],
  }));
}

function vars(
  baseId: string,
  entries: Array<{ name: string; difficulty: Difficulty; description: string; painMax?: number }>
): StretchVariation[] {
  return entries.map((e, i) => ({
    id: `${baseId}-var-${i + 1}`,
    name: e.name,
    difficulty: e.difficulty,
    description: e.description,
    modifications: [],
    contraindications: ["Acute fracture/surgery without clearance", "Unexplained neuro symptoms"],
    painMaxRecommended: e.painMax ?? 4,
  }));
}

function clinical(
  what: string,
  why: string,
  outcome: string,
  op: string
): Stretch["clinical"] {
  return {
    whatItDoes: what,
    whyImportant: why,
    clinicalOutcome: outcome,
    outpatientRationale: op,
  };
}

/** Additional clinician-style stretches (merged into BASE independently of exercises) */
export const ADDITIONAL_STRETCH_SEEDS: Seed[] = [
  {
    id: "piriformis-supine",
    name: "Supine Piriformis Stretch",
    bodyParts: ["glutes", "hips", "pelvis", "lower-back"],
    primaryMuscles: ["piriformis", "deep external rotators"],
    difficulty: "beginner",
    durationSeconds: 120,
    benefits: ["Posterior hip mobility", "Often used for buttock/referred hip tightness"],
    risks: ["Avoid aggressive pull with acute radiculopathy"],
    breathing: "Exhale as you draw the knee across.",
    alignment: "Pelvis stays level; neck relaxed.",
    posture: "Supine, opposite knee bent optional.",
    warmUpNotes: "Gentle hip circles first.",
    steps: steps([
      {
        instruction:
          "Lie on your back. Cross ankle over opposite knee. Gently draw the uncrossed thigh toward you until a buttock stretch is felt.",
        kid: "Make a number 4 with your legs and hug the bottom leg like a soft pillow.",
        hold: 30,
        breaths: 4,
      },
    ]),
    variations: vars("piriformis-supine", [
      { name: "Seated figure-four", difficulty: "beginner", description: "Chair version for desk breaks." },
      { name: "Wall-supported", difficulty: "beginner", description: "Feet on wall to reduce arm effort.", painMax: 5 },
    ]),
    video: videoForTechnique("hip-glute", "Piriformis / glute stretch technique"),
    evidenceNotes:
      "Posterior hip mobility is commonly paired with activity modification in buttock-dominant presentations; programs often track pain ratings and walking/sitting tolerance.",
    clinical: clinical(
      "Lengthens deep external rotators of the hip in a controllable supine position.",
      "Improves comfort with sitting and crossing mid-line when tissue irritability allows.",
      "Often associated with improved sitting tolerance and lower pain scores when dosed as part of a graded program (e.g., alongside activity pacing).",
      "Standard HEP item in many outpatient lumbar-hip plans; progress by hold time then functional sit tolerance."
    ),
    equipment: ["mat"],
    tags: ["glutes", "hips", "sitting", "mobility"],
  },
  {
    id: "tfl-itb-standing",
    name: "Standing TFL / Lateral Hip Stretch",
    bodyParts: ["hips", "glutes", "knee"],
    primaryMuscles: ["tensor fasciae latae", "lateral hip complex"],
    difficulty: "beginner",
    durationSeconds: 100,
    benefits: ["Lateral hip length", "Useful with ITB-region tightness complaints"],
    risks: ["Do not bounce; keep knee tracking soft"],
    breathing: "Tall exhale as you lean.",
    alignment: "Pelvis stacked; avoid collapsing arch.",
    posture: "Stand near wall for balance.",
    warmUpNotes: "Side-stepping lightly first.",
    steps: steps([
      {
        instruction:
          "Cross the stretch-side leg behind the other. Lean the trunk slightly away until a stretch is felt along the outer hip.",
        kid: "Make an X with your legs and lean like a tree in the wind—slow and gentle.",
        hold: 30,
        breaths: 4,
      },
    ]),
    variations: vars("tfl-itb-standing", [
      { name: "Side-lying ITB stretch", difficulty: "intermediate", description: "More load through lateral tissues.", painMax: 3 },
    ]),
    video: videoForTechnique("hip-glute", "Lateral hip mobility technique"),
    evidenceNotes:
      "Lateral hip mobility plus glute med strengthening is common when lateral knee/hip symptoms limit walking or stairs; function often tracked with LEFS-style activity items.",
    clinical: clinical(
      "Targets lateral hip tissues that can feel tight with prolonged walking or running.",
      "Supports more comfortable single-leg stance and stair use when combined with strength.",
      "Clinical plans often pair this with hip abductor work; improvements reported in activity tolerance and pain with walking when load is graded.",
      "Outpatient HEP staple for lateral hip/knee regional pain patterns."
    ),
    equipment: ["wall"],
    tags: ["hips", "itb", "walking", "mobility"],
  },
  {
    id: "plantar-fascia-wall",
    name: "Plantar Fascia / Calf Wall Stretch",
    bodyParts: ["foot", "calves", "ankles", "toes"],
    primaryMuscles: ["plantar fascia", "gastrocnemius", "soleus"],
    difficulty: "beginner",
    durationSeconds: 120,
    benefits: ["First-step morning foot comfort support", "Ankle dorsiflexion mobility"],
    risks: ["Ease in if acute plantar pain is sharp"],
    breathing: "Exhale as heel sinks.",
    alignment: "Big toe and second toe face forward.",
    posture: "Hands on wall, staggered stance.",
    warmUpNotes: "Ankle pumps × 15 first.",
    steps: steps([
      {
        instruction:
          "Place the ball of the foot on the wall or a step edge with heel down. Gently lean until stretch is felt in arch and calf.",
        kid: "Put your toes up the wall like a little ramp and lean forward until the bottom of your foot and calf feel a gentle rubber-band stretch.",
        hold: 30,
        breaths: 4,
      },
    ]),
    variations: vars("plantar-fascia-wall", [
      { name: "Seated towel stretch", difficulty: "beginner", description: "Loop towel around toes, pull gently.", painMax: 5 },
      { name: "Big-toe extension stretch", difficulty: "beginner", description: "Pull big toe toward shin gently." },
    ]),
    video: videoForTechnique("calf", "Foot and calf mobility technique"),
    evidenceNotes:
      "Calf–plantar mobility and load management are foundational in plantar heel pain care pathways; outcomes often include first-step pain ratings and walking tolerance.",
    clinical: clinical(
      "Improves ankle dorsiflexion and plantar tissue extensibility.",
      "Supports more comfortable walking starts and stair push-off when tissues tolerate stretch.",
      "Often linked with reduced first-step pain and improved walking distance as part of multi-modal PT (stretch + progressive loading).",
      "Aligned with typical outpatient plantar heel pain home programs."
    ),
    equipment: ["wall"],
    tags: ["foot", "calves", "morning", "walking"],
  },
  {
    id: "adductor-butterfly",
    name: "Butterfly / Supine Adductor Stretch",
    bodyParts: ["groin", "hips", "pelvis"],
    primaryMuscles: ["adductors"],
    difficulty: "beginner",
    durationSeconds: 110,
    benefits: ["Inner-thigh mobility", "Supports comfortable hip abduction"],
    risks: ["Avoid forcing knees down"],
    breathing: "Slow breaths; let gravity assist.",
    alignment: "Spine long; pelvis neutral.",
    posture: "Seated or supine soles together.",
    warmUpNotes: "Easy side-steps first.",
    steps: steps([
      {
        instruction:
          "Sit tall with soles of feet together. Gently allow knees toward the floor until a mild inner-thigh stretch is felt. Or lie on back and open knees with soles together.",
        kid: "Make a butterfly with your legs—feet together, knees open like wings, but don’t force the wings down.",
        hold: 30,
        breaths: 5,
      },
    ]),
    variations: vars("adductor-butterfly", [
      { name: "Standing side lunge stretch", difficulty: "intermediate", description: "Side lunge with pelvis square.", painMax: 3 },
      { name: "Supine strap-assisted", difficulty: "beginner", description: "Strap on foot, open hip gently.", painMax: 5 },
    ]),
    video: videoForTechnique("adductor", "Adductor / groin mobility technique"),
    evidenceNotes:
      "Groin/adductor mobility is used when hip abduction or change-of-direction tasks are limited; functional goals often include lateral movement comfort.",
    clinical: clinical(
      "Lengthens the inner thigh adductors in a supported position.",
      "Helps sitting and side-step tasks feel less restricted.",
      "When combined with progressive adductor loading, programs often aim for better pain scores with lateral activity and improved sport/work tasks.",
      "Common in outpatient hip and groin-region plans of care."
    ),
    equipment: ["mat", "optional strap"],
    tags: ["groin", "hips", "mobility"],
  },
  {
    id: "sleeper-stretch",
    name: "Sleeper Stretch (Posterior Capsule)",
    bodyParts: ["shoulders", "scapular"],
    primaryMuscles: ["posterior shoulder capsule", "infraspinatus region"],
    difficulty: "intermediate",
    durationSeconds: 100,
    benefits: ["Posterior shoulder mobility", "Common in thrower/overhead rehab"],
    risks: ["Keep intensity mild; stop if anterior shoulder pinches sharply"],
    breathing: "Exhale as you gently press the forearm toward the table.",
    alignment: "Scapula stable; no shrugging.",
    posture: "Side-lying, bottom arm at 90°.",
    warmUpNotes: "Pendulums and scapular squeezes first.",
    steps: steps([
      {
        instruction:
          "Lie on the stretch side with upper arm forward ~90°. Use the top hand to gently press the forearm toward the table until a mild stretch is felt in the back of the shoulder.",
        kid: "Lie on your side like a book, arm out like a goal post, and gently close the book of your forearm toward the bed—no slamming.",
        hold: 20,
        breaths: 3,
      },
    ]),
    variations: vars("sleeper-stretch", [
      { name: "Cross-body horizontal adduction", difficulty: "beginner", description: "Easier alternative for many people.", painMax: 5 },
      { name: "Doorway posterior capsule", difficulty: "intermediate", description: "Standing variation with support." },
    ]),
    video: videoForTechnique("rotator-cuff", "Posterior shoulder mobility technique (PT demo)"),
    evidenceNotes:
      "Posterior capsule mobility is frequently prescribed in overhead-athlete and shoulder hypomobility programs; function tracked with reach/overhead tasks and pain ratings.",
    clinical: clinical(
      "Gently mobilizes the posterior shoulder complex.",
      "Supports more comfortable horizontal adduction and follow-through motions.",
      "Often included when the goal is improved overhead activity tolerance and lower pain with cross-body reach.",
      "Outpatient shoulder HEP item; dose to mild stretch, not sharp pain."
    ),
    equipment: ["mat"],
    tags: ["shoulders", "overhead", "mobility"],
  },
  {
    id: "lat-childs-side",
    name: "Latissimus Side-Reach Stretch",
    bodyParts: ["upper-back", "shoulders", "thoracic", "core"],
    primaryMuscles: ["latissimus dorsi", "thoracolumbar fascia"],
    difficulty: "beginner",
    durationSeconds: 100,
    benefits: ["Overhead reach prep", "Lateral trunk length"],
    risks: ["Avoid if shoulder elevation is contraindicated"],
    breathing: "Inhale length; exhale into side bend.",
    alignment: "Ribs stacked; no collapsing.",
    posture: "Standing or kneeling with one arm overhead.",
    warmUpNotes: "Arm circles × 10.",
    steps: steps([
      {
        instruction:
          "Reach one arm overhead and gently side-bend away until a stretch is felt along the side of the trunk and underarm.",
        kid: "Reach for a cookie jar on a high shelf and tip slightly like a teapot—slow pour.",
        hold: 25,
        breaths: 4,
      },
    ]),
    variations: vars("lat-childs-side", [
      { name: "Child’s pose side walk", difficulty: "beginner", description: "Hands walk to one side in child’s pose.", painMax: 5 },
    ]),
    video: videoForTechnique("thoracic-rotation", "Lat and trunk mobility technique"),
    evidenceNotes:
      "Lat length and thoracic mobility support overhead function; programs often track reach height and pain with overhead ADLs.",
    clinical: clinical(
      "Lengthens the latissimus and lateral trunk line.",
      "Helps arms go overhead with less trunk compensation.",
      "Useful when overhead activity tolerance and pain with reaching are treatment targets.",
      "Standard mobility option in outpatient shoulder and thoracic plans."
    ),
    equipment: [],
    tags: ["lats", "overhead", "thoracic", "mobility"],
  },
  {
    id: "scalene-stretch",
    name: "Scalene / Side-Neck Stretch",
    bodyParts: ["neck", "shoulders"],
    primaryMuscles: ["scalenes", "upper trapezius (secondary)"],
    difficulty: "beginner",
    durationSeconds: 90,
    benefits: ["Lateral neck length", "Desk-posture counter-mobility"],
    risks: ["Very gentle only; stop if arm symptoms strongly increase"],
    breathing: "Exhale into the side bend.",
    alignment: "Nose stays forward; no aggressive rotation unless coached.",
    posture: "Seated tall; optional hand sit-on for shoulder anchor.",
    warmUpNotes: "Shoulder rolls × 8.",
    steps: steps([
      {
        instruction:
          "Sit tall. Gently tip ear toward shoulder until a mild stretch is felt on the opposite side of the neck. Keep intensity light.",
        kid: "Pretend your ear wants to whisper to your shoulder—tiny tip, no yank.",
        hold: 20,
        breaths: 3,
      },
    ]),
    variations: vars("scalene-stretch", [
      { name: "With rotation bias", difficulty: "intermediate", description: "Slight turn of nose for scalene bias—gentle only.", painMax: 3 },
    ]),
    video: videoForTechnique("neck-side", "Cervical side-bend technique"),
    evidenceNotes:
      "Gentle cervical mobility is common in NDI-oriented neck pain programs emphasizing pain reduction and function (looking, driving, desk work).",
    clinical: clinical(
      "Gently lengthens lateral neck tissues.",
      "Supports more comfortable head turning and desk posture breaks.",
      "Often part of multimodal care that aims to improve neck disability scores and pain ratings with daily tasks.",
      "Outpatient cervical HEP staple with low-force dosing."
    ),
    equipment: ["chair"],
    tags: ["neck", "desk", "mobility"],
  },
  {
    id: "suboccipital-nod",
    name: "Suboccipital Nod / Chin Tuck Hold",
    bodyParts: ["neck", "jaw"],
    primaryMuscles: ["suboccipitals", "deep neck flexors"],
    difficulty: "beginner",
    durationSeconds: 90,
    benefits: ["Upper cervical control", "Pairs with headache-related neck tension education"],
    risks: ["Avoid forceful pressure under the skull"],
    breathing: "Soft nasal breathing; jaw unclenched.",
    alignment: "Lengthen tall before tiny nod.",
    posture: "Seated or supine with head support.",
    warmUpNotes: "Gentle head nods within pain-free range.",
    steps: steps([
      {
        instruction:
          "Lengthen through the crown. Perform a tiny chin tuck / nod as if saying ‘yes’ from the top of the neck, then hold gently.",
        kid: "Make a tiny double chin and nod ‘yes’ like a shy turtle—super small.",
        hold: 8,
        breaths: 2,
      },
    ]),
    variations: vars("suboccipital-nod", [
      { name: "Supine towel support", difficulty: "beginner", description: "Lie down with small towel under skull.", painMax: 5 },
    ]),
    video: videoForTechnique("chin-tuck", "Deep neck flexor / chin-tuck technique"),
    evidenceNotes:
      "Deep neck flexor training and upper cervical mobility appear in many neck pain pathways aiming to improve NDI and pain intensity scores.",
    clinical: clinical(
      "Activates deep neck flexors while easing upper cervical stiffness.",
      "Supports posture endurance for screens and reading.",
      "Frequently included when goals are lower neck pain ratings and better sustained posture tolerance.",
      "Core item in many outpatient cervical motor-control progressions."
    ),
    equipment: ["optional towel"],
    tags: ["neck", "motor-control", "desk", "posture"],
  },
  {
    id: "prayer-wrist",
    name: "Prayer & Reverse-Prayer Wrist Stretch",
    bodyParts: ["wrists", "forearm", "hand"],
    primaryMuscles: ["wrist flexors", "wrist extensors"],
    difficulty: "beginner",
    durationSeconds: 90,
    benefits: ["Desk typing counter-mobility", "Forearm length"],
    risks: ["Avoid if acute tendon injury without guidance"],
    breathing: "Ease on exhale.",
    alignment: "Elbows soft; shoulders down.",
    posture: "Seated or standing.",
    warmUpNotes: "Fist open-close × 15.",
    steps: steps([
      {
        instruction:
          "Place palms together at chest (prayer). Lower hands while keeping palms together until a stretch is felt in forearms. Then reverse (backs of hands together) if comfortable.",
        kid: "Make a quiet prayer with your hands, then slowly slide them down like an elevator—only until it feels like a gentle stretch.",
        hold: 20,
        breaths: 3,
      },
    ]),
    variations: vars("prayer-wrist", [
      { name: "Table edge stretch", difficulty: "intermediate", description: "Fingers on table, gentle lean.", painMax: 3 },
    ]),
    video: videoForTechnique("wrist-hand", "Wrist mobility technique"),
    evidenceNotes:
      "Wrist/forearm mobility plus load management is common for activity-related wrist pain; function tracked with grip/ADLs and pain scales.",
    clinical: clinical(
      "Lengthens wrist flexors and extensors in a simple bilateral pattern.",
      "Supports typing, lifting, and tool-use comfort when irritability is low.",
      "Often paired with graded grip and tendon loading; targets improved pain ratings with desk tasks.",
      "Outpatient upper-extremity HEP classic."
    ),
    equipment: [],
    tags: ["wrists", "desk", "typing", "mobility"],
  },
  {
    id: "elbow-extensor-stretch",
    name: "Elbow Extensor (Tennis Elbow Region) Stretch",
    bodyParts: ["elbow", "forearm", "wrists"],
    primaryMuscles: ["wrist extensors", "ECRB region"],
    difficulty: "beginner",
    durationSeconds: 90,
    benefits: ["Lateral elbow tissue length", "Common tennis-elbow HEP item"],
    risks: ["Mild only; stop if sharp lateral elbow pain spikes"],
    breathing: "Exhale as wrist flexes.",
    alignment: "Elbow straight for stronger stretch; bend elbow to ease.",
    posture: "Arm forward, palm down.",
    warmUpNotes: "Gentle wrist circles.",
    steps: steps([
      {
        instruction:
          "Straighten elbow, palm down. Use other hand to gently bend wrist down (flexion) and slightly ulnar deviate until a mild stretch is felt on the outside of the elbow/forearm.",
        kid: "Make a stop-sign hand, then gently tip the fingers toward the floor with your other hand—soft, not yanky.",
        hold: 25,
        breaths: 3,
      },
    ]),
    variations: vars("elbow-extensor-stretch", [
      { name: "Flexor (golfer’s elbow region) stretch", difficulty: "beginner", description: "Palm up, extend wrist gently." },
    ]),
    video: videoForTechnique("wrist-load", "Elbow / forearm tendon region mobility"),
    evidenceNotes:
      "Stretching plus progressive loading is common in lateral elbow tendinopathy care; outcomes include pain-free grip and patient-rated tennis elbow scores.",
    clinical: clinical(
      "Gently lengthens the wrist extensor complex near the lateral elbow.",
      "Supports gripping and lifting tasks when combined with load management.",
      "Clinical goals often include better pain scores with grip and improved activity tolerance for tools/sports.",
      "Standard outpatient HEP for lateral elbow presentations."
    ),
    equipment: [],
    tags: ["elbow", "forearm", "tendon", "mobility"],
  },
  {
    id: "quad-rectus-prone",
    name: "Prone Rectus Femoris / Quad Stretch",
    bodyParts: ["quadriceps", "hips", "knee"],
    primaryMuscles: ["rectus femoris", "quadriceps"],
    difficulty: "intermediate",
    durationSeconds: 110,
    benefits: ["Front-thigh length with hip extension bias", "Useful for runners and sitters"],
    risks: ["Pad under hips if low back arches"],
    breathing: "Exhale as heel draws toward hip.",
    alignment: "Pelvis gently tucked; avoid lumbar over-arch.",
    posture: "Face-down with strap optional.",
    warmUpNotes: "Standing marches 30 seconds.",
    steps: steps([
      {
        instruction:
          "Lie face down. Bend one knee and hold the ankle (or strap). Gently draw heel toward buttock while keeping hips down.",
        kid: "Lie on your tummy like a superhero and gently bring your heel toward your back pocket with a towel lasso if needed.",
        hold: 30,
        breaths: 4,
      },
    ]),
    variations: vars("quad-rectus-prone", [
      { name: "Side-lying quad stretch", difficulty: "beginner", description: "Easier balance and back control.", painMax: 5 },
      { name: "Standing quad", difficulty: "beginner", description: "Classic wall-supported version." },
    ]),
    video: videoForTechnique("quad", "Quadriceps flexibility technique"),
    evidenceNotes:
      "Quad flexibility and hip extension mobility are common when kneeling, running, or stairs are limited; function tracked with LEFS-type tasks.",
    clinical: clinical(
      "Stretches the quadriceps with a hip-extension component.",
      "Supports more comfortable kneeling, lunging, and running prep when appropriate.",
      "Often part of plans aiming to improve knee pain ratings and stair/walking tolerance.",
      "Outpatient lower-extremity HEP staple with multiple regressions."
    ),
    equipment: ["mat", "optional strap"],
    tags: ["quads", "hips", "running", "mobility"],
  },
  {
    id: "hamstring-doorway",
    name: "Doorway Hamstring Stretch",
    bodyParts: ["hamstrings", "knee", "lower-back", "calves"],
    primaryMuscles: ["hamstrings"],
    difficulty: "beginner",
    durationSeconds: 130,
    benefits: ["Measurable, gravity-friendly hamstring mobility", "Easy home dosing"],
    risks: ["Scoot closer gradually; watch neural symptoms"],
    breathing: "Exhale as knee softens toward straighter.",
    alignment: "Low back relatively quiet; opposite leg relaxed.",
    posture: "Supine with heel on doorframe.",
    warmUpNotes: "Knee hugs × 5 each.",
    steps: steps([
      {
        instruction:
          "Lie on your back with one heel on a doorframe. Scoot closer or farther to find a mild stretch in the back of the thigh. Keep the knee as straight as comfortable.",
        kid: "Put one heel on the doorway wall like a ladder and scoot closer until the back of your leg feels a gentle rubber-band stretch.",
        hold: 30,
        breaths: 5,
      },
    ]),
    variations: vars("hamstring-doorway", [
      { name: "Strap stretch", difficulty: "beginner", description: "No doorway needed.", painMax: 5 },
      { name: "Seated long-sit hinge", difficulty: "intermediate", description: "Tall spine then hinge.", painMax: 3 },
    ]),
    video: videoForTechnique("hamstring", "Hamstring mobility technique"),
    evidenceNotes:
      "Hamstring mobility is common when forward bend or sit-to-stand mechanics are limited; outcomes include reach tasks and activity pain scores.",
    clinical: clinical(
      "Provides a reproducible long-lever hamstring stretch.",
      "Supports forward-reach and long-sitting comfort when dosed well.",
      "Frequently combined with strengthening; goals include better pain scores with daily bending tasks.",
      "Classic outpatient HEP with clear regression/progression via distance to door."
    ),
    equipment: ["doorway"],
    tags: ["hamstrings", "mobility", "home"],
  },
  {
    id: "si-figure-glute-med",
    name: "Pelvic / SI-Friendly Figure-Four",
    bodyParts: ["pelvis", "glutes", "hips", "lower-back"],
    primaryMuscles: ["gluteus maximus", "deep rotators"],
    difficulty: "beginner",
    durationSeconds: 110,
    benefits: ["Gentle pelvic-hip mobility", "Low-irritability posterior hip option"],
    risks: ["Keep range small if SI region is irritable"],
    breathing: "Slow continuous breaths.",
    alignment: "Pelvis level; no forcing.",
    posture: "Supine preferred.",
    warmUpNotes: "Pelvic tilts × 8.",
    steps: steps([
      {
        instruction:
          "Lie on back, ankle on opposite knee. Gently open the bent knee or hug the uncrossed thigh—choose the smaller motion if the pelvis feels sensitive.",
        kid: "Make a gentle number 4 and open the top knee like a door on soft hinges.",
        hold: 25,
        breaths: 4,
      },
    ]),
    variations: vars("si-figure-glute-med", [
      { name: "Hands-behind-thigh only", difficulty: "beginner", description: "Minimal load version.", painMax: 5 },
    ]),
    video: videoForTechnique("hip-glute", "Pelvic-hip mobility technique"),
    evidenceNotes:
      "Pelvic-hip mobility is dosed carefully in SI-region irritability; function goals often include rolling, walking, and sit tolerance with pain monitoring.",
    clinical: clinical(
      "Gently mobilizes the posterior hip while keeping the pelvis supported.",
      "Supports rolling and sitting transitions when irritability is managed.",
      "Used when goals include improved activity tolerance with lower pain ratings during daily mobility.",
      "Outpatient-friendly option with strong emphasis on symptom response."
    ),
    equipment: ["mat"],
    tags: ["pelvis", "si", "glutes", "mobility"],
  },
  {
    id: "jaw-masseter-release",
    name: "Gentle Jaw Opening Stretch",
    bodyParts: ["jaw", "neck"],
    primaryMuscles: ["masseter", "temporalis (secondary)"],
    difficulty: "beginner",
    durationSeconds: 80,
    benefits: ["Comfortable jaw opening mobility", "Pairs with neck relaxation"],
    risks: ["Do not force; stop if locking or sharp TMJ pain"],
    breathing: "Tongue soft on palate; nasal breathing.",
    alignment: "Head supported; shoulders relaxed.",
    posture: "Seated or semi-reclined.",
    warmUpNotes: "Soft tongue-to-palate breaths × 5.",
    steps: steps([
      {
        instruction:
          "Keep tongue gently on the roof of the mouth. Slowly open the jaw within a comfortable range, pause, then close. Optional: light fingertip support on chin—no force.",
        kid: "Keep your tongue on the ceiling of your mouth and open like a sleepy dinosaur—slow and small.",
        hold: 5,
        breaths: 2,
      },
    ]),
    variations: vars("jaw-masseter-release", [
      { name: "Side-glide gentle", difficulty: "intermediate", description: "Tiny side shifts if pain-free.", painMax: 3 },
    ]),
    video: videoForTechnique("cervical", "Jaw / cervical region mobility education"),
    evidenceNotes:
      "TMJ-region mobility is typically gentle and combined with habit change; outcomes include pain ratings with chewing and opening range.",
    clinical: clinical(
      "Encourages controlled jaw opening without clenching.",
      "Supports eating and speaking comfort when irritability is low.",
      "Clinical aims often include lower jaw pain scores and better opening tolerance.",
      "Conservative outpatient approach; force is never the goal."
    ),
    equipment: [],
    tags: ["jaw", "tmj", "relaxation", "mobility"],
  },
  {
    id: "knee-heel-to-glute-side",
    name: "Side-Lying Heel-to-Glute (Knee Friendly Quad)",
    bodyParts: ["knee", "quadriceps", "hips"],
    primaryMuscles: ["quadriceps"],
    difficulty: "beginner",
    durationSeconds: 100,
    benefits: ["Quad stretch with better balance than standing", "Knee flexion mobility"],
    risks: ["Pad under knee if tender"],
    breathing: "Steady breaths.",
    alignment: "Hips stacked; pelvis quiet.",
    posture: "Side-lying.",
    warmUpNotes: "Heel slides × 10.",
    steps: steps([
      {
        instruction:
          "Lie on your side. Bend the top knee and hold the ankle, bringing heel toward the glute until a front-thigh stretch is felt. Keep the knee in line with the hip.",
        kid: "Lie on your side like a banana and gently bring your top heel toward your back pocket.",
        hold: 25,
        breaths: 4,
      },
    ]),
    variations: vars("knee-heel-to-glute-side", [
      { name: "Strap-assisted", difficulty: "beginner", description: "Use strap if you cannot reach the ankle.", painMax: 5 },
    ]),
    video: videoForTechnique("quad", "Quad stretch alternative technique"),
    evidenceNotes:
      "Knee flexion and quad mobility support kneeling and cycling-type tasks; pain and KOOS-style function often guide progression.",
    clinical: clinical(
      "Stretches the quads with improved stability versus standing.",
      "Helps knee bending feel more available for daily tasks.",
      "Included when goals include better pain scores with stairs/kneeling and improved flexion tolerance.",
      "Practical outpatient regression for standing quad stretch."
    ),
    equipment: ["mat", "optional strap"],
    tags: ["knee", "quads", "mobility"],
  },
  {
    id: "shin-tibialis-stretch",
    name: "Seated Anterior Shin Stretch",
    bodyParts: ["shins", "ankles", "foot"],
    primaryMuscles: ["tibialis anterior"],
    difficulty: "beginner",
    durationSeconds: 80,
    benefits: ["Anterior shin length", "Counters long walking dorsiflexor fatigue"],
    risks: ["Gentle only if shin pain is acute"],
    breathing: "Exhale as top of foot presses down.",
    alignment: "Sit tall.",
    posture: "Seated with ankles crossed or kneeling if comfortable.",
    warmUpNotes: "Ankle pumps.",
    steps: steps([
      {
        instruction:
          "Sit tall. Point the foot and gently press the top of the foot toward the floor (or sit back on heels if kneeling is comfortable) until a stretch is felt in the shin.",
        kid: "Point your toes like a ballerina and softly press the top of your foot toward the floor until the front of your shin feels a gentle stretch.",
        hold: 20,
        breaths: 3,
      },
    ]),
    variations: vars("shin-tibialis-stretch", [
      { name: "Standing toe-point stretch", difficulty: "beginner", description: "Top of toes on floor behind you, gentle press.", painMax: 4 },
    ]),
    video: videoForTechnique("ankle", "Shin and ankle mobility technique"),
    evidenceNotes:
      "Anterior compartment mobility is used when shin tightness limits walking; outcomes include walking tolerance and pain ratings.",
    clinical: clinical(
      "Lengthens the tibialis anterior and anterior shin line.",
      "Supports more comfortable walking cadence when not irritable.",
      "Often paired with load management for activity-related shin symptoms and improved pain scores with walking.",
      "Simple outpatient HEP option for anterior leg tightness."
    ),
    equipment: ["chair"],
    tags: ["shins", "walking", "mobility"],
  },
  {
    id: "hand-intrinsic-stretch",
    name: "Finger Extensor / Intrinsic Hand Stretch",
    bodyParts: ["hand", "wrists", "forearm"],
    primaryMuscles: ["finger extensors", "intrinsics (secondary)"],
    difficulty: "beginner",
    durationSeconds: 80,
    benefits: ["Hand opening mobility", "Desk and grip prep"],
    risks: ["Avoid forceful end-range if joints are swollen"],
    breathing: "Easy breaths.",
    alignment: "Wrist neutral to slightly flexed for extensor stretch.",
    posture: "Seated forearm supported.",
    warmUpNotes: "Finger fans × 10.",
    steps: steps([
      {
        instruction:
          "Straighten the elbow, palm down. Gently bend the wrist down and curl fingers with the other hand until a stretch is felt on the top of the forearm/hand. Then reverse for palm-up flexor stretch.",
        kid: "Make a flat hand, then gently fold the wrist and fingers like closing a book—soft close.",
        hold: 20,
        breaths: 3,
      },
    ]),
    variations: vars("hand-intrinsic-stretch", [
      { name: "Prayer stretch focus", difficulty: "beginner", description: "Palms together variation.", painMax: 5 },
    ]),
    video: videoForTechnique("wrist-hand", "Hand mobility technique"),
    evidenceNotes:
      "Hand mobility supports ADLs measured on QuickDASH-type scales; often combined with tendon glides and graded grip.",
    clinical: clinical(
      "Improves finger and wrist mobility for opening and gripping.",
      "Supports dressing, typing, and tool use.",
      "Clinical targets include improved hand function scores and lower pain with grip tasks.",
      "Common outpatient hand therapy–informed HEP element."
    ),
    equipment: [],
    tags: ["hand", "wrists", "adl", "mobility"],
  },
  {
    id: "scapular-corner-pec",
    name: "Corner Pec Stretch (Scapular Friendly)",
    bodyParts: ["chest", "shoulders", "scapular", "upper-back"],
    primaryMuscles: ["pectoralis major", "pectoralis minor"],
    difficulty: "beginner",
    durationSeconds: 110,
    benefits: ["Anterior chest opening", "Posture counter to screen time"],
    risks: ["Elbows slightly below shoulders if shoulders are sensitive"],
    breathing: "Inhale expand; exhale soften into stretch.",
    alignment: "Ribs stacked; no aggressive lumbar arch.",
    posture: "Stand in a corner or doorway.",
    warmUpNotes: "Scapular squeezes × 10.",
    steps: steps([
      {
        instruction:
          "Place forearms on each wall of a corner. Step one foot forward and gently lean until a stretch is felt across the chest. Keep neck long.",
        kid: "Make goal posts with your arms on the walls and take a tiny superhero step forward to open your chest to the sun.",
        hold: 30,
        breaths: 5,
      },
    ]),
    variations: vars("scapular-corner-pec", [
      { name: "Single-arm doorway", difficulty: "beginner", description: "One side at a time.", painMax: 5 },
    ]),
    video: videoForTechnique("chest-open", "Chest opening stretch technique"),
    evidenceNotes:
      "Pec stretching with scapular strengthening is common in postural and shoulder programs aiming to improve reach and pain ratings.",
    clinical: clinical(
      "Lengthens anterior chest tissues that shorten with rounded postures.",
      "Supports upright posture endurance and overhead readiness.",
      "Often linked with improved posture-related pain scores and better activity tolerance for desk/overhead work when paired with strengthening.",
      "Outpatient postural pathway staple."
    ),
    equipment: ["corner or doorway"],
    tags: ["chest", "posture", "desk", "scapular", "mobility"],
  },
];
