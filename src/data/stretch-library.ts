import type {
  BodyPart,
  Difficulty,
  DurationBucket,
  Stretch,
  StretchStep,
  StretchVariation,
} from "@/lib/types";
import { ADDITIONAL_STRETCH_SEEDS } from "@/data/stretch-clinical-expansion";
import { BULK_STRETCH_SEEDS } from "@/data/stretch-clinical-bulk";
import { functionalOutcomeNarrative } from "@/data/stretch-outcomes";
import { videoForRegion } from "@/data/video-catalog";

/** Virtual stretch catalog capacity: clinician bases × dosing/context modifiers */
export const STRETCH_CATALOG_CAPACITY = 250_000;

function bucket(seconds: number): DurationBucket {
  if (seconds < 60) return "under-1-min";
  if (seconds < 120) return "1-2-min";
  if (seconds < 300) return "2-5-min";
  return "5-plus-min";
}

function steps(
  items: Array<{
    instruction: string;
    kid: string;
    hold?: number;
    breaths?: number;
    cues?: string[];
  }>
): StretchStep[] {
  return items.map((item, i) => ({
    order: i + 1,
    instruction: item.instruction,
    kidFriendly: item.kid,
    holdSeconds: item.hold,
    breaths: item.breaths,
    cues: item.cues ?? ["Move slow", "Breathe easy", "Stop if sharp pain"],
  }));
}

function vars(
  baseId: string,
  entries: Array<{
    name: string;
    difficulty: Difficulty;
    description: string;
    modifications?: string[];
    contraindications?: string[];
    painMax?: number;
  }>
): StretchVariation[] {
  return entries.map((e, i) => ({
    id: `${baseId}-var-${i + 1}`,
    name: e.name,
    difficulty: e.difficulty,
    description: e.description,
    modifications: e.modifications ?? [],
    contraindications: e.contraindications ?? [
      "Acute fracture or recent surgery without clearance",
      "Unexplained neurological symptoms",
    ],
    painMaxRecommended: e.painMax ?? 4,
  }));
}

type Seed = Omit<Stretch, "durationBucket" | "slug" | "kind" | "clinical"> & {
  slug?: string;
};

const SEEDS: Seed[] = [
  {
    id: "chin-tuck",
    name: "Chin Tuck (Cervical Retraction)",
    bodyParts: ["neck"],
    primaryMuscles: ["deep neck flexors", "suboccipitals"],
    difficulty: "beginner",
    durationSeconds: 90,
    benefits: [
      "Improves forward-head posture awareness",
      "Gentle activation of deep neck flexors",
      "Often used in outpatient cervical programs",
    ],
    risks: ["May aggravate acute disc irritation if forced"],
    breathing: "Inhale to prepare, exhale as you gently draw the chin back.",
    alignment: "Ears stack over shoulders; avoid tipping chin up or down.",
    posture: "Sit or stand tall as if a string lifts the crown of your head.",
    warmUpNotes: "Do 5 gentle head nods first if very stiff.",
    steps: steps([
      {
        instruction:
          "Sit tall. Slide your chin straight back as if making a double chin, keeping eyes level.",
        kid: "Make a tiny double chin like a shy turtle pulling its head into its shell—slow and gentle.",
        hold: 5,
        breaths: 2,
        cues: ["Eyes look forward", "Soft shoulders", "No force"],
      },
      {
        instruction: "Hold 3–5 seconds, then relax halfway forward. Repeat 8–10 times.",
        kid: "Hold while you count “one-banana, two-banana,” then let go a little.",
        hold: 5,
      },
    ]),
    variations: vars("chin-tuck", [
      {
        name: "Supine chin tuck",
        difficulty: "beginner",
        description: "Lie on your back with a small towel under the neck for support.",
        painMax: 5,
      },
      {
        name: "Wall chin tuck",
        difficulty: "beginner",
        description: "Stand with back to wall; slide head back to lightly touch wall.",
      },
      {
        name: "Band-resisted chin tuck",
        difficulty: "advanced",
        description: "Light band behind head for gentle resistance—only if pain-free.",
        painMax: 3,
      },
    ]),
    video: videoForRegion("neck", "Neck posture and chin tuck education"),
    evidenceNotes:
      "Cervical retraction is commonly used in clinic for posture-related neck discomfort and deep neck flexor re-education.",
    equipment: ["optional towel", "optional light band"],
    tags: ["posture", "desk", "cervical"],
  },
  {
    id: "upper-trap-stretch",
    name: "Upper Trapezius Stretch",
    bodyParts: ["neck", "shoulders"],
    primaryMuscles: ["upper trapezius", "levator scapulae (secondary)"],
    difficulty: "beginner",
    durationSeconds: 120,
    benefits: ["Reduces lateral neck tightness", "Helpful after screen time"],
    risks: ["Avoid if cervical instability or acute radiculopathy without guidance"],
    breathing: "Slow nasal inhale; longer exhale as the stretch eases in.",
    alignment: "Keep nose facing forward; do not rotate aggressively.",
    posture: "Sit on one hand to anchor the shoulder down.",
    warmUpNotes: "Shoulder rolls × 10 each direction first.",
    steps: steps([
      {
        instruction:
          "Sit tall. Gently tilt your ear toward the same-side shoulder until a mild stretch is felt on the opposite side of the neck.",
        kid: "Pretend your ear wants to whisper a secret to your shoulder—slow tilt, no yank.",
        hold: 30,
        breaths: 4,
      },
      {
        instruction: "Optionally rest the same-side hand on the head for a feather-light assist. Never pull hard.",
        kid: "Your hand is a butterfly landing on your head—not a heavy backpack.",
        hold: 20,
      },
    ]),
    variations: vars("upper-trap-stretch", [
      {
        name: "Seated anchor stretch",
        difficulty: "beginner",
        description: "Sit on the opposite hand to keep the shoulder down.",
      },
      {
        name: "Doorway lean variation",
        difficulty: "intermediate",
        description: "Light contralateral lean of the torso for more side-bend.",
        painMax: 3,
      },
    ]),
    video: videoForRegion("neck", "Neck and shoulder stretch education"),
    evidenceNotes:
      "Static upper trap stretching is a common self-management drill; dosing is short holds with low intensity.",
    equipment: [],
    tags: ["desk", "stress", "neck"],
  },
  {
    id: "levator-scapulae-stretch",
    name: "Levator Scapulae Stretch",
    bodyParts: ["neck", "shoulders", "upper-back"],
    primaryMuscles: ["levator scapulae"],
    difficulty: "beginner",
    durationSeconds: 100,
    benefits: ["Targets corner-of-neck tightness", "Pairs well with chin tucks"],
    risks: ["Stop if arm pain or numbness increases"],
    breathing: "Exhale into the stretch; avoid breath-holding.",
    alignment: "Nose toward armpit direction; gentle only.",
    posture: "Shoulder of the stretch side stays down.",
    warmUpNotes: "Gentle neck circles within pain-free range.",
    steps: steps([
      {
        instruction:
          "Turn your head ~45° toward the side you will stretch, then look down toward your armpit until a mild pull is felt from neck to shoulder blade.",
        kid: "Look toward your pocket on one side, then nod “yes” a tiny bit until the neck feels a gentle stretch.",
        hold: 30,
        breaths: 4,
      },
    ]),
    variations: vars("levator-scapulae-stretch", [
      {
        name: "Seated with arm reach back",
        difficulty: "intermediate",
        description: "Reach the stretch-side arm down and slightly behind the hip.",
      },
      {
        name: "Supine supported",
        difficulty: "beginner",
        description: "Perform with head supported on pillow for sensitive necks.",
        painMax: 5,
      },
    ]),
    video: videoForRegion("neck", "Cervical stretch technique"),
    evidenceNotes:
      "Often prescribed for desk-related upper quarter tightness in outpatient PT.",
    equipment: ["optional pillow"],
    tags: ["desk", "upper-quarter"],
  },
  {
    id: "doorway-chest-stretch",
    name: "Doorway Pectoral Stretch",
    bodyParts: ["chest", "shoulders"],
    primaryMuscles: ["pectoralis major", "pectoralis minor"],
    difficulty: "beginner",
    durationSeconds: 120,
    benefits: ["Opens anterior chest", "Counters rounded-shoulder posture"],
    risks: ["Avoid aggressive stretch after shoulder surgery without clearance"],
    breathing: "Inhale expand ribs; exhale soften into the opening.",
    alignment: "Elbows slightly below shoulder height for general pec stretch.",
    posture: "Ribs stacked over pelvis; do not arch low back hard.",
    warmUpNotes: "Arm circles and scapular squeezes first.",
    steps: steps([
      {
        instruction:
          "Place forearms on door frame, step one foot through, and gently lean until a mild stretch is felt across the chest.",
        kid: "Make a goal-post with your arms on the doorway, then take a tiny step forward like a superhero opening their chest to the sun.",
        hold: 30,
        breaths: 5,
      },
    ]),
    variations: vars("doorway-chest-stretch", [
      {
        name: "Single-arm doorway",
        difficulty: "beginner",
        description: "Stretch one side at a time for more control.",
      },
      {
        name: "High elbow (upper fibers emphasis)",
        difficulty: "intermediate",
        description: "Elbows higher to bias upper chest.",
        painMax: 3,
      },
      {
        name: "Foam roller thoracic opener",
        difficulty: "intermediate",
        description: "Supine with arms in cactus on foam roller (if available).",
      },
    ]),
    video: videoForRegion("chest", "Chest and posture mobility education"),
    evidenceNotes:
      "Anterior chest stretching is frequently combined with thoracic extension in postural programs.",
    equipment: ["doorway"],
    tags: ["posture", "desk", "shoulders"],
  },
  {
    id: "thread-the-needle",
    name: "Thread the Needle",
    bodyParts: ["upper-back", "thoracic", "shoulders"],
    primaryMuscles: ["thoracic rotators", "posterior shoulder"],
    difficulty: "intermediate",
    durationSeconds: 150,
    benefits: ["Thoracic rotation mobility", "Gentle mid-back release"],
    risks: ["Modify if wrist weight-bearing is painful"],
    breathing: "Exhale as you thread the arm under; inhale as you open.",
    alignment: "Hips stay roughly level; rotation comes from mid-back.",
    posture: "Start in quadruped with neutral spine.",
    warmUpNotes: "Cat-cow × 8 first.",
    steps: steps([
      {
        instruction:
          "From hands and knees, slide one arm under the other, lowering the shoulder and side of the head toward the floor.",
        kid: "Pretend you are sliding one arm under a low fence to grab a toy—slow and smooth.",
        hold: 20,
        breaths: 3,
      },
      {
        instruction: "Optionally open the same arm toward the ceiling for a rotation pair, then repeat.",
        kid: "Then open that arm to show the sky your palm.",
        hold: 10,
      },
    ]),
    variations: vars("thread-the-needle", [
      {
        name: "Seated chair rotation",
        difficulty: "beginner",
        description: "No floor: rotate gently while sitting, hands across chest.",
        painMax: 5,
      },
      {
        name: "Side-lying open book",
        difficulty: "beginner",
        description: "Lie on side with knees bent; open top arm like a book.",
      },
      {
        name: "Deep loaded thread",
        difficulty: "advanced",
        description: "Longer hold with reach emphasis—only if pain ≤ 3.",
        painMax: 3,
      },
    ]),
    video: videoForRegion("thoracic", "Thoracic mobility education"),
    evidenceNotes:
      "Thoracic rotation drills are standard in outpatient care for stiff mid-back and rib mobility.",
    equipment: ["mat"],
    tags: ["thoracic", "rotation", "desk"],
  },
  {
    id: "cat-cow",
    name: "Cat-Cow Mobility",
    bodyParts: ["lower-back", "upper-back", "core"],
    primaryMuscles: ["erector spinae", "abdominals", "multifidus (control)"],
    difficulty: "beginner",
    durationSeconds: 90,
    benefits: ["Spinal segmental mobility", "Gentle warm-up for nearly all routines"],
    risks: ["Keep range pain-free; avoid end-range forcing with acute disc flare"],
    breathing: "Inhale on cow (extend); exhale on cat (flex).",
    alignment: "Move one vertebra at a time; neck follows gently.",
    posture: "Wrists under shoulders, knees under hips.",
    warmUpNotes: "Ideal as the first drill of most sessions.",
    steps: steps([
      {
        instruction:
          "Inhale, let the belly drop slightly and lift the chest (cow). Exhale, round the spine toward the ceiling (cat).",
        kid: "Be a happy cow looking up, then a Halloween cat arching its back—slow like syrup.",
        breaths: 1,
      },
      {
        instruction: "Flow for 8–12 slow cycles within a comfortable range.",
        kid: "Count 10 slow cow-cat waves.",
      },
    ]),
    variations: vars("cat-cow", [
      {
        name: "Seated cat-cow",
        difficulty: "beginner",
        description: "Hands on knees in a chair—great for office or high pain days.",
        painMax: 6,
      },
      {
        name: "Hands elevated (countertop)",
        difficulty: "beginner",
        description: "Reduce wrist load by placing hands on a counter.",
      },
    ]),
    video: videoForRegion("lowerBack", "Gentle spinal mobility"),
    evidenceNotes:
      "Repeated flexion-extension in comfortable range is a staple warm-up and motor control primer.",
    equipment: ["mat or chair"],
    tags: ["warmup", "spine", "mobility"],
  },
  {
    id: "childs-pose",
    name: "Child’s Pose (Supported)",
    bodyParts: ["lower-back", "hips", "shoulders"],
    primaryMuscles: ["latissimus dorsi", "glutes", "spinal extensors (stretch)"],
    difficulty: "beginner",
    durationSeconds: 120,
    benefits: ["Calming flexion-based recovery position", "Hip and back ease"],
    risks: ["Avoid deep knee flexion if contraindicated; use props"],
    breathing: "Long exhales; feel ribs expand into the back body.",
    alignment: "Hips toward heels as comfortable; neck relaxed.",
    posture: "Wide knees if belly or pregnancy needs space (with provider OK).",
    warmUpNotes: "Use after more active mobility or as cool-down.",
    steps: steps([
      {
        instruction:
          "From kneeling, sit hips back toward heels and reach arms forward, forehead resting on stacked hands or a pillow.",
        kid: "Make yourself into a little rock resting on the ground, arms stretched like a sleepy superhero.",
        hold: 45,
        breaths: 6,
      },
    ]),
    variations: vars("childs-pose", [
      {
        name: "Narrow knee child’s pose",
        difficulty: "beginner",
        description: "Knees together for more back body stretch.",
      },
      {
        name: "Bolster-supported",
        difficulty: "beginner",
        description: "Pillow under torso or forehead for sensitive backs.",
        painMax: 6,
      },
      {
        name: "Side-reach child’s pose",
        difficulty: "intermediate",
        description: "Walk hands to one side to bias lat stretch.",
      },
    ]),
    video: videoForRegion("lowerBack", "Restorative back positions"),
    evidenceNotes:
      "Supported flexion postures are used for comfort and down-regulation; not ideal for every pathology—pain guide applies.",
    equipment: ["mat", "optional pillows"],
    tags: ["cooldown", "relaxation", "hips"],
  },
  {
    id: "knee-to-chest",
    name: "Single Knee-to-Chest",
    bodyParts: ["lower-back", "glutes", "hips"],
    primaryMuscles: ["gluteus maximus", "lumbar paraspinals"],
    difficulty: "beginner",
    durationSeconds: 100,
    benefits: ["Gentle lumbar flexion mobility", "Often soothing for stiffness"],
    risks: ["Stop if leg pain worsens significantly down the limb"],
    breathing: "Exhale as you draw the knee in.",
    alignment: "Opposite leg relaxed; head and shoulders heavy on floor.",
    posture: "Supine; neutral neck.",
    warmUpNotes: "Pelvic tilts × 10 first if very stiff.",
    steps: steps([
      {
        instruction:
          "Lie on your back. Hug one knee toward the chest until a mild stretch is felt in the low back or glute.",
        kid: "Give one knee a gentle hug like it’s your favorite stuffed animal.",
        hold: 30,
        breaths: 4,
      },
    ]),
    variations: vars("knee-to-chest", [
      {
        name: "Double knee-to-chest",
        difficulty: "beginner",
        description: "Both knees hugged if comfortable.",
        painMax: 4,
      },
      {
        name: "Seated knee hug",
        difficulty: "beginner",
        description: "Chair version for those avoiding floor work.",
        painMax: 5,
      },
    ]),
    video: videoForRegion("lowerBack", "Low back mobility basics"),
    evidenceNotes:
      "Supine flexion drills are common early-phase options when extension is irritable—individualize with pain scale.",
    equipment: ["mat"],
    tags: ["lumbar", "morning-stiffness"],
  },
  {
    id: "figure-four-glute",
    name: "Figure-Four Glute Stretch",
    bodyParts: ["glutes", "hips", "lower-back"],
    primaryMuscles: ["gluteus maximus", "piriformis (region)"],
    difficulty: "beginner",
    durationSeconds: 120,
    benefits: ["Hip external rotation mobility", "Common for buttock tightness"],
    risks: ["Avoid aggressive pull with acute hip pathology"],
    breathing: "Slow breaths; soften the hip on each exhale.",
    alignment: "Ankle stays flexed; keep low back relatively quiet.",
    posture: "Supine preferred for control.",
    warmUpNotes: "Gentle hip circles or marches first.",
    steps: steps([
      {
        instruction:
          "Lie on back, cross ankle over opposite knee. Reach through to hug the uncrossed thigh toward you until a glute stretch is felt.",
        kid: "Make a number 4 with your legs, then hug the bottom leg like a pizza box closing slowly.",
        hold: 30,
        breaths: 5,
      },
    ]),
    variations: vars("figure-four-glute", [
      {
        name: "Seated figure-four",
        difficulty: "beginner",
        description: "Sit tall, ankle on opposite knee, hinge forward slightly.",
      },
      {
        name: "Wall-supported figure-four",
        difficulty: "beginner",
        description: "Feet on wall for easier arm reach.",
        painMax: 5,
      },
      {
        name: "Pigeon prep (elevated)",
        difficulty: "advanced",
        description: "Front shin on bench—only if hips tolerate load.",
        painMax: 3,
      },
    ]),
    video: videoForRegion("hip", "Hip and glute flexibility education"),
    evidenceNotes:
      "Figure-four variations are clinic staples for posterior hip mobility with clear regression options.",
    equipment: ["mat", "optional wall"],
    tags: ["glutes", "sitting", "hips"],
  },
  {
    id: "half-kneeling-hip-flexor",
    name: "Half-Kneeling Hip Flexor Stretch",
    bodyParts: ["hips", "quadriceps", "lower-back"],
    primaryMuscles: ["iliopsoas", "rectus femoris"],
    difficulty: "intermediate",
    durationSeconds: 130,
    benefits: ["Counters prolonged sitting", "Improves hip extension mobility"],
    risks: ["Pad the knee; avoid lumbar over-arch"],
    breathing: "Exhale and gently posteriorly tilt the pelvis.",
    alignment: "Tuck tail slightly; tall ribs over pelvis.",
    posture: "Rear knee down, front foot planted.",
    warmUpNotes: "Marching in place × 20 steps.",
    steps: steps([
      {
        instruction:
          "In half-kneeling, gently tuck the pelvis under and shift weight forward until a stretch is felt in the front of the rear hip.",
        kid: "Be a knight on one knee, then tuck your belt buckle toward your nose and lean forward a tiny bit.",
        hold: 30,
        breaths: 5,
        cues: ["No big back bend", "Soft front knee", "Tall crown"],
      },
    ]),
    variations: vars("half-kneeling-hip-flexor", [
      {
        name: "Standing lunge stretch",
        difficulty: "beginner",
        description: "No kneeling—rear heel lifted, pelvis tucked.",
        painMax: 5,
      },
      {
        name: "Couch stretch (advanced)",
        difficulty: "advanced",
        description: "Rear foot elevated—high intensity, short holds.",
        painMax: 3,
        contraindications: ["Recent knee injury without clearance"],
      },
      {
        name: "Supine edge-of-bed hip flexor",
        difficulty: "beginner",
        description: "Thomas-test position with support—very controllable.",
      },
    ]),
    video: videoForRegion("hip", "Hip flexor mobility education"),
    evidenceNotes:
      "Hip flexor mobility with pelvic control is a core outpatient cue for anterior hip tightness from sitting.",
    equipment: ["pad or mat"],
    tags: ["desk", "running", "hips"],
  },
  {
    id: "supine-hamstring-strap",
    name: "Supine Hamstring Stretch (Strap)",
    bodyParts: ["hamstrings", "lower-back", "calves"],
    primaryMuscles: ["hamstrings", "gastrocnemius (if ankle flexed)"],
    difficulty: "beginner",
    durationSeconds: 140,
    benefits: ["Safe long-lever hamstring mobility", "Easy to dose intensity"],
    risks: ["Keep opposite leg relaxed; avoid sciatic aggravation"],
    breathing: "Exhale as you straighten the knee slightly more.",
    alignment: "Neutral low back; do not force knee lock if neural symptoms appear.",
    posture: "Supine; strap around ball of foot.",
    warmUpNotes: "Gentle knee hugs and ankle pumps.",
    steps: steps([
      {
        instruction:
          "Loop a strap around one foot. Keep hips down and gently straighten the knee toward the ceiling until a mild stretch is felt in the back of the thigh.",
        kid: "Use a towel like a lasso on your foot and lift the leg like a slow drawbridge—only until it feels like a gentle rubber-band stretch.",
        hold: 30,
        breaths: 5,
      },
    ]),
    variations: vars("supine-hamstring-strap", [
      {
        name: "Doorway hamstring stretch",
        difficulty: "beginner",
        description: "Heel on doorframe; scoot closer/farther to dose.",
      },
      {
        name: "Seated forward fold (long sit)",
        difficulty: "intermediate",
        description: "Sit tall then hinge—avoid rounding aggressively.",
        painMax: 3,
      },
      {
        name: "Contract-relax PNF style",
        difficulty: "advanced",
        description: "Gentle 5-sec push into strap, then ease further—clinic technique.",
        painMax: 3,
      },
    ]),
    video: videoForRegion("hamstring", "Hamstring flexibility education"),
    evidenceNotes:
      "Supine strap stretching allows gravity-reduced, measurable dosing commonly used in PT home programs.",
    equipment: ["strap or towel"],
    tags: ["hamstrings", "neural-sensitive-modify"],
  },
  {
    id: "quad-standing",
    name: "Standing Quadriceps Stretch",
    bodyParts: ["quadriceps", "hips"],
    primaryMuscles: ["quadriceps", "hip flexors"],
    difficulty: "beginner",
    durationSeconds: 100,
    benefits: ["Front-thigh flexibility", "Useful for walkers and runners"],
    risks: ["Hold a wall for balance; avoid twisting the knee"],
    breathing: "Steady breaths; stand tall.",
    alignment: "Knees close; pelvis gently tucked.",
    posture: "Stand on one leg with support.",
    warmUpNotes: "Easy marching 30 seconds.",
    steps: steps([
      {
        instruction:
          "Hold a wall. Bend one knee and hold the ankle, bringing heel toward buttock until a stretch is felt in the front thigh.",
        kid: "Stand like a flamingo with a helper wall, and bring your heel toward your back pocket gently.",
        hold: 30,
        breaths: 4,
      },
    ]),
    variations: vars("quad-standing", [
      {
        name: "Side-lying quad stretch",
        difficulty: "beginner",
        description: "More stable; great for balance challenges.",
        painMax: 5,
      },
      {
        name: "Prone quad with strap",
        difficulty: "intermediate",
        description: "Lie face down; strap pulls ankle toward hip.",
      },
    ]),
    video: videoForRegion("hip", "Quadriceps stretch education"),
    evidenceNotes:
      "Standing and side-lying quad stretches are standard HEP items with balance safety cues.",
    equipment: ["wall"],
    tags: ["running", "quads"],
  },
  {
    id: "gastroc-wall",
    name: "Wall Gastrocnemius Stretch",
    bodyParts: ["calves", "ankles"],
    primaryMuscles: ["gastrocnemius"],
    difficulty: "beginner",
    durationSeconds: 100,
    benefits: ["Ankle dorsiflexion mobility", "Helps walking and squat depth prep"],
    risks: ["Keep heel down; avoid aggressive bounce"],
    breathing: "Exhale as heel presses gently down.",
    alignment: "Back knee straight for gastroc bias.",
    posture: "Hands on wall in staggered stance.",
    warmUpNotes: "Ankle circles × 10 each way.",
    steps: steps([
      {
        instruction:
          "Stagger stance, back knee straight, heel glued down. Lean into the wall until a stretch is felt in the upper calf.",
        kid: "Make a superhero stance at the wall. Keep the back heel sticky like peanut butter and lean in slowly.",
        hold: 30,
        breaths: 4,
      },
    ]),
    variations: vars("gastroc-wall", [
      {
        name: "Soleus wall stretch",
        difficulty: "beginner",
        description: "Bend the back knee slightly to bias deeper calf.",
      },
      {
        name: "Step stretch",
        difficulty: "intermediate",
        description: "Ball of foot on step, heel drops gently.",
        painMax: 3,
      },
    ]),
    video: videoForRegion("calf", "Calf and ankle mobility"),
    evidenceNotes:
      "Differentiating gastroc vs soleus stretching is a classic PT teaching point for ankle mobility.",
    equipment: ["wall", "optional step"],
    tags: ["calves", "walking", "ankles"],
  },
  {
    id: "ankle-alphabet",
    name: "Ankle Alphabet Mobility",
    bodyParts: ["ankles"],
    primaryMuscles: ["ankle dorsiflexors", "plantarflexors", "invertors/evertors"],
    difficulty: "beginner",
    durationSeconds: 90,
    benefits: ["Active range for stiff ankles", "Low load warm-up"],
    risks: ["Stay pain-free; reduce size of letters if irritable"],
    breathing: "Natural breathing throughout.",
    alignment: "Move from the ankle, not the whole leg thrashing.",
    posture: "Seated or long-sitting.",
    warmUpNotes: "Pump ankles up/down 10 times first.",
    steps: steps([
      {
        instruction:
          "Draw the alphabet in the air with your big toe, making letters as large as comfortable.",
        kid: "Write the ABCs with your toes like invisible sky writing—big letters if it feels good, tiny if not.",
      },
    ]),
    variations: vars("ankle-alphabet", [
      {
        name: "Ankle circles only",
        difficulty: "beginner",
        description: "Simpler for high pain or early recovery.",
        painMax: 6,
      },
      {
        name: "Resistance-band alphabet",
        difficulty: "advanced",
        description: "Light band for strength-mobility combo.",
        painMax: 3,
      },
    ]),
    video: videoForRegion("ankle", "Ankle mobility education"),
    evidenceNotes:
      "Active ankle ROM is frequently prescribed post-sprain (when appropriate) and for general stiffness.",
    equipment: ["optional band"],
    tags: ["ankles", "warmup", "active-mobility"],
  },
  {
    id: "wrist-flexor-extensor",
    name: "Wrist Flexor & Extensor Stretch",
    bodyParts: ["wrists"],
    primaryMuscles: ["wrist flexors", "wrist extensors"],
    difficulty: "beginner",
    durationSeconds: 90,
    benefits: ["Desk and typing counter-mobility", "Gentle forearm length"],
    risks: ["Avoid if acute tendon rupture suspicion"],
    breathing: "Ease in on exhale.",
    alignment: "Elbow straight for stronger stretch; bend elbow to ease.",
    posture: "Seated or standing, arm forward.",
    warmUpNotes: "Fist open-close × 15.",
    steps: steps([
      {
        instruction:
          "Arm forward, palm up. With other hand, gently bend wrist down (flexor stretch). Then palm down and bend wrist down (extensor stretch).",
        kid: "Make a stop sign hand, then use your other hand to gently tip it like a teapot—both ways.",
        hold: 20,
        breaths: 3,
      },
    ]),
    variations: vars("wrist-flexor-extensor", [
      {
        name: "Prayer stretch",
        difficulty: "beginner",
        description: "Palms together at chest, lower hands keeping contact.",
      },
      {
        name: "Table edge stretch",
        difficulty: "intermediate",
        description: "Fingers on table, gentle lean—dose carefully.",
        painMax: 3,
      },
    ]),
    video: videoForRegion("full", "Upper extremity mobility basics"),
    evidenceNotes:
      "Short-duration wrist stretching is common for office-related forearm complaints alongside load management.",
    equipment: [],
    tags: ["desk", "wrists", "typing"],
  },
  {
    id: "worlds-greatest-stretch",
    name: "World’s Greatest Stretch (Modified)",
    bodyParts: ["full-body", "hips", "thoracic", "hamstrings"],
    primaryMuscles: ["hip flexors", "hamstrings", "thoracic rotators", "calves"],
    difficulty: "intermediate",
    durationSeconds: 180,
    benefits: ["Integrated warm-up flow used widely in sports PT"],
    risks: ["Break into pieces if balance or pain is high"],
    breathing: "Exhale into rotation; never force.",
    alignment: "Front knee tracks over mid-foot; rear heel can lift.",
    posture: "Long lunge with hand support as needed.",
    warmUpNotes: "Start with cat-cow and hip flexor alone if new.",
    steps: steps([
      {
        instruction:
          "Step into a lunge, place both hands inside the front foot, then rotate the same-side arm toward the ceiling. Optionally straighten the front leg for a hamstring bias.",
        kid: "Lunge like a superhero landing, plant your hands, then open one arm to high-five the sky. Stand the front leg if you want a gentle rubber-band feel in the back of the thigh.",
        hold: 15,
        breaths: 3,
      },
    ]),
    variations: vars("worlds-greatest-stretch", [
      {
        name: "Hands-on-box version",
        difficulty: "beginner",
        description: "Elevate hands on a chair for less load.",
        painMax: 5,
      },
      {
        name: "Full athletic flow",
        difficulty: "advanced",
        description: "Add elbow to instep and longer holds.",
        painMax: 3,
      },
    ]),
    video: videoForRegion("full", "Dynamic mobility flow education"),
    evidenceNotes:
      "Multi-planar dynamic mobility sequences are common pre-activity in sports and outpatient performance PT.",
    equipment: ["optional chair"],
    tags: ["warmup", "athletic", "full-body"],
  },
  {
    id: "pelvic-tilt",
    name: "Supine Pelvic Tilt",
    bodyParts: ["lower-back", "core"],
    primaryMuscles: ["transverse abdominis", "multifidus", "rectus abdominis"],
    difficulty: "beginner",
    durationSeconds: 90,
    benefits: ["Motor control primer", "Teaches neutral vs flat back awareness"],
    risks: ["Gentle only; not a crunch competition"],
    breathing: "Exhale as you flatten low back lightly into the mat.",
    alignment: "Ribs stay quiet; small motion.",
    posture: "Knees bent, feet flat.",
    warmUpNotes: "Diaphragmatic breathing × 5 first.",
    steps: steps([
      {
        instruction:
          "Gently rock the pelvis to flatten the low back into the floor, then release to a neutral soft curve. Small and smooth.",
        kid: "Imagine your low back is a banana gently pressing a blueberry into the floor, then letting it puff back up.",
        hold: 5,
        breaths: 2,
      },
    ]),
    variations: vars("pelvic-tilt", [
      {
        name: "Hooklying marches (after tilts)",
        difficulty: "intermediate",
        description: "Maintain light control while marching feet.",
        painMax: 3,
      },
      {
        name: "Seated pelvic clocks",
        difficulty: "beginner",
        description: "Chair version for awareness training.",
        painMax: 5,
      },
    ]),
    video: videoForRegion("lowerBack", "Core control and pelvic motion"),
    evidenceNotes:
      "Pelvic control drills are foundational in lumbar stabilization progressions in outpatient PT.",
    equipment: ["mat"],
    tags: ["core", "motor-control", "lumbar"],
  },
  {
    id: "seated-neural-slider",
    name: "Seated Sciatic Nerve Slider (Gentle)",
    bodyParts: ["hamstrings", "lower-back", "calves"],
    primaryMuscles: ["neural mobility (sciatic distribution)", "hamstrings"],
    difficulty: "intermediate",
    durationSeconds: 100,
    benefits: ["Gentle neurodynamics when appropriate", "Less aggressive than tensioners"],
    risks: [
      "Stop if symptoms strongly peripheralize",
      "Not for undiagnosed progressive neuro deficits",
    ],
    breathing: "Smooth continuous breathing; no forcing end range.",
    alignment: "Sit tall; motion is coordinated, not stretched hard.",
    posture: "Perch on chair edge with good posture.",
    warmUpNotes: "Only use when symptoms are stable and mild; regress if irritable.",
    steps: steps([
      {
        instruction:
          "Sit tall. As you extend one knee, look slightly up and flex the ankle gently; as you bend the knee, nod the chin slightly. Glide, don’t yank.",
        kid: "Pretend your leg is a trombone slide and your head nods yes/no in a tiny dance—smooth music, not yanking.",
      },
    ]),
    variations: vars("seated-neural-slider", [
      {
        name: "Supine strap slider",
        difficulty: "beginner",
        description: "More support; smaller ranges.",
        painMax: 4,
      },
      {
        name: "Omit if irritable",
        difficulty: "beginner",
        description: "Replace with hamstring strap stretch only.",
        painMax: 6,
      },
    ]),
    video: videoForRegion("hamstring", "Nerve mobility education (professional)"),
    evidenceNotes:
      "Neural sliders are used selectively in PT; intensity must stay non-aggravating. This app defaults to gentle dosing.",
    equipment: ["chair"],
    tags: ["neural", "advanced-caution"],
  },
  {
    id: "open-book-thoracic",
    name: "Side-Lying Open Book",
    bodyParts: ["thoracic", "upper-back", "chest"],
    primaryMuscles: ["thoracic rotators", "pectorals", "rhomboids"],
    difficulty: "beginner",
    durationSeconds: 120,
    benefits: ["Comfortable thoracic rotation", "Great evening mobility"],
    risks: ["Keep knees stacked; stop if shoulder pain sharp"],
    breathing: "Inhale to prepare; exhale as top arm opens.",
    alignment: "Knees and hips flexed ~45–90°; head supported.",
    posture: "Side-lying with pillow under head.",
    warmUpNotes: "Shoulder blade squeezes × 10.",
    steps: steps([
      {
        instruction:
          "Lie on your side with knees bent. Reach top arm open toward the floor behind you, following with your eyes, while knees stay stacked.",
        kid: "You are a book opening. Keep your knees like a closed sandwich and let your top arm open the page to the floor.",
        hold: 20,
        breaths: 4,
      },
    ]),
    variations: vars("open-book-thoracic", [
      {
        name: "Hand-supported open book",
        difficulty: "beginner",
        description: "Bottom hand assists top ribs for sensitive shoulders.",
        painMax: 5,
      },
      {
        name: "Deep rotation hold",
        difficulty: "intermediate",
        description: "Longer end-range hold if pain ≤ 3.",
        painMax: 3,
      },
    ]),
    video: videoForRegion("thoracic", "Thoracic rotation mobility"),
    evidenceNotes:
      "Open-book drills are ubiquitous in outpatient thoracic and rib mobility programs.",
    equipment: ["mat", "pillow"],
    tags: ["thoracic", "evening", "rotation"],
  },
  {
    id: "scapular-clock",
    name: "Scapular Clocks & Squeezes",
    bodyParts: ["shoulders", "upper-back"],
    primaryMuscles: ["middle trapezius", "lower trapezius", "rhomboids", "serratus"],
    difficulty: "beginner",
    durationSeconds: 100,
    benefits: ["Scapular control", "Pairs with chest opening for posture"],
    risks: ["Avoid shrugging into pain"],
    breathing: "Exhale on gentle squeeze.",
    alignment: "Ribs down; neck long.",
    posture: "Seated or standing tall.",
    warmUpNotes: "Arm pendulums if shoulders stiff.",
    steps: steps([
      {
        instruction:
          "Gently draw shoulder blades back and down as if tucking them into opposite back pockets. Hold 3–5 seconds. Then explore small “clock” movements of one blade.",
        kid: "Pinch an invisible grape between your shoulder blades—don’t smash it—then draw tiny clock numbers with one shoulder blade.",
        hold: 5,
      },
    ]),
    variations: vars("scapular-clock", [
      {
        name: "Wall angels",
        difficulty: "intermediate",
        description: "Back to wall, slide arms in a snow-angel pattern.",
        painMax: 3,
      },
      {
        name: "Band pull-aparts (light)",
        difficulty: "intermediate",
        description: "Strength-mobility hybrid with light band.",
      },
    ]),
    video: videoForRegion("shoulder", "Shoulder blade control education"),
    evidenceNotes:
      "Scapular neuromuscular control is central to many shoulder rehab progressions.",
    equipment: ["optional light band"],
    tags: ["posture", "shoulders", "control"],
  },
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function finalize(seed: Seed & { clinical?: Stretch["clinical"] }): Stretch {
  const muscles = seed.primaryMuscles.join(", ");
  const areas = seed.bodyParts.join(", ");
  const { clinical: providedClinical, ...rest } = seed;
  const narrative = functionalOutcomeNarrative(seed.bodyParts, seed.evidenceNotes);
  const clinical =
    providedClinical ??
    ({
      whatItDoes: `Gently lengthens and mobilizes ${muscles || "target tissues"} while teaching controlled range through the ${areas || "body"}.`,
      whyImportant:
        seed.benefits[0] ||
        "Improves comfort with movement and supports daily functional mobility when dosed appropriately.",
      clinicalOutcome: narrative.clinicalOutcome,
      outpatientRationale: narrative.outpatientRationale,
    } satisfies Stretch["clinical"]);

  // Enrich provided clinical with functional outcome appendix when short
  const enrichedClinical: Stretch["clinical"] = providedClinical
    ? {
        ...providedClinical,
        clinicalOutcome: providedClinical.clinicalOutcome.includes("Functional focus")
          ? providedClinical.clinicalOutcome
          : `${providedClinical.clinicalOutcome} ${narrative.clinicalOutcome.split("Functional focus")[1] ? `Functional focus${narrative.clinicalOutcome.split("Functional focus")[1]}` : narrative.clinicalOutcome}`,
        outpatientRationale: providedClinical.outpatientRationale.includes("functional outcomes")
          ? providedClinical.outpatientRationale
          : `${providedClinical.outpatientRationale} ${narrative.outpatientRationale}`,
      }
    : clinical;

  return {
    ...rest,
    kind: "stretch",
    slug: seed.slug ?? slugify(seed.name),
    durationBucket: bucket(seed.durationSeconds),
    clinical: enrichedClinical,
    tags: Array.from(
      new Set([...(seed.tags ?? []), "evidence-informed", "functional-outcomes", ...narrative.outcomeTags.slice(0, 4)])
    ),
  };
}

/** Core clinical library (base stretches) — independent of exercise catalog */
export const BASE_STRETCHES: Stretch[] = [
  ...SEEDS,
  ...ADDITIONAL_STRETCH_SEEDS,
  ...BULK_STRETCH_SEEDS,
].map(finalize);

/**
 * Evidence-informed dosing / context modifiers for virtual expansion.
 * Each keeps institutional video + clinical education while tuning dose and
 * functional outcome emphasis (educational, not a trial arm).
 */
const STRETCH_MODIFIERS = [
  {
    tag: "desk-break",
    label: "Desk-Break Microdose",
    scale: 0.7,
    difficultyShift: -1,
    outcome:
      "Supports sit-to-stand comfort and desk-task tolerance with short, frequent bouts.",
  },
  {
    tag: "morning",
    label: "Morning Stiffness Starter",
    scale: 0.85,
    difficultyShift: -1,
    outcome: "Targets morning stiffness and first-hour mobility readiness.",
  },
  {
    tag: "evening",
    label: "Evening Wind-Down Mobility",
    scale: 1.1,
    difficultyShift: 0,
    outcome: "Supports recovery mobility and next-day ease after daily loading.",
  },
  {
    tag: "athletic-prep",
    label: "Athletic Prep Mobility",
    scale: 1.0,
    difficultyShift: 1,
    outcome: "Prepares sport/work-task range with dynamic readiness emphasis.",
  },
  {
    tag: "cool-down",
    label: "Post-Activity Cool-Down",
    scale: 1.05,
    difficultyShift: 0,
    outcome: "Promotes post-activity range restoration and perceived recovery.",
  },
  {
    tag: "phase-early",
    label: "Early Protective Mobility",
    scale: 0.7,
    difficultyShift: -1,
    outcome: "Protects irritable tissues while restoring a pain-free motion arc.",
  },
  {
    tag: "phase-mid",
    label: "Mid-Stage Mobility Load",
    scale: 1.0,
    difficultyShift: 0,
    outcome: "Builds usable range for ADLs as irritability settles.",
  },
  {
    tag: "phase-late",
    label: "Late Functional Mobility",
    scale: 1.15,
    difficultyShift: 1,
    outcome: "Bridges mobility into higher-demand functional or athletic tasks.",
  },
  {
    tag: "hold-long",
    label: "Longer End-Range Hold",
    scale: 1.25,
    difficultyShift: 0,
    outcome: "Emphasizes tissue tolerance at mild end-range when symptoms allow.",
  },
  {
    tag: "dynamic",
    label: "Dynamic / Oscillatory Mobility",
    scale: 0.9,
    difficultyShift: 0,
    outcome: "Uses gentle oscillation to restore motion confidence and warm tissue.",
  },
  {
    tag: "contract-relax",
    label: "Contract–Relax Assisted",
    scale: 1.1,
    difficultyShift: 1,
    outcome: "May improve ROM efficiently via light contract–relax dosing.",
  },
  {
    tag: "breath-led",
    label: "Breath-Led Mobility",
    scale: 1.0,
    difficultyShift: -1,
    outcome: "Pairs mobility with breathing to reduce guarding and improve ease.",
  },
  {
    tag: "unilateral-left",
    label: "Left Side Focus",
    scale: 1.0,
    difficultyShift: 0,
    outcome: "Addresses side-to-side asymmetry for unilateral functional tasks.",
  },
  {
    tag: "unilateral-right",
    label: "Right Side Focus",
    scale: 1.0,
    difficultyShift: 0,
    outcome: "Addresses side-to-side asymmetry for unilateral functional tasks.",
  },
  {
    tag: "bilateral-symmetry",
    label: "Bilateral Symmetry Drill",
    scale: 1.05,
    difficultyShift: 0,
    outcome: "Compares sides to improve balanced functional mobility.",
  },
  {
    tag: "older-adult-safe",
    label: "Older Adult Safe Progression",
    scale: 0.85,
    difficultyShift: -1,
    outcome: "Prioritizes support, balance safety, and ADL mobility gains.",
  },
  {
    tag: "post-op-gentle",
    label: "Gentle / Early Phase Style",
    scale: 0.65,
    difficultyShift: -1,
    outcome: "Mirrors early protective ROM goals when cleared by the care team.",
  },
  {
    tag: "home-minimal",
    label: "Home Minimal Equipment",
    scale: 1.0,
    difficultyShift: 0,
    outcome: "Maximizes adherence with home-friendly setup for functional gains.",
  },
  {
    tag: "clinic-progressed",
    label: "Clinic-Progressed Intensity",
    scale: 1.2,
    difficultyShift: 1,
    outcome: "Reflects progressed clinic dosing toward higher functional demand.",
  },
  {
    tag: "neural-gentle",
    label: "Neural-Aware Gentle Dose",
    scale: 0.75,
    difficultyShift: -1,
    outcome: "Keeps ranges small when neural sensitivity is a concern.",
  },
  {
    tag: "functional-reach",
    label: "Functional Reach Integration",
    scale: 1.05,
    difficultyShift: 0,
    outcome: "Links mobility gains to real reach, bend, or step tasks (PSFS-style).",
  },
  {
    tag: "pain-calm",
    label: "Pain-Calming Short Bouts",
    scale: 0.6,
    difficultyShift: -1,
    outcome: "Uses brief, frequent bouts to build confidence without flare-ups.",
  },
  {
    tag: "endurance-volume",
    label: "Endurance Volume Mobility",
    scale: 1.3,
    difficultyShift: 0,
    outcome: "Builds tissue tolerance for longer activity windows.",
  },
  {
    tag: "work-task",
    label: "Work-Task Specific Mobility",
    scale: 1.0,
    difficultyShift: 0,
    outcome: "Orients dosing toward job-specific postures and task tolerance.",
  },
] as const;

const DIFFS: Difficulty[] = ["beginner", "intermediate", "advanced"];

function shiftDifficulty(d: Difficulty, shift: number): Difficulty {
  const i = Math.max(0, Math.min(2, DIFFS.indexOf(d) + shift));
  return DIFFS[i]!;
}

/** Resolve any catalog index 0..STRETCH_CATALOG_CAPACITY-1 into a full Stretch */
export function getStretchByIndex(index: number): Stretch | undefined {
  if (index < 0 || index >= STRETCH_CATALOG_CAPACITY) return undefined;
  const baseCount = BASE_STRETCHES.length;
  if (baseCount === 0) return undefined;
  const base = BASE_STRETCHES[index % baseCount]!;
  const cycle = Math.floor(index / baseCount);
  if (cycle === 0) {
    return { ...base, id: base.id, slug: base.slug };
  }
  const mod = STRETCH_MODIFIERS[cycle % STRETCH_MODIFIERS.length]!;
  const series = Math.floor(cycle / STRETCH_MODIFIERS.length) + 1;
  const id = `${base.id}__${mod.tag}__s${series}__i${index}`;
  const durationSeconds = Math.round(base.durationSeconds * mod.scale);
  const sideHint = mod.tag.includes("left")
    ? " Focus on the left side."
    : mod.tag.includes("right")
      ? " Focus on the right side."
      : "";

  return {
    ...base,
    id,
    slug: `${base.slug}-${mod.tag}-s${series}-${index}`,
    name: `${base.name} — ${mod.label}${series > 1 ? ` #${series}` : ""}`,
    difficulty: shiftDifficulty(base.difficulty, mod.difficultyShift),
    durationSeconds,
    durationBucket: bucket(durationSeconds),
    tags: [
      ...base.tags,
      mod.tag,
      "catalog-variant",
      "evidence-informed",
      "functional-outcomes",
      `series-${series}`,
    ],
    evidenceNotes: `${base.evidenceNotes} Catalog edition tuned for ${mod.label.toLowerCase()}: ${mod.outcome}`,
    clinical: {
      ...base.clinical,
      whyImportant: `${base.clinical.whyImportant} This edition emphasizes ${mod.label.toLowerCase()}.`,
      clinicalOutcome: `${base.clinical.clinicalOutcome} Variant goal: ${mod.outcome}`,
      outpatientRationale: `${base.clinical.outpatientRationale} Dosing modifier: ${mod.label} (scale ${mod.scale}× duration).`,
    },
    steps: base.steps.map((s) => ({
      ...s,
      instruction: `${s.instruction}${sideHint} (${mod.label} dosing.)`,
      kidFriendly: `${s.kidFriendly}${sideHint ? " This round is special-side practice." : ""}`,
      holdSeconds: s.holdSeconds
        ? Math.max(5, Math.round(s.holdSeconds * mod.scale))
        : s.holdSeconds,
    })),
  };
}

/**
 * Materialized browse set: clinical bases + first-wave unilateral/context samples.
 * Full 250k catalog is virtual via getStretchByIndex / listStretches.
 */
function expandBrowseSample(base: Stretch[]): Stretch[] {
  const expanded: Stretch[] = [...base];
  const sampleMods = STRETCH_MODIFIERS.filter((m) =>
    ["desk-break", "morning", "evening", "athletic-prep", "phase-early", "unilateral-left", "unilateral-right"].includes(
      m.tag
    )
  );
  for (const stretch of base) {
    for (const mod of sampleMods) {
      const durationSeconds = Math.round(stretch.durationSeconds * mod.scale);
      expanded.push({
        ...stretch,
        id: `${stretch.id}__${mod.tag}__browse`,
        name: `${stretch.name} — ${mod.label}`,
        slug: `${stretch.slug}-${mod.tag}-browse`,
        durationSeconds,
        durationBucket: bucket(durationSeconds),
        difficulty: shiftDifficulty(stretch.difficulty, mod.difficultyShift),
        tags: [...stretch.tags, mod.tag, "browse-sample", "functional-outcomes"],
        evidenceNotes: `${stretch.evidenceNotes} ${mod.outcome}`,
        clinical: {
          ...stretch.clinical,
          clinicalOutcome: `${stretch.clinical.clinicalOutcome} Variant goal: ${mod.outcome}`,
        },
      });
    }
  }
  return expanded;
}

/** Browse-friendly sample library (not the full 250k materialization) */
export const STRETCH_LIBRARY: Stretch[] = expandBrowseSample(BASE_STRETCHES);

export const BODY_PART_LABELS: Record<BodyPart, string> = {
  neck: "Neck / Cervical",
  jaw: "Jaw / TMJ",
  shoulders: "Shoulders",
  scapular: "Shoulder Blade / Scapular",
  "upper-back": "Upper Back",
  thoracic: "Thoracic / Mid-Back",
  chest: "Chest",
  "lower-back": "Lower Back / Lumbar",
  pelvis: "Pelvis / SI Region",
  hips: "Hips",
  groin: "Groin / Adductors",
  glutes: "Glutes",
  hamstrings: "Hamstrings",
  quadriceps: "Quadriceps",
  knee: "Knee",
  calves: "Calves",
  shins: "Shins / Anterior Leg",
  ankles: "Ankles",
  foot: "Foot / Arch",
  toes: "Toes",
  elbow: "Elbow",
  forearm: "Forearm",
  wrists: "Wrists",
  hand: "Hand / Fingers",
  core: "Core / Trunk",
  "full-body": "Full Body",
};

/** Suggested high-use targets for intake UI ordering */
export const SUGGESTED_BODY_PART_ORDER: BodyPart[] = [
  "neck",
  "shoulders",
  "scapular",
  "thoracic",
  "upper-back",
  "chest",
  "lower-back",
  "pelvis",
  "hips",
  "groin",
  "glutes",
  "hamstrings",
  "quadriceps",
  "knee",
  "calves",
  "shins",
  "ankles",
  "foot",
  "toes",
  "elbow",
  "forearm",
  "wrists",
  "hand",
  "jaw",
  "core",
  "full-body",
];

export function getStretchById(id: string): Stretch | undefined {
  const base = BASE_STRETCHES.find((s) => s.id === id);
  if (base) return base;
  const browse = STRETCH_LIBRARY.find((s) => s.id === id);
  if (browse) return browse;
  if (id.includes("__i")) {
    const m = id.match(/__i(\d+)$/);
    if (m) return getStretchByIndex(Number(m[1]));
  }
  // Virtual id pattern without index: try browse then list scan
  return listStretches({ limit: 500, query: id.split("__")[0] }).items.find(
    (s) => s.id === id || s.slug === id
  );
}

export function getStretchBySlug(slug: string): Stretch | undefined {
  const base = BASE_STRETCHES.find((s) => s.slug === slug);
  if (base) return base;
  const browse = STRETCH_LIBRARY.find((s) => s.slug === slug);
  if (browse) return browse;
  // Virtual slugs end with -{index}
  const idxMatch = slug.match(/-(\d+)$/);
  if (idxMatch) {
    const byIndex = getStretchByIndex(Number(idxMatch[1]));
    if (byIndex?.slug === slug) return byIndex;
  }
  return listStretches({ limit: 2000, query: slug.split("-")[0] }).items.find(
    (s) => s.slug === slug
  );
}

export function listStretches(opts: {
  offset?: number;
  limit?: number;
  bodyPart?: BodyPart | "all";
  difficulty?: Difficulty | "all";
  duration?: DurationBucket | "all";
  query?: string;
}): { items: Stretch[]; total: number; capacity: number } {
  const offset = opts.offset ?? 0;
  const limit = Math.min(opts.limit ?? 48, 120);
  const q = opts.query?.toLowerCase().trim();
  const items: Stretch[] = [];

  const filtered =
    Boolean(q) ||
    (opts.bodyPart && opts.bodyPart !== "all") ||
    (opts.difficulty && opts.difficulty !== "all") ||
    (opts.duration && opts.duration !== "all");

  // Prefer clinical bases for filtered browse, then walk virtual catalog
  const maxScan = filtered
    ? Math.min(STRETCH_CATALOG_CAPACITY, 8_000)
    : Math.min(STRETCH_CATALOG_CAPACITY, offset + limit + 200);

  let matched = 0;
  for (let i = 0; i < maxScan; i++) {
    const s = getStretchByIndex(i);
    if (!s) continue;
    if (opts.bodyPart && opts.bodyPart !== "all" && !s.bodyParts.includes(opts.bodyPart))
      continue;
    if (opts.difficulty && opts.difficulty !== "all" && s.difficulty !== opts.difficulty)
      continue;
    if (opts.duration && opts.duration !== "all" && s.durationBucket !== opts.duration)
      continue;
    if (q) {
      const hay = [
        s.name,
        s.primaryMuscles.join(" "),
        s.tags.join(" "),
        s.benefits.join(" "),
        s.clinical.clinicalOutcome,
        s.evidenceNotes,
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q) && !s.slug.includes(q)) continue;
    }
    if (matched >= offset && items.length < limit) items.push(s);
    matched++;
    // After filling the page, keep counting within scan window for total estimate
    if (!filtered && items.length >= limit && matched > offset + limit) break;
  }

  const total = filtered ? matched : STRETCH_CATALOG_CAPACITY;
  return { items, total, capacity: STRETCH_CATALOG_CAPACITY };
}

/** @deprecated Prefer listStretches for capacity-aware paging; kept for simple filters */
export function filterStretches(opts: {
  bodyPart?: BodyPart | "all";
  difficulty?: Difficulty | "all";
  duration?: DurationBucket | "all";
  query?: string;
}): Stretch[] {
  return listStretches({ ...opts, limit: 120, offset: 0 }).items;
}

export const LIBRARY_STATS = {
  baseCount: BASE_STRETCHES.length,
  /** Full virtual catalog capacity */
  totalEntries: STRETCH_CATALOG_CAPACITY,
  capacity: STRETCH_CATALOG_CAPACITY,
  browseSampleCount: STRETCH_LIBRARY.length,
  variationCount: BASE_STRETCHES.reduce((n, s) => n + s.variations.length, 0),
  modifierStyles: STRETCH_MODIFIERS.length,
  note:
    "Clinician-authored, evidence-informed stretch bases expand into a 250,000-entry virtual catalog via dosing, laterality, phase, and functional-context modifiers. Each entry carries functional outcome framing (PSFS/pain NRS and region-relevant constructs such as NDI, ODI, LEFS, QuickDASH, KOOS, FAAM) and institutional educational video sources. Educational synthesis of outpatient PT practice—not a trial database.",
};
