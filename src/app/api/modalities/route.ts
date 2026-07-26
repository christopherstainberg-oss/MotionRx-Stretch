import { NextResponse } from "next/server";
import {
  MODALITY_CATEGORY_LABELS,
  MODALITY_STATS,
  listModalities,
  type ModalityCategory,
  type ModalitySetting,
  type ModalityTiming,
} from "@/data/modalities";
import { getActorId, signInRequiredResponse } from "@/lib/auth";
import {
  buildVisitModalityPlan,
  recommendModalities,
} from "@/lib/modality-engine";
import { readDb, updateDb } from "@/lib/storage";
import type { ModalityPlan } from "@/lib/types";
import { clientIp, rateLimit, sanitizeText } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") || "catalog";

  if (mode === "stats") {
    return NextResponse.json({
      stats: MODALITY_STATS,
      categories: MODALITY_CATEGORY_LABELS,
    });
  }

  if (mode === "recommend" || mode === "plan") {
    const actor = await getActorId();
    if (!actor) return signInRequiredResponse();
    const { userId } = actor;
    const db = await readDb();
    const painScore = Number(searchParams.get("pain") ?? 3);
    const timing = (searchParams.get("timing") as ModalityTiming) || "between-visits";
    const setting = (searchParams.get("setting") as ModalitySetting | "all") || "all";
    const q = searchParams.get("q") || undefined;
    const descriptorIds = (searchParams.get("descriptors") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 24);

    const sessions = db.sessions
      .filter((s) => s.userId === userId)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .slice(0, 8);
    const journal = db.journal
      .filter((j) => j.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);

    // Fall back to latest pain profile descriptors
    let desc = descriptorIds;
    if (!desc.length) {
      const profile = db.painProfiles
        .filter((p) => p.userId === userId)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
      desc = profile?.descriptorIds || [];
    }

    const experienceText =
      q ||
      journal[0]?.body ||
      sessions[0]?.notes ||
      undefined;

    if (mode === "plan") {
      const plan = buildVisitModalityPlan({
        painScore: Number.isFinite(painScore) ? painScore : 3,
        descriptorIds: desc,
        experienceText,
        recentSessions: sessions,
        recentJournal: journal,
        settingPreference: setting,
      });
      return NextResponse.json({
        plan,
        stats: MODALITY_STATS,
        categories: MODALITY_CATEGORY_LABELS,
      });
    }

    const recommendations = recommendModalities({
      painScore: Number.isFinite(painScore) ? painScore : 3,
      descriptorIds: desc,
      experienceText,
      timing,
      settingPreference: setting,
      recentSessions: sessions,
      recentJournal: journal,
      limit: Number(searchParams.get("limit") || 8),
    }).map((s) => ({
      modalityId: s.modality.id,
      name: s.modality.name,
      category: s.modality.category,
      setting: s.modality.setting,
      timing: s.timing,
      score: Math.round(s.score * 10) / 10,
      confidence: s.confidence,
      reasons: s.reasons,
      plainLanguage: s.modality.plainLanguage,
      howTo: s.modality.howTo,
      evidenceNotes: s.modality.evidenceNotes,
      durationMinutes: s.modality.durationMinutes,
      frequency: s.modality.frequency,
      precautions: s.modality.precautions,
      contraindications: s.modality.contraindications,
      outcomeLinks: s.modality.outcomeLinks,
      homeSafe: s.modality.setting === "home" || s.modality.setting === "either",
    }));

    return NextResponse.json({
      recommendations,
      stats: MODALITY_STATS,
      timing,
    });
  }

  if (mode === "history") {
    const actor = await getActorId();
    if (!actor) return signInRequiredResponse();
    const { userId } = actor;
    const db = await readDb();
    const plans = db.modalityPlans
      .filter((p) => p.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
    const logs = db.modalityLogs
      .filter((l) => l.userId === userId)
      .sort((a, b) => new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime())
      .slice(0, 40);
    return NextResponse.json({ plans, logs });
  }

  // Default: catalog browse
  const setting = (searchParams.get("setting") as ModalitySetting | "all") || "all";
  const timing = (searchParams.get("timing") as ModalityTiming | "all") || "all";
  const category = (searchParams.get("category") as ModalityCategory | "all") || "all";
  const query = searchParams.get("q") || undefined;
  const items = listModalities({ setting, timing, category, query });

  return NextResponse.json({
    items,
    stats: MODALITY_STATS,
    categories: MODALITY_CATEGORY_LABELS,
  });
}

export async function POST(req: Request) {
  const limited = rateLimit(`modalities:${clientIp(req)}`, {
    limit: 30,
    windowMs: 60 * 1000,
  });
  if (!limited.ok) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as {
    action?: "save-plan" | "recommend";
    plan?: ModalityPlan;
    painScore?: number;
    descriptorIds?: string[];
    experienceText?: string;
    source?: ModalityPlan["source"];
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const actor = await getActorId();
    if (!actor) return signInRequiredResponse();
    const { userId } = actor;
  const db = await readDb();
  const sessions = db.sessions
    .filter((s) => s.userId === userId)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 8);
  const journal = db.journal
    .filter((j) => j.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  if (body.action === "recommend" || !body.plan) {
    const plan = buildVisitModalityPlan({
      painScore: Number(body.painScore ?? 3),
      descriptorIds: Array.isArray(body.descriptorIds)
        ? body.descriptorIds.map(String).slice(0, 24)
        : [],
      experienceText: body.experienceText
        ? sanitizeText(body.experienceText, 2000)
        : undefined,
      recentSessions: sessions,
      recentJournal: journal,
    });
    plan.userId = userId;
    plan.source = body.source || "modalities";

    await updateDb((d) => {
      d.modalityPlans = [
        plan,
        ...d.modalityPlans.filter((p) => p.userId === userId).slice(0, 19),
        ...d.modalityPlans.filter((p) => p.userId !== userId),
      ].slice(0, 200);
    });

    return NextResponse.json({ plan });
  }

  // Save provided plan
  const plan: ModalityPlan = {
    ...body.plan,
    userId,
    experienceSummary: body.plan.experienceSummary
      ? sanitizeText(body.plan.experienceSummary, 500)
      : undefined,
    source: body.source || body.plan.source || "manual",
  };

  await updateDb((d) => {
    const i = d.modalityPlans.findIndex((p) => p.id === plan.id && p.userId === userId);
    if (i >= 0) d.modalityPlans[i] = plan;
    else d.modalityPlans.unshift(plan);
    d.modalityPlans = d.modalityPlans.slice(0, 200);
  });

  return NextResponse.json({ plan });
}
