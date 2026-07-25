/**
 * Additional clinician-style stretch bases covering common outpatient HEP patterns.
 * Compact seeds expand into full Stretch records with evidence + functional outcome framing.
 * Educational synthesis of widely used PT mobility protocols — not a trial database.
 */

import type { BodyPart, Difficulty, Stretch, StretchStep, StretchVariation } from "@/lib/types";
import { videoForRegion, type VideoRegion } from "@/data/video-catalog";
import { functionalOutcomeNarrative } from "@/data/stretch-outcomes";

type CompactSeed = {
  id: string;
  name: string;
  bodyParts: BodyPart[];
  primaryMuscles: string[];
  difficulty?: Difficulty;
  durationSeconds?: number;
  /** Adult instruction core */
  how: string;
  /** Kid-friendly core */
  kid: string;
  hold?: number;
  benefits: string[];
  risks?: string[];
  evidence: string;
  tags?: string[];
  equipment?: string[];
  videoRegion?: VideoRegion;
  variationNames?: Array<{ name: string; difficulty?: Difficulty; description: string }>;
};

function stepsFrom(how: string, kid: string, hold = 30): StretchStep[] {
  return [
    {
      order: 1,
      instruction: how,
      kidFriendly: kid,
      holdSeconds: hold,
      breaths: 4,
      cues: ["Move slow", "Breathe easy", "Stop if sharp pain", "Stay in a mild–moderate stretch"],
    },
    {
      order: 2,
      instruction:
        "Hold 20–40 seconds (or 3–5 slow breaths) if comfortable, then ease out. Repeat 2–3 sets per side as indicated. Never force into sharp pain or numbness that worsens.",
      kidFriendly:
        "Hold while you take three slow dragon breaths. If it pinches sharply, back off like you found a “yellow light.”",
      holdSeconds: hold,
      breaths: 3,
      cues: ["Quality over intensity", "Symmetry when both sides allowed"],
    },
  ];
}

function vars(
  baseId: string,
  entries: Array<{ name: string; difficulty?: Difficulty; description: string }>
): StretchVariation[] {
  return entries.map((e, i) => ({
    id: `${baseId}-var-${i + 1}`,
    name: e.name,
    difficulty: e.difficulty ?? "beginner",
    description: e.description,
    modifications: ["Reduce range", "Support with pillow/wall", "Shorter hold"],
    contraindications: [
      "Acute fracture or recent surgery without clearance",
      "Unexplained neurological symptoms (progressive weakness, bowel/bladder change)",
      "Unstable joints or red-flag systemic symptoms",
    ],
    painMaxRecommended: 4,
  }));
}

function regionFor(parts: BodyPart[]): VideoRegion {
  const map: Partial<Record<BodyPart, VideoRegion>> = {
    neck: "neck",
    jaw: "neck",
    shoulders: "shoulder",
    scapular: "shoulder",
    chest: "chest",
    thoracic: "thoracic",
    "upper-back": "thoracic",
    "lower-back": "lowerBack",
    pelvis: "hip",
    hips: "hip",
    glutes: "hip",
    groin: "hip",
    hamstrings: "hamstring",
    quadriceps: "leg",
    knee: "leg",
    calves: "calf",
    shins: "ankle",
    ankles: "ankle",
    foot: "ankle",
    toes: "ankle",
    elbow: "general",
    forearm: "general",
    wrists: "general",
    hand: "general",
    core: "core",
    "full-body": "full",
  };
  for (const p of parts) {
    if (map[p]) return map[p]!;
  }
  return "general";
}

function expandCompact(c: CompactSeed): Omit<Stretch, "durationBucket" | "slug" | "kind"> {
  const bodyParts = c.bodyParts;
  const narrative = functionalOutcomeNarrative(bodyParts, c.evidence);
  const vRegion = c.videoRegion ?? regionFor(bodyParts);
  const defaultVars = c.variationNames ?? [
    {
      name: "Supported / reduced range",
      difficulty: "beginner" as Difficulty,
      description: "Use wall, chair, or towel to stay in a mild stretch.",
    },
    {
      name: "Longer breath-led hold",
      difficulty: "intermediate" as Difficulty,
      description: "Extend to 40–45s holds if pain ≤ 3/10 and form stays easy.",
    },
  ];

  return {
    id: c.id,
    name: c.name,
    bodyParts,
    primaryMuscles: c.primaryMuscles,
    difficulty: c.difficulty ?? "beginner",
    durationSeconds: c.durationSeconds ?? 120,
    benefits: c.benefits,
    risks: c.risks ?? [
      "Avoid forcing end-range with acute inflammation",
      "Stop for sharp, radiating, or worsening neurological symptoms",
    ],
    breathing: "Inhale to prepare; exhale as you ease into a mild–moderate stretch.",
    alignment: "Stack joints neutrally; avoid compensatory twisting unless the stretch intends rotation.",
    posture: "Use support (wall, chair, mat) so the target tissue—not your balance—does the work.",
    warmUpNotes: "2–3 minutes of easy marching or joint circles first if you feel cold or stiff.",
    steps: stepsFrom(c.how, c.kid, c.hold ?? 30),
    variations: vars(c.id, defaultVars),
    video: videoForRegion(vRegion, `${c.name} education`),
    evidenceNotes: c.evidence,
    clinical: {
      whatItDoes: `Gently mobilizes ${c.primaryMuscles.join(", ")} through a controlled range while teaching safe stretch dosing.`,
      whyImportant:
        c.benefits[0] ||
        "Supports daily mobility and reduces stiffness when dosed as part of a graded plan.",
      clinicalOutcome: narrative.clinicalOutcome,
      outpatientRationale: narrative.outpatientRationale,
    },
    equipment: c.equipment ?? ["mat or sturdy chair"],
    tags: [
      ...(c.tags ?? []),
      "clinical-hep",
      "evidence-informed",
      "functional-outcomes",
      ...narrative.outcomeTags.slice(0, 6),
    ],
  };
}

/** Compact clinically common HEP stretches across regions */
const COMPACT: CompactSeed[] = [
  // —— Cervical / jaw ——
  {
    id: "cervical-rotation-seated",
    name: "Seated Cervical Rotation Mobility",
    bodyParts: ["neck"],
    primaryMuscles: ["cervical rotators", "upper trapezius (secondary)"],
    how: "Sit tall. Gently turn your head to look over one shoulder until a mild stretch is felt. Hold, return to center, then the other side.",
    kid: "Pretend your nose is a lighthouse beam sweeping slowly left, then right—no racing.",
    benefits: ["Supports looking over the shoulder for driving and desk work"],
    evidence:
      "Active cervical rotation is a staple in outpatient neck programs aiming to restore rotation ROM and reduce NDI-related activity limits.",
    tags: ["cervical", "desk", "rotation"],
  },
  {
    id: "cervical-flexion-chin-to-chest",
    name: "Gentle Cervical Flexion Stretch",
    bodyParts: ["neck"],
    primaryMuscles: ["suboccipitals", "cervical extensors"],
    how: "Sit tall. Softly nod the chin toward the chest until a mild stretch is felt at the base of the skull or back of the neck. Do not pull hard.",
    kid: "Make a tiny yes-nod and pause like you found a soft pillow under your chin.",
    benefits: ["Eases posterior neck stiffness after screens"],
    evidence:
      "Gentle flexion mobility is commonly used for suboccipital and posterior cervical tightness with monitoring of headache and neuro symptoms.",
    tags: ["cervical", "desk"],
  },
  {
    id: "cervical-extension-supported",
    name: "Supported Gentle Cervical Extension",
    bodyParts: ["neck"],
    primaryMuscles: ["anterior cervical soft tissues"],
    difficulty: "beginner",
    how: "Sit tall. Lengthen the crown up, then gently look slightly upward without compressing the back of the neck. Keep the motion small.",
    kid: "Imagine a balloon lifting the top of your head, then peek at the sky just a little.",
    benefits: ["Restores comfortable looking-up motion"],
    risks: ["Avoid with acute radiculopathy or dizziness until cleared"],
    evidence:
      "Small-range extension is used cautiously in cervical programs to restore functional looking-up while avoiding end-range compression.",
    tags: ["cervical"],
  },
  {
    id: "jaw-lateral-glide",
    name: "Gentle Jaw Lateral Glide Mobility",
    bodyParts: ["jaw", "neck"],
    primaryMuscles: ["masseter", "pterygoids"],
    how: "Tongue lightly on the roof of the mouth. Slowly glide the jaw a small amount left, then right, staying pain-free.",
    kid: "Slide your jaw like a tiny train on smooth tracks—short trips only.",
    benefits: ["Supports comfortable chewing and speaking motion"],
    evidence:
      "Controlled TMJ mobility drills appear in conservative jaw-care pathways focusing on opening comfort and reduced guarding.",
    tags: ["tmj", "jaw"],
    videoRegion: "neck",
  },

  // —— Shoulder / scapular / chest ——
  {
    id: "cross-body-posterior-capsule",
    name: "Cross-Body Posterior Shoulder Stretch",
    bodyParts: ["shoulders", "scapular"],
    primaryMuscles: ["posterior capsule", "posterior deltoid", "infraspinatus (secondary)"],
    how: "Bring one arm across the chest. Use the other hand to gently hug it closer until a mild stretch is felt in the back of the shoulder.",
    kid: "Give your arm a gentle hug across your body like wrapping a soft scarf.",
    benefits: ["Posterior shoulder mobility for reach and throw prep"],
    evidence:
      "Cross-body and sleeper-type stretches are widely used for posterior shoulder hypomobility with QuickDASH-oriented reach goals.",
    tags: ["shoulder", "overhead"],
    videoRegion: "shoulder",
  },
  {
    id: "towel-ir-stretch",
    name: "Towel Internal Rotation Stretch",
    bodyParts: ["shoulders"],
    primaryMuscles: ["external rotators", "posterior capsule"],
    difficulty: "intermediate",
    how: "Hold a towel behind your back (one hand high, one low). Gently draw the lower hand up until a mild stretch is felt. Keep ribs quiet.",
    kid: "Pretend the towel is a rope elevator—go up slowly, stop at yellow light.",
    benefits: ["Behind-the-back reach for dressing"],
    evidence:
      "Internal rotation towel stretches are common in outpatient shoulder programs targeting functional IR for ADLs.",
    equipment: ["towel"],
    tags: ["shoulder", "dressing"],
    videoRegion: "shoulder",
  },
  {
    id: "pendulum-codman",
    name: "Pendulum (Codman) Mobility",
    bodyParts: ["shoulders"],
    primaryMuscles: ["rotator cuff (gentle motion)", "deltoid (relaxed)"],
    how: "Hinge at the hips, support with the non-working hand on a counter. Let the working arm hang and draw small circles or pendulums using body sway—not muscle force.",
    kid: "Let your arm be a floppy spaghetti noodle drawing tiny circles.",
    benefits: ["Early gentle shoulder motion with low load"],
    evidence:
      "Pendulum mobility is a classic early-phase shoulder HEP item for pain-free arc motion and reduced guarding.",
    tags: ["shoulder", "early-phase", "post-op-style"],
    videoRegion: "shoulder",
  },
  {
    id: "wall-slide-flex",
    name: "Wall Slide Flexion Mobility",
    bodyParts: ["shoulders", "scapular"],
    primaryMuscles: ["flexors", "serratus (secondary)"],
    how: "Stand facing a wall. Slide both hands up the wall as high as comfortable, keeping ribs down. Pause, then slide down.",
    kid: "Paint a rainbow up the wall with your hands—slow paint strokes.",
    benefits: ["Graded overhead mobility with wall feedback"],
    evidence:
      "Wall slides are standard graded elevation drills used to restore overhead ROM with scapular awareness.",
    tags: ["shoulder", "overhead"],
    videoRegion: "shoulder",
  },
  {
    id: "doorway-pec-minor",
    name: "Doorway Pectoralis Minor Emphasis",
    bodyParts: ["chest", "shoulders"],
    primaryMuscles: ["pectoralis minor", "pectoralis major"],
    how: "In a doorway, place forearm on the frame with elbow ~ shoulder height or slightly lower. Step through gently until a chest/front-shoulder stretch is felt. Avoid pinching in the front of the joint.",
    kid: "Open a superhero cape across your chest—gentle, not a yank.",
    benefits: ["Chest opening for posture and breathing ease"],
    evidence:
      "Pectoral stretches are widely prescribed for rounded-shoulder posture and thoracic outlet–adjacent stiffness patterns with posture PSFS goals.",
    tags: ["posture", "chest"],
    videoRegion: "chest",
  },

  // —— Thoracic / trunk ——
  {
    id: "seated-thoracic-extension",
    name: "Seated Thoracic Extension over Chair",
    bodyParts: ["thoracic", "upper-back"],
    primaryMuscles: ["thoracic extensors", "anterior chest (secondary)"],
    how: "Sit mid-chair. Hands behind head or across chest. Extend mid-back over the chair edge gently, keeping neck long. Return to upright.",
    kid: "Make your chest a proud bird opening to the sun—small and careful.",
    benefits: ["Counters flexed desk posture"],
    evidence:
      "Thoracic extension mobility is a core desk-worker intervention linked to posture comfort and reduced mid-back stiffness.",
    tags: ["thoracic", "desk"],
    videoRegion: "thoracic",
  },
  {
    id: "quadruped-thread-needle-deep",
    name: "Quadruped Thread-the-Needle Rotation",
    bodyParts: ["thoracic", "shoulders", "upper-back"],
    primaryMuscles: ["thoracic rotators", "latissimus (secondary)"],
    how: "On hands and knees, thread one arm under the body, resting the shoulder and side of head as comfortable. Breathe into the ribs. Reverse slowly.",
    kid: "Slide one arm under like mailing a letter under a table.",
    benefits: ["Thoracic rotation for reach and rolling"],
    evidence:
      "Thread-the-needle variants are common thoracic rotation drills used for rib and mid-back mobility with low lumbar load.",
    tags: ["thoracic", "rotation"],
    videoRegion: "thoracic",
  },
  {
    id: "side-lying-open-book-low",
    name: "Side-Lying Open Book (Lower Thoracic Bias)",
    bodyParts: ["thoracic", "chest", "lower-back"],
    primaryMuscles: ["thoracic rotators", "pectorals (secondary)"],
    how: "Side-lying with knees bent. Open the top arm like a book toward the ceiling/floor behind you, following with your eyes. Keep knees stacked.",
    kid: "Open a giant storybook with your top arm while knees stay glued like a sandwich.",
    benefits: ["Rotation mobility for rolling and reaching"],
    evidence:
      "Open-book thoracic mobility is ubiquitous in outpatient trunk programs targeting rotation ROM and breathing ease.",
    tags: ["thoracic", "evening"],
    videoRegion: "thoracic",
  },
  {
    id: "childs-pose-side-bend",
    name: "Child’s Pose with Side Reach",
    bodyParts: ["lower-back", "latissimus", "hips"] as BodyPart[],
    primaryMuscles: ["latissimus dorsi", "quadratus lumborum (secondary)", "paraspinals"],
    how: "From child’s pose, walk both hands slightly to one side to feel a side-body stretch. Breathe wide into the ribs. Switch sides.",
    kid: "Make a sleepy cat stretch and scoot your paws to one side.",
    benefits: ["Lateral trunk and lat mobility"],
    evidence:
      "Child’s pose side-reach is a low-load lateral trunk mobility drill used for lat and QL region stiffness with pain-aware dosing.",
    tags: ["lumbar", "lat", "recovery"],
    // latissimus not a BodyPart - fix bodyParts
    videoRegion: "back",
  },

  // Fix the bad bodyParts - latissimus isn't BodyPart. I'll fix in the array below carefully.
];

// Fix child's pose entry body parts - rewrite COMPACT carefully without invalid BodyPart
const COMPACT_FIXED: CompactSeed[] = COMPACT.filter((c) => c.id !== "childs-pose-side-bend").concat([
  {
    id: "childs-pose-side-reach",
    name: "Child’s Pose with Side Reach",
    bodyParts: ["lower-back", "hips", "shoulders"],
    primaryMuscles: ["latissimus dorsi", "quadratus lumborum (secondary)", "paraspinals"],
    how: "From child’s pose, walk both hands slightly to one side to feel a side-body stretch. Breathe wide into the ribs. Switch sides.",
    kid: "Make a sleepy cat stretch and scoot your paws to one side.",
    benefits: ["Lateral trunk and lat mobility"],
    evidence:
      "Child’s pose side-reach is a low-load lateral trunk mobility drill used for lat and QL region stiffness with pain-aware dosing.",
    tags: ["lumbar", "lat", "recovery"],
    videoRegion: "back",
  },
  {
    id: "ql-standing-side-bend",
    name: "Standing QL / Lateral Trunk Stretch",
    bodyParts: ["lower-back", "hips"],
    primaryMuscles: ["quadratus lumborum", "obliques (secondary)"],
    how: "Stand tall, feet grounded. Reach one arm overhead and lean gently away from that side until a mild side stretch is felt. Keep both feet flat.",
    kid: "Be a tree leaning to pick fruit on one side—roots stay planted.",
    benefits: ["Lateral trunk mobility for side-bending ADLs"],
    evidence:
      "Lateral trunk mobility is used in lumbar programs when side-bending and sitting tolerance are limited; outcomes tracked with ODI-style activity items.",
    tags: ["lumbar", "side-bend"],
    videoRegion: "lowerBack",
  },
  {
    id: "knee-rocks-supine",
    name: "Supine Knee Rocks (Lumbar Rotation Mobility)",
    bodyParts: ["lower-back", "pelvis", "hips"],
    primaryMuscles: ["lumbar rotators", "gluteals (secondary)"],
    how: "Lie on your back, knees bent, feet flat. Gently rock both knees side to side in a small pain-free arc.",
    kid: "Let your knees be windshield wipers on a rainy day—slow and small.",
    benefits: ["Gentle lumbar motion for morning stiffness"],
    evidence:
      "Knee rocks are a classic early lumbar mobility drill for reducing stiffness and fear of movement with low load.",
    tags: ["lumbar", "morning", "early-phase"],
    videoRegion: "lowerBack",
  },
  {
    id: "prone-press-up-gentle",
    name: "Gentle Prone Press-Up (Extension Bias)",
    bodyParts: ["lower-back"],
    primaryMuscles: ["lumbar extensors", "anterior trunk (stretch bias)"],
    difficulty: "intermediate",
    how: "Lie prone. Place hands under shoulders and gently press the chest up, keeping hips heavy if comfortable. Stay in a mild range. Return down.",
    kid: "Do a tiny cobra stretch like a sleepy snake lifting only its head and chest.",
    benefits: ["Extension mobility for standing tolerance in selected patterns"],
    risks: ["Avoid if extension increases leg symptoms; seek guidance for radicular presentations"],
    evidence:
      "Repeated extension / press-up strategies are used selectively in mechanical lumbar care; monitor peripheralization and functional standing tolerance.",
    tags: ["lumbar", "extension"],
    videoRegion: "lowerBack",
  },
  {
    id: "double-knee-to-chest",
    name: "Double Knee-to-Chest Flexion Mobility",
    bodyParts: ["lower-back", "glutes", "hips"],
    primaryMuscles: ["paraspinals", "gluteals"],
    how: "Lie on your back and gently draw both knees toward the chest within comfort. Hold, then lower slowly.",
    kid: "Hug both knees like two soft teddy bears.",
    benefits: ["Flexion mobility for dressing and sitting prep"],
    evidence:
      "Knee-to-chest flexion mobility is common in lumbar HEP for morning stiffness and sit-prep, with ODI-oriented sitting/bending goals.",
    tags: ["lumbar", "flexion"],
    videoRegion: "lowerBack",
  },

  // —— Hips / glutes / groin ——
  {
    id: "supine-hip-flexor-edge",
    name: "Supine Hip Flexor Stretch (Table/Bed Edge)",
    bodyParts: ["hips", "quadriceps", "pelvis"],
    primaryMuscles: ["iliopsoas", "rectus femoris (secondary)"],
    difficulty: "intermediate",
    how: "Lie near the edge of a bed so one thigh can hang gently. Opposite knee may be held toward the chest. Keep pelvis level.",
    kid: "One leg hangs like a sleepy fish while the other knee stays cozy.",
    benefits: ["Hip flexor length for upright posture and stride"],
    evidence:
      "Hip flexor stretching is widely used when prolonged sitting limits stride and upright posture; LEFS walking items often tracked.",
    tags: ["hips", "desk", "gait"],
    videoRegion: "hip",
  },
  {
    id: "figure-four-seated",
    name: "Seated Figure-Four Glute Stretch",
    bodyParts: ["glutes", "hips", "pelvis"],
    primaryMuscles: ["piriformis", "gluteus maximus"],
    how: "Sit tall. Cross ankle over opposite knee. Hinge forward slightly from the hips until a buttock stretch is felt.",
    kid: "Make a number 4 with your legs and bow like a polite robot.",
    benefits: ["Posterior hip mobility for sitting tolerance"],
    evidence:
      "Seated figure-four is a desk-friendly posterior hip mobility drill linked to sitting comfort and buttock tightness care.",
    tags: ["glutes", "desk"],
    videoRegion: "hip",
  },
  {
    id: "pigeon-prep-supported",
    name: "Supported Pigeon-Prep Hip Opener",
    bodyParts: ["hips", "glutes"],
    primaryMuscles: ["external rotators", "gluteals"],
    difficulty: "intermediate",
    how: "From a half-kneeling or elevated surface setup, place the front shin as comfortable (not forced). Keep hips square and torso tall. Use blocks/pillows liberally.",
    kid: "Make a gentle nest for your front leg—pillows allowed, no forcing.",
    benefits: ["Deep hip external rotation mobility"],
    evidence:
      "Supported pigeon-prep variants are used for hip ER mobility with strong emphasis on symptom monitoring and support.",
    equipment: ["pillows or yoga blocks"],
    tags: ["hips", "athletic"],
    videoRegion: "hip",
  },
  {
    id: "adductor-side-lunge-stretch",
    name: "Side-Lunge Adductor Stretch",
    bodyParts: ["groin", "hips"],
    primaryMuscles: ["adductors"],
    how: "Step wide. Bend one knee into a side lunge while the other leg stays long, foot forward or slightly turned out. Hips back, chest proud.",
    kid: "Do a gentle sideways skate stretch—soft knee, proud chest.",
    benefits: ["Groin mobility for stride width and lateral tasks"],
    evidence:
      "Adductor mobility is prescribed when lateral movement and change-of-direction comfort are limited; progressive loading often paired later.",
    tags: ["groin", "athletic"],
    videoRegion: "hip",
  },
  {
    id: "butterfly-adductor",
    name: "Butterfly (Supine/Seated) Adductor Mobility",
    bodyParts: ["groin", "hips", "pelvis"],
    primaryMuscles: ["adductors"],
    how: "Sit or lie with soles of feet together. Let knees open gently with gravity or light hand pressure. Avoid bouncing.",
    kid: "Make butterfly wings with your legs and let them flap open slowly—no slamming.",
    benefits: ["Gentle groin mobility for sitting and hip ER"],
    evidence:
      "Butterfly adductor mobility is a common beginner HEP item for groin flexibility with low equipment needs.",
    tags: ["groin", "beginner"],
    videoRegion: "hip",
  },
  {
    id: "obers-side-lying-tfl",
    name: "Side-Lying ITB / TFL Stretch",
    bodyParts: ["hips", "knee", "glutes"],
    primaryMuscles: ["tensor fasciae latae", "IT band complex (soft tissue)"],
    how: "Side-lying. Bring the top leg back slightly and let the knee drop toward the table within comfort. Support with a pillow if needed.",
    kid: "Top leg draws a gentle rainbow backward and rests like a sleepy wing.",
    benefits: ["Lateral hip mobility for walking and running prep"],
    evidence:
      "TFL/lateral hip mobility is often paired with glute med strengthening when lateral knee/hip symptoms limit walking or stairs.",
    tags: ["hips", "lateral"],
    videoRegion: "hip",
  },

  // —— Hamstrings / quads / knee ——
  {
    id: "seated-hamstring-hinge",
    name: "Seated Hamstring Hinge Stretch",
    bodyParts: ["hamstrings", "lower-back", "knee"],
    primaryMuscles: ["hamstrings"],
    how: "Sit tall on a chair edge, one leg long with heel down. Hinge from the hips with a flat back until a mild hamstring stretch is felt. Do not round aggressively.",
    kid: "Bow from your hips like a polite dinosaur with a long proud neck.",
    benefits: ["Hamstring mobility for sit-to-stand and forward bend"],
    evidence:
      "Hip-hinge hamstring stretching is preferred clinically over aggressive lumbar rounding; outcomes include bend comfort and LEFS-oriented tasks.",
    tags: ["hamstrings", "desk"],
    videoRegion: "hamstring",
  },
  {
    id: "supine-strap-hamstring-abducted",
    name: "Supine Strap Hamstring with Slight Abduction",
    bodyParts: ["hamstrings", "hips"],
    primaryMuscles: ["hamstrings", "adductors (secondary)"],
    how: "On your back, strap around the foot. Raise the leg with a soft knee, then open slightly to the side if comfortable. Keep pelvis quiet.",
    kid: "Use your magic towel elevator to lift one leg, then open the door a little.",
    benefits: ["Multi-plane posterior chain mobility"],
    evidence:
      "Strap-assisted SLR variations allow dose control for hamstring mobility while monitoring neural symptoms.",
    equipment: ["strap or towel"],
    tags: ["hamstrings"],
    videoRegion: "hamstring",
  },
  {
    id: "prone-quad-stretch",
    name: "Prone Quadriceps Stretch",
    bodyParts: ["quadriceps", "knee", "hips"],
    primaryMuscles: ["quadriceps", "hip flexors (secondary)"],
    how: "Lie on your stomach. Bend one knee and hold the ankle (strap OK). Gently draw heel toward glute without forcing the low back to arch.",
    kid: "Make a mermaid tail by bending one knee—slow, no yanking the tail.",
    benefits: ["Knee flexion and quad length for stairs/kneeling"],
    evidence:
      "Prone quad stretching is standard for restoring knee flexion comfort; KOOS/LEFS stair and kneel items often relevant.",
    equipment: ["optional strap"],
    tags: ["quads", "knee"],
    videoRegion: "hip",
  },
  {
    id: "side-lying-quad",
    name: "Side-Lying Quadriceps Stretch",
    bodyParts: ["quadriceps", "knee", "hips"],
    primaryMuscles: ["quadriceps"],
    how: "Side-lying. Bend the top knee and hold the ankle or use a strap. Keep thighs stacked and pelvis quiet.",
    kid: "Top leg makes a soft banana curve behind you.",
    benefits: ["Quad mobility alternative when prone is uncomfortable"],
    evidence:
      "Side-lying quad stretch is a common regression/progression option in knee and hip HEP pathways.",
    tags: ["quads"],
    videoRegion: "hip",
  },
  {
    id: "heel-slides-flexion",
    name: "Heel Slides for Knee Flexion Mobility",
    bodyParts: ["knee", "quadriceps", "hamstrings"],
    primaryMuscles: ["knee flexors/extensors (mobility)"],
    how: "Lie on your back. Slowly slide the heel toward the glute within comfort, then straighten. Use a slider or towel under the heel if helpful.",
    kid: "Slide your heel on an invisible ice rink toward your seat, then away.",
    benefits: ["Active-assisted knee flexion ROM"],
    evidence:
      "Heel slides are foundational post-knee-irritation / post-op (with clearance) mobility drills tracking flexion ROM and KOOS ADL function.",
    tags: ["knee", "early-phase", "post-op-style"],
    videoRegion: "leg",
  },
  {
    id: "seated-knee-extension-stretch",
    name: "Seated Knee Extension Mobility",
    bodyParts: ["knee", "hamstrings"],
    primaryMuscles: ["hamstrings", "posterior knee soft tissue"],
    how: "Sit tall. Straighten one knee and flex the ankle gently. Optional strap on the foot for a light calf/hamstring assist.",
    kid: "Kick a slow imaginary soccer ball and freeze with a long proud leg.",
    benefits: ["Terminal extension comfort for walking"],
    evidence:
      "Active terminal extension mobility supports gait and is common in knee pathways aiming for full extension.",
    tags: ["knee", "gait"],
    videoRegion: "leg",
  },

  // —— Calf / ankle / foot ——
  {
    id: "soleus-bent-knee-wall",
    name: "Bent-Knee Soleus Wall Stretch",
    bodyParts: ["calves", "ankles"],
    primaryMuscles: ["soleus"],
    how: "Facing a wall in a staggered stance, bend the back knee while keeping the heel down. Lean until a lower-calf stretch is felt.",
    kid: "Back knee soft like a marshmallow while the heel stays glued down.",
    benefits: ["Soleus length for squat depth and stairs"],
    evidence:
      "Differentiating gastroc vs soleus stretching is standard for ankle DF limitations affecting squat and gait (FAAM/LEFS relevant).",
    tags: ["calf", "ankle"],
    videoRegion: "calf",
  },
  {
    id: "gastroc-straight-knee-wall",
    name: "Straight-Knee Gastrocnemius Wall Stretch",
    bodyParts: ["calves", "ankles", "foot"],
    primaryMuscles: ["gastrocnemius"],
    how: "Staggered stance facing wall, back knee straight, heel down. Lean forward until upper calf stretches.",
    kid: "Back leg is a tall stick—heel stuck to the floor like gum.",
    benefits: ["Calf length for push-off and walking"],
    evidence:
      "Gastroc stretching is foundational in plantar heel pain and limited-DF pathways; morning first-step pain often monitored.",
    tags: ["calf", "gait"],
    videoRegion: "calf",
  },
  {
    id: "ankle-alphabet-seated",
    name: "Seated Ankle Alphabet Mobility",
    bodyParts: ["ankles", "foot"],
    primaryMuscles: ["ankle invertors/evertors", "dorsiflexors/plantarflexors"],
    how: "Seated, lift one foot and slowly “write” the alphabet in the air with your big toe. Keep letters small and controlled.",
    kid: "Draw ABCs in the air with your big toe pencil.",
    benefits: ["Multi-plane ankle mobility for balance and gait"],
    evidence:
      "Ankle alphabet drills restore multi-plane motion after sprain or stiffness; FAAM and balance confidence often tracked.",
    tags: ["ankle", "early-phase"],
    videoRegion: "ankle",
  },
  {
    id: "towel-scrunch-foot",
    name: "Towel Scrunches (Foot Intrinsic Mobility Prep)",
    bodyParts: ["foot", "toes", "ankles"],
    primaryMuscles: ["foot intrinsics"],
    how: "Seated, barefoot on a towel. Scrunch the towel toward you with your toes, then relax. Avoid clawing with pain.",
    kid: "Make your toes a tiny vacuum cleaner gathering the towel.",
    benefits: ["Foot mobility and arch control prep"],
    evidence:
      "Foot intrinsic activation/mobility drills support arch control and are used in plantar heel and balance programs.",
    equipment: ["towel"],
    tags: ["foot", "balance"],
    videoRegion: "ankle",
  },
  {
    id: "great-toe-extension",
    name: "Great Toe Extension Stretch",
    bodyParts: ["toes", "foot"],
    primaryMuscles: ["plantar fascia continuum", "toe flexors"],
    how: "Seated, cross one ankle over the opposite knee. Gently extend the big toe upward until a mild stretch is felt under the foot/toe.",
    kid: "Help your big toe wave hello to the sky—gentle wave.",
    benefits: ["Push-off prep and shoe comfort"],
    evidence:
      "Hallux extension mobility supports push-off mechanics; often included in plantar fascia and gait-oriented care.",
    tags: ["foot", "toes"],
    videoRegion: "ankle",
  },
  {
    id: "inversion-eversion-arom",
    name: "Ankle Inversion–Eversion AROM",
    bodyParts: ["ankles", "foot"],
    primaryMuscles: ["tibialis posterior", "peroneals"],
    how: "Seated, slowly tilt the sole inward then outward through a pain-free range. Optional light band later for strength pairing.",
    kid: "Make your foot a windshield wiper for the floor—slow sweeps.",
    benefits: ["Frontal-plane ankle mobility for uneven ground"],
    evidence:
      "Inversion/eversion AROM is standard after ankle sprain pathways aiming for multi-plane motion and return-to-walk confidence.",
    tags: ["ankle"],
    videoRegion: "ankle",
  },

  // —— Upper extremity distal ——
  {
    id: "wrist-extensor-stretch",
    name: "Wrist Extensor Stretch (Elbow Soft)",
    bodyParts: ["wrists", "forearm", "elbow"],
    primaryMuscles: ["wrist extensors"],
    how: "Arm forward, elbow soft. Palm down; gently flex the wrist with the other hand until a mild forearm stretch is felt. Keep shoulders relaxed.",
    kid: "Make a stop hand, then politely fold the fingers down with help.",
    benefits: ["Forearm mobility for typing and gripping"],
    evidence:
      "Wrist extensor stretching is common in lateral elbow pathways alongside progressive loading; QuickDASH work items often relevant.",
    tags: ["wrist", "desk", "elbow"],
    videoRegion: "general",
  },
  {
    id: "wrist-flexor-stretch",
    name: "Wrist Flexor Stretch",
    bodyParts: ["wrists", "forearm"],
    primaryMuscles: ["wrist flexors"],
    how: "Arm forward, palm up or down as comfortable. Gently extend the wrist with the other hand until a mild stretch is felt on the palm-side forearm.",
    kid: "Open a flat pizza hand and tip it back like saying “whoa” gently.",
    benefits: ["Wrist extension mobility for push and desk tasks"],
    evidence:
      "Wrist flexor/extensor mobility is used for desk-related wrist complaints with load management and ergonomic cues.",
    tags: ["wrist", "desk"],
    videoRegion: "general",
  },
  {
    id: "prayer-stretch-wrists",
    name: "Prayer Stretch for Wrist Extension",
    bodyParts: ["wrists", "hand", "forearm"],
    primaryMuscles: ["wrist flexors", "hand intrinsics (secondary)"],
    how: "Palms together at chest height. Slowly lower hands toward the waist, keeping palms touching, until a mild wrist stretch is felt.",
    kid: "Pray hands slide down like an elevator—stop at the soft floor.",
    benefits: ["Wrist extension for push-ups and crawling prep"],
    evidence:
      "Prayer stretch is a standard wrist extension mobility drill in hand therapy–informed HEP and desk care.",
    tags: ["wrist", "hand"],
    videoRegion: "general",
  },
  {
    id: "median-nerve-slider-gentle",
    name: "Gentle Median Nerve Slider (Education)",
    bodyParts: ["wrists", "elbow", "neck", "shoulders"],
    primaryMuscles: ["neural mobility (median bias)"],
    difficulty: "intermediate",
    how: "In a comfortable seated position, combine gentle wrist/elbow motions in a sliding pattern taught for median bias—small range only. Stop if symptoms increase or linger.",
    kid: "Make your arm a gentle floss string—tiny slides, never yanking.",
    benefits: ["Neural mobility education for selected upper-limb symptoms"],
    risks: ["Do not force; stop if numbness worsens or spreads. Prefer PT guidance for true neurodynamic care."],
    evidence:
      "Neural sliders (vs tensioners) are used in selected radicular/peripheral nerve pathways with careful dosing and symptom monitoring.",
    tags: ["neural", "upper-limb"],
    videoRegion: "general",
  },
  {
    id: "finger-tendon-glides",
    name: "Finger Tendon Gliding Sequence",
    bodyParts: ["hand", "wrists"],
    primaryMuscles: ["finger flexors/extensors"],
    how: "Move slowly through open hand → hook fist → full fist → tabletop → open, within comfort. Smooth, pain-aware motion.",
    kid: "Teach your fingers a five-step dance: open, hook, fist, table, open.",
    benefits: ["Hand mobility for grip and fine motor ADLs"],
    evidence:
      "Tendon gliding is a hand-therapy staple for restoring composite motion after stiffness or overuse with QuickDASH hand-item relevance.",
    tags: ["hand"],
    videoRegion: "general",
  },
  {
    id: "elbow-supination-pronation",
    name: "Elbow Supination–Pronation AROM",
    bodyParts: ["elbow", "forearm", "wrists"],
    primaryMuscles: ["supinators", "pronators"],
    how: "Elbow at side, bent ~90°. Rotate palm up and palm down slowly through a comfortable range. Optional stick for feedback.",
    kid: "Flip pancakes in the air—slow, imaginary pancakes only.",
    benefits: ["Forearm rotation for pouring and tool use"],
    evidence:
      "Pronation/supination AROM is essential post-elbow injury/stiffness pathways for ADLs like pouring and turning keys.",
    tags: ["elbow", "forearm"],
    videoRegion: "general",
  },

  // —— Full body / functional integration ——
  {
    id: "worlds-greatest-split-stance",
    name: "Split-Stance World’s Greatest Mobility Flow",
    bodyParts: ["hips", "thoracic", "hamstrings", "full-body"],
    primaryMuscles: ["hip flexors", "hamstrings", "thoracic rotators"],
    difficulty: "intermediate",
    durationSeconds: 180,
    how: "From a lunge stance, place hands inside the front foot. Optionally rotate the top arm open. Keep motions smooth and pain-aware.",
    kid: "Lunge like a superhero landing, then open one arm to the sky like a gate.",
    benefits: ["Integrated hip-trunk mobility for athletic prep"],
    evidence:
      "Multi-segment mobility flows are used in athletic prep and general conditioning to restore linked hip–thoracic motion for functional tasks.",
    tags: ["full-body", "athletic", "flow"],
    videoRegion: "full",
  },
  {
    id: "cat-cow-seated",
    name: "Seated Cat–Cow Spinal Mobility",
    bodyParts: ["thoracic", "lower-back", "core"],
    primaryMuscles: ["paraspinals", "abdominals (control)"],
    how: "Seated tall. Alternate gentle rounding and arching of the spine with breath. Keep the motion segmental and small if irritable.",
    kid: "Be a seated cat (round) and cow (open chest)—quiet moo, quiet meow.",
    benefits: ["Spinal mobility for desk breaks"],
    evidence:
      "Cat–cow variants are nearly universal early spinal mobility drills for reducing stiffness and improving movement confidence.",
    tags: ["spine", "desk"],
    videoRegion: "thoracic",
  },
  {
    id: "pelvic-clock",
    name: "Supine Pelvic Clock Mobility",
    bodyParts: ["pelvis", "lower-back", "core"],
    primaryMuscles: ["deep core", "pelvic movers"],
    how: "Lie on your back, knees bent. Gently tilt the pelvis as if rolling a marble around a clock face—small, controlled arcs.",
    kid: "Roll a tiny marble around a clock under your low back—soft rolls.",
    benefits: ["Pelvic awareness for lumbar comfort"],
    evidence:
      "Pelvic clocks build motor control and gentle mobility used in lumbar stabilization progressions with ODI-oriented function goals.",
    tags: ["pelvis", "motor-control"],
    videoRegion: "lowerBack",
  },
  {
    id: "thread-needle-standing",
    name: "Standing Desk Thread / Rotation Reach",
    bodyParts: ["thoracic", "shoulders"],
    primaryMuscles: ["thoracic rotators", "scapular movers"],
    how: "Standing in a staggered stance, hands on desk. Thread one arm under the torso, then open to the ceiling in a pain-free arc.",
    kid: "Thread a needle under the desk, then open the curtain to the sky.",
    benefits: ["Desk-friendly thoracic rotation"],
    evidence:
      "Standing rotation reaches provide workplace microdoses of thoracic mobility associated with reduced desk-related stiffness.",
    tags: ["desk", "thoracic"],
    videoRegion: "thoracic",
  },
  {
    id: "hip-90-90-stretch",
    name: "90/90 Hip Mobility Stretch",
    bodyParts: ["hips", "glutes", "pelvis"],
    primaryMuscles: ["hip external rotators", "hip internal rotators"],
    difficulty: "intermediate",
    how: "Sit with front hip in ~90° flexion/ER and back hip in ~90° flexion/IR as comfortable. Hinge forward over the front shin for a gentle stretch. Switch sides.",
    kid: "Make two square L shapes with your legs and bow to the front shin.",
    benefits: ["Multi-plane hip mobility for squat and sit"],
    evidence:
      "90/90 hip positions are popular clinical/athletic mobility drills for IR/ER capacity supporting squat and sit function.",
    tags: ["hips", "athletic"],
    videoRegion: "hip",
  },
  {
    id: "couch-stretch-supported",
    name: "Supported Couch Stretch (Hip Flexor–Quad)",
    bodyParts: ["hips", "quadriceps"],
    primaryMuscles: ["hip flexors", "quadriceps"],
    difficulty: "advanced",
    how: "Half-kneeling with rear foot elevated on a couch/wall as tolerable. Keep torso tall and glute gently engaged. Use padding under the knee.",
    kid: "Knight kneel with the back foot on a soft couch castle—stay tall like a proud knight.",
    benefits: ["Deep hip flexor/quad mobility for runners and desk workers"],
    evidence:
      "Couch stretch variants aggressively target anterior hip chain; dose carefully and prioritize upright trunk without lumbar pain.",
    equipment: ["pad", "couch or wall"],
    tags: ["hips", "athletic", "desk"],
    videoRegion: "hip",
  },
  {
    id: "scapular-wall-angels",
    name: "Wall Angels Mobility",
    bodyParts: ["scapular", "shoulders", "thoracic"],
    primaryMuscles: ["lower trapezius", "rhomboids", "rotator cuff (secondary)"],
    how: "Back to wall, ribs down. Slide arms in a snow-angel pattern keeping wrists/elbows as close to the wall as comfortable.",
    kid: "Make snow angels on the wall—slow motion snow day.",
    benefits: ["Scapular upward rotation and posture mobility"],
    evidence:
      "Wall angels combine thoracic extension and scapular control used in postural and shoulder prep programs.",
    tags: ["posture", "shoulders"],
    videoRegion: "shoulder",
  },
  {
    id: "levator-seated-pinch",
    name: "Seated Levator Scapulae Stretch",
    bodyParts: ["neck", "shoulders", "scapular"],
    primaryMuscles: ["levator scapulae"],
    how: "Sit on one hand. Turn nose toward opposite armpit and gently nod until a mild stretch is felt along the neck/shoulder blade path.",
    kid: "Smell your opposite armpit like a silly detective—gentle sniff only.",
    benefits: ["Eases neck–shoulder junction tightness"],
    evidence:
      "Levator-specific stretching is common for desk-related neck pain with NDI-oriented looking-down/rotation tasks.",
    tags: ["neck", "desk"],
    videoRegion: "neck",
  },
  {
    id: "upper-trap-contralateral",
    name: "Upper Trap Contralateral Side-Bend Stretch",
    bodyParts: ["neck", "shoulders"],
    primaryMuscles: ["upper trapezius"],
    how: "Sit tall, one hand anchoring the opposite side of the chair. Side-bend the ear toward the free shoulder until a mild stretch is felt.",
    kid: "Tip your ear to your shoulder like listening for a secret whisper.",
    benefits: ["Lateral neck mobility after screen time"],
    evidence:
      "Upper trapezius stretching is among the most prescribed cervical HEP items for posture-related tightness.",
    tags: ["neck", "desk"],
    videoRegion: "neck",
  },
  {
    id: "sciatic-slider-seated",
    name: "Seated Sciatic Nerve Slider (Gentle)",
    bodyParts: ["hamstrings", "lower-back", "calves"],
    primaryMuscles: ["neural mobility (sciatic bias)"],
    difficulty: "intermediate",
    how: "Sit tall. Alternate gentle knee extension with ankle motion in a sliding pattern (extend knee as ankle relaxes, reverse). Small range; no forcing tension.",
    kid: "Your leg is dental floss for a sleepy nerve—tiny floss moves only.",
    benefits: ["Neural mobility education for selected posterior chain symptoms"],
    risks: ["Stop if leg symptoms worsen or linger; prefer guided care for true radiculopathy"],
    evidence:
      "Sciatic sliders are used in selected lumbar–radicular pathways; evidence favors gentle sliding over aggressive tensioning early.",
    tags: ["neural", "lumbar", "hamstrings"],
    videoRegion: "hamstring",
  },
  {
    id: "hip-circles-quadruped",
    name: "Quadruped Hip Circles Mobility",
    bodyParts: ["hips", "pelvis", "core"],
    primaryMuscles: ["hip movers", "deep core (control)"],
    how: "On hands and knees, draw slow controlled circles with one knee. Keep pelvis as steady as possible. Reverse direction.",
    kid: "Draw slow pizza circles with your knee while your back stays a quiet table.",
    benefits: ["Hip joint mobility with trunk control"],
    evidence:
      "Quadruped hip circles are used for early hip mobility and motor control before loading progressions.",
    tags: ["hips", "motor-control"],
    videoRegion: "hip",
  },
  {
    id: "ankle-dorsiflexion-knee-to-wall",
    name: "Knee-to-Wall Ankle Dorsiflexion Stretch",
    bodyParts: ["ankles", "calves", "foot"],
    primaryMuscles: ["soleus", "achilles complex"],
    how: "Face a wall in a half-kneeling or staggered stance. Drive the front knee toward the wall while keeping the heel down. Move closer over sessions as able.",
    kid: "Front knee tries to kiss the wall while the heel stays glued.",
    benefits: ["Closed-chain DF for squat and stairs"],
    evidence:
      "Knee-to-wall DF is a clinical standard measure and mobility drill for closed-chain dorsiflexion relevant to squat/gait.",
    tags: ["ankle", "functional"],
    videoRegion: "ankle",
  },
  {
    id: "thoracic-foam-extension",
    name: "Supported Thoracic Extension (Foam/Towel Roll)",
    bodyParts: ["thoracic", "upper-back", "chest"],
    primaryMuscles: ["thoracic spine soft tissues", "pectorals (secondary)"],
    how: "Supine with a foam roller or towel along the mid-back. Support head. Gently extend over the support within comfort, hands on chest or overhead as able.",
    kid: "Rest on a soft log and open your chest like a book on a pillow.",
    benefits: ["Thoracic extension for posture and overhead prep"],
    evidence:
      "Supported thoracic extension is commonly prescribed for desk-related kyphotic stiffness with posture and reach goals.",
    equipment: ["foam roller or towel roll"],
    tags: ["thoracic", "posture"],
    videoRegion: "thoracic",
  },
  {
    id: "si-figure-four-bridge-prep",
    name: "Figure-Four with Gentle Pelvic Rock",
    bodyParts: ["pelvis", "glutes", "hips", "lower-back"],
    primaryMuscles: ["piriformis", "glute med/max (secondary)"],
    how: "Supine figure-four. Add tiny pelvic rocks or ankle pumps if comfortable—motion, not force.",
    kid: "Number-4 legs plus tiny see-saw hips—super small.",
    benefits: ["Pelvic–hip comfort for walking and sitting"],
    evidence:
      "Figure-four with gentle pelvic motion is used when SI-region or buttock tightness limits sit/walk tolerance.",
    tags: ["pelvis", "glutes"],
    videoRegion: "hip",
  },
  {
    id: "shoulder-flexion-table-slide",
    name: "Table Slide Shoulder Flexion",
    bodyParts: ["shoulders", "scapular"],
    primaryMuscles: ["shoulder flexors", "scapular upward rotators"],
    how: "Seated sideways to a table, hand on a towel. Slide the hand forward, allowing the shoulder to flex as the torso hinges slightly. Return smoothly.",
    kid: "Slide a magic carpet towel forward and back on the table.",
    benefits: ["Supported elevation for irritable shoulders"],
    evidence:
      "Table slides provide supported flexion ROM progressions common in early–mid shoulder rehab with QuickDASH reach goals.",
    equipment: ["towel", "table"],
    tags: ["shoulder", "early-phase"],
    videoRegion: "shoulder",
  },
  {
    id: "cervical-retraction-with-extension",
    name: "Chin Tuck with Gentle Extension",
    bodyParts: ["neck"],
    primaryMuscles: ["deep neck flexors", "cervical extensors (controlled)"],
    difficulty: "intermediate",
    how: "Perform a chin tuck, then add a small gentle look-up while maintaining the long neck. Return to neutral. Stop if dizziness or arm symptoms appear.",
    kid: "Turtle head in, then peek up at a butterfly—tiny peek.",
    benefits: ["Combined motor control and extension mobility"],
    evidence:
      "Retraction-extension sequences appear in selected cervical programs for restoring looking-up while maintaining deep flexor control.",
    tags: ["cervical", "motor-control"],
    videoRegion: "neck",
  },
  {
    id: "hamstring-contract-relax",
    name: "Hamstring Contract–Relax Stretch",
    bodyParts: ["hamstrings", "knee"],
    primaryMuscles: ["hamstrings"],
    difficulty: "intermediate",
    how: "Supine with strap on foot, raise leg to mild stretch. Gently press heel into the strap 5 seconds (light), relax, then ease slightly further if comfortable.",
    kid: "Push your heel into the magic towel like a soft button, rest, then float a little higher.",
    benefits: ["PNF-style mobility when static stretch plateaus"],
    evidence:
      "Contract–relax (PNF) techniques can improve ROM efficiently and are used in outpatient mobility progressions with care for irritability.",
    equipment: ["strap"],
    tags: ["hamstrings", "pnf"],
    videoRegion: "hamstring",
  },
  {
    id: "calf-eccentric-mobility-prep",
    name: "Calf Stretch into Light Eccentric Prep",
    bodyParts: ["calves", "ankles", "foot"],
    primaryMuscles: ["gastrocnemius", "soleus"],
    difficulty: "intermediate",
    how: "After a gentle wall calf stretch, perform a slow heel-lower from a step if cleared and pain-aware (both feet or single as able). Mobility first, then light load.",
    kid: "Stretch the calf, then ride a slow elevator heel down a step if an adult says it’s OK.",
    benefits: ["Combines length and capacity for Achilles/gait goals"],
    evidence:
      "Combining calf mobility with progressive loading (including eccentrics when appropriate) is central in many Achilles and plantar pathways.",
    tags: ["calf", "tendon-capacity"],
    videoRegion: "calf",
  },
  {
    id: "full-body-reach-roll",
    name: "Supine Reach-and-Roll Mobility",
    bodyParts: ["full-body", "thoracic", "hips"],
    primaryMuscles: ["trunk rotators", "hip movers"],
    durationSeconds: 150,
    how: "Lie on your back. Reach one arm across and allow the knees to fall the opposite way in a gentle roll, then reverse. Keep ranges small and comfortable.",
    kid: "Be a slow rolling log that reaches for a snack on one side, then the other.",
    benefits: ["Integrated rolling mobility for bed mobility and ADLs"],
    evidence:
      "Reach-and-roll patterns train linked trunk–hip mobility used in bed mobility and general movement confidence programs.",
    tags: ["full-body", "functional"],
    videoRegion: "full",
  },
]);

export const BULK_STRETCH_SEEDS: Array<
  Omit<Stretch, "durationBucket" | "slug" | "kind">
> = COMPACT_FIXED.map(expandCompact);
