/**
 * Auto-refresh video resolver: never returns a known-dead institutional YouTube ID.
 * Walks region candidates → full catalog until oEmbed confirms a live video.
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
  };
}

/** Only catalog + allowlisted healthcare publishers may enter the resolve chain */
function pushInstitutionalOnly(
  ordered: InstitutionalVideo[],
  seen: Set<string>,
  v: InstitutionalVideo | undefined
) {
  if (!v || seen.has(v.youtubeId)) return;
  if (!isVettedInstitutionalVideo(v)) return;
  seen.add(v.youtubeId);
  ordered.push(enrichCatalogVideo(v));
}

/**
 * Resolve a guaranteed-live institutional video for a region / preferred ID.
 * Side effect: may trigger a throttled full-catalog background refresh.
 */
export async function resolveLiveVideo(opts: {
  preferredId?: string;
  region?: VideoRegion | string;
  bodyParts?: string[];
  /** Movement name / library title — used only for match scoring of fallbacks */
  titleOverride?: string;
  tags?: string[];
  kind?: "stretch" | "exercise";
  /** Skip background catalog refresh (e.g. during bulk resolve) */
  skipBackgroundRefresh?: boolean;
}): Promise<ResolvedVideo> {
  if (!opts.skipBackgroundRefresh) {
    // Non-blocking intent: we still await lightly so cache warms; refresh is TTL-gated
    void maybeBackgroundRefresh().catch(() => {});
  }

  const region: VideoRegion =
    (opts.region as VideoRegion) ||
    inferRegionFromBodyParts(opts.bodyParts) ||
    "general";

  const movementHint = opts.titleOverride;
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

  // Preferred ID is used ONLY if it is already in the institutional catalog.
  // Fitness-creator / random YouTube IDs are discarded — never embedded.
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
    const bestScore = movementVideoMatchScore({
      video: contentBest,
      name: movementHint,
      technique,
      region,
      bodyParts: opts.bodyParts,
      tags: opts.tags,
      kind: opts.kind,
    });
    const preferredOwnsTech = technique
      ? (preferredMeta.techniques || []).some(
          (t) => t.toLowerCase() === technique.toLowerCase()
        )
      : true;
    const bestOwnsTech = technique
      ? (contentBest.techniques || []).some(
          (t) => t.toLowerCase() === technique.toLowerCase()
        )
      : true;

    // Override preferred when content-best is clearly more specific
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

  // Content-best first when it won the specificity contest; else preferred then content
  if (contentBest && preferredId === contentBest.youtubeId) {
    push(contentBest);
    if (preferredMeta && preferredMeta.youtubeId !== contentBest.youtubeId) {
      push(preferredMeta);
    }
  } else {
    if (preferredMeta) push(preferredMeta);
    if (contentBest) push(contentBest);
  }

  // Fallback chain: same technique family only, then same region, then ranked catalog
  // (allCatalogVideos already filters to allowlisted institutions)
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
    // Skip garbage fallbacks that failed technique gate
    if (techKey && score < -20) continue;
    push(v);
  }
  for (const v of candidatesForRegion(region)) push(v);

  // Pass 1: prefer confirmed-live, in relevance order
  let firstUnknown: { video: InstitutionalVideo; author?: string } | null = null;
  for (const candidate of ordered) {
    const entry = await checkYoutubeId(candidate.youtubeId);
    if (entry.ok === true) {
      return toResolved(candidate, {
        preferredId,
        region,
        // Always serve the real institutional title
        titleOverride: candidate.title,
        author: entry.author,
      });
    }
    if (entry.ok === null && !firstUnknown) {
      firstUnknown = { video: candidate, author: entry.author };
    }
  }

  // Pass 2: if YouTube was flaky, keep first non-dead institutional candidate
  if (firstUnknown) {
    return toResolved(firstUnknown.video, {
      preferredId,
      region,
      titleOverride: firstUnknown.video.title,
      author: firstUnknown.author,
    });
  }

  // Skip confirmed-dead only; still prefer preferred if somehow not dead-checked
  for (const candidate of ordered) {
    if (!(await isYoutubeIdDead(candidate.youtubeId))) {
      return toResolved(candidate, {
        preferredId,
        region,
        titleOverride: candidate.title,
      });
    }
  }

  // Absolute last resort: static primary for region (never invent non-catalog IDs)
  const fallback = videoForRegion(region);
  return {
    ...fallback,
    swapped: fallback.youtubeId !== preferredId,
    preferredId,
    region,
    checkedAt: new Date().toISOString(),
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
  }
): Promise<VideoLike & { swapped?: boolean; preferredId?: string }> {
  const movementName = video.source?.includes("Educational match for:")
    ? video.source.split("Educational match for:")[1]?.trim()
    : video.title;
  const live = await resolveLiveVideo({
    preferredId: video.youtubeId,
    region: opts?.region,
    bodyParts: opts?.bodyParts,
    tags: opts?.tags,
    kind: opts?.kind,
    // Pass written stretch/exercise name for intelligent institutional matching
    titleOverride: movementName,
  });
  return {
    youtubeId: live.youtubeId,
    title: live.title,
    source: video.source || live.source,
    institution: live.institution,
    swapped: live.swapped,
    preferredId: live.preferredId,
  };
}

/** Batch-resolve unique preferred IDs (session lists, etc.) */
export async function resolveManyLive(
  items: Array<{
    preferredId: string;
    region?: VideoRegion | string;
    bodyParts?: string[];
    titleOverride?: string;
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
