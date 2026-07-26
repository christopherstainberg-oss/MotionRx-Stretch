import { NextResponse } from "next/server";
import { getActorId, signInRequiredResponse } from "@/lib/auth";
import { readDb, updateDb } from "@/lib/storage";
import type { BodyPart, PainProfile } from "@/lib/types";
import { clientIp, rateLimit, sanitizeText } from "@/lib/rate-limit";
import { clampInt } from "@/lib/security";
import { normalizeSex } from "@/lib/clinical-history";
import { v4 as uuid } from "uuid";

export async function GET() {
  const actor = await getActorId();
    if (!actor) return signInRequiredResponse();
    const { userId } = actor;
  const db = await readDb();
  const profiles = db.painProfiles
    .filter((p) => p.userId === userId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return NextResponse.json({
    profile: profiles[0] ?? null,
    history: profiles.slice(0, 20),
  });
}

export async function POST(req: Request) {
  const limited = rateLimit(`pain-profile:${clientIp(req)}`, {
    limit: 40,
    windowMs: 60 * 1000,
  });
  if (!limited.ok) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const actor = await getActorId();
    if (!actor) return signInRequiredResponse();
    const { userId } = actor;
  const descriptorIds = Array.isArray(body.descriptorIds)
    ? body.descriptorIds.map(String).slice(0, 24)
    : [];

  const conditionIds = Array.isArray(body.conditionIds)
    ? body.conditionIds.map(String).slice(0, 24)
    : [];

  const medications = Array.isArray(body.medications)
    ? body.medications.slice(0, 24).map((m: Record<string, unknown>) => ({
        medicationId: String(m.medicationId || "").slice(0, 160),
        genericName: sanitizeText(String(m.genericName || ""), 120),
        brandName: m.brandName ? sanitizeText(String(m.brandName), 80) : undefined,
        strength: sanitizeText(String(m.strength || ""), 80),
        route: String(m.route || "oral-tablet").slice(0, 40),
        routeLabel: sanitizeText(String(m.routeLabel || m.route || ""), 80),
        doseText: sanitizeText(String(m.doseText || ""), 80),
        frequency: sanitizeText(String(m.frequency || ""), 80),
        asNeeded: Boolean(m.asNeeded),
        notes: m.notes ? sanitizeText(String(m.notes), 300) : undefined,
        primaryUse: m.primaryUse ? sanitizeText(String(m.primaryUse), 300) : undefined,
        classLabel: m.classLabel ? sanitizeText(String(m.classLabel), 80) : undefined,
      }))
    : undefined;

  const profile: PainProfile = {
    id: String(body.id || uuid()),
    userId,
    updatedAt: new Date().toISOString(),
    descriptorIds,
    conditionIds,
    freeText: body.freeText ? sanitizeText(String(body.freeText), 4000) : undefined,
    sex: normalizeSex(body.sex),
    pastMedicalHistory: body.pastMedicalHistory
      ? sanitizeText(String(body.pastMedicalHistory), 2000)
      : undefined,
    currentMedicalHistory: body.currentMedicalHistory
      ? sanitizeText(String(body.currentMedicalHistory), 2000)
      : undefined,
    overallPain: clampInt(Number(body.overallPain), 0, 10, 0),
    areas: (Array.isArray(body.areas) ? body.areas.slice(0, 15) : []) as BodyPart[],
    source: (body.source as PainProfile["source"]) || "manual",
    ageYears: body.ageYears != null ? clampInt(Number(body.ageYears), 5, 110, 0) || undefined : undefined,
    borgTargetId: body.borgTargetId ? String(body.borgTargetId).slice(0, 40) : undefined,
    precautionIds: Array.isArray(body.precautionIds)
      ? body.precautionIds.map(String).slice(0, 30)
      : undefined,
    implantIds: Array.isArray(body.implantIds) ? body.implantIds.map(String).slice(0, 20) : undefined,
    orthoticIds: Array.isArray(body.orthoticIds) ? body.orthoticIds.map(String).slice(0, 20) : undefined,
    prostheticIds: Array.isArray(body.prostheticIds)
      ? body.prostheticIds.map(String).slice(0, 20)
      : undefined,
    assistiveDeviceIds: Array.isArray(body.assistiveDeviceIds)
      ? body.assistiveDeviceIds.map(String).slice(0, 20)
      : undefined,
    protocolNotes: body.protocolNotes
      ? sanitizeText(String(body.protocolNotes), 1000)
      : undefined,
    homeBasedProgram:
      typeof body.homeBasedProgram === "boolean" ? body.homeBasedProgram : undefined,
    medications: medications as PainProfile["medications"],
    clinicalSymptomIds: Array.isArray(body.clinicalSymptomIds)
      ? body.clinicalSymptomIds.map(String).slice(0, 24)
      : undefined,
    adlEntries: Array.isArray(body.adlEntries)
      ? body.adlEntries.slice(0, 24).map((raw: unknown) => {
          const a = raw as {
            adlId?: string;
            label?: string;
            domain?: string;
            assistance?: string;
            notes?: string;
          };
          return {
            adlId: String(a.adlId || "").slice(0, 80),
            label: sanitizeText(String(a.label || ""), 120),
            domain: String(a.domain || "self-care") as import("@/data/adls").UserAdlEntry["domain"],
            assistance: String(
              a.assistance || "independent"
            ) as import("@/data/adls").UserAdlEntry["assistance"],
            notes: a.notes ? sanitizeText(String(a.notes), 200) : undefined,
          };
        })
      : undefined,
  };

  await updateDb((db) => {
    const others = db.painProfiles.filter((p) => p.userId !== userId);
    const mine = db.painProfiles.filter((p) => p.userId === userId && p.id !== profile.id);
    mine.unshift(profile);
    db.painProfiles = [...others, ...mine.slice(0, 50)];
  });

  return NextResponse.json({ profile });
}
