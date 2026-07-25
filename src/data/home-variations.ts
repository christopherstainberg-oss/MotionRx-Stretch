/**
 * Standard home-based program variations for every stretch/exercise.
 * Ensures catalog items always offer equipment-minimal, chair/wall/floor options.
 */

import type { Difficulty, StretchVariation } from "@/lib/types";

const HOME_VARIATIONS: Array<{
  suffix: string;
  name: string;
  difficulty: Difficulty;
  description: string;
  painMax?: number;
}> = [
  {
    suffix: "home-chair",
    name: "Home — chair-supported",
    difficulty: "beginner",
    description:
      "Use a sturdy chair for balance or seated setup. Ideal for apartments and low-equipment HEP.",
    painMax: 4,
  },
  {
    suffix: "home-wall",
    name: "Home — wall-assisted",
    difficulty: "beginner",
    description:
      "Use a wall for support, alignment feedback, or closed-chain assistance. No gym gear required.",
    painMax: 4,
  },
  {
    suffix: "home-floor",
    name: "Home — floor / mat version",
    difficulty: "beginner",
    description:
      "Mat or carpet version with pillows for comfort. Keep ranges mild and stop for sharp pain.",
    painMax: 4,
  },
  {
    suffix: "home-minimal",
    name: "Home — minimal equipment",
    difficulty: "intermediate",
    description:
      "Bodyweight or household items only (towel, water bottle, belt as strap). Clinic machines not required.",
    painMax: 4,
  },
  {
    suffix: "home-short",
    name: "Home — microdose (2–4 min)",
    difficulty: "beginner",
    description:
      "Short bout for desk breaks or low-energy days. Same form, fewer reps/holds.",
    painMax: 5,
  },
];

/** Merge home-based variations into a movement without duplicating existing names */
export function ensureHomeProgramVariations(
  baseId: string,
  existing: StretchVariation[] | undefined
): StretchVariation[] {
  const list = [...(existing ?? [])];
  const names = new Set(list.map((v) => v.name.toLowerCase()));

  for (const h of HOME_VARIATIONS) {
    if (names.has(h.name.toLowerCase())) continue;
    list.push({
      id: `${baseId}-var-${h.suffix}`,
      name: h.name,
      difficulty: h.difficulty,
      description: h.description,
      modifications: [
        "Reduce range",
        "Add pillow/towel support",
        "Shorten hold or reps",
        "Use chair/wall for balance",
      ],
      contraindications: [
        "Acute fracture/surgery without clearance",
        "Unexplained neurological symptoms",
        "Dizziness or chest pain with activity",
      ],
      painMaxRecommended: h.painMax ?? 4,
    });
  }
  return list;
}

export function isHomeVariationId(variationId: string | undefined): boolean {
  if (!variationId) return false;
  return /home-(chair|wall|floor|minimal|short)/i.test(variationId);
}

/** Prefer a home variation id when home-based program is on */
export function pickHomeVariationId(
  variations: StretchVariation[] | undefined
): string | undefined {
  if (!variations?.length) return undefined;
  const preferred = variations.find((v) => /home — chair/i.test(v.name));
  if (preferred) return preferred.id;
  const anyHome = variations.find((v) => /home —/i.test(v.name));
  return anyHome?.id ?? variations[0]?.id;
}
