"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, PlayCircle, RefreshCw, ShieldCheck } from "lucide-react";

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
  };
  embedUrl: string;
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
};

/**
 * Auto-refreshing institutional YouTube embed.
 * On mount (and on demand), resolves via /api/videos/resolve so dead IDs
 * are swapped to the next live catalog video before the iframe loads.
 */
export function InstitutionalVideoEmbed({
  video,
  region,
  bodyParts,
  tags,
  kind,
  className = "",
  showAttribution = true,
}: Props) {
  const [live, setLive] = useState<ResolveResponse["video"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const bodyPartsKey = bodyParts?.join(",") ?? "";
  const tagsKey = tags?.join(",") ?? "";

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("youtubeId", video.youtubeId);
    if (region) params.set("region", region);
    // Prefer movement name from attribution for content-matched institutional demos
    const matchFor = video.source?.match(/Educational match for:\s*(.+)$/i)?.[1]?.trim();
    const scoreName = matchFor || video.title;
    if (scoreName) params.set("title", scoreName);
    if (bodyPartsKey) params.set("bodyParts", bodyPartsKey);
    if (tagsKey) params.set("tags", tagsKey);
    if (kind) params.set("kind", kind);
    return params.toString();
  }, [video.youtubeId, video.title, video.source, region, bodyPartsKey, tagsKey, kind]);

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
      if (!data?.video?.youtubeId) throw new Error("empty_resolve");
      setLive(data.video);
    } catch (e) {
      // Offline / API failure: only show preferred ID if institution string looks healthcare
      const inst = (video.institution || "").toLowerCase();
      const looksInstitutional =
        /mayo|cleveland|hopkins|nih|nia|veterans|vha|dartmouth|dana-farber|apta|choosept|physical therapy association/.test(
          inst
        );
      if (looksInstitutional && video.youtubeId) {
        setLive({
          youtubeId: video.youtubeId,
          title: video.title,
          source: video.source,
          institution: video.institution,
          swapped: false,
          preferredId: video.youtubeId,
        });
      } else {
        setLive(null);
      }
      setError(e instanceof Error ? e.message : "resolve_failed");
    } finally {
      setLoading(false);
    }
  }, [query, video]);

  useEffect(() => {
    void resolve();
  }, [resolve, attempt]);

  const active = live ?? video;
  const canEmbed = Boolean(active?.youtubeId && active?.institution);
  const embedSrc = canEmbed
    ? `https://www.youtube-nocookie.com/embed/${active.youtubeId}?rel=0&modestbranding=1`
    : "";

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
        {!loading && !canEmbed ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-brand-100">
            <ShieldCheck className="h-8 w-8 text-brand-300" />
            <p className="text-sm font-medium">Institutional video unavailable offline</p>
            <p className="text-xs text-brand-300">
              MotionRx only embeds vetted hospital, NIH/VA, and healthcare association demos.
            </p>
          </div>
        ) : (
          <iframe
            key={active.youtubeId}
            className="h-full w-full"
            src={embedSrc}
            title={active.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}
      </div>

      {showAttribution && (
        <div className="mt-3 flex items-start gap-2 text-sm">
          <PlayCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-brand-900">{active.title}</p>
            <p className="text-brand-600">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                {active.institution}
              </span>
              {" · "}
              {active.source}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-brand-500">
              Healthcare-only: matched to this stretch/exercise from MotionRx’s institutional catalog
              (hospital systems, NIH/NIA, VA, academic medical centers, APTA ChoosePT). Fitness
              creators and influencer channels are never embedded. Follow written MotionRx steps for
              exact cues.
            </p>
            {live?.swapped && (
              <p className="mt-1 text-xs text-amber-700">
                Preferred technique video was unavailable — auto-refreshed to the closest live
                institutional match (same technique/region when possible).
              </p>
            )}
            {error && (
              <p className="mt-1 text-xs text-brand-500">
                Live verification unreachable ({error}); showing catalog preferred ID.
              </p>
            )}
            <button
              type="button"
              onClick={() => setAttempt((n) => n + 1)}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
            >
              <RefreshCw className="h-3 w-3" />
              Re-check video link
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
