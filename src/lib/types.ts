/**
 * Expanded regional targets for outpatient-style PT programming.
 * Includes joint-level and functional-region labels used in common
 * outcome measures (NDI, ODI, LEFS, QuickDASH, KOOS, FAAM, etc.).
 */
export type BodyPart =
  | "neck"
  | "jaw"
  | "shoulders"
  | "scapular"
  | "upper-back"
  | "thoracic"
  | "chest"
  | "lower-back"
  | "pelvis"
  | "hips"
  | "groin"
  | "glutes"
  | "hamstrings"
  | "quadriceps"
  | "knee"
  | "calves"
  | "shins"
  | "ankles"
  | "foot"
  | "toes"
  | "elbow"
  | "forearm"
  | "wrists"
  | "hand"
  | "core"
  | "full-body";

export type Difficulty = "beginner" | "intermediate" | "advanced";
export type DurationBucket = "under-1-min" | "1-2-min" | "2-5-min" | "5-plus-min";
export type MovementKind = "stretch" | "exercise";
export type ExerciseCategory =
  | "strength"
  | "activation"
  | "motor-control"
  | "mobility"
  | "balance"
  | "endurance"
  | "postural"
  | "neural"
  | "functional";

export interface StretchStep {
  order: number;
  instruction: string;
  kidFriendly: string;
  holdSeconds?: number;
  breaths?: number;
  reps?: number;
  sets?: number;
  cues: string[];
}

export interface StretchVariation {
  id: string;
  name: string;
  difficulty: Difficulty;
  description: string;
  modifications: string[];
  contraindications: string[];
  painMaxRecommended: number;
}

export interface ClinicalWhy {
  /** What the movement does biomechanically / physiologically */
  whatItDoes: string;
  /** Why it matters for the user */
  whyImportant: string;
  /** Clinically significant outcome education */
  clinicalOutcome: string;
  /** How it maps to outpatient PT standards */
  outpatientRationale: string;
}

export interface Stretch {
  id: string;
  name: string;
  slug: string;
  kind: "stretch";
  bodyParts: BodyPart[];
  primaryMuscles: string[];
  difficulty: Difficulty;
  durationSeconds: number;
  durationBucket: DurationBucket;
  benefits: string[];
  risks: string[];
  breathing: string;
  alignment: string;
  posture: string;
  warmUpNotes: string;
  steps: StretchStep[];
  variations: StretchVariation[];
  video: {
    youtubeId: string;
    title: string;
    source: string;
    institution: string;
  };
  evidenceNotes: string;
  clinical: ClinicalWhy;
  equipment: string[];
  tags: string[];
}

export interface Exercise {
  id: string;
  name: string;
  slug: string;
  kind: "exercise";
  category: ExerciseCategory;
  bodyParts: BodyPart[];
  primaryMuscles: string[];
  difficulty: Difficulty;
  durationSeconds: number;
  durationBucket: DurationBucket;
  benefits: string[];
  risks: string[];
  breathing: string;
  alignment: string;
  posture: string;
  warmUpNotes: string;
  steps: StretchStep[];
  variations: StretchVariation[];
  video: {
    youtubeId: string;
    title: string;
    source: string;
    institution: string;
  };
  evidenceNotes: string;
  clinical: ClinicalWhy;
  equipment: string[];
  tags: string[];
  defaultSets: number;
  defaultReps: string;
}

export type Movement = Stretch | Exercise;

export interface RoutineItem {
  id: string;
  movementId: string;
  kind: MovementKind;
  /** Optional user-picked variation id */
  variationId?: string;
  notes?: string;
  /** Stable slot for per-item rotation */
  rotationSeed?: number;
}

/**
 * Modality attached to a stretch/exercise program.
 * User can flag pre-visit and/or post-visit (and optional session phases).
 */
export interface RoutineModality {
  id: string;
  modalityId: string;
  /** User selected: use before PT visit */
  preVisit: boolean;
  /** User selected: use after PT visit */
  postVisit: boolean;
  /** Also run before home stretch/exercise session */
  preSession?: boolean;
  /** Also run after home stretch/exercise session */
  postSession?: boolean;
  /** Selected multi-type option (e.g. conventional vs burst TENS) */
  variantId?: string;
  notes?: string;
  order?: number;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  /** Increment to invalidate all existing JWTs for this user */
  sessionVersion: number;
  /** Server-assigned avatar object key (never client path) */
  avatarKey?: string;
  createdAt: string;
  preferences: UserPreferences;
  goals: Goal[];
  favorites: string[];
  painBaseline: Partial<Record<BodyPart, number>>;
}

export interface UserPreferences {
  reminderTimes: string[];
  defaultDifficulty: Difficulty;
  sessionLengthMinutes: number;
  notificationsEnabled: boolean;
  offlineVideosPreferred: boolean;
  nameChoice?: string;
  /** UI theme preference: auto | light | dark */
  theme?: "auto" | "light" | "dark";
}

export interface Goal {
  id: string;
  title: string;
  bodyPart?: BodyPart;
  targetDate?: string;
  metric: string;
  baseline?: number;
  current?: number;
  status: "active" | "completed" | "paused";
  createdAt: string;
}

export interface SessionLog {
  id: string;
  userId: string;
  routineId?: string;
  stretchIds: string[];
  exerciseIds?: string[];
  itemIds?: string[];
  startedAt: string;
  completedAt?: string;
  durationMinutes: number;
  averagePainBefore: number;
  averagePainAfter: number;
  painByArea: Partial<Record<BodyPart, { before: number; after: number }>>;
  difficultyFelt: 1 | 2 | 3 | 4 | 5;
  notes?: string;
  completed: boolean;
  source?: "session" | "jeffery" | "builder";
  /** Clinical pain descriptor IDs selected for this session */
  painDescriptorIds?: string[];
  /** Suggested or used modality IDs correlated with this session */
  modalityIds?: string[];
}

export interface JournalEntry {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  body: string;
  mood: 1 | 2 | 3 | 4 | 5;
  painOverall: number;
  bodyParts: BodyPart[];
  flexibilityNote?: string;
  sharedWithProvider: boolean;
  tags: string[];
  /** Clinical pain descriptor IDs for this reflection */
  painDescriptorIds?: string[];
  /** Modalities tried or considered that day */
  modalityIds?: string[];
}

/** Saved pain description profile correlated across the app */
export interface PainProfile {
  id: string;
  userId: string;
  updatedAt: string;
  descriptorIds: string[];
  /** Clinical condition IDs from Assessment paragraph matching */
  conditionIds?: string[];
  freeText?: string;
  overallPain: number;
  areas: BodyPart[];
  source: "assess" | "journal" | "session" | "jeffery" | "manual";
}

export interface Routine {
  id: string;
  userId?: string;
  name: string;
  description: string;
  focusAreas: BodyPart[];
  /** @deprecated prefer items — kept for backward compatibility */
  stretchIds: string[];
  exerciseIds?: string[];
  items: RoutineItem[];
  /** Modalities included in this stretch/exercise program */
  modalities?: RoutineModality[];
  estimatedMinutes: number;
  difficulty: Difficulty;
  isPersonalized: boolean;
  generatedFrom?: {
    symptoms: string[];
    areas: BodyPart[];
    painLevels: Partial<Record<BodyPart, number>>;
    goals: string[];
    concernParagraph?: string;
    suggestedKinds?: MovementKind[];
    painDescriptorIds?: string[];
    descriptorSummary?: string[];
    /** Clinical condition / injury / surgery IDs matched from intake */
    conditionIds?: string[];
    conditionSummary?: string[];
    conditionCategories?: string[];
    conditionSubcategories?: string[];
    /** Evidence-informed outcome targets from matched conditions */
    clinicalOutcomes?: Array<{
      label: string;
      evidenceNote: string;
      timeframe: string;
      measureHint: string;
    }>;
    modalityPlanId?: string;
    suggestedModalityIds?: string[];
  };
  selfAdjustHistory: RoutineAdjustment[];
  createdAt: string;
  updatedAt?: string;
  rotationCount?: number;
}

export interface RoutineAdjustment {
  at: string;
  reason: string;
  painFactor: number;
  action: "progress" | "regress" | "modify" | "hold" | "rotate" | "jeffery";
  details: string;
  source?: "session" | "pain" | "jeffery" | "user" | "builder";
}

export interface AppNameOption {
  id: string;
  name: string;
  tagline: string;
  rationale: string;
}

export interface IconSpec {
  id: string;
  name: string;
  purpose: string;
  relatesTo: string;
  lucide: string;
}

export interface SymptomInput {
  areas: BodyPart[];
  symptoms: string[];
  painLevels: Partial<Record<BodyPart, number>>;
  goals: string[];
  availableMinutes: number;
  difficulty: Difficulty;
  /** Free-text clinical intake paragraph */
  concernParagraph?: string;
  preferKinds?: MovementKind[] | "auto";
  /** Clinical pain descriptor IDs from the descriptor database */
  painDescriptorIds?: string[];
  /** Musculoskeletal injuries, surgeries, and complex medical conditions */
  conditionIds?: string[];
}

export interface JefferyMessage {
  id: string;
  role: "user" | "jeffery" | "system";
  content: string;
  createdAt: string;
  meta?: {
    painMentioned?: number;
    adjustedRoutineId?: string;
    openEndedQuestion?: string;
    clinicalTopics?: string[];
    suggestedModalityIds?: string[];
  };
}

export interface JefferyThread {
  id: string;
  userId: string;
  messages: JefferyMessage[];
  knownAdjustments: string[];
  knownCustomItems: string[];
  lastPainInsight?: number;
  lastDescriptorIds?: string[];
  updatedAt: string;
}

export interface CorrelatedInsight {
  id: string;
  title: string;
  summary: string;
  severity: "info" | "positive" | "caution" | "action";
  sources: Array<
    | "sessions"
    | "journal"
    | "pain"
    | "goals"
    | "jeffery"
    | "routines"
    | "descriptors"
    | "modalities"
  >;
  recommendation?: string;
  at: string;
  relatedDescriptorIds?: string[];
  relatedModalityIds?: string[];
}

/** Scored modality suggestion returned by the engine / APIs */
export interface ModalityRecommendation {
  modalityId: string;
  name: string;
  category: string;
  setting: string;
  timing: string;
  score: number;
  confidence: "high" | "moderate" | "exploratory";
  reasons: string[];
  plainLanguage: string;
  howTo: string[];
  evidenceNotes: string;
  durationMinutes?: string;
  frequency?: string;
  precautions: string[];
  contraindications: string[];
  outcomeLinks: string[];
  homeSafe: boolean;
}

/** Snapshot of pre/post visit and related modality plan */
export interface ModalityPlan {
  id: string;
  userId?: string;
  createdAt: string;
  painScore: number;
  effectivePain: number;
  descriptorIds: string[];
  experienceSummary?: string;
  clinicalFlags: {
    stiffnessDominant: boolean;
    inflammatoryPattern: boolean;
    acuteIrritability: boolean;
    neurologicCaution: boolean;
    postActivitySoreness: boolean;
    highIrritability: boolean;
    redFlags: boolean;
    programBiases: string[];
  };
  narrative: string;
  preVisit: ModalityRecommendation[];
  postVisit: ModalityRecommendation[];
  acuteFlare: ModalityRecommendation[];
  betweenVisits: ModalityRecommendation[];
  preSession: ModalityRecommendation[];
  postSession: ModalityRecommendation[];
  source?: "assess" | "modalities" | "session" | "journal" | "jeffery" | "manual";
}

/** User log that a modality was tried */
export interface ModalityLog {
  id: string;
  userId: string;
  modalityId: string;
  timing: string;
  usedAt: string;
  painBefore?: number;
  painAfter?: number;
  helpful?: boolean;
  notes?: string;
  descriptorIds?: string[];
  context?: "pre-visit" | "post-visit" | "session" | "home" | "flare";
}
