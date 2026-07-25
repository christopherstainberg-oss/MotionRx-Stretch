/**
 * Shared structure for detailed, proficiency-focused modality instructions.
 * Every modality uses this shape (types/settings when relevant).
 */

export interface InstructionStep {
  order: number;
  title: string;
  instruction: string;
  kidFriendly: string;
  safetyNote?: string;
  tip?: string;
}

export interface ModalityControlOption {
  value: string;
  label: string;
  whenToUse: string;
  whyThis: string;
  kidFriendly: string;
}

export interface ModalityControl {
  id: string;
  name: string;
  kidFriendlyName: string;
  description: string;
  options: ModalityControlOption[];
  recommendedDefault?: string;
  howToSet: string;
  howToSetKid: string;
}

/** One “kind” of a modality (e.g. conventional vs acupuncture-like TENS). */
export interface ModalityTypeOption {
  id: string;
  name: string;
  plainLanguage: string;
  kidFriendly: string;
  differences: string;
  whenToUse: string[];
  whyUse: string;
  whyUseKid: string;
  controls: ModalityControl[];
  setupSteps: InstructionStep[];
  duringUse: InstructionStep[];
}

export interface ModalityGuide {
  mission: string;
  missionKid: string;
  whatYouNeed: string[];
  whatYouNeedKid: string[];
  safetyChecklist: Array<{ item: string; kidFriendly: string }>;
  /** Multi-type options (always ≥1; “standard” if only one way) */
  types: ModalityTypeOption[];
  commonSetupSteps: InstructionStep[];
  duringUseSteps: InstructionStep[];
  afterUseSteps: InstructionStep[];
  troubleshooting: Array<{ problem: string; fix: string; kidFriendly: string }>;
  proficiencyTips: Array<{ tip: string; kidFriendly: string }>;
  successMarkers: Array<{ marker: string; kidFriendly: string }>;
  doNotList: string[];
  estimatedSetupMinutes: string;
}
