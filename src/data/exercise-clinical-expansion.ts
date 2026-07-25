/**
 * Independent exercise expansions focused on PT protocols that commonly
 * improve function, activity tolerance, and pain ratings (e.g., LEFS, NDI,
 * ODI, QuickDASH, KOOS-oriented task practice)—educational synthesis.
 */
import type {
  BodyPart,
  Difficulty,
  Exercise,
  StretchStep,
  StretchVariation,
} from "@/lib/types";
import { videoForTechnique } from "@/data/video-catalog";

type Seed = Omit<Exercise, "durationBucket" | "slug" | "kind"> & { slug?: string };

function steps(
  items: Array<{
    instruction: string;
    kid: string;
    reps?: number;
    sets?: number;
    hold?: number;
  }>
): StretchStep[] {
  return items.map((item, i) => ({
    order: i + 1,
    instruction: item.instruction,
    kidFriendly: item.kid,
    reps: item.reps,
    sets: item.sets,
    holdSeconds: item.hold,
    cues: ["Quality over quantity", "Stop if sharp pain", "Breathe steady"],
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

export const ADDITIONAL_EXERCISE_SEEDS: Seed[] = [
  {
    id: "ex-quad-set",
    name: "Quad Set (Isometric)",
    category: "activation",
    bodyParts: ["knee", "quadriceps"],
    primaryMuscles: ["quadriceps", "VMO region"],
    difficulty: "beginner",
    durationSeconds: 90,
    benefits: ["Early knee activation", "Supports extension control"],
    risks: ["Pad under knee if tender"],
    breathing: "Exhale on squeeze.",
    alignment: "Knee presses gently down; ankle flexed optional.",
    posture: "Long-sit or semi-reclined.",
    warmUpNotes: "Ankle pumps × 10.",
    steps: steps([
      {
        instruction:
          "Sit with leg straight. Tighten the thigh so the knee presses gently into the surface. Hold 5 seconds, relax.",
        kid: "Make your thigh muscle hard like a superhero shield for a 5-count, then relax.",
        reps: 10,
        sets: 2,
        hold: 5,
      },
    ]),
    variations: vars("ex-quad-set", [
      { name: "Towel under knee", difficulty: "beginner", description: "Press into rolled towel.", painMax: 5 },
      { name: "Short-arc quad", difficulty: "intermediate", description: "Small extension arc over bolster." },
    ]),
    video: videoForTechnique("leg-strength", "Quad activation / isometric technique"),
    evidenceNotes:
      "Isometric quad activation is foundational after knee irritation or surgery pathways; function goals include better extension control and lower pain with weight-bearing progression.",
    clinical: {
      whatItDoes: "Activates the quadriceps without large joint motion.",
      whyImportant: "Restores thigh control needed for standing and stairs.",
      clinicalOutcome:
        "Often associated with improved knee extension control and better pain scores during early functional tasks when progressed gradually.",
      outpatientRationale:
        "Early-phase outpatient knee staple before multi-angle strength and sit-to-stand loading.",
    },
    equipment: ["mat or bed"],
    tags: ["knee", "activation", "isometric", "quads"],
    defaultSets: 2,
    defaultReps: "8–12 holds",
  },
  {
    id: "ex-heel-slide",
    name: "Heel Slides (Knee Flexion)",
    category: "mobility",
    bodyParts: ["knee", "quadriceps", "hamstrings"],
    primaryMuscles: ["hamstrings", "quadriceps (control)"],
    difficulty: "beginner",
    durationSeconds: 100,
    benefits: ["Active knee flexion range", "Early post-injury / post-op friendly (when cleared)"],
    risks: ["Stay within comfortable flexion"],
    breathing: "Exhale as heel slides in.",
    alignment: "Foot slides in line; pelvis quiet.",
    posture: "Supine.",
    warmUpNotes: "Ankle pumps.",
    steps: steps([
      {
        instruction:
          "Lie on your back. Slide the heel toward the buttock, bending the knee as far as comfortable, then slide back out.",
        kid: "Slide your heel toward your seat like a snail on a skateboard—smooth out and back.",
        reps: 12,
        sets: 2,
      },
    ]),
    variations: vars("ex-heel-slide", [
      { name: "Towel-assisted", difficulty: "beginner", description: "Towel under heel for easier slide.", painMax: 5 },
      { name: "Seated heel slide", difficulty: "beginner", description: "Chair version." },
    ]),
    video: videoForTechnique("knee-rom", "Knee flexion mobility technique"),
    evidenceNotes:
      "Active assisted knee flexion is standard for restoring ROM; outcomes include flexion range and improved KOOS/ADL-type function when swelling and pain allow.",
    clinical: {
      whatItDoes: "Actively restores knee bending under patient control.",
      whyImportant: "Needed for sitting, stairs, and cycling motions.",
      clinicalOutcome:
        "Supports improved knee flexion range and better pain ratings with daily bending tasks as part of graded rehab.",
      outpatientRationale: "High-frequency outpatient knee mobility drill with clear dosing.",
    },
    equipment: ["mat", "optional towel"],
    tags: ["knee", "mobility", "rom"],
    defaultSets: 2,
    defaultReps: "10–15",
  },
  {
    id: "ex-slr",
    name: "Straight Leg Raise",
    category: "strength",
    bodyParts: ["knee", "quadriceps", "hips"],
    primaryMuscles: ["quadriceps", "hip flexors"],
    difficulty: "beginner",
    durationSeconds: 110,
    benefits: ["Knee extension strength endurance", "Classic lower-extremity progression"],
    risks: ["Keep opposite knee bent if back is sensitive"],
    breathing: "Exhale on lift.",
    alignment: "Knee stays as straight as possible; pelvis quiet.",
    posture: "Supine.",
    warmUpNotes: "Quad sets × 8 first.",
    steps: steps([
      {
        instruction:
          "Lie on your back with one knee bent. Tighten the straight leg’s thigh and lift it to the height of the bent knee. Lower slowly.",
        kid: "Keep one leg a tall stick and lift it like a slow drawbridge to match the other knee’s height.",
        reps: 10,
        sets: 2,
      },
    ]),
    variations: vars("ex-slr", [
      { name: "Short arc only", difficulty: "beginner", description: "Smaller lift range.", painMax: 5 },
      { name: "Ankle weight progress", difficulty: "advanced", description: "Light load when form is solid.", painMax: 3 },
    ]),
    video: videoForTechnique("slr", "Straight leg raise technique"),
    evidenceNotes:
      "SLR strength is widely used in knee and hip programs targeting walking and stair function; pain and strength measures guide load.",
    clinical: {
      whatItDoes: "Strengthens the quads in a long-lever pattern.",
      whyImportant: "Builds capacity for walking and step control.",
      clinicalOutcome:
        "Often contributes to better activity tolerance and improved pain scores with weight-bearing tasks when progressed without flare.",
      outpatientRationale: "Core lower-extremity strengthening progression in outpatient PT.",
    },
    equipment: ["mat"],
    tags: ["knee", "quads", "strength"],
    defaultSets: 2,
    defaultReps: "8–12",
  },
  {
    id: "ex-clamshell",
    name: "Side-Lying Clamshell",
    category: "activation",
    bodyParts: ["hips", "glutes", "pelvis", "knee"],
    primaryMuscles: ["gluteus medius", "deep external rotators"],
    difficulty: "beginner",
    durationSeconds: 110,
    benefits: ["Lateral hip activation", "Supports knee tracking and pelvic stability"],
    risks: ["Keep pelvis stacked; small range if irritable"],
    breathing: "Exhale as top knee opens.",
    alignment: "Feet together; open from the hip.",
    posture: "Side-lying, hips and knees flexed ~45°.",
    warmUpNotes: "Pelvic clocks or bridges light.",
    steps: steps([
      {
        instruction:
          "Lie on your side with knees bent. Keep feet together and lift the top knee like a clam opening. Lower with control.",
        kid: "Keep your feet glued like a sandwich and open the top knee like a clam shell—slow open, slow close.",
        reps: 12,
        sets: 2,
      },
    ]),
    variations: vars("ex-clamshell", [
      { name: "Band around knees", difficulty: "intermediate", description: "Light band for more challenge." },
      { name: "Isometric open hold", difficulty: "beginner", description: "Hold mid-range 5 seconds.", painMax: 4 },
    ]),
    video: videoForTechnique("hip-strength", "Glute med activation technique"),
    evidenceNotes:
      "Glute med activation is linked with improved frontal-plane control; often included when stair and walking pain/function are goals (LEFS-oriented).",
    clinical: {
      whatItDoes: "Activates lateral hip stabilizers without high joint compression.",
      whyImportant: "Helps pelvis stay level and knee track better in single-leg tasks.",
      clinicalOutcome:
        "Commonly used to support better walking/stair tolerance and reduced lateral hip or knee pain ratings in graded programs.",
      outpatientRationale: "Near-universal outpatient hip activation drill.",
    },
    equipment: ["mat", "optional band"],
    tags: ["hips", "glutes", "activation", "knee"],
    defaultSets: 2,
    defaultReps: "10–15",
  },
  {
    id: "ex-side-plank-knees",
    name: "Side Plank on Knees",
    category: "strength",
    bodyParts: ["core", "hips", "shoulders", "lower-back"],
    primaryMuscles: ["obliques", "gluteus medius", "shoulder stabilizers"],
    difficulty: "intermediate",
    durationSeconds: 100,
    benefits: ["Lateral core endurance", "Functional trunk stability"],
    risks: ["Keep neck neutral; drop to shorter holds if shaking hard"],
    breathing: "Steady breathing; do not hold breath.",
    alignment: "Ears-shoulders-hips in a line as able.",
    posture: "Side-lying, knees bent, forearm down.",
    warmUpNotes: "Bird dogs or dead bugs first.",
    steps: steps([
      {
        instruction:
          "From side-lying on forearm with knees bent, lift hips so body forms a straight line from knees to head. Hold, then lower.",
        kid: "Make a strong side bridge from your knees to your head—like a board on its side—then lower softly.",
        sets: 2,
        hold: 15,
        reps: 4,
      },
    ]),
    variations: vars("ex-side-plank-knees", [
      { name: "Short holds only", difficulty: "beginner", description: "5-second holds.", painMax: 5 },
      { name: "Full side plank", difficulty: "advanced", description: "Legs straight—only if pain ≤3.", painMax: 3 },
    ]),
    video: videoForTechnique("core-lateral", "Lateral core endurance technique"),
    evidenceNotes:
      "Lateral core endurance supports trunk control for ADLs; programs track endurance time and pain with functional tasks.",
    clinical: {
      whatItDoes: "Builds side-body trunk and hip endurance.",
      whyImportant: "Helps with carrying, turning, and single-leg stability demands.",
      clinicalOutcome:
        "May improve activity tolerance for side-loaded tasks and support lower pain ratings when capacity rises without flare.",
      outpatientRationale: "Progressive core endurance item after basic activation.",
    },
    equipment: ["mat"],
    tags: ["core", "endurance", "hips"],
    defaultSets: 2,
    defaultReps: "4×10–20s",
  },
  {
    id: "ex-terminal-knee-extension",
    name: "Terminal Knee Extension (Band)",
    category: "strength",
    bodyParts: ["knee", "quadriceps"],
    primaryMuscles: ["quadriceps"],
    difficulty: "intermediate",
    durationSeconds: 110,
    benefits: ["End-range extension strength", "Gait terminal extension control"],
    risks: ["Use light band; avoid hyperextension force"],
    breathing: "Exhale as knee straightens.",
    alignment: "Soft standing posture; control the last 20–30°.",
    posture: "Band behind knee, facing anchor.",
    warmUpNotes: "Quad sets and marches.",
    steps: steps([
      {
        instruction:
          "Place a light band behind the knee, anchored in front. Start with a soft knee bend, then straighten the knee firmly against the band and return slowly.",
        kid: "Make your knee a soft hinge, then straighten it to push the band like pressing a pedal—smooth.",
        reps: 12,
        sets: 2,
      },
    ]),
    variations: vars("ex-terminal-knee-extension", [
      { name: "No band long-arc", difficulty: "beginner", description: "Seated long-arc quads.", painMax: 5 },
    ]),
    video: videoForTechnique("tke", "Terminal knee extension technique"),
    evidenceNotes:
      "TKE is widely used to restore extension strength for walking; outcomes include gait quality and pain with stance phase tasks.",
    clinical: {
      whatItDoes: "Strengthens the quads in the final degrees of knee extension.",
      whyImportant: "Critical for confident straight-leg stance and push-off.",
      clinicalOutcome:
        "Supports improved walking tolerance and often better pain scores with stance when loading is graded.",
      outpatientRationale: "High-value knee strengthening progression in outpatient care.",
    },
    equipment: ["light band", "anchor"],
    tags: ["knee", "quads", "gait", "strength"],
    defaultSets: 2,
    defaultReps: "10–15",
  },
  {
    id: "ex-shoulder-er-band",
    name: "Side-Lying or Band External Rotation",
    category: "strength",
    bodyParts: ["shoulders", "scapular"],
    primaryMuscles: ["infraspinatus", "teres minor", "posterior cuff"],
    difficulty: "beginner",
    durationSeconds: 110,
    benefits: ["Rotator cuff endurance", "Shoulder stability for reach"],
    risks: ["Elbow glued to side; small pain-free range"],
    breathing: "Exhale as you rotate out.",
    alignment: "Towel roll under elbow optional.",
    posture: "Side-lying or standing with band.",
    warmUpNotes: "Pendulums and scapular clocks.",
    steps: steps([
      {
        instruction:
          "Keep elbow bent 90° at your side. Rotate the forearm outward against light resistance, then return slowly.",
        kid: "Keep your elbow hugging your ribs and open your forearm like a gate—then close the gate slowly.",
        reps: 12,
        sets: 2,
      },
    ]),
    variations: vars("ex-shoulder-er-band", [
      { name: "Isometric ER at wall", difficulty: "beginner", description: "Press outward into wall, no motion.", painMax: 5 },
      { name: "Side-lying dumbbell ER", difficulty: "intermediate", description: "Light weight when ready." },
    ]),
    video: videoForTechnique("rotator-cuff", "Rotator cuff ER stretch/strength technique (PT demo)"),
    evidenceNotes:
      "Cuff endurance work is standard in shoulder rehab aiming to improve QuickDASH/function and reduce pain with reaching.",
    clinical: {
      whatItDoes: "Strengthens the external rotators of the rotator cuff.",
      whyImportant: "Helps the ball of the shoulder stay centered during arm use.",
      clinicalOutcome:
        "Often contributes to better overhead/reach tolerance and improved pain ratings with daily arm tasks in progressive programs.",
      outpatientRationale: "Foundational outpatient shoulder strengthening item.",
    },
    equipment: ["light band or light weight"],
    tags: ["shoulders", "cuff", "strength"],
    defaultSets: 2,
    defaultReps: "10–15",
  },
  {
    id: "ex-serratus-punch",
    name: "Supine Serratus Punch",
    category: "activation",
    bodyParts: ["scapular", "shoulders", "chest"],
    primaryMuscles: ["serratus anterior"],
    difficulty: "beginner",
    durationSeconds: 100,
    benefits: ["Scapular protraction control", "Supports overhead mechanics"],
    risks: ["Keep neck relaxed; small motion"],
    breathing: "Exhale as you punch toward ceiling.",
    alignment: "Shoulder blade glides around rib cage.",
    posture: "Supine, arm toward ceiling.",
    warmUpNotes: "Scapular clocks.",
    steps: steps([
      {
        instruction:
          "Lie on your back with arm straight toward the ceiling. Keep elbow straight and reach the hand higher by sliding the shoulder blade around the ribs, then lower the scapula.",
        kid: "Keep your arm a tall stick to the sky and gently punch the ceiling by shrugging the shoulder blade around your ribs—not by bending the elbow.",
        reps: 12,
        sets: 2,
      },
    ]),
    variations: vars("ex-serratus-punch", [
      { name: "Wall serratus punch", difficulty: "beginner", description: "Standing at wall.", painMax: 5 },
      { name: "Plus push-up", difficulty: "advanced", description: "On knees or toes when ready.", painMax: 3 },
    ]),
    video: videoForTechnique("serratus", "Serratus / scapular activation technique"),
    evidenceNotes:
      "Serratus training is common when scapular dyskinesis or overhead pain limits function; outcomes include reach endurance and pain scores.",
    clinical: {
      whatItDoes: "Trains the serratus to protract and stabilize the scapula.",
      whyImportant: "Supports smooth overhead and pushing motions.",
      clinicalOutcome:
        "Helps improve overhead activity tolerance and can support better pain ratings with reaching when combined with load management.",
      outpatientRationale: "Key scapular motor-control drill in outpatient shoulder care.",
    },
    equipment: ["mat"],
    tags: ["scapular", "shoulders", "activation", "overhead"],
    defaultSets: 2,
    defaultReps: "10–15",
  },
  {
    id: "ex-cervical-isometrics",
    name: "Cervical Isometrics (Gentle)",
    category: "motor-control",
    bodyParts: ["neck"],
    primaryMuscles: ["deep neck flexors", "cervical extensors", "side flexors"],
    difficulty: "beginner",
    durationSeconds: 100,
    benefits: ["Pain-friendly neck activation", "Early control without large ROM"],
    risks: ["Very light pressure only—about 10–20% effort"],
    breathing: "Breathe continuously; never hold breath.",
    alignment: "Neutral head; jaw unclenched.",
    posture: "Seated tall.",
    warmUpNotes: "Chin tucks light × 5.",
    steps: steps([
      {
        instruction:
          "Place a hand on the forehead and gently push the head into the hand without letting the head move. Repeat on sides and back with light pressure. Hold 5 seconds each.",
        kid: "Make your head a statue. Your hand is a soft pillow—press into the pillow gently without moving your head.",
        reps: 5,
        sets: 2,
        hold: 5,
      },
    ]),
    variations: vars("ex-cervical-isometrics", [
      { name: "Only flexion/extension", difficulty: "beginner", description: "Fewer directions if irritable.", painMax: 5 },
    ]),
    video: videoForTechnique("cervical-iso", "Cervical isometric control technique"),
    evidenceNotes:
      "Low-load cervical isometrics appear in early neck pain care aiming to reduce fear and improve NDI-related function with low symptom provocation.",
    clinical: {
      whatItDoes: "Activates neck muscles without moving the neck through a large range.",
      whyImportant: "Rebuilds confidence and control when motion is irritable.",
      clinicalOutcome:
        "Often used to support lower pain ratings and better tolerance for desk/driving postures as part of multimodal care.",
      outpatientRationale: "Early-phase outpatient cervical motor-control option.",
    },
    equipment: [],
    tags: ["neck", "isometric", "motor-control", "beginner"],
    defaultSets: 2,
    defaultReps: "4–6 directions",
  },
  {
    id: "ex-hip-hinge-dowel",
    name: "Hip Hinge Pattern (Dowel/Broom)",
    category: "motor-control",
    bodyParts: ["hips", "hamstrings", "lower-back", "core"],
    primaryMuscles: ["gluteus maximus", "hamstrings", "erectors (control)"],
    difficulty: "intermediate",
    durationSeconds: 120,
    benefits: ["Safe bending pattern", "Transfers to lifting ADLs"],
    risks: ["Soft knees; stop if lumbar pain sharp"],
    breathing: "Inhale prepare; exhale as you return tall.",
    alignment: "Dowel contact at head, mid-back, and sacrum.",
    posture: "Standing with light dowel along spine.",
    warmUpNotes: "Cat-cow and glute bridges.",
    steps: steps([
      {
        instruction:
          "Hold a broomstick along your back touching head, mid-back, and tailbone. Soften knees and push hips backward as if closing a car door with your hips, then stand tall.",
        kid: "Keep three kisses of the stick on your head, backpack, and tail. Push your hips back like sitting on a high stool, then stand up tall.",
        reps: 10,
        sets: 2,
      },
    ]),
    variations: vars("ex-hip-hinge-dowel", [
      { name: "Hands on hips only", difficulty: "beginner", description: "No dowel—feel hips go back.", painMax: 5 },
      { name: "Light kettlebell deadlift", difficulty: "advanced", description: "Only with excellent form.", painMax: 3 },
    ]),
    video: videoForTechnique("hip-hinge", "Hip hinge motor control — low-back safe form"),
    evidenceNotes:
      "Hip-hinge training is central to lifting education and low-back rehab aiming to improve activity tolerance and reduce pain with bending tasks.",
    clinical: {
      whatItDoes: "Teaches bending through the hips while protecting the spine.",
      whyImportant: "Transfers to safer laundry, lifting, and work tasks.",
      clinicalOutcome:
        "Supports better functional lifting tolerance and often improved pain scores with bending ADLs in progressive programs.",
      outpatientRationale: "Core motor-control progression in outpatient lumbar care.",
    },
    equipment: ["broomstick or dowel"],
    tags: ["hips", "lumbar", "motor-control", "lifting"],
    defaultSets: 2,
    defaultReps: "8–12",
  },
  {
    id: "ex-step-down",
    name: "Lateral or Forward Step-Down",
    category: "functional",
    bodyParts: ["knee", "hips", "quadriceps", "glutes", "ankles"],
    primaryMuscles: ["quadriceps", "gluteus medius"],
    difficulty: "intermediate",
    durationSeconds: 130,
    benefits: ["Single-leg control", "Stair descent capacity"],
    risks: ["Start with low step; use rail"],
    breathing: "Exhale as you control the descent.",
    alignment: "Knee tracks over mid-foot; pelvis level.",
    posture: "Standing on a low step.",
    warmUpNotes: "Sit-to-stands and mini squats.",
    steps: steps([
      {
        instruction:
          "Stand on a low step on one leg. Slowly lower the other heel to lightly tap the floor, keeping the stance knee aligned, then rise.",
        kid: "Stand on a low stair on one foot and slowly lower the free heel to kiss the floor, then stand tall—like a slow elevator.",
        reps: 8,
        sets: 2,
      },
    ]),
    variations: vars("ex-step-down", [
      { name: "Tap only, high surface", difficulty: "beginner", description: "Higher support, smaller motion.", painMax: 5 },
      { name: "Deeper step-down", difficulty: "advanced", description: "Lower step when control is excellent.", painMax: 3 },
    ]),
    video: videoForTechnique("step", "Step-down control technique"),
    evidenceNotes:
      "Step-downs train eccentric single-leg strength relevant to stairs; LEFS/stair items and pain ratings guide progression.",
    clinical: {
      whatItDoes: "Builds controlled single-leg strength for lowering the body.",
      whyImportant: "Directly transfers to going down stairs and curbs.",
      clinicalOutcome:
        "Often improves stair confidence and can reduce pain scores with descent when dosed without flare.",
      outpatientRationale: "High-transfer functional strengthening after basic bilateral work.",
    },
    equipment: ["low step", "optional rail"],
    tags: ["knee", "functional", "stairs", "strength"],
    defaultSets: 2,
    defaultReps: "6–10/side",
  },
  {
    id: "ex-ankle-alphabet-strength",
    name: "Resisted Ankle 4-Way",
    category: "strength",
    bodyParts: ["ankles", "foot", "calves", "shins"],
    primaryMuscles: ["tibialis anterior", "peroneals", "gastroc/soleus", "inverters"],
    difficulty: "intermediate",
    durationSeconds: 120,
    benefits: ["Ankle strength for walking stability", "Post-sprain capacity (when appropriate)"],
    risks: ["Light band; pain-free ranges"],
    breathing: "Exhale on effort.",
    alignment: "Move from ankle, not whole leg thrashing.",
    posture: "Long-sit with band.",
    warmUpNotes: "Ankle circles and alphabet without band.",
    steps: steps([
      {
        instruction:
          "Loop a light band around the foot. Perform slow dorsiflexion, plantarflexion, inversion, and eversion against the band—controlled and pain-free.",
        kid: "Put a light rubber band on your foot and draw slow arrows: up, down, in, and out—like teaching your foot directions.",
        reps: 10,
        sets: 2,
      },
    ]),
    variations: vars("ex-ankle-alphabet-strength", [
      { name: "No band AROM only", difficulty: "beginner", description: "Active range without resistance.", painMax: 6 },
    ]),
    video: videoForTechnique("ankle", "Ankle strengthening technique"),
    evidenceNotes:
      "Multi-plane ankle strengthening is common for stability and return-to-walk goals; outcomes include balance and walking tolerance.",
    clinical: {
      whatItDoes: "Strengthens the ankle in four directions.",
      whyImportant: "Supports stable walking on uneven ground.",
      clinicalOutcome:
        "Helps improve ankle capacity and activity tolerance; pain ratings with walking often guide load.",
      outpatientRationale: "Standard ankle rehab strengthening progression.",
    },
    equipment: ["light band"],
    tags: ["ankles", "strength", "balance", "foot"],
    defaultSets: 2,
    defaultReps: "8–12 each way",
  },
  {
    id: "ex-short-foot",
    name: "Short Foot / Arch Doming",
    category: "motor-control",
    bodyParts: ["foot", "toes", "ankles"],
    primaryMuscles: ["intrinsics of foot", "tibialis posterior (secondary)"],
    difficulty: "beginner",
    durationSeconds: 90,
    benefits: ["Arch control", "Foundation for balance and push-off"],
    risks: ["Do not claw toes hard"],
    breathing: "Quiet breathing.",
    alignment: "Tri-pod foot contact maintained.",
    posture: "Seated then progressed to standing.",
    warmUpNotes: "Toe spreads × 10.",
    steps: steps([
      {
        instruction:
          "Keep toes long and gently draw the ball of the foot toward the heel to lift the arch slightly without curling toes. Hold 5 seconds.",
        kid: "Keep your toes sleepy and make a tiny cave under the middle of your foot—like a mouse house—then relax.",
        reps: 10,
        sets: 2,
        hold: 5,
      },
    ]),
    variations: vars("ex-short-foot", [
      { name: "Standing short foot", difficulty: "intermediate", description: "Same drill in standing.", painMax: 4 },
    ]),
    video: videoForTechnique("foot-intrinsic", "Foot intrinsic control technique"),
    evidenceNotes:
      "Foot intrinsic training is used for arch control and balance; may support better pain and function in some foot conditions when combined with load management.",
    clinical: {
      whatItDoes: "Activates the small muscles that support the arch.",
      whyImportant: "Improves the foot’s base of support for standing and walking.",
      clinicalOutcome:
        "Can support improved balance and walking comfort; pain ratings with standing/walking guide progression.",
      outpatientRationale: "Foot-core motor-control item in outpatient lower-extremity care.",
    },
    equipment: ["chair"],
    tags: ["foot", "motor-control", "balance"],
    defaultSets: 2,
    defaultReps: "8–12 holds",
  },
  {
    id: "ex-wrist-eccentrics",
    name: "Wrist Extensor Eccentrics (Light)",
    category: "strength",
    bodyParts: ["elbow", "forearm", "wrists"],
    primaryMuscles: ["wrist extensors"],
    difficulty: "intermediate",
    durationSeconds: 110,
    benefits: ["Tendon-capacity oriented loading", "Common tennis-elbow pathway item"],
    risks: ["Very light load; pain ≤3–4 during and not worse next day"],
    breathing: "Exhale on slow lower.",
    alignment: "Forearm supported; wrist free.",
    posture: "Seated at table.",
    warmUpNotes: "Wrist circles and gentle stretch.",
    steps: steps([
      {
        instruction:
          "Forearm supported, palm down, light weight in hand. Use the other hand to help lift into wrist extension, then slowly lower the weight with the working hand over 3–4 seconds.",
        kid: "Help the weight go up with both hands, then let the working hand lower it like a slow elevator—no crashing.",
        reps: 10,
        sets: 2,
      },
    ]),
    variations: vars("ex-wrist-eccentrics", [
      { name: "Isometric hold only", difficulty: "beginner", description: "Hold mid-range without motion.", painMax: 5 },
      { name: "Flexor eccentrics", difficulty: "intermediate", description: "Palm-up version for medial elbow region." },
    ]),
    video: videoForTechnique("wrist-load", "Wrist tendon loading technique"),
    evidenceNotes:
      "Progressive tendon loading (including eccentrics/isometrics) is central in many lateral elbow protocols aiming to improve pain-free grip and PRTEE-type scores.",
    clinical: {
      whatItDoes: "Builds wrist extensor tendon capacity with controlled lowering.",
      whyImportant: "Supports gripping and lifting without early flare when dosed well.",
      clinicalOutcome:
        "Associated in clinical pathways with improved pain ratings and better grip-related function over weeks of progressive loading.",
      outpatientRationale: "Evidence-informed outpatient tendinopathy loading option.",
    },
    equipment: ["light dumbbell or can"],
    tags: ["elbow", "tendon", "strength", "forearm"],
    defaultSets: 2,
    defaultReps: "8–12",
  },
  {
    id: "ex-wall-sit",
    name: "Wall Sit (Supported Squat Hold)",
    category: "endurance",
    bodyParts: ["quadriceps", "glutes", "knee", "core"],
    primaryMuscles: ["quadriceps", "gluteus maximus"],
    difficulty: "intermediate",
    durationSeconds: 100,
    benefits: ["Lower-extremity endurance", "Static functional strength"],
    risks: ["Keep knees over mid-foot; shallow angle if irritable"],
    breathing: "Steady breathing against the wall.",
    alignment: "Low back gently toward wall; thighs not beyond comfort.",
    posture: "Back to wall, feet forward.",
    warmUpNotes: "Sit-to-stands × 8.",
    steps: steps([
      {
        instruction:
          "Stand with back to wall. Slide down to a comfortable mini-squat and hold. Rise before form fails.",
        kid: "Make an invisible chair against the wall and hold it—only as low as feels like work, not ouch.",
        sets: 2,
        hold: 20,
        reps: 3,
      },
    ]),
    variations: vars("ex-wall-sit", [
      { name: "High wall sit", difficulty: "beginner", description: "Very shallow bend.", painMax: 5 },
      { name: "Single-leg wall sit", difficulty: "advanced", description: "Only if pain ≤3.", painMax: 3 },
    ]),
    video: videoForTechnique("wall-sit", "Wall sit endurance technique"),
    evidenceNotes:
      "Isometric lower-extremity holds build endurance relevant to standing tolerance; pain and hold-time progressions are monitored.",
    clinical: {
      whatItDoes: "Builds thigh and hip endurance in a supported squat position.",
      whyImportant: "Transfers to prolonged standing and partial squat tasks.",
      clinicalOutcome:
        "Can improve standing/activity tolerance and support better pain scores with sustained lower-extremity demand when progressed carefully.",
      outpatientRationale: "Simple outpatient endurance progression after basic strength is established.",
    },
    equipment: ["wall"],
    tags: ["quads", "endurance", "functional", "knee"],
    defaultSets: 2,
    defaultReps: "3×15–30s",
  },
  {
    id: "ex-adductor-ball-squeeze",
    name: "Supine Ball/Pillow Adductor Squeeze",
    category: "activation",
    bodyParts: ["groin", "hips", "pelvis", "core"],
    primaryMuscles: ["adductors"],
    difficulty: "beginner",
    durationSeconds: 90,
    benefits: ["Inner-thigh activation", "Pelvic control accessory"],
    risks: ["Mild squeeze only if groin is irritable"],
    breathing: "Exhale on squeeze.",
    alignment: "Neutral pelvis; ribs quiet.",
    posture: "Supine knees bent, pillow between knees.",
    warmUpNotes: "Gentle butterfly without force.",
    steps: steps([
      {
        instruction:
          "Lie on your back with knees bent and a pillow between the knees. Gently squeeze the pillow, hold 5 seconds, relax.",
        kid: "Give the pillow a soft hug with your knees—like squeezing a marshmallow, not crushing a rock.",
        reps: 10,
        sets: 2,
        hold: 5,
      },
    ]),
    variations: vars("ex-adductor-ball-squeeze", [
      { name: "Seated squeeze", difficulty: "beginner", description: "Chair version.", painMax: 5 },
      { name: "Copenhagen prep (short)", difficulty: "advanced", description: "Only under guidance.", painMax: 3 },
    ]),
    video: videoForTechnique("adductor", "Adductor activation technique"),
    evidenceNotes:
      "Adductor activation/strength is used in groin and pelvic control programs; progressive loading relates to return-to-activity and pain ratings.",
    clinical: {
      whatItDoes: "Activates the inner-thigh adductors isometrically.",
      whyImportant: "Supports pelvic stability and change-of-direction readiness.",
      clinicalOutcome:
        "Helps rebuild capacity for side-to-side tasks; pain scores with squeeze/activity guide dosing.",
      outpatientRationale: "Early groin-region activation option in outpatient care.",
    },
    equipment: ["pillow or soft ball", "mat"],
    tags: ["groin", "activation", "pelvis"],
    defaultSets: 2,
    defaultReps: "8–12 holds",
  },
];
