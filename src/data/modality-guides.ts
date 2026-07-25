/**
 * Detailed setup / settings / multi-type guides for every modality.
 * Complex devices (TENS, heat systems, etc.) include full type comparisons.
 * Others receive complete structured guides generated from catalog data + category templates.
 */

import {
  getModalityById,
  listModalities,
  type Modality,
  type ModalityWithGuide,
} from "@/data/modalities";
import type {
  InstructionStep,
  ModalityControl,
  ModalityGuide,
  ModalityTypeOption,
} from "@/data/modality-guide-types";

function step(
  order: number,
  title: string,
  instruction: string,
  kidFriendly: string,
  extras?: { safetyNote?: string; tip?: string }
): InstructionStep {
  return { order, title, instruction, kidFriendly, ...extras };
}

function ctrl(
  id: string,
  name: string,
  kidFriendlyName: string,
  description: string,
  options: ModalityControl["options"],
  howToSet: string,
  howToSetKid: string,
  recommendedDefault?: string
): ModalityControl {
  return {
    id,
    name,
    kidFriendlyName,
    description,
    options,
    howToSet,
    howToSetKid,
    recommendedDefault,
  };
}

/** ——— Deep custom guides for multi-setting / multi-type modalities ——— */

const TENS_GUIDE: ModalityGuide = {
  mission:
    "Use TENS as a short-term comfort tool so you can move better—not as a cure. Pick the mode that matches your goal (steady buzz vs strong pulses), set pads correctly, and always stay in a comfortable tingle range.",
  missionKid:
    "TENS is a tiny buzz helper for ouchy spots. We choose the right buzz style, stick the sticky pads in safe places, and keep the buzz friendly—never scary.",
  whatYouNeed: [
    "Clinician-recommended TENS unit (or unit you were taught to use)",
    "Reusable or disposable electrodes (pads) sized for the area",
    "Clean, dry, intact skin; optional alcohol wipe",
    "Timer or phone clock",
    "Your pain scale (0–10) before and after",
  ],
  whatYouNeedKid: [
    "Buzz box (TENS machine)",
    "Sticky pads",
    "Clean dry skin (no boo-boo cuts)",
    "Timer",
    "Pain number before and after",
  ],
  safetyChecklist: [
    {
      item: "No pacemaker, implanted pump, or defibrillator unless cleared by your clinician",
      kidFriendly: "Special heart or body machines? Ask a grown-up doctor/PT first.",
    },
    {
      item: "Do not place pads on the front of the neck, over the eyes, mouth, or broken skin",
      kidFriendly: "No pads on neck front, eyes, mouth, or scrapes.",
    },
    {
      item: "Not over the pregnant abdomen/low back without clinician guidance",
      kidFriendly: "Pregnancy tummy/back needs a clinician’s OK.",
    },
    {
      item: "Stop if skin burns, sharp pain spikes, or you feel dizzy/odd heart feelings",
      kidFriendly: "If it hurts weird or skin gets angry—stop and tell a grown-up.",
    },
  ],
  types: [
    {
      id: "tens-conventional",
      name: "Conventional / sensory TENS (high frequency)",
      plainLanguage:
        "A steady comfortable buzz (often ~80–120 Hz) for short-term pain easing while you rest or do gentle activity.",
      kidFriendly: "Smooth friendly buzz—like a soft electric tickle that stays the same.",
      differences:
        "Uses higher pulse rate and usually lower intensity than motor/acupuncture-like modes. Sensation should be strong but comfortable tingling—not muscle thumping. Relief often lasts mainly during or shortly after the session.",
      whenToUse: [
        "Aching or sharp spots you want quieter for 20–30 minutes",
        "Before gentle mobility if pain blocks starting",
        "Between visits when irritability is moderate",
      ],
      whyUse:
        "May gate pain signals short-term (gate-control theory) so you can complete your home program. Evidence is mixed for long-term change—value is enabling movement.",
      whyUseKid:
        "It can turn down the ouch volume for a little while so you can do your stretches and exercises.",
      controls: [
        ctrl(
          "mode",
          "Mode / program",
          "Buzz style",
          "Many units label this ‘Normal’, ‘Constant’, or a numbered program.",
          [
            {
              value: "constant",
              label: "Constant / Normal",
              whenToUse: "Default for conventional TENS",
              whyThis: "Steady sensory input without big bursts",
              kidFriendly: "Same buzz the whole time",
            },
            {
              value: "modulated",
              label: "Modulated",
              whenToUse: "If constant buzz fades or skin gets used to it",
              whyThis: "Slight changes keep nerves noticing the signal",
              kidFriendly: "Buzz that wiggles a little so it stays interesting",
            },
          ],
          "Select Constant/Normal first. Switch to Modulated only if comfort fades after 10+ minutes.",
          "Pick the smooth same-buzz button first. If it gets boring and less helpful, try the wiggle-buzz mode.",
          "constant"
        ),
        ctrl(
          "frequency",
          "Pulse rate (Hz / frequency)",
          "Buzz speed",
          "How many pulses per second. Conventional sensory often ~80–120 Hz.",
          [
            {
              value: "80-120",
              label: "80–120 Hz (typical sensory)",
              whenToUse: "Most home pain-modulation sessions",
              whyThis: "Classic comfortable tingle range",
              kidFriendly: "Fast little taps that feel tingly",
            },
            {
              value: "50-80",
              label: "50–80 Hz",
              whenToUse: "If higher rates feel too sharp on sensitive skin",
              whyThis: "Slightly slower may feel softer",
              kidFriendly: "A bit slower taps",
            },
          ],
          "If your unit shows Hz, start near 100. If it only has Low/Med/High rate, pick High or the ‘pain relief’ preset your PT marked.",
          "If you can set a number, start around 100. If only Low/Med/High, use High or the sticker your PT put on the box.",
          "80-120"
        ),
        ctrl(
          "pulse-width",
          "Pulse width (µs)",
          "Buzz thickness",
          "How ‘wide’ each pulse is—often 50–100 µs for sensory comfort.",
          [
            {
              value: "50-100",
              label: "50–100 µs",
              whenToUse: "Sensory comfort without strong muscle twitch",
              whyThis: "Narrower pulses favor tingling over thumping",
              kidFriendly: "Skinny buzz, not a muscle punch",
            },
            {
              value: "150-200",
              label: "150–200 µs",
              whenToUse: "Only if clinician taught this for your unit",
              whyThis: "Wider pulses can feel stronger / more motor",
              kidFriendly: "Fatter buzz—PT must teach this",
            },
          ],
          "Prefer 50–100 µs if adjustable. Leave factory sensory preset if unsure.",
          "If a number exists, keep it medium-low. When unsure, use the factory pain-relief preset.",
          "50-100"
        ),
        ctrl(
          "intensity",
          "Intensity / amplitude",
          "Buzz loudness",
          "Strength of the sensation—the most important user control.",
          [
            {
              value: "strong-comfortable",
              label: "Strong but comfortable tingle",
              whenToUse: "Target for conventional TENS",
              whyThis: "Too weak may not help; too strong risks skin irritation",
              kidFriendly: "Loud enough to notice, soft enough to smile",
            },
            {
              value: "just-noticeable",
              label: "Just noticeable",
              whenToUse: "Very sensitive skin or first session",
              whyThis: "Safety first while learning",
              kidFriendly: "Whisper buzz for practice day",
            },
          ],
          "Start at 0. Raise slowly until a clear tingle without pain or big muscle jumps. Re-check after 5 minutes (skin can get used to it—raise slightly if still comfortable).",
          "Start at zero. Turn up like a volume knob until you feel a clear tickle—not an ouch. After 5 minutes, if it feels weaker, turn up a tiny bit.",
          "strong-comfortable"
        ),
        ctrl(
          "time",
          "Session time",
          "Buzz timer",
          "How long the unit runs.",
          [
            {
              value: "20-30",
              label: "20–30 minutes",
              whenToUse: "Typical home session",
              whyThis: "Common clinical education window",
              kidFriendly: "About one cartoon-length buzz",
            },
            {
              value: "15",
              label: "15 minutes",
              whenToUse: "First trials or sensitive skin",
              whyThis: "Shorter to test tolerance",
              kidFriendly: "Short practice buzz",
            },
          ],
          "Set timer 20–30 min unless your PT said otherwise. Do not fall asleep on high intensity.",
          "Use a 20–30 minute timer. Don’t take a nap with the buzz on high.",
          "20-30"
        ),
      ],
      setupSteps: [
        step(
          1,
          "Gather and inspect",
          "Check unit battery/charge, lead wires for frays, and pads for stickiness. Replace dry pads.",
          "Make sure the buzz box has power and the sticky pads are still sticky—not dusty paper.",
          { safetyNote: "Damaged wires → do not use" }
        ),
        step(
          2,
          "Clean skin",
          "Wash or wipe the area; dry completely. Avoid lotion right before pad placement.",
          "Wash the skin and dry it like drying a plate—no slippery lotion.",
          { tip: "Hair may need trimming (not shaving aggressively) for better contact" }
        ),
        step(
          3,
          "Place pads (electrode placement)",
          "Place two pads of a channel around the painful region (not on the spine bones if avoidable; not on broken skin). Keep pads at least ~1 inch apart. Follow the diagram your PT gave when available.",
          "Stick two pads near the ouchy area like sandwich bread around the filling—not on top of cuts. Leave a finger-width space between pads.",
          {
            safetyNote:
              "Never place a pad path across the chest in a way that sends current through the heart.",
          }
        ),
        step(
          4,
          "Connect leads",
          "Snap or plug leads firmly into pads and into the correct channel on the unit. Keep intensity at 0.",
          "Click the wires into the pads and the box. Volume starts at zero.",
          { safetyNote: "Connect before turning intensity up" }
        ),
        step(
          5,
          "Select conventional settings",
          "Mode: Constant. Rate: ~80–120 Hz. Width: ~50–100 µs if adjustable. Timer: 20–30 min.",
          "Pick smooth buzz, fast ticks, medium-skinny pulses, 20–30 minute timer.",
          {}
        ),
        step(
          6,
          "Raise intensity",
          "Increase until strong comfortable tingle. No sharp pain. Mild muscle shimmer is OK; big forceful contractions are not the goal for conventional mode.",
          "Turn up until it tickles clearly. Stop before it becomes a mean zap or big muscle kick.",
          {}
        ),
      ],
      duringUse: [
        step(
          1,
          "Stay aware",
          "You may sit, stand, or do gentle mobility if taught. Check skin if burning occurs.",
          "You can sit still or do gentle moves if your PT said OK. If it burns, stop.",
          {}
        ),
        step(
          2,
          "Mid-session tweak",
          "At ~5–10 minutes, if sensation faded, raise intensity slightly while still comfortable.",
          "Halfway, if the tickle got shy, turn the volume up a tiny bit.",
          {}
        ),
      ],
    },
    {
      id: "tens-acupuncture-like",
      name: "Acupuncture-like / low-frequency TENS",
      plainLanguage:
        "Slower, stronger pulses that may cause small muscle twitches; sometimes used for longer-lasting comfort in selected cases.",
      kidFriendly: "Slow thumpy buzz that can make a tiny muscle hop—only if a PT taught you.",
      differences:
        "Lower frequency (often ~1–10 Hz), often higher intensity to a visible/feelable twitch. Sessions may feel more intense. Not the first choice for highly irritable or fearful users without coaching.",
      whenToUse: [
        "When your PT specifically programmed this mode",
        "Chronic aching presentations where conventional TENS was insufficient (per plan of care)",
      ],
      whyUse:
        "May engage different neuromodulatory pathways (including endogenous opioid-related mechanisms in some literature). Still an adjunct to exercise.",
      whyUseKid:
        "A different kind of buzz that some bodies like better for longer quiet—but only with coach instructions.",
      controls: [
        ctrl(
          "frequency",
          "Pulse rate",
          "Slow thump speed",
          "Often 1–10 Hz for acupuncture-like TENS.",
          [
            {
              value: "2-4",
              label: "2–4 Hz",
              whenToUse: "Classic low-rate setting when prescribed",
              whyThis: "Strong rhythmic pulses",
              kidFriendly: "Slow drum beat",
            },
            {
              value: "10",
              label: "~10 Hz",
              whenToUse: "If 2–4 Hz is poorly tolerated",
              whyThis: "Slightly faster low-rate option",
              kidFriendly: "A bit quicker drum",
            },
          ],
          "Only use values your clinician wrote down.",
          "Use only the numbers your PT wrote on your card.",
          "2-4"
        ),
        ctrl(
          "intensity",
          "Intensity",
          "Thump strength",
          "Often to a visible small muscle twitch that remains tolerable.",
          [
            {
              value: "motor-twitch-ok",
              label: "Small tolerable twitch",
              whenToUse: "When coached for low-rate TENS",
              whyThis: "Motor-level intensity is intentional in this mode",
              kidFriendly: "Tiny muscle hop is OK if it doesn’t hurt",
            },
          ],
          "Raise carefully to small twitch; never to pain.",
          "Turn up until a tiny hop shows—but not ouch.",
          "motor-twitch-ok"
        ),
        ctrl(
          "time",
          "Session time",
          "Timer",
          "Often 20–30 minutes when prescribed.",
          [
            {
              value: "20-30",
              label: "20–30 min",
              whenToUse: "Standard unless told otherwise",
              whyThis: "Common prescription window",
              kidFriendly: "About half a show",
            },
          ],
          "Follow written home program time.",
          "Use the time on your homework card.",
          "20-30"
        ),
      ],
      setupSteps: [
        step(
          1,
          "Confirm this mode is for you",
          "Check your HEP card—do not self-switch from conventional to low-rate without teaching.",
          "Only use thumpy mode if your PT homework says so.",
          { safetyNote: "Skip if highly irritable or first-ever TENS without coaching" }
        ),
        step(
          2,
          "Pad placement as taught",
          "Use the exact pad map from your clinician when available.",
          "Stick pads exactly where your coach showed—like following a treasure map.",
          {}
        ),
        step(
          3,
          "Select low-rate program",
          "Set frequency 2–10 Hz per card; intensity to small twitch.",
          "Slow drum setting; turn up to tiny muscle hop.",
          {}
        ),
      ],
      duringUse: [
        step(
          1,
          "Monitor comfort",
          "Twitches should stay small. Stop if pain escalates or skin burns.",
          "Little hops OK. Big pain or hot skin = stop.",
          {}
        ),
      ],
    },
    {
      id: "tens-burst",
      name: "Burst TENS",
      plainLanguage:
        "Packs of pulses delivered in bursts—another programmed option on many units.",
      kidFriendly: "Buzz that comes in little packets—like popcorn pops.",
      differences:
        "Combines features of low- and high-rate patterns depending on device. Use only as labeled on your unit/PT program.",
      whenToUse: [
        "When your unit’s ‘Burst’ program was selected in clinic",
        "If conventional constant mode was not preferred and Burst was trialed successfully",
      ],
      whyUse: "Some users prefer burst sensation; choice is preference + response based.",
      whyUseKid: "Some kids/grown-ups like popcorn buzz better than smooth buzz.",
      controls: [
        ctrl(
          "program",
          "Burst program",
          "Popcorn program",
          "Select the Burst preset if present.",
          [
            {
              value: "burst",
              label: "Burst",
              whenToUse: "When prescribed or preferred after trial",
              whyThis: "Device-defined burst pattern",
              kidFriendly: "Popcorn mode",
            },
          ],
          "Choose Burst on the program dial/menu; set intensity to strong comfortable.",
          "Tap Burst, then turn volume to strong-friendly.",
          "burst"
        ),
        ctrl(
          "intensity",
          "Intensity",
          "Loudness",
          "Strong comfortable without pain.",
          [
            {
              value: "strong-comfortable",
              label: "Strong comfortable",
              whenToUse: "Default",
              whyThis: "Sensory effectiveness without injury risk",
              kidFriendly: "Loud tickle, not ouch",
            },
          ],
          "Raise slowly from 0.",
          "From zero, sneak the volume up.",
          "strong-comfortable"
        ),
      ],
      setupSteps: [
        step(
          1,
          "Pads and leads",
          "Same safe placement rules as conventional TENS; intensity 0 before powering pattern.",
          "Same sticky-pad safety rules; volume at zero first.",
          {}
        ),
        step(
          2,
          "Select Burst",
          "Program → Burst → timer 20–30 → raise intensity.",
          "Popcorn mode → timer → turn up gently.",
          {}
        ),
      ],
      duringUse: [
        step(
          1,
          "Comfort check",
          "Bursts should not startle or cause guarding.",
          "If popcorn scares your muscles, turn down or switch modes with PT advice.",
          {}
        ),
      ],
    },
  ],
  commonSetupSteps: [
    step(
      1,
      "Read your personal card",
      "If your PT gave pad placement or mode notes, follow those over generic defaults.",
      "Homework card beats generic internet rules.",
      {}
    ),
    step(
      2,
      "Environment",
      "Sit supported; phone timer on; water nearby; no wet hands on unit.",
      "Comfy seat, timer on, dry hands.",
      {}
    ),
  ],
  duringUseSteps: [
    step(
      1,
      "Optional gentle movement",
      "If cleared, do easy mobility while TENS runs so the session links comfort to motion.",
      "If allowed, wiggle gently while buzzing so your body learns ‘move + comfort’.",
      { tip: "TENS alone without movement is less aligned with outpatient goals" }
    ),
  ],
  afterUseSteps: [
    step(
      1,
      "Turn intensity to 0, then power off",
      "Lower intensity fully before unplugging pads.",
      "Volume to zero, then off, then unstick pads.",
      {}
    ),
    step(
      2,
      "Skin care",
      "Remove pads gently; check redness. Mild pink that fades is common; lasting welts need pad/intensity changes.",
      "Peek at skin. A little pink that goes away is OK; angry marks mean change pads or turn down next time.",
      {}
    ),
    step(
      3,
      "Store pads",
      "Return pads to plastic sheet; seal bag; charge unit if rechargeable.",
      "Put pads back on their shiny sticker sheet so they stay sticky.",
      {}
    ),
    step(
      4,
      "Do your active plan",
      "Complete prescribed stretches/exercises while comfort window is open when that was the goal.",
      "Now do your stretch/exercise homework while the ouch is quieter.",
      {}
    ),
  ],
  troubleshooting: [
    {
      problem: "No sensation",
      fix: "Check battery, lead snaps, pad stickiness, and that intensity is rising on the correct channel.",
      kidFriendly: "Is the box charged? Are wires clicked in? Is the volume really going up?",
    },
    {
      problem: "One pad stings",
      fix: "Replace dried pad; improve contact; lower intensity; ensure pad fully adhered.",
      kidFriendly: "Old sticky pad? Get a fresher one and press it flat.",
    },
    {
      problem: "Muscle cramping",
      fix: "Lower intensity; switch toward conventional sensory settings; reposition off motor points if needed.",
      kidFriendly: "Turn down; ask for smooth tickle mode instead of thumpy mode.",
    },
  ],
  proficiencyTips: [
    {
      tip: "Log mode + intensity number + pain before/after for 5 sessions to learn your best recipe.",
      kidFriendly: "Write down which buzz recipe helped each day—like a science notebook.",
    },
    {
      tip: "Replace pads regularly; poor contact causes hot spots.",
      kidFriendly: "Crispy dry pads are grumpy—use sticky ones.",
    },
    {
      tip: "If TENS does nothing after honest trials, tell your PT—other strategies may fit better.",
      kidFriendly: "If buzz doesn’t help after fair tries, tell your coach. That’s useful data!",
    },
  ],
  successMarkers: [
    {
      marker: "You can explain your mode and pad placement in your own words (teach-back).",
      kidFriendly: "You can teach a friend (or stuffed animal) how you set it up.",
    },
    {
      marker: "Pain eases enough during/after to complete more of your mobility/strength plan.",
      kidFriendly: "You finish more of your movement homework after buzzing.",
    },
    {
      marker: "Skin stays healthy; no fear of the device.",
      kidFriendly: "Skin happy; you feel brave and calm with the box.",
    },
  ],
  doNotList: [
    "Do not use in the shower or on wet skin",
    "Do not place pads on the front of the neck or over the eyes",
    "Do not sleep with high intensity running",
    "Do not share pads between people without replacing",
    "Do not ignore clinician restrictions for implants or pregnancy",
  ],
  estimatedSetupMinutes: "5–8",
};

const HEAT_GUIDE: ModalityGuide = {
  mission:
    "Warm stiff areas safely so movement feels easier—then move. Heat is a bridge into mobility/strength, not the whole treatment.",
  missionKid:
    "Give stiff spots a warm hug, then gently move them. Warmth is the opening song, not the whole concert.",
  whatYouNeed: [
    "Moist heat pack, microwavable pack, or heating pad",
    "Towel barrier (1–2 layers)",
    "Timer",
    "Water bottle if using moist pack that can dry",
  ],
  whatYouNeedKid: ["Warm pack", "Towel pillowcase", "Timer"],
  safetyChecklist: [
    {
      item: "Comfortably warm—not scalding; you must be able to rest a hand nearby without flinching",
      kidFriendly: "Warm cocoa, not lava.",
    },
    {
      item: "Intact sensation; extra caution if diabetes/neuropathy—use clinician rules",
      kidFriendly: "If skin doesn’t feel heat well, ask a grown-up/PT for special rules.",
    },
    {
      item: "Avoid heat on hot, red, swollen joints unless a clinician said otherwise",
      kidFriendly: "If a joint is already hot and puffy, skip heat.",
    },
  ],
  types: [
    {
      id: "heat-moist",
      name: "Moist heat pack",
      plainLanguage: "Damp warmth that many people find deeper-feeling for stiffness.",
      kidFriendly: "Warm wet hug (in a safe pack).",
      differences:
        "Moist heat can feel more penetrating than dry pads for some users; still superficial heat. Needs careful temperature control.",
      whenToUse: ["Morning stiffness", "Before mobility sessions", "Desk-related tightness"],
      whyUse: "Temporary comfort and readiness for stretch/exercise.",
      whyUseKid: "Makes rusty hinges easier to wiggle.",
      controls: [
        ctrl(
          "temp",
          "Temperature",
          "Warmth level",
          "Comfortably warm with towel barrier.",
          [
            {
              value: "warm",
              label: "Comfortably warm",
              whenToUse: "Default",
              whyThis: "Safety + comfort",
              kidFriendly: "Cozy, not ouch-hot",
            },
            {
              value: "low",
              label: "Mild warm",
              whenToUse: "Sensitive skin / first uses",
              whyThis: "Lower burn risk",
              kidFriendly: "Baby bear warm",
            },
          ],
          "Heat pack per product directions; always towel wrap; never microwave beyond instructions.",
          "Follow pack box rules; always wrap in a towel.",
          "warm"
        ),
        ctrl(
          "time",
          "Time",
          "Hug timer",
          "Usually 10–15 minutes.",
          [
            {
              value: "10-15",
              label: "10–15 min",
              whenToUse: "Standard",
              whyThis: "Enough for comfort without prolonged skin risk",
              kidFriendly: "One short song playlist",
            },
          ],
          "Set timer; check skin at 5 minutes.",
          "Timer on; peek at skin halfway.",
          "10-15"
        ),
        ctrl(
          "layers",
          "Towel layers",
          "Blanket layers",
          "1–2 towels between pack and skin (more if very hot).",
          [
            {
              value: "1-2",
              label: "1–2 layers",
              whenToUse: "Most home packs",
              whyThis: "Burn prevention",
              kidFriendly: "At least one towel shield",
            },
          ],
          "Add a layer if it feels too hot within 1–2 minutes.",
          "Too hot? Add another towel blanket.",
          "1-2"
        ),
      ],
      setupSteps: [
        step(1, "Prepare pack", "Heat using product instructions only.", "Warm the pack the safe way on the box.", {}),
        step(2, "Wrap", "Fully wrap in dry towel.", "Towel burrito the pack.", { safetyNote: "No bare scalding pack on skin" }),
        step(3, "Place", "On stiff region over clothing or towel.", "Rest on the stiff spot.", {}),
        step(4, "Timer", "10–15 minutes; skin check at 5.", "Timer + mid-hug skin peek.", {}),
      ],
      duringUse: [
        step(1, "Stay awake", "Do not sleep on heat.", "No naps on the warm pack.", {}),
      ],
    },
    {
      id: "heat-dry",
      name: "Dry heating pad",
      plainLanguage: "Electric pad for localized warmth with auto settings.",
      kidFriendly: "Electric warm blanket square.",
      differences: "Easier for local spots; risk if left on high or used while sleeping.",
      whenToUse: ["Local muscle ache", "When moist pack unavailable"],
      whyUse: "Convenient short-term comfort.",
      whyUseKid: "Easy warm button for a small grumpy spot.",
      controls: [
        ctrl(
          "level",
          "Heat level",
          "Button warmth",
          "Low–medium preferred.",
          [
            {
              value: "low-med",
              label: "Low or medium",
              whenToUse: "Default home use",
              whyThis: "Lower burn risk",
              kidFriendly: "Not the max button",
            },
          ],
          "Start low for 2 minutes; increase only if needed.",
          "Start on low like testing bath water.",
          "low-med"
        ),
        ctrl(
          "time",
          "Time",
          "Timer",
          "10–20 minutes max per bout.",
          [
            {
              value: "10-20",
              label: "10–20 min",
              whenToUse: "Standard",
              whyThis: "Limits skin exposure",
              kidFriendly: "Short cozy visit",
            },
          ],
          "Use auto-shutoff if available.",
          "Auto-off is your friend.",
          "10-20"
        ),
      ],
      setupSteps: [
        step(1, "Inspect pad", "No cracked wires.", "Wires look healthy?", { safetyNote: "Damaged pad = do not use" }),
        step(2, "Barrier", "Cloth layer under pad.", "Shirt or towel under pad.", {}),
        step(3, "Low setting + timer", "Low/med 10–20 min.", "Low button + timer.", {}),
      ],
      duringUse: [
        step(1, "Reposition", "If one spot gets too hot, move pad.", "Scoot the pad if a spot feels toasty.", {}),
      ],
    },
    {
      id: "heat-shower",
      name: "Warm shower prep",
      plainLanguage: "Whole-body warm water before morning mobility.",
      kidFriendly: "Warm rain warm-up.",
      differences: "Great for generalized morning stiffness; needs fall-safety setup.",
      whenToUse: ["Morning stiffness", "Before visit if stiff on arrival"],
      whyUse: "Practical daily strategy + light movement under water if safe.",
      whyUseKid: "Warm rain helps rusty robots move.",
      controls: [
        ctrl(
          "temp",
          "Water temperature",
          "Rain warmth",
          "Warm, not hot enough to redden skin quickly.",
          [
            {
              value: "warm",
              label: "Warm",
              whenToUse: "Default",
              whyThis: "Comfort without burn",
              kidFriendly: "Cozy rain",
            },
          ],
          "Adjust before fully stepping under; use non-slip mat.",
          "Test water with your hand first.",
          "warm"
        ),
        ctrl(
          "time",
          "Duration",
          "Rain time",
          "5–10 minutes.",
          [
            {
              value: "5-10",
              label: "5–10 min",
              whenToUse: "Standard",
              whyThis: "Enough for stiffness ease",
              kidFriendly: "Short shower song",
            },
          ],
          "Add gentle shoulder rolls or pelvic tilts if balance is safe.",
          "Tiny wiggles under water if you feel steady.",
          "5-10"
        ),
      ],
      setupSteps: [
        step(1, "Safety gear", "Non-slip mat; grab bar if needed; seated option if dizzy risk.", "No-slip mat; sit if wobbly.", {}),
        step(2, "Warm water", "Set temperature before long exposure.", "Hand-test water.", {}),
        step(3, "Optional mobility", "Gentle ROM under water.", "Slow robot moves in the rain.", {}),
      ],
      duringUse: [
        step(1, "Exit carefully", "Dry feet before stepping out.", "Dry feet so you don’t ice-skate on the floor.", {}),
      ],
    },
  ],
  commonSetupSteps: [
    step(1, "Decide goal", "Heat should lead into movement within a few minutes after.", "Warmth → then move soon.", {}),
  ],
  duringUseSteps: [
    step(1, "Skin checks", "Pink OK; bright red / blister risk → stop.", "If skin looks sunburned, stop.", {}),
  ],
  afterUseSteps: [
    step(1, "Move", "Begin your mobility or activation plan while comfortable.", "Do your stretch/exercise next.", {}),
    step(2, "Hydrate", "Sip water if you sweat.", "Drink a little water.", {}),
  ],
  troubleshooting: [
    {
      problem: "Heat makes swelling worse",
      fix: "Stop heat; try relative rest/cold if that pattern fits; discuss with PT.",
      kidFriendly: "If the spot gets puffier, pause heat and tell your coach.",
    },
    {
      problem: "Skin blotchy",
      fix: "More towel layers, lower temp, shorter time.",
      kidFriendly: "Extra towel + cooler + shorter hug.",
    },
  ],
  proficiencyTips: [
    {
      tip: "Pair every heat bout with at least 5 minutes of prescribed movement.",
      kidFriendly: "Warm hug must be followed by movement homework.",
    },
  ],
  successMarkers: [
    {
      marker: "Easier start to mobility without skin injury",
      kidFriendly: "Moves start easier; skin stays happy",
    },
  ],
  doNotList: [
    "Do not sleep on a heating pad on high",
    "Do not microwave packs beyond instructions",
    "Do not heat numb skin without guidance",
  ],
  estimatedSetupMinutes: "3–5",
};

const ICE_GUIDE: ModalityGuide = {
  mission:
    "Use cold for short-term calming of hot, irritable, or post-load spots—then reassess movement readiness.",
  missionKid:
    "A cold visit for a grumpy hot spot—short and friendly, then check if moving feels OK.",
  whatYouNeed: ["Ice pack or frozen gel pack", "Thin cloth barrier", "Timer", "Optional elevation pillows"],
  whatYouNeedKid: ["Cold pack", "Thin towel", "Timer"],
  safetyChecklist: [
    {
      item: "Never ice bare skin for long; use a cloth",
      kidFriendly: "Cloth shield between ice and skin",
    },
    {
      item: "Stop if skin goes white/blotchy or you lose feeling beyond mild numbness",
      kidFriendly: "If skin looks ghostly or super numb, stop",
    },
    {
      item: "Avoid if cold allergy (urticaria) or severe vascular issues without advice",
      kidFriendly: "If cold makes itchy hives, skip ice",
    },
  ],
  types: [
    {
      id: "ice-pack",
      name: "Ice / gel pack",
      plainLanguage: "Broad cold over an area for 10–15 minutes.",
      kidFriendly: "Cold pillow visit.",
      differences: "Covers larger areas; easy home default after activity.",
      whenToUse: ["After aggravating activity", "Throbbing/swollen feeling", "Post-session irritability"],
      whyUse: "Short-term symptom modulation; mixed long-term evidence—use if next-day function improves.",
      whyUseKid: "Helps a hot grumpy spot chill out for a bit.",
      controls: [
        ctrl(
          "time",
          "Time",
          "Cold visit length",
          "Usually 10–15 minutes.",
          [
            {
              value: "10-15",
              label: "10–15 min",
              whenToUse: "Standard",
              whyThis: "Balance of comfort vs skin risk",
              kidFriendly: "Short freeze visit",
            },
            {
              value: "8-10",
              label: "8–10 min",
              whenToUse: "Sensitive skin / kids with adult help",
              whyThis: "Extra caution",
              kidFriendly: "Extra-short visit",
            },
          ],
          "Timer required; check skin mid-way.",
          "Timer on; peek halfway.",
          "10-15"
        ),
        ctrl(
          "barrier",
          "Barrier",
          "Towel shield",
          "Thin cloth always.",
          [
            {
              value: "thin-cloth",
              label: "Thin cloth",
              whenToUse: "Always",
              whyThis: "Prevents ice burn",
              kidFriendly: "Always a shield",
            },
          ],
          "Wrap pack completely.",
          "Towel wrap like a burrito.",
          "thin-cloth"
        ),
      ],
      setupSteps: [
        step(1, "Prepare pack", "Frozen gel or ice in bag; wrap cloth.", "Cold pack + towel wrap.", {}),
        step(2, "Position", "On irritable area; optional elevate limb.", "On the grumpy spot; lift it on pillows if puffy.", {}),
        step(3, "Timer", "10–15 min; skin check at 5.", "Timer + peek.", {}),
      ],
      duringUse: [
        step(1, "Stay still-ish", "Relax; breathe; don’t fall asleep on ice.", "Comfy sit; no ice naps.", {}),
      ],
    },
    {
      id: "ice-massage",
      name: "Ice cup massage",
      plainLanguage: "Small ice circles over a local tender spot 3–5 minutes.",
      kidFriendly: "Ice crayon circles.",
      differences: "More local and shorter; good for focal tendon or small irritable spots.",
      whenToUse: ["Focal tenderness", "Before/after small-area loading if taught"],
      whyUse: "Targeted short cryotherapy.",
      whyUseKid: "Draw cold circles on one small ouch.",
      controls: [
        ctrl(
          "time",
          "Time",
          "Circle time",
          "3–5 minutes.",
          [
            {
              value: "3-5",
              label: "3–5 min",
              whenToUse: "Standard",
              whyThis: "Local ice is intense",
              kidFriendly: "Short drawing time",
            },
          ],
          "Keep ice moving; never hold still on one point.",
          "Keep the ice crayon moving—no parking.",
          "3-5"
        ),
      ],
      setupSteps: [
        step(1, "Make ice cup", "Freeze water in paper cup; peel rim.", "Paper cup ice pop for muscles (not for eating on the sore spot).", {}),
        step(2, "Circles", "Gentle circles 3–5 min.", "Soft circles only.", { safetyNote: "Stop if sharp pain worsens" }),
      ],
      duringUse: [
        step(1, "Moving ice", "Continuous motion.", "Always sliding, never stuck.", {}),
      ],
    },
    {
      id: "ice-compression",
      name: "Cold + light compression",
      plainLanguage: "Cold pack with gentle wrap—snug, not tourniquet.",
      kidFriendly: "Cool hug + soft bandage hug.",
      differences: "Adds mild compression; watch for tingling from wrap tightness.",
      whenToUse: ["Post-load swelling feel", "Ankle/knee irritability patterns when appropriate"],
      whyUse: "Combined comfort strategy some prefer after load.",
      whyUseKid: "Cold + gentle squeeze can feel calmer.",
      controls: [
        ctrl(
          "wrap",
          "Wrap tightness",
          "Squeeze level",
          "Snug; fingers/toes stay normal color.",
          [
            {
              value: "snug",
              label: "Snug not tight",
              whenToUse: "Default",
              whyThis: "Avoid nerve/vessel compression",
              kidFriendly: "Hug, not superhero squeeze",
            },
          ],
          "Loosen if numbness from wrap increases.",
          "If fingers tingle from the wrap, loosen.",
          "snug"
        ),
      ],
      setupSteps: [
        step(1, "Cold pack + cloth", "Same as ice pack.", "Cold + cloth first.", {}),
        step(2, "Light wrap", "Elastic wrap over pack lightly.", "Soft wrap over the cold pillow.", {}),
        step(3, "Timer 10–15", "Check color of digits.", "Timer; peek at finger/toe color.", {}),
      ],
      duringUse: [
        step(1, "Circulation check", "Skin color and sensation distal to wrap.", "Fingers/toes still look normal?", {}),
      ],
    },
  ],
  commonSetupSteps: [
    step(1, "Choose type", "Pack for broad areas; massage for small spots.", "Big ouch = pack; tiny ouch = ice crayon.", {}),
  ],
  duringUseSteps: [
    step(1, "Comfort first", "Cold should be intense but tolerable—not painful burning.", "Very cold OK; mean pain not OK.", {}),
  ],
  afterUseSteps: [
    step(1, "Skin check", "Allow skin to rewarm naturally.", "Let skin wake up slowly.", {}),
    step(2, "Gentle motion", "Easy pumps or walk if appropriate.", "Tiny pumps or easy steps if allowed.", {}),
  ],
  troubleshooting: [
    {
      problem: "Ice increases stiffness without benefit",
      fix: "Shorten time or switch to active recovery/heat-if-stiffness pattern per PT.",
      kidFriendly: "If ice makes you feel like a frozen robot with no help, try a different helper with your coach.",
    },
  ],
  proficiencyTips: [
    {
      tip: "Track next-morning pain after ice days vs non-ice days.",
      kidFriendly: "Science test: which mornings feel better?",
    },
  ],
  successMarkers: [
    {
      marker: "Can set up independently with timer and barrier every time",
      kidFriendly: "You can do the cold setup without reminders",
    },
  ],
  doNotList: ["No bare-skin long icing", "No ice on open wounds", "No falling asleep on ice"],
  estimatedSetupMinutes: "2–4",
};

/** Category template builders for remaining modalities */
function categoryTypes(m: Modality): ModalityTypeOption[] {
  const baseControls: ModalityControl[] = [
    ctrl(
      "dose-time",
      "Session length",
      "How long",
      `Typical: ${m.durationMinutes || "as guided"}.`,
      [
        {
          value: "standard",
          label: m.durationMinutes || "As prescribed",
          whenToUse: "Default dosing window",
          whyThis: "Balances benefit and irritation risk",
          kidFriendly: "The usual timer for this helper",
        },
        {
          value: "short",
          label: "Shorter trial",
          whenToUse: "First time or higher irritability",
          whyThis: "Test tolerance",
          kidFriendly: "Tiny practice round",
        },
      ],
      `Use ${m.durationMinutes || "the time your PT wrote"}; shorten if symptoms spike.`,
      `Use the normal time (${m.durationMinutes || "from your card"}); go shorter if ouches grow.`,
      "standard"
    ),
    ctrl(
      "intensity",
      "Effort / intensity",
      "How strong",
      "Stay in a safe, teachable intensity for this modality.",
      [
        {
          value: "gentle",
          label: "Gentle / comfortable",
          whenToUse: "Default home start",
          whyThis: "Protects skin, joints, and confidence",
          kidFriendly: "Goldilocks gentle",
        },
        {
          value: "moderate",
          label: "Moderate (if taught)",
          whenToUse: "When form is solid and irritability low",
          whyThis: "Progress only when ready",
          kidFriendly: "A bit braver—only if coached",
        },
      ],
      "Start gentle. Progress only if your plan of care says so.",
      "Start soft. Get braver only when your coach says OK.",
      "gentle"
    ),
    ctrl(
      "frequency",
      "How often",
      "How many times",
      m.frequency || "As needed / per plan",
      [
        {
          value: "plan",
          label: m.frequency || "Per plan",
          whenToUse: "Ongoing use",
          whyThis: "Consistency without overuse",
          kidFriendly: "Follow the homework calendar",
        },
      ],
      m.frequency || "Follow your written plan.",
      "Do it on the days your plan says.",
      "plan"
    ),
  ];

  const setupFromHowTo: InstructionStep[] = (m.howTo.length ? m.howTo : ["Follow clinician instructions for this modality."]).map(
    (line, i) =>
      step(
        i + 1,
        `Step ${i + 1}`,
        line,
        kidify(line),
        i === 0 ? { safetyNote: m.precautions[0] } : undefined
      )
  );

  // Ensure minimum 5 setup-style steps for proficiency
  while (setupFromHowTo.length < 5) {
    const extras = [
      step(setupFromHowTo.length + 1, "Prepare space", "Clear a safe area; have timer and water ready.", "Make a safe helper station with timer and water.", {}),
      step(setupFromHowTo.length + 2, "Body position", "Choose a supported posture you can hold without strain.", "Sit or lie like a calm mountain—comfy and steady.", {}),
      step(setupFromHowTo.length + 3, "Baseline check", "Note pain 0–10 and how the area feels before starting.", "Write your ouch number before you begin.", {}),
      step(setupFromHowTo.length + 4, "Begin gently", "Start at the easiest setting or smallest dose.", "Start on easy mode.", {}),
      step(setupFromHowTo.length + 5, "Reassess", "After the bout, re-check pain and readiness to move.", "Afterward, check ouch number and if moving feels OK.", {}),
    ];
    setupFromHowTo.push(extras[setupFromHowTo.length]!);
  }

  const typeName =
    m.setting === "clinic"
      ? "Clinic-delivered version (education)"
      : m.setting === "home"
        ? "Home self-care version"
        : "Home or clinic version";

  const types: ModalityTypeOption[] = [
    {
      id: `${m.id}-standard`,
      name: typeName,
      plainLanguage: m.plainLanguage,
      kidFriendly: m.kidFriendly,
      differences: `Primary way to use “${m.name}” in MotionRx. ${m.clinicalIntent}`,
      whenToUse: m.timings.map((t) => `Timing fit: ${t.replace(/-/g, " ")}`),
      whyUse: m.evidenceNotes,
      whyUseKid: m.kidFriendly,
      controls: baseControls,
      setupSteps: setupFromHowTo,
      duringUse: [
        step(
          1,
          "Stay in the green zone",
          "Mild productive discomfort may be OK for some movement-based modalities; sharp escalating pain means stop or ease.",
          "Green light feelings OK; red light sharp pain means stop.",
          {}
        ),
        step(
          2,
          "Breathe and monitor",
          "Keep breathing easy; watch for dizziness, numbness changes, or skin issues.",
          "Easy breaths; tell a grown-up if dizzy or weird numb.",
          {}
        ),
      ],
    },
  ];

  // Add a “modified / sensitive” alternate type for home modalities
  if (m.setting !== "clinic") {
    types.push({
      id: `${m.id}-sensitive`,
      name: "Sensitive / high-irritability modification",
      plainLanguage: "Shorter, gentler version when symptoms are louder than usual.",
      kidFriendly: "Whisper version for louder ouch days.",
      differences:
        "Same modality goal with reduced time, intensity, or range. Used on flare or high-pain days so you still practice the skill safely.",
      whenToUse: [
        "Pain ≥6/10 or flare day",
        "After poor sleep or high stress when symptoms spike",
        "First 1–2 practice sessions while learning",
      ],
      whyUse: "Protects confidence and tissue irritability while building proficiency.",
      whyUseKid: "Practice the helper softly so your body still learns without a flare fight.",
      controls: [
        ctrl(
          "dose-time",
          "Session length",
          "How long",
          "Use the shorter end of the range.",
          [
            {
              value: "short",
              label: "Short trial",
              whenToUse: "Irritable days",
              whyThis: "Limits flare risk",
              kidFriendly: "Mini round",
            },
          ],
          "Cut time ~30–50% from standard.",
          "Do about half as long as usual.",
          "short"
        ),
        ctrl(
          "intensity",
          "Intensity",
          "Strength",
          "Stay gentle.",
          [
            {
              value: "gentle",
              label: "Gentle only",
              whenToUse: "Always in this type",
              whyThis: "Irritability protection",
              kidFriendly: "Feather soft",
            },
          ],
          "No pushing into sharp symptoms.",
          "No brave-hero pushing into sharp ouch.",
          "gentle"
        ),
      ],
      setupSteps: [
        step(1, "Choose quiet space", "Reduce distractions; support the body.", "Cozy calm corner.", {}),
        step(2, "Short timer", "Set a shorter timer first.", "Mini timer.", {}),
        step(3, "Gentle dose", "Smallest helpful dose only.", "Tiny helper dose.", {}),
        step(4, "Stop rules", "Stop if symptoms jump sharply or linger worse for hours.", "If ouch jumps up a lot, stop and rest.", {}),
        step(5, "Log result", "Note what happened for your PT/app journal.", "Write what happened for coach.", {}),
      ],
      duringUse: [
        step(1, "Traffic light", "Yellow = ease more; Red = stop.", "Yellow slow; red stop.", {}),
      ],
    });
  } else {
    types.push({
      id: `${m.id}-ask-pt`,
      name: "What to discuss with your PT",
      plainLanguage: "Clinic-only care—your job is good questions and home carryover.",
      kidFriendly: "Clinic super-tool—your job is questions + homework after.",
      differences:
        "You do not self-deliver this modality. You prepare questions, report sensations, and practice the exercises paired with it.",
      whenToUse: ["Before visits when this may be offered", "After visits when it was used"],
      whyUse: "Shared decision-making improves safety and home program success.",
      whyUseKid: "Talking with your coach makes clinic tools safer and homework clearer.",
      controls: [
        ctrl(
          "questions",
          "Questions to ask",
          "Curious questions",
          "Prep 2–3 questions.",
          [
            {
              value: "why",
              label: "Why this tool for my goal?",
              whenToUse: "Every time it’s used",
              whyThis: "Links passive care to function goals",
              kidFriendly: "Why this helper for my goal?",
            },
            {
              value: "home",
              label: "What do I do at home after?",
              whenToUse: "End of visit",
              whyThis: "Active care is the long game",
              kidFriendly: "What’s my homework after?",
            },
          ],
          "Write questions in the app pre-visit list.",
          "Write questions in your notebook/app.",
          "why"
        ),
      ],
      setupSteps: [
        step(1, "List goals", "Bring 2 function goals to the visit.", "Bring 2 wishes for what you want to do better.", {}),
        step(2, "Share history", "Tell about prior response to similar tools.", "Tell if a similar helper helped or hurt before.", {}),
        step(3, "During treatment", "Report pain quality changes in simple words.", "Use simple words: better, same, worse, tingly…", {}),
        step(4, "Teach-back", "Repeat home instructions in your own words.", "Teach the homework back like a teacher.", {}),
        step(5, "Schedule HEP", "Calendar the first home session same day.", "Put homework on the calendar today.", {}),
      ],
      duringUse: [
        step(1, "Communicate", "Speak up about sharp pain or fear.", "Use your voice—sharp pain or scared feelings matter.", {}),
      ],
    });
  }

  return types;
}

function kidify(line: string): string {
  const s = line
    .replace(/clinician|physical therapist|PT/gi, "coach")
    .replace(/contraindications?/gi, "reasons to skip")
    .replace(/intensity/gi, "strength")
    .replace(/duration/gi, "time");
  if (s.length < 120) return s;
  return s.slice(0, 110) + "…";
}

function buildDefaultGuide(m: Modality): ModalityGuide {
  const types = categoryTypes(m);
  return {
    mission: `${m.clinicalIntent} Use this modality as an adjunct to your stretch and exercise program.`,
    missionKid: m.kidFriendly,
    whatYouNeed: [
      "Quiet space and timer",
      "Any equipment named in the steps",
      "Your pain scale (0–10)",
      "Your written plan / app routine nearby",
    ],
    whatYouNeedKid: ["Timer", "Helper tools for this activity", "Ouch number", "Your movement plan"],
    safetyChecklist: [
      ...m.contraindications.slice(0, 4).map((c) => ({
        item: c,
        kidFriendly: `Skip if: ${kidify(c)}`,
      })),
      ...m.precautions.slice(0, 3).map((p) => ({
        item: p,
        kidFriendly: `Be careful: ${kidify(p)}`,
      })),
      {
        item: "Stop for red-flag symptoms (chest pain, progressive weakness, bowel/bladder changes, fever with spinal pain, trauma).",
        kidFriendly: "Emergency feelings (chest pain, can’t move a part, bathroom accidents with back pain) → get grown-up/medical help.",
      },
    ],
    types,
    commonSetupSteps: [
      step(1, "Read the goal", m.plainLanguage, m.kidFriendly, {}),
      step(
        2,
        "Safety scan",
        `Review contraindications: ${m.contraindications.slice(0, 3).join("; ") || "none listed—still use common sense"}.`,
        "Quick safety check before starting.",
        {}
      ),
      step(
        3,
        "Pick type & settings",
        "Choose Standard or Sensitive modification; set time and intensity controls.",
        "Pick normal or whisper version; set timer and gentle strength.",
        {}
      ),
    ],
    duringUseSteps: [
      step(
        1,
        "Stay present",
        "Focus on form/safety cues; do not push through sharp escalating pain.",
        "Pay attention; no pushing through sharp ouch rockets.",
        {}
      ),
    ],
    afterUseSteps: [
      step(
        1,
        "Re-rate pain",
        "Note pain 0–10 and readiness for your stretch/exercise program.",
        "New ouch number? Ready to move?",
        {}
      ),
      step(
        2,
        "Bridge to movement",
        "If this was pre-session/pre-visit prep, start your mobility/strength plan next.",
        "If this was a warm-up helper, do your stretches/exercises next.",
        {}
      ),
      step(
        3,
        "Log in app",
        "Mark helpful/not helpful so future suggestions improve.",
        "Tap if it helped—teach the app.",
        {}
      ),
    ],
    troubleshooting: [
      {
        problem: "Symptoms worse after",
        fix: "Use Sensitive type next time; shorten dose; discuss with PT if lasting >24–48h.",
        kidFriendly: "Try whisper version next time; tell coach if still worse tomorrow.",
      },
      {
        problem: "Not sure you did it right",
        fix: "Use teach-back: explain steps out loud; re-read setup; ask Jeffery or your PT.",
        kidFriendly: "Teach a stuffed animal the steps—if you get stuck, ask for help.",
      },
    ],
    proficiencyTips: [
      {
        tip: "Practice setup 3 times the same way to build automatic skill.",
        kidFriendly: "Do the setup the same way three times to become a pro.",
      },
      {
        tip: `Outcome links to watch: ${m.outcomeLinks.slice(0, 3).join("; ")}.`,
        kidFriendly: "Watch if daily life moves get easier—not only the ouch number.",
      },
      {
        tip: m.evidenceNotes,
        kidFriendly: "Helpers are sidekicks; your movement practice is the hero.",
      },
    ],
    successMarkers: [
      {
        marker: "Independent setup without reading every line",
        kidFriendly: "You can set up almost from memory",
      },
      {
        marker: "Links modality to the active program (not used in isolation forever)",
        kidFriendly: "You use the helper AND do your stretches/exercises",
      },
      {
        marker: m.outcomeLinks[0] || "Comfort or function improvement",
        kidFriendly: "Something important gets a little easier",
      },
    ],
    doNotList: [
      ...m.contraindications.slice(0, 5),
      "Do not use modalities as a reason to skip prescribed exercise long-term",
    ],
    estimatedSetupMinutes: "3–8",
  };
}

/** Optional extra types layered onto defaults for specific IDs */
const CUSTOM_GUIDES: Partial<Record<string, ModalityGuide>> = {
  "mod-tens-education": TENS_GUIDE,
  "mod-moist-heat": HEAT_GUIDE,
  "mod-dry-heat": {
    ...HEAT_GUIDE,
    types: HEAT_GUIDE.types.filter((t) => t.id === "heat-dry" || t.id === "heat-moist"),
  },
  "mod-warm-shower": {
    ...HEAT_GUIDE,
    types: HEAT_GUIDE.types.filter((t) => t.id === "heat-shower"),
  },
  "mod-heat-before-strength": HEAT_GUIDE,
  "mod-ice-pack": ICE_GUIDE,
  "mod-ice-massage": {
    ...ICE_GUIDE,
    types: ICE_GUIDE.types.filter((t) => t.id === "ice-massage" || t.id === "ice-pack"),
  },
  "mod-cold-compression": ICE_GUIDE,
  "mod-ice-after-strength": ICE_GUIDE,
  "mod-postvisit-ice-or-heat": {
    mission:
      "Choose heat for stiffness-dominant comfort or ice for hot/irritable post-load patterns—then reassess which helped your next movement session.",
    missionKid: "Pick warm hug for rusty-stiff or cold pillow for hot-grumpy—then see which helps you move better.",
    whatYouNeed: ["Heat option", "Ice option", "Towel barriers", "Timer", "Pain log"],
    whatYouNeedKid: ["Warm helper", "Cold helper", "Towels", "Timer"],
    safetyChecklist: [...HEAT_GUIDE.safetyChecklist, ...ICE_GUIDE.safetyChecklist].slice(0, 6),
    types: [...HEAT_GUIDE.types, ...ICE_GUIDE.types],
    commonSetupSteps: [
      step(
        1,
        "Pick by pattern",
        "Stiff/morning/better with warmth → heat. Hot/swollen/worse after load → ice. Unsure → try one for 2–3 days and log.",
        "Rusty → warm. Hot puffy → cold. Not sure → test and write it down.",
        {}
      ),
    ],
    duringUseSteps: HEAT_GUIDE.duringUseSteps,
    afterUseSteps: [
      step(1, "Compare", "Note pain and motion 30–60 min later.", "How do you feel a little later?", {}),
      step(2, "Move", "Do prescribed mobility/strength.", "Do homework moves.", {}),
    ],
    troubleshooting: [...HEAT_GUIDE.troubleshooting, ...ICE_GUIDE.troubleshooting],
    proficiencyTips: [
      {
        tip: "Do not alternate randomly every hour—change based on pattern data.",
        kidFriendly: "Don’t flip-flop every minute—use your science notes.",
      },
    ],
    successMarkers: [
      {
        marker: "You can explain why you chose heat vs ice today",
        kidFriendly: "You can tell why you picked warm or cold",
      },
    ],
    doNotList: [...HEAT_GUIDE.doNotList, ...ICE_GUIDE.doNotList],
    estimatedSetupMinutes: "5",
  },
};

/** Foam roll & soft tissue multi-density types */
function foamRollGuide(m: Modality): ModalityGuide {
  const g = buildDefaultGuide(m);
  g.types = [
    {
      id: "foam-soft",
      name: "Soft / low-density roller",
      plainLanguage: "Gentler roller for beginners or irritable tissue.",
      kidFriendly: "Squishy rolling pin.",
      differences: "Less pressure than firm foam or textured rollers—start here if new or sore.",
      whenToUse: ["First sessions", "High soreness days", "Older adults new to rolling"],
      whyUse: "Teaches technique with lower irritability risk.",
      whyUseKid: "Learn rolling without big ouches.",
      controls: [
        ctrl(
          "pressure",
          "Body pressure",
          "How hard you lean",
          "Support with hands/feet so pressure stays comfortable.",
          [
            {
              value: "light",
              label: "Light",
              whenToUse: "Default start",
              whyThis: "Skill before force",
              kidFriendly: "Feather lean",
            },
            {
              value: "moderate",
              label: "Moderate",
              whenToUse: "When light is easy",
              whyThis: "Slightly more input",
              kidFriendly: "Medium lean",
            },
          ],
          "You should breathe and talk in full sentences.",
          "If you can’t talk, it’s too hard.",
          "light"
        ),
        ctrl(
          "time-per-region",
          "Time per region",
          "Roll time",
          "30–90 seconds per large muscle group.",
          [
            {
              value: "30-90s",
              label: "30–90 sec",
              whenToUse: "Standard",
              whyThis: "Enough without over-irritating",
              kidFriendly: "One short song verse",
            },
          ],
          "Keep rolling; don’t park on bony spots.",
          "Keep moving—no parking on bones.",
          "30-90s"
        ),
      ],
      setupSteps: [
        step(1, "Choose soft roller", "Pick low-density foam.", "Squishy roller first.", {}),
        step(2, "Mat space", "Clear floor space.", "Clear floor runway.", {}),
        step(3, "Region map", "Quads, calves, glutes, upper back—avoid lumbar spine bones.", "Big muscles only—not pokey spine bones.", {}),
        step(4, "Light lean + roll", "Slow rolls 30–90s.", "Slow rolls, soft lean.", {}),
        step(5, "Stand and move", "Follow with mobility or strength.", "Stand up and do your moves.", {}),
      ],
      duringUse: [
        step(1, "Breathe", "No breath-holding.", "Breathe like a calm dragon.", {}),
      ],
    },
    {
      id: "foam-firm",
      name: "Firm / standard roller",
      plainLanguage: "Firmer foam for experienced users with low irritability.",
      kidFriendly: "Firmer rolling pin.",
      differences: "More pressure; higher skill demand; not first choice on flare days.",
      whenToUse: ["After technique is solid", "Athletic recovery when not flared"],
      whyUse: "Deeper pressure preference for some users—still short-term effect.",
      whyUseKid: "Stronger roll when you’re already good at soft rolling.",
      controls: [
        ctrl(
          "pressure",
          "Pressure",
          "Lean strength",
          "Still able to breathe easily.",
          [
            {
              value: "moderate",
              label: "Moderate",
              whenToUse: "Default for firm roller",
              whyThis: "Avoid bruising",
              kidFriendly: "Medium, not crush",
            },
          ],
          "If bruised later, reduce pressure/time.",
          "Bruises mean too hard.",
          "moderate"
        ),
      ],
      setupSteps: [
        step(1, "Confirm readiness", "No acute flare; soft roller already mastered.", "Not a flare day; you already know soft rolling.", {}),
        step(2, "Same region rules", "Muscle bellies only.", "Soft muscle pillows only.", {}),
        step(3, "Shorter first bout", "Start 30–45s/region.", "Shorter first.", {}),
        step(4, "Reassess", "Pain and function after.", "Check ouch after.", {}),
        step(5, "Active follow-through", "Mobility/strength next.", "Do homework moves.", {}),
      ],
      duringUse: [
        step(1, "Avoid spine bones", "Do not crush lumbar spinous processes.", "No rolling on bumpy back bones.", {}),
      ],
    },
  ];
  g.mission =
    "Use foam rolling for short-term comfort/ROM prep—then do your real mobility and strength work.";
  return g;
}

const FOAM_IDS = new Set(["mod-foam-roll", "mod-lacrosse-ball", "mod-percussion-gun"]);

export function getModalityGuide(modality: Modality): ModalityGuide {
  const custom = CUSTOM_GUIDES[modality.id];
  if (custom) return custom;
  if (FOAM_IDS.has(modality.id)) {
    return foamRollGuide(modality);
  }
  return buildDefaultGuide(modality);
}

export function getModalityType(
  modality: Modality,
  typeId?: string
): ModalityTypeOption | undefined {
  const guide = getModalityGuide(modality);
  if (!typeId) return guide.types[0];
  return guide.types.find((t) => t.id === typeId) || guide.types[0];
}

export function getModalityWithGuide(id: string): ModalityWithGuide | undefined {
  const m = getModalityById(id);
  if (!m) return undefined;
  return { ...m, guide: getModalityGuide(m) };
}

export function listModalitiesWithGuides(
  opts?: Parameters<typeof listModalities>[0]
): ModalityWithGuide[] {
  return listModalities(opts).map((m) => ({ ...m, guide: getModalityGuide(m) }));
}
