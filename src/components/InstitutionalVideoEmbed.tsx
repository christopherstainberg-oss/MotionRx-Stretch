"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  Loader2,
  PlayCircle,
  RefreshCw,
  ShieldCheck,
  WifiOff,
} from "lucide-react";

export type EmbedVideoInput = {
  youtubeId: string;
  title: string;
  source: string;
  institution: string;
};

type ResolveResponse = {
  video: EmbedVideoInput & {
    swapped?: boolean;
    preferredId?: string;
    region?: string;
    author?: string;
    checkedAt?: string;
    caveat?: string;
    attribution?: string;
    matchSource?: string;
    movementClean?: string | null;
    hide?: boolean;
    verified?: string;
    watchUrl?: string;
  };
  embedUrl: string | null;
  watchUrl?: string | null;
  hide?: boolean;
  caveat?: string;
  attribution?: string;
  verified?: string;
};

type Props = {
  video: EmbedVideoInput;
  /** Body region key (neck, hip, …) for fallback chain */
  region?: string;
  bodyParts?: string[];
  /** Library tags for content-specific institutional matching */
  tags?: string[];
  kind?: "stretch" | "exercise";
  className?: string;
  /** Show institution attribution under the player (default true) */
  showAttribution?: boolean;
  /**
   * PhysioPath caveats: weight-bearing + precaution flags.
   * Shown on the video so generic demos do not override the plan.
   */
  weightBearingStatus?: string;
  precautionFlags?: string[];
  /**
   * When true (default if title present via API), do not show a wrong-region
   * generic demo when no curated/technique match exists.
   */
  requireSpecificMatch?: boolean;
};

/**
 * Auto-refreshing institutional YouTube embed with PhysioPath management rules:
 * curated movement map → technique catalog → oEmbed health swap.
 * No unvetted YouTube search. Precaution caveats always visible.
 */
export function InstitutionalVideoEmbed({
  video,
  region,
  bodyParts,
  tags,
  kind,
  className = "",
  showAttribution = true,
  weightBearingStatus,
  precautionFlags,
  requireSpecificMatch = true,
}: Props) {
  const [live, setLive] = useState<ResolveResponse["video"] | null>(null);
  const [meta, setMeta] = useState<Pick<
    ResolveResponse,
    "hide" | "caveat" | "attribution" | "verified" | "watchUrl" | "embedUrl"
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [offline, setOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );

  const bodyPartsKey = bodyParts?.join(",") ?? "";
  const tagsKey = tags?.join(",") ?? "";
  const flagsKey = (precautionFlags || []).join(",");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (video.youtubeId) params.set("youtubeId", video.youtubeId);
    if (region) params.set("region", region);
    const matchFor = video.source?.match(/Educational match for:\s*(.+)$/i)?.[1]?.trim();
    const scoreName = matchFor || video.title;
    if (scoreName) params.set("title", scoreName);
    if (bodyPartsKey) params.set("bodyParts", bodyPartsKey);
    if (tagsKey) params.set("tags", tagsKey);
    if (kind) params.set("kind", kind);
    if (weightBearingStatus) params.set("wb", weightBearingStatus);
    if (flagsKey) params.set("flags", flagsKey);
    params.set("strict", requireSpecificMatch ? "1" : "0");
    return params.toString();
  }, [
    video.youtubeId,
    video.title,
    video.source,
    region,
    bodyPartsKey,
    tagsKey,
    kind,
    weightBearingStatus,
    flagsKey,
    requireSpecificMatch,
  ]);

  const resolve = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/videos/resolve?${query}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`resolve_${res.status}`);
      const data = (await res.json()) as ResolveResponse;
      setMeta({
        hide: data.hide ?? data.video?.hide,
        caveat: data.caveat || data.video?.caveat,
        attribution: data.attribution || data.video?.attribution,
        verified: data.verified || data.video?.verified,
        watchUrl: data.watchUrl || data.video?.watchUrl,
        embedUrl: data.embedUrl,
      });
      if (data.hide || data.video?.hide || !data?.video?.youtubeId) {
        setLive(null);
      } else {
        setLive(data.video);
      }
    } catch (e) {
      // Offline / API failure: only show preferred ID if institution string looks healthcare
      const inst = (video.institution || "").toLowerCase();
      const looksInstitutional =
        /mayo|cleveland|hopkins|nih|nia|veterans|vha|dartmouth|dana-farber|apta|choosept|hospital|nhs|health|orthop|physio|medical/.test(
          inst
        );
      if (looksInstitutional && video.youtubeId && navigator.onLine) {
        setLive({
          youtubeId: video.youtubeId,
          title: video.title,
          source: video.source,
          institution: video.institution,
          swapped: false,
          preferredId: video.youtubeId,
        });
        setMeta({
          hide: false,
          caveat:
            "Videos are generic: they don't know your precautions, your phase, or your dose. Your plan's sets and reps win.",
          attribution: `from ${video.institution}`,
          verified: undefined,
          watchUrl: `https://www.youtube.com/watch?v=${video.youtubeId}`,
          embedUrl: `https://www.youtube-nocookie.com/embed/${video.youtubeId}`,
        });
      } else {
        setLive(null);
        setMeta({
          hide: true,
          caveat:
            "Videos are generic: they don't know your precautions, your phase, or your dose. Your plan's sets and reps win.",
          attribution: "",
          verified: undefined,
          watchUrl: null,
          embedUrl: null,
        });
      }
      setError(e instanceof Error ? e.message : "resolve_failed");
    } finally {
      setLoading(false);
    }
  }, [query, video]);

  useEffect(() => {
    void resolve();
  }, [resolve, attempt]);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const active = live;
  const canEmbed = Boolean(active?.youtubeId && active?.institution && !meta?.hide);
  const embedSrc = canEmbed
    ? meta?.embedUrl ||
      `https://www.youtube-nocookie.com/embed/${active!.youtubeId}?rel=0&modestbranding=1`
    : "";
  const watchHref =
    meta?.watchUrl ||
    (active?.youtubeId ? `https://www.youtube.com/watch?v=${active.youtubeId}` : null);
  const caveat =
    meta?.caveat ||
    "Videos are generic: they don't know your precautions, your phase, or your dose. Your plan's sets and reps win.";

  return (
    <div className={className}>
      <div className="relative aspect-video overflow-hidden rounded-xl bg-brand-950">
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-brand-950/90 text-brand-100">
            <Loader2 className="h-8 w-8 animate-spin text-brand-300" />
            <p className="text-xs font-medium text-brand-200">
              Verifying institutional healthcare video…
            </p>
          </div>
        )}
        {!loading && offline && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-brand-100">
            <WifiOff className="h-8 w-8 text-brand-300" />
            <p className="text-sm font-medium">You&apos;re offline</p>
            <p className="text-xs text-brand-300">
              This video needs a connection. Written MotionRx steps still work.
            </p>
          </div>
        )}
        {!loading && !offline && !canEmbed ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-brand-100">
            <ShieldCheck className="h-8 w-8 text-brand-300" />
            <p className="text-sm font-medium">No verified institutional demo for this movement</p>
            <p className="text-xs text-brand-300">
              MotionRx only links publisher-verified hospital / health-system videos (PhysioPath
              rule). Written steps stand alone — we never invent an unvetted YouTube search.
            </p>
          </div>
        ) : !loading && !offline && canEmbed ? (
          <iframe
            key={active!.youtubeId}
            className="h-full w-full"
            src={embedSrc}
            title={active!.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : null}
      </div>

      {showAttribution && (
        <div className="mt-3 flex items-start gap-2 text-sm">
          <PlayCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
          <div className="min-w-0 flex-1">
            {canEmbed && active ? (
              <>
                <p className="font-medium text-brand-900 dark:text-brand-50">{active.title}</p>
                <p className="text-brand-600 dark:text-brand-300">
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    {meta?.attribution || (
                      <>
                        from <b>{active.institution}</b>
                        {meta?.verified ? ` · link checked ${meta.verified}` : ""}
                      </>
                    )}
                  </span>
                </p>
                {active.source && (
                  <p className="mt-0.5 text-xs text-brand-500">{active.source}</p>
                )}
                {live?.matchSource && (
                  <p className="mt-0.5 text-[11px] uppercase tracking-wide text-brand-400">
                    Match: {live.matchSource}
                    {live.movementClean ? ` · “${live.movementClean}”` : ""}
                  </p>
                )}
              </>
            ) : (
              <p className="font-medium text-brand-900 dark:text-brand-50">
                Written steps only for this movement
              </p>
            )}

            {/* PhysioPath videoCaveat — always on the link/embed */}
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50/80 px-2.5 py-2 text-xs leading-relaxed text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
              {caveat}
            </p>

            <p className="mt-1 text-xs leading-relaxed text-brand-500">
              Healthcare-only: institutional catalog + PhysioPath curated map (hospital systems,
              NHS, academic centres). Fitness creators never embedded. No YouTube search fallback.
            </p>

            {live?.swapped && (
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-200">
                Preferred technique video was unavailable — auto-refreshed to the closest live
                institutional match (same technique when possible).
              </p>
            )}
            {error && (
              <p className="mt-1 text-xs text-brand-500">
                Live verification unreachable ({error})
                {canEmbed ? "; showing catalog preferred ID when allowed." : "."}
              </p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-3">
              {watchHref && canEmbed && (
                <a
                  href={watchHref}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline dark:text-brand-200"
                >
                  <ExternalLink className="h-3 w-3" />
                  Watch on YouTube
                </a>
              )}
              <button
                type="button"
                onClick={() => setAttempt((n) => n + 1)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline dark:text-brand-200"
              >
                <RefreshCw className="h-3 w-3" />
                Re-check video link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
