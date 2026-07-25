export type BodyPart =
  | "neck"
  | "shoulders"
  | "upper-back"
  | "lower-back"
  | "chest"
  | "hips"
  | "glutes"
  | "hamstrings"
  | "quadriceps"
  | "calves"
  | "ankles"
  | "wrists"
  | "full-body"
  | "thoracic"
  | "core";

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

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
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
}

/** Saved pain description profile correlated across the app */
export interface PainProfile {
  id: string;
  userId: string;
  updatedAt: string;
  descriptorIds: string[];
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
    "sessions" | "journal" | "pain" | "goals" | "jeffery" | "routines" | "descriptors"
  >;
  recommendation?: string;
  at: string;
  relatedDescriptorIds?: string[];
}
