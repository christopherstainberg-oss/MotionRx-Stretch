import type { AppNameOption } from "@/lib/types";

/** Ten branding options for the Physical Therapy Stretching Application */
export const APP_NAME_OPTIONS: AppNameOption[] = [
  {
    id: "flexacare",
    name: "FlexaCare",
    tagline: "Clinically guided flexibility, every day",
    rationale:
      "Pairs flexibility (Flexa) with clinical care. Clear, professional, easy to say and spell.",
  },
  {
    id: "stretchpath-pt",
    name: "StretchPath PT",
    tagline: "Your path from stiffness to strength",
    rationale:
      "Emphasizes progressive pathways designed like outpatient PT plans of care.",
  },
  {
    id: "mobilify",
    name: "Mobilify",
    tagline: "Move better. Feel stronger.",
    rationale:
      "Modern product name focused on mobility outcomes rather than only static stretching.",
  },
  {
    id: "rangeready",
    name: "RangeReady",
    tagline: "Restore range. Stay ready.",
    rationale:
      "Highlights range of motion (ROM) goals common in physical therapy clinics.",
  },
  {
    id: "therastretch",
    name: "TheraStretch",
    tagline: "Therapeutic stretching, simplified",
    rationale:
      "Signals therapeutic intent and clinical credibility for patients and providers.",
  },
  {
    id: "flexguide-pro",
    name: "FlexGuide Pro",
    tagline: "Evidence-based guidance you can trust",
    rationale:
      "Positions the app as a guided coach with professional-grade education.",
  },
  {
    id: "recoveryrange",
    name: "RecoveryRange",
    tagline: "From recovery to lasting mobility",
    rationale:
      "Connects post-injury recovery with long-term range and wellness habits.",
  },
  {
    id: "stretchclinic",
    name: "StretchClinic",
    tagline: "Outpatient-quality routines at home",
    rationale:
      "Evokes the outpatient PT clinic experience: assessment, progression, safety.",
  },
  {
    id: "motionrx",
    name: "MotionRx Stretch",
    tagline: "Prescribed motion for real life",
    rationale:
      "Rx framing matches how PTs dose mobility work—pain-aware and progressive.",
  },
  {
    id: "pt-flex-journal",
    name: "PT Flex Journal",
    tagline: "Stretch, track, reflect, improve",
    rationale:
      "Leads with journaling and outcomes tracking alongside the stretch library.",
  },
];

/** Official brand chosen by the product owner */
export const DEFAULT_APP_NAME =
  APP_NAME_OPTIONS.find((o) => o.id === "motionrx") ?? APP_NAME_OPTIONS[0]!;
