import type { BodyPart, PainProfile } from "@/lib/types";
import { v4 as uuid } from "uuid";

const LS_KEY = "motionrx-pain-profile";

export function loadLocalPainProfile(): PainProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as PainProfile) : null;
  } catch {
    return null;
  }
}

export function saveLocalPainProfile(
  partial: Omit<PainProfile, "id" | "updatedAt"> & { id?: string }
): PainProfile {
  const profile: PainProfile = {
    id: partial.id || uuid(),
    userId: partial.userId,
    descriptorIds: partial.descriptorIds,
    conditionIds: partial.conditionIds,
    freeText: partial.freeText,
    overallPain: partial.overallPain,
    areas: partial.areas,
    source: partial.source,
    ageYears: partial.ageYears,
    borgTargetId: partial.borgTargetId,
    restingHr: partial.restingHr,
    precautionIds: partial.precautionIds,
    implantIds: partial.implantIds,
    orthoticIds: partial.orthoticIds,
    prostheticIds: partial.prostheticIds,
    assistiveDeviceIds: partial.assistiveDeviceIds,
    protocolNotes: partial.protocolNotes,
    homeBasedProgram: partial.homeBasedProgram,
    adjectiveSummary: partial.adjectiveSummary,
    medications: partial.medications,
    occupations: partial.occupations,
    clinicalSymptomIds: partial.clinicalSymptomIds,
    adlEntries: partial.adlEntries,
    sex: partial.sex,
    pastMedicalHistory: partial.pastMedicalHistory,
    currentMedicalHistory: partial.currentMedicalHistory,
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(profile));
  } catch {
    /* ignore quota */
  }
  return profile;
}

export function mergeDescriptorIds(...lists: (string[] | undefined)[]): string[] {
  const set = new Set<string>();
  for (const list of lists) {
    for (const id of list || []) set.add(id);
  }
  return Array.from(set);
}

export function averagePainFromAreas(
  painLevels: Partial<Record<BodyPart, number>>,
  areas: BodyPart[]
): number {
  if (!areas.length) return 0;
  return (
    areas.reduce((n, a) => n + (painLevels[a] ?? 0), 0) / Math.max(areas.length, 1)
  );
}
