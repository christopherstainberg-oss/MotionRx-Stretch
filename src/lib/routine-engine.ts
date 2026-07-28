import type { Routine, RoutineItem } from "@/lib/types";
import { v4 as uuid } from "uuid";

export {
  generateHybridPlan,
  generateRoutine,
  adjustRoutineFromFeedback,
  rotateRoutineItem,
  rotateEntireRoutine,
  addMovementToRoutine,
  removeItemFromRoutine,
  ensureRoutineItems,
  addModalityToRoutine,
  addModalitiesToRoutine,
  updateRoutineModality,
  removeModalityFromRoutine,
  modalitiesForPhase,
  parseConcernParagraph,
  matchDescriptorsFromText,
  analyzeParagraphDescriptors,
  applyHomeBasedProgram,
  buildClinicalSafetyPlan,
  analyzeAssessmentAdjectives,
  generateProgram,
  createProgramCreationInputFromSymptom,
  planDrift,
  formatProgramPhasesText,
} from "@/lib/plan-engine";

function itemsFrom(
  stretches: string[],
  exercises: string[] = []
): { items: RoutineItem[]; stretchIds: string[]; exerciseIds: string[] } {
  const items: RoutineItem[] = [
    ...stretches.map((movementId) => ({
      id: uuid(),
      movementId,
      kind: "stretch" as const,
      rotationSeed: 0,
    })),
    ...exercises.map((movementId) => ({
      id: uuid(),
      movementId,
      kind: "exercise" as const,
      rotationSeed: 0,
    })),
  ];
  return { items, stretchIds: stretches, exerciseIds: exercises };
}

export const STARTER_ROUTINES: Omit<Routine, "id" | "createdAt">[] = [
  {
    name: "Desk Reset (10–12 min)",
    description: "Neck, chest, thoracic mobility + light scapular strength for screen-heavy days.",
    focusAreas: ["neck", "chest", "thoracic", "wrists"],
    ...itemsFrom(
      ["cat-cow", "chin-tuck", "upper-trap-stretch", "doorway-chest-stretch", "open-book-thoracic", "wrist-flexor-extensor"],
      ["ex-scapular-rows-band", "ex-thoracic-extension-foam"]
    ),
    estimatedMinutes: 14,
    difficulty: "beginner",
    isPersonalized: false,
    selfAdjustHistory: [],
  },
  {
    name: "Low Back Ease + Control",
    description: "Gentle lumbar mobility with glute activation—pain-aware outpatient style.",
    focusAreas: ["lower-back", "glutes", "hips", "core"],
    ...itemsFrom(
      ["cat-cow", "pelvic-tilt", "knee-to-chest", "figure-four-glute", "childs-pose"],
      ["ex-glute-bridge", "ex-bird-dog", "ex-dead-bug"]
    ),
    estimatedMinutes: 16,
    difficulty: "beginner",
    isPersonalized: false,
    selfAdjustHistory: [],
  },
  {
    name: "Hip & Hamstring Flow",
    description: "Sitting recovery: hip flexor/hamstring mobility plus lateral hip strength.",
    focusAreas: ["hips", "hamstrings", "glutes"],
    ...itemsFrom(
      ["cat-cow", "half-kneeling-hip-flexor", "supine-hamstring-strap", "figure-four-glute", "childs-pose"],
      ["ex-side-lying-abduction", "ex-glute-bridge"]
    ),
    estimatedMinutes: 16,
    difficulty: "intermediate",
    isPersonalized: false,
    selfAdjustHistory: [],
  },
  {
    name: "Athletic Prep (Mobility + Strength)",
    description: "Dynamic mobility with functional lower-body activation before activity.",
    focusAreas: ["full-body", "hips", "thoracic", "ankles"],
    ...itemsFrom(
      ["cat-cow", "worlds-greatest-stretch", "gastroc-wall", "open-book-thoracic"],
      ["ex-sit-to-stand", "ex-heel-raises", "ex-step-up"]
    ),
    estimatedMinutes: 18,
    difficulty: "intermediate",
    isPersonalized: false,
    selfAdjustHistory: [],
  },
];
