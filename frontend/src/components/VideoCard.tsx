"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Play, Clock, Share2, Info } from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface VideoCardProps {
  platform?: string;
  title?: string;
  creator?: string;
  viewsCurrent?: number;
  viewsTarget?: number;
  consensusPercent?: number;
  totalStaked?: string;
  timeRemaining?: string;
  multiplier?: string;
}

export default function VideoCard({
  platform = "TIKTOK",
  title = "This dog learned 50 tricks in one week",
  creator = "@puptok_official",
  viewsCurrent = 9_400,
  viewsTarget = 100_000,
  consensusPercent = 74,
  totalStaked = "$2,841",
  timeRemaining = "14H 07M",
  multiplier = "2.8X",
}: VideoCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const viewsProgress = Math.min((viewsCurrent / viewsTarget) * 100, 100);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="relative w-full max-w-sm mx-auto lg:max-w-none group"
    >
      <div className="bg-black border-2 border-white/10 p-6 relative overflow-hidden transition-all group-hover:border-primary/50">
        {/* Scanline overlay */}
        <div className="scanline absolute inset-0 opacity-10 pointer-events-none" />

        {/* Multiplier badge */}
        <div className="absolute top-0 right-0 px-4 py-2 bg-primary text-black text-[10px] font-black italic tracking-tighter z-10">
          {multiplier} ALPHA_EARLY
        </div>

        {/* Platform + status */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest border border-white/10 px-2 py-0.5">
              {platform}
            </span>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-black text-primary uppercase tracking-tighter">DATA_LIVE</span>
            </div>
          </div>
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Share2 className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-white" />
            <Info className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-white" />
          </div>
        </div>

        {/* Thumbnail area */}
        <div className="aspect-video mb-6 relative bg-white/[0.02] border border-white/5 flex items-center justify-center group/play">
          <div className="w-16 h-16 border-2 border-white/10 flex items-center justify-center group-hover/play:border-primary group-hover/play:bg-primary transition-all">
            <Play className="w-6 h-6 ml-1 text-white group-hover/play:text-black fill-current" />
          </div>
          {/* Grid background in thumbnail */}
          <div className="absolute inset-0 pointer-events-none" 
               style={{ 
                 backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)',
                 backgroundSize: '12px 12px'
               }} 
          />
        </div>

        {/* Content data */}
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-tight leading-tight mb-1">
              {title}
            </h3>
            <p className="text-[10px] font-black text-primary/70 uppercase tracking-widest">
              USERID: {creator}
            </p>
          </div>

          {/* Progress monitors */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">THRESHOLD_TRACKER</span>
                <div className="text-right">
                  <div className="text-[10px] font-black text-white italic">
                    {formatNumber(viewsCurrent)} <span className="text-muted-foreground">/ {formatNumber(viewsTarget)}</span>
                  </div>
                </div>
              </div>
              <div className="h-1 bg-white/5 relative">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-primary"
                  initial={{ width: 0 }}
                  animate={inView ? { width: `${viewsProgress}%` } : {}}
                  transition={{ duration: 1.5, ease: "circOut" }}
                />
              </div>
            </div>

            <div className="p-4 bg-white/[0.02] border border-white/5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">CONSENSUS_LEVEL</span>
                <span className="text-xs font-black text-primary italic">{consensusPercent}% VIRAL</span>
              </div>
              <div className="h-3 bg-white/5 relative">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-primary"
                  initial={{ width: 0 }}
                  animate={inView ? { width: `${consensusPercent}%` } : {}}
                  transition={{ duration: 1, delay: 0.5, ease: "circOut" }}
                />
              </div>
            </div>
          </div>

          {/* Transaction data */}
          <div className="pt-4 border-t border-white/5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">TOTAL_VOLUME_USDC</p>
              <p className="text-sm font-black text-white italic tracking-tighter">{totalStaked}</p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">SETTLEMENT_ETR</p>
              <div className="flex items-center gap-2 justify-end">
                <Clock className="w-3 h-3 text-primary" />
                <span className="text-xs font-black text-white italic">{timeRemaining}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

