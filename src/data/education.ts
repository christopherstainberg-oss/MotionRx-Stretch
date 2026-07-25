export interface EducationArticle {
  id: string;
  title: string;
  summary: string;
  category: "stretching-science" | "injury-prevention" | "pt-clinic" | "wellness";
  readMinutes: number;
  body: string[];
}

export const EDUCATION_ARTICLES: EducationArticle[] = [
  {
    id: "why-stretch",
    title: "Why Stretching Helps (and When It Doesn’t)",
    summary:
      "What the evidence says about flexibility, mobility, and warm-ups—explained like a PT would in clinic.",
    category: "stretching-science",
    readMinutes: 5,
    body: [
      "Stretching is not magic—it is a tool. Physical therapists use it to improve comfort with movement, reduce stiffness after inactivity, and prepare tissues for activity when paired with warm-up movement.",
      "Static holds (holding still) are often useful after activity or for general flexibility goals. Dynamic mobility (moving through a range) is often preferred before sports or lifting.",
      "If a stretch causes sharp pain, numbness, tingling that travels, or dizziness, stop and modify. Soreness like a gentle pull is different from pain that feels wrong.",
      "Your MotionRx Stretch routines follow outpatient-style dosing: warm-up → mobility → key stretches → cool-down reflection, with pain-scale checks to progress or ease intensity.",
    ],
  },
  {
    id: "pain-scale-clinic",
    title: "Using a Pain Scale Like an Outpatient PT",
    summary:
      "0–10 ratings help decide whether to progress, hold, or regress a program safely.",
    category: "pt-clinic",
    readMinutes: 4,
    body: [
      "In clinic, therapists often aim for “productive discomfort” around 0–3/10 for many mobility drills, and they avoid pushing through sharp or worsening pain.",
      "Rule of thumb used in this app: pain ≤ 3 and improving → may progress difficulty or duration. Pain 4–5 → hold or modify. Pain ≥ 6 → regress variation and reduce volume; consider professional care if it persists.",
      "Always compare pain before and after a session. If pain rises by more than 2 points and stays elevated, the next session should be gentler.",
      "This is educational support—not a diagnosis. Red flags (chest pain, unexplained weakness, bowel/bladder changes, fever with back pain) need urgent medical care.",
    ],
  },
  {
    id: "injury-prevention-basics",
    title: "Injury Prevention Basics for Daily Life",
    summary:
      "Load management, posture variety, and recovery habits that reduce overuse risk.",
    category: "injury-prevention",
    readMinutes: 6,
    body: [
      "Most overuse issues come from doing “a little too much, a little too soon,” not from one perfect stretch you forgot.",
      "Change positions often. Sitting or standing all day both stress tissues; micro-breaks every 30–60 minutes help.",
      "Strength and control matter as much as flexibility. Stretching a tight area without building stability can feel good short-term but not solve the job demand.",
      "Sleep, hydration, and gradual training progression are part of “stretching success” even though they are not stretches.",
    ],
  },
  {
    id: "form-breathing",
    title: "Breathing, Alignment, and Form Cues",
    summary:
      "How to make every stretch safer and more effective with simple breath and posture rules.",
    category: "stretching-science",
    readMinutes: 4,
    body: [
      "Breathe out slowly as you ease into a stretch. Holding your breath raises tension and can make form worse.",
      "Lengthen tall through the spine first, then move into the stretch. Collapsing the chest or rounding aggressively often shifts load to the wrong place.",
      "Move slowly. Fast bouncing (ballistic stretching) is rarely needed for general wellness and can increase risk for many people.",
      "Kid-friendly cue used in the app: “Grow like a tree, then gently lean—never yank the branches.”",
    ],
  },
  {
    id: "when-to-see-pt",
    title: "When Home Stretching Is Not Enough",
    summary:
      "Signs you should see a licensed physical therapist or physician.",
    category: "pt-clinic",
    readMinutes: 3,
    body: [
      "See a licensed professional if pain is severe, worsening over days, follows trauma, or limits walking, sleep, or work.",
      "Neurologic signs—numbness, tingling in a limb, weakness, or coordination loss—need clinical evaluation.",
      "This app can support home programs and education. It does not replace individualized evaluation, imaging decisions, or hands-on care.",
      "You can export journal entries to share with your provider for more personalized guidance.",
    ],
  },
  {
    id: "consistency-wellness",
    title: "Consistency Beats Hero Sessions",
    summary:
      "Why short daily mobility often outperforms occasional long sessions.",
    category: "wellness",
    readMinutes: 3,
    body: [
      "Tissues adapt to regular, tolerable load. Ten focused minutes most days usually beats one hour once a week.",
      "Use reminders and journal check-ins to build the habit. Celebrate showing up—not only hitting a personal record.",
      "If life is busy, choose a “minimum effective dose” routine (5–8 minutes) rather than skipping entirely.",
    ],
  },
];
