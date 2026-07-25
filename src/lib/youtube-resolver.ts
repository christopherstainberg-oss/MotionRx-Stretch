/**
 * Auto-refresh video resolver: never returns a known-dead institutional YouTube ID.
 * Walks region candidates → full catalog until oEmbed confirms a live video.
 */

import {
  type InstitutionalVideo,
  type VideoRegion,
  VIDEO_BY_REGION,
  allCatalogVideos,
  candidatesForRegion,
  getCatalogVideoById,
  inferRegionFromBodyParts,
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

/**
 * Resolve a guaranteed-live institutional video for a region / preferred ID.
 * Side effect: may trigger a throttled full-catalog background refresh.
 */
export async function resolveLiveVideo(opts: {
  preferredId?: string;
  region?: VideoRegion | string;
  bodyParts?: string[];
  titleOverride?: string;
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

  const preferredId =
    opts.preferredId?.trim() ||
    VIDEO_BY_REGION[region]?.youtubeId ||
    VIDEO_BY_REGION.general.youtubeId;

  const titleOverride = opts.titleOverride;

  const ordered: InstitutionalVideo[] = [];
  const seen = new Set<string>();
  const push = (v: InstitutionalVideo | undefined) => {
    if (!v || seen.has(v.youtubeId)) return;
    seen.add(v.youtubeId);
    ordered.push(v);
  };

  // Prefer the library's chosen ID only if it is still in the institutional catalog.
  // Non-catalog fitness-creator / legacy IDs are never served, even if still on YouTube.
  const preferredMeta = getCatalogVideoById(preferredId);
  if (preferredMeta) {
    push(preferredMeta);
  }

  for (const v of candidatesForRegion(region)) push(v);
  for (const v of allCatalogVideos()) push(v);

  // Pass 1: prefer confirmed-live
  let firstUnknown: { video: InstitutionalVideo; author?: string } | null = null;
  for (const candidate of ordered) {
    const entry = await checkYoutubeId(candidate.youtubeId);
    if (entry.ok === true) {
      return toResolved(candidate, {
        preferredId,
        region,
        titleOverride,
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
      titleOverride,
      author: firstUnknown.author,
    });
  }

  // Skip confirmed-dead only; still prefer preferred if somehow not dead-checked
  for (const candidate of ordered) {
    if (!(await isYoutubeIdDead(candidate.youtubeId))) {
      return toResolved(candidate, { preferredId, region, titleOverride });
    }
  }

  // Absolute last resort: static primary for region (never invent non-catalog IDs)
  const fallback = videoForRegion(region, titleOverride);
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
  opts?: { region?: VideoRegion | string; bodyParts?: string[] }
): Promise<VideoLike & { swapped?: boolean; preferredId?: string }> {
  const live = await resolveLiveVideo({
    preferredId: video.youtubeId,
    region: opts?.region,
    bodyParts: opts?.bodyParts,
    titleOverride: video.title,
  });
  return {
    youtubeId: live.youtubeId,
    title: live.title,
    source: live.source,
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
