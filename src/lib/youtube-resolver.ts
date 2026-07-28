/**
 * Auto-refresh video resolver: never returns a known-dead institutional YouTube ID.
 *
 * PhysioPath YouTube management intricacies (merged):
 * - Movement-name cleaning before match (videoMovement)
 * - Curated movement → video map first (no search fallback)
 * - Longest-key normalised matching
 * - Publisher bar (institutional only)
 * - Precaution caveats attached to every resolve
 * - requireSpecificMatch: silence instead of wrong-region demos
 * - VIDEO_VERIFIED stamp + oEmbed health swap for dead IDs
 */

import {
  type InstitutionalVideo,
  type VideoRegion,
  VIDEO_BY_REGION,
  allCatalogVideos,
  bestCatalogVideoForMovement,
  candidatesForRegion,
  enrichCatalogVideo,
  getCatalogVideoById,
  inferRegionFromBodyParts,
  inferTechniqueFromMovement,
  isAllowedHealthcareInstitution,
  isVettedInstitutionalVideo,
  movementVideoMatchScore,
  scoreCatalogVideoMatch,
  videoForRegion,
} from "@/data/video-catalog";
import {
  checkYoutubeId,
  isYoutubeIdDead,
  maybeBackgroundRefresh,
} from "@/lib/youtube-health";
import {
  VIDEO_VERIFIED,
  curatedAsInstitutional,
  curatedVideoFor,
  isCuratedServeable,
  isSpecificEnoughMatch,
  videoAttributionLine,
  videoCaveat,
  videoMovement,
  type VideoCaveatContext,
  type YoutubeMatchPolicy,
  DEFAULT_MATCH_POLICY,
} from "@/lib/youtube-management";

export type ResolvedVideo = {
  youtubeId: string;
  title: string;
  source: string;
  institution: string;
  /** True when a different ID was chosen because the preferred one was dead */
  swapped: boolean;
  /** Preferred / original ID requested by the library entry */
  preferredId: string;
  region: VideoRegion;
  /** oEmbed author when available */
  author?: string;
  checkedAt: string;
  /** PhysioPath precaution caveat shown next to the video */
  caveat?: string;
  /** from {institution} · link checked {VIDEO_VERIFIED} */
  attribution?: string;
  /** Curated / technique / region */
  matchSource?: "curated" | "technique" | "catalog" | "region" | "none";
  /** Cleaned movement phrase used for matching */
  movementClean?: string | null;
  /** When true, UI should not embed (PhysioPath silence) */
  hide?: boolean;
  /** Verified stamp for UI */
  verified?: string;
  watchUrl?: string;
};

export type VideoLike = {
  youtubeId: string;
  title: string;
  source: string;
  institution: string;
};

function toResolved(
  video: InstitutionalVideo | VideoLike,
  opts: {
    preferredId: string;
    region: VideoRegion;
    titleOverride?: string;
    author?: string;
    matchSource?: ResolvedVideo["matchSource"];
    movementClean?: string | null;
    caveatCtx?: VideoCaveatContext;
    hide?: boolean;
  }
): ResolvedVideo {
  // Never emit a non-institutional publisher
  if (!isAllowedHealthcareInstitution(video.institution || "")) {
    const safe = videoForRegion(opts.region);
    return {
      youtubeId: safe.youtubeId,
      title: safe.title,
      source: safe.source,
      institution: safe.institution,
      swapped: true,
      preferredId: opts.preferredId,
      region: opts.region,
      checkedAt: new Date().toISOString(),
      matchSource: "region",
      movementClean: opts.movementClean,
      caveat: videoCaveat(opts.caveatCtx),
      attribution: videoAttributionLine({ institution: safe.institution }),
      verified: VIDEO_VERIFIED,
      watchUrl: `https://www.youtube.com/watch?v=${safe.youtubeId}`,
      hide: opts.hide,
    };
  }
  return {
    youtubeId: video.youtubeId,
    title: opts.titleOverride ?? video.title,
    source: video.source,
    institution: video.institution,
    swapped: video.youtubeId !== opts.preferredId,
    preferredId: opts.preferredId,
    region: opts.region,
    author: opts.author,
    checkedAt: new Date().toISOString(),
    matchSource: opts.matchSource || "catalog",
    movementClean: opts.movementClean,
    caveat: videoCaveat(opts.caveatCtx),
    attribution: videoAttributionLine({ institution: video.institution }),
    verified: VIDEO_VERIFIED,
    watchUrl: `https://www.youtube.com/watch?v=${video.youtubeId}`,
    hide: opts.hide,
  };
}

/** Only catalog + allowlisted healthcare publishers may enter the resolve chain */
function pushInstitutionalOnly(
  ordered: InstitutionalVideo[],
  seen: Set<string>,
  v: InstitutionalVideo | undefined
) {
  if (!v || seen.has(v.youtubeId)) return;
  if (!isVettedInstitutionalVideo(v) && !isAllowedHealthcareInstitution(v.institution))
    return;
  // Allow curated IDs that are in getCatalogVideoById
  if (!isAllowedHealthcareInstitution(v.institution || "")) return;
  seen.add(v.youtubeId);
  ordered.push(enrichCatalogVideo(v));
}

function emptyHiddenResolve(opts: {
  preferredId: string;
  region: VideoRegion;
  movementClean: string | null;
  caveatCtx?: VideoCaveatContext;
}): ResolvedVideo {
  return {
    youtubeId: "",
    title: "",
    source: "",
    institution: "",
    swapped: false,
    preferredId: opts.preferredId,
    region: opts.region,
    checkedAt: new Date().toISOString(),
    matchSource: "none",
    movementClean: opts.movementClean,
    caveat: videoCaveat(opts.caveatCtx),
    attribution: "",
    verified: VIDEO_VERIFIED,
    hide: true,
  };
}

/**
 * Resolve a guaranteed-live institutional video for a region / preferred ID.
 * Side effect: may trigger a throttled full-catalog background refresh.
 */
export async function resolveLiveVideo(opts: {
  preferredId?: string;
  region?: VideoRegion | string;
  bodyParts?: string[];
  /** Movement name / library title — used for match scoring of fallbacks */
  titleOverride?: string;
  tags?: string[];
  kind?: "stretch" | "exercise";
  /** Skip background catalog refresh (e.g. during bulk resolve) */
  skipBackgroundRefresh?: boolean;
  /** PhysioPath-style match policy */
  policy?: YoutubeMatchPolicy;
  /** Precaution / WB context for caveats */
  caveatCtx?: VideoCaveatContext;
}): Promise<ResolvedVideo> {
  if (!opts.skipBackgroundRefresh) {
    void maybeBackgroundRefresh().catch(() => {});
  }

  const policy = { ...DEFAULT_MATCH_POLICY, ...opts.policy };
  const region: VideoRegion =
    (opts.region as VideoRegion) ||
    inferRegionFromBodyParts(opts.bodyParts) ||
    "general";

  const rawName = opts.titleOverride || "";
  const movementClean = rawName ? videoMovement(rawName) : null;
  const movementHint = movementClean || rawName || undefined;

  // —— 1. PhysioPath curated movement map (highest priority, technique-true) ——
  const curated = movementHint ? curatedVideoFor(movementHint) : null;
  if (curated && isCuratedServeable(curated)) {
    const inst = curatedAsInstitutional(curated);
    const entry = await checkYoutubeId(inst.youtubeId);
    if (entry.ok !== false) {
      return toResolved(inst, {
        preferredId: opts.preferredId?.trim() || inst.youtubeId,
        region,
        titleOverride: inst.title,
        author: entry.author,
        matchSource: "curated",
        movementClean,
        caveatCtx: opts.caveatCtx,
      });
    }
    // Curated ID dead — fall through to catalog chain (do not invent search)
  }

  const technique = inferTechniqueFromMovement({
    name: movementHint,
    tags: opts.tags,
    kind: opts.kind,
  });

  // Content-best match for written movement (technique-locked when possible)
  const contentBest = movementHint
    ? bestCatalogVideoForMovement({
        name: movementHint,
        technique,
        region,
        bodyParts: opts.bodyParts,
        tags: opts.tags,
        kind: opts.kind,
      })
    : technique
      ? bestCatalogVideoForMovement({
          technique,
          region,
          bodyParts: opts.bodyParts,
          tags: opts.tags,
          kind: opts.kind,
        })
      : undefined;

  const contentScore = contentBest
    ? movementVideoMatchScore({
        video: contentBest,
        name: movementHint,
        technique,
        region,
        bodyParts: opts.bodyParts,
        tags: opts.tags,
        kind: opts.kind,
      })
    : 0;
  const ownsTechnique = Boolean(
    technique &&
      contentBest &&
      (contentBest.techniques || []).some(
        (t) => t.toLowerCase() === technique.toLowerCase()
      )
  );

  // PhysioPath silence: named movement with no curated + no specific catalog match
  if (
    movementHint &&
    policy.requireSpecificMatch &&
    !isSpecificEnoughMatch(
      { curated, catalogScore: contentScore, ownsTechnique },
      policy
    )
  ) {
    // Still allow preferred catalog ID if it is technique-specific and live
    const requestedPreferred = opts.preferredId?.trim() || "";
    const preferredInCatalog = requestedPreferred
      ? getCatalogVideoById(requestedPreferred)
      : undefined;
    if (!preferredInCatalog) {
      return emptyHiddenResolve({
        preferredId: requestedPreferred,
        region,
        movementClean,
        caveatCtx: opts.caveatCtx,
      });
    }
  }

  // Preferred ID is used ONLY if it is already in the institutional catalog / curated map.
  const requestedPreferred = opts.preferredId?.trim() || "";
  const preferredInCatalog = requestedPreferred
    ? getCatalogVideoById(requestedPreferred)
    : undefined;

  let preferredId =
    preferredInCatalog?.youtubeId ||
    contentBest?.youtubeId ||
    VIDEO_BY_REGION[region]?.youtubeId ||
    VIDEO_BY_REGION.general.youtubeId;

  let preferredMeta = preferredInCatalog
    ? enrichCatalogVideo(preferredInCatalog)
    : getCatalogVideoById(preferredId)
      ? enrichCatalogVideo(getCatalogVideoById(preferredId)!)
      : undefined;

  if (preferredMeta && contentBest && (movementHint || technique)) {
    const prefScore = movementVideoMatchScore({
      video: preferredMeta,
      name: movementHint,
      technique,
      region,
      bodyParts: opts.bodyParts,
      tags: opts.tags,
      kind: opts.kind,
    });
    const bestScore = contentScore;
    const preferredOwnsTech = technique
      ? (preferredMeta.techniques || []).some(
          (t) => t.toLowerCase() === technique.toLowerCase()
        )
      : true;
    const bestOwnsTech = ownsTechnique;

    if (
      contentBest.youtubeId !== preferredMeta.youtubeId &&
      bestOwnsTech &&
      (bestScore >= prefScore + 25 || (!preferredOwnsTech && bestScore > prefScore))
    ) {
      preferredId = contentBest.youtubeId;
      preferredMeta = enrichCatalogVideo(contentBest);
    }
  }

  const ordered: InstitutionalVideo[] = [];
  const seen = new Set<string>();
  const push = (v: InstitutionalVideo | undefined) =>
    pushInstitutionalOnly(ordered, seen, v);

  // Dead curated still tried earlier; push content-best / preferred next
  if (contentBest && preferredId === contentBest.youtubeId) {
    push(contentBest);
    if (preferredMeta && preferredMeta.youtubeId !== contentBest.youtubeId) {
      push(preferredMeta);
    }
  } else {
    if (preferredMeta) push(preferredMeta);
    if (contentBest) push(contentBest);
  }

  const techKey = technique || preferredMeta?.techniques?.[0];
  if (techKey) {
    for (const raw of allCatalogVideos()) {
      const v = enrichCatalogVideo(raw);
      if ((v.techniques || []).some((t) => t.toLowerCase() === techKey.toLowerCase())) {
        push(v);
      }
    }
  }

  const ranked = allCatalogVideos()
    .map((v) => ({
      v: enrichCatalogVideo(v),
      score: scoreCatalogVideoMatch(v, {
        name: movementHint || preferredMeta?.title,
        region,
        bodyParts: opts.bodyParts,
        technique: techKey,
        tags: opts.tags,
        kind: opts.kind,
        requireTechnique: Boolean(techKey),
      }),
    }))
    .sort((a, b) => b.score - a.score);

  for (const { v, score } of ranked) {
    if (techKey && score < -20) continue;
    push(v);
  }

  // Only add region fallbacks when policy allows non-specific matches
  if (!policy.requireSpecificMatch || !movementHint) {
    for (const v of candidatesForRegion(region)) push(v);
  }

  // Pass 1: prefer confirmed-live, in relevance order
  let firstUnknown: { video: InstitutionalVideo; author?: string } | null = null;
  for (const candidate of ordered) {
    const entry = await checkYoutubeId(candidate.youtubeId);
    if (entry.ok === true) {
      return toResolved(candidate, {
        preferredId,
        region,
        titleOverride: candidate.title,
        author: entry.author,
        matchSource: ownsTechnique || technique ? "technique" : "catalog",
        movementClean,
        caveatCtx: opts.caveatCtx,
      });
    }
    if (entry.ok === null && !firstUnknown) {
      firstUnknown = { video: candidate, author: entry.author };
    }
  }

  if (firstUnknown) {
    return toResolved(firstUnknown.video, {
      preferredId,
      region,
      titleOverride: firstUnknown.video.title,
      author: firstUnknown.author,
      matchSource: "catalog",
      movementClean,
      caveatCtx: opts.caveatCtx,
    });
  }

  for (const candidate of ordered) {
    if (!(await isYoutubeIdDead(candidate.youtubeId))) {
      return toResolved(candidate, {
        preferredId,
        region,
        titleOverride: candidate.title,
        matchSource: "catalog",
        movementClean,
        caveatCtx: opts.caveatCtx,
      });
    }
  }

  // Absolute last resort — or PhysioPath silence for named movements
  if (policy.requireSpecificMatch && movementHint) {
    return emptyHiddenResolve({
      preferredId,
      region,
      movementClean,
      caveatCtx: opts.caveatCtx,
    });
  }

  const fallback = videoForRegion(region);
  return {
    ...fallback,
    swapped: fallback.youtubeId !== preferredId,
    preferredId,
    region,
    checkedAt: new Date().toISOString(),
    matchSource: "region",
    movementClean,
    caveat: videoCaveat(opts.caveatCtx),
    attribution: videoAttributionLine({ institution: fallback.institution }),
    verified: VIDEO_VERIFIED,
    watchUrl: `https://www.youtube.com/watch?v=${fallback.youtubeId}`,
  };
}

/** Resolve and merge into a library video object shape */
export async function ensureLiveVideoField(
  video: VideoLike,
  opts?: {
    region?: VideoRegion | string;
    bodyParts?: string[];
    tags?: string[];
    kind?: "stretch" | "exercise";
    caveatCtx?: VideoCaveatContext;
    policy?: YoutubeMatchPolicy;
  }
): Promise<
  VideoLike & {
    swapped?: boolean;
    preferredId?: string;
    caveat?: string;
    hide?: boolean;
    attribution?: string;
  }
> {
  const movementName = video.source?.includes("Educational match for:")
    ? video.source.split("Educational match for:")[1]?.trim()
    : video.title;
  const live = await resolveLiveVideo({
    preferredId: video.youtubeId,
    region: opts?.region,
    bodyParts: opts?.bodyParts,
    tags: opts?.tags,
    kind: opts?.kind,
    titleOverride: movementName,
    caveatCtx: opts?.caveatCtx,
    policy: opts?.policy,
  });
  if (live.hide || !live.youtubeId) {
    return {
      youtubeId: "",
      title: video.title,
      source: video.source,
      institution: "",
      swapped: true,
      preferredId: video.youtubeId,
      caveat: live.caveat,
      hide: true,
      attribution: live.attribution,
    };
  }
  return {
    youtubeId: live.youtubeId,
    title: live.title,
    source: video.source || live.source,
    institution: live.institution,
    swapped: live.swapped,
    preferredId: live.preferredId,
    caveat: live.caveat,
    attribution: live.attribution,
  };
}

/** Batch-resolve unique preferred IDs (session lists, etc.) */
export async function resolveManyLive(
  items: Array<{
    preferredId: string;
    region?: VideoRegion | string;
    bodyParts?: string[];
    titleOverride?: string;
    caveatCtx?: VideoCaveatContext;
  }>
): Promise<ResolvedVideo[]> {
  void maybeBackgroundRefresh().catch(() => {});
  const results: ResolvedVideo[] = [];
  for (const item of items) {
    results.push(
      await resolveLiveVideo({
        ...item,
        skipBackgroundRefresh: true,
      })
    );
  }
  return results;
}

export {
  videoMovement,
  curatedVideoFor,
  videoCaveat,
  VIDEO_VERIFIED,
} from "@/lib/youtube-management";
