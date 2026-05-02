"use client";

import { MonitorPlay, Eye, Calendar } from "lucide-react";
import { formatViews, type TiersResponse, type Market } from "@/lib/api";
import MarketStats from "./MarketStats";
import PredictionsList from "./PredictionsList";

interface Props {
  videoId: string | null;
  contentData: TiersResponse | null;
  market: Market | null;
  refreshTrigger?: number;
}

export default function VideoPanel({ videoId, contentData, market, refreshTrigger }: Props) {
  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-2">
      {/* Video embed or placeholder */}
      <div className="relative w-full bg-black border border-white/10" style={{ aspectRatio: "16/9" }}>
        {videoId ? (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0`}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <MonitorPlay className="w-12 h-12 text-white/10" />
            <div className="text-center">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">
                AWAITING_CONTENT_FEED
              </p>
              <p className="text-[9px] text-muted-foreground/50 mt-1 tracking-widest">
                Paste a YouTube URL to begin
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Video metadata */}
      {contentData && (
        <div className="border border-white/10 bg-black p-5">
          <h2 className="text-base font-black text-white italic tracking-tighter leading-tight mb-3 uppercase line-clamp-2">
            {contentData.title}
          </h2>
          {market && (
            <div className="mb-4 pb-4 border-b border-white/10 space-y-1">
              <p className="text-[9px] font-black text-[#00FF85] uppercase tracking-widest">
                Prediction window (market)
              </p>
              <p className="text-[10px] text-muted-foreground">
                Opened{" "}
                {new Date(market.created_at).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Betting closes{" "}
                {new Date(market.deadline).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
          )}
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                CHANNEL
              </span>
              <span className="text-[10px] font-black text-white tracking-wide">
                {contentData.author}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="w-3 h-3 text-[#00FF85]" />
              <span className="text-[10px] font-black text-white italic">
                {formatViews(contentData.current_views)} views
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-3 h-3 text-muted-foreground" />
              <span className="text-[9px] font-black text-muted-foreground tracking-widest">
                Published{" "}
                {new Date(contentData.published_at).toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Market stats */}
      <MarketStats market={market} />

      {/* Recent predictions */}
      <PredictionsList marketId={market?.id ?? null} refreshTrigger={refreshTrigger} />
    </div>
  );
}
