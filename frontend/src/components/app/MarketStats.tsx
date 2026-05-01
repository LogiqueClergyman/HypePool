"use client";

import { motion } from "framer-motion";
import { Users, Clock, TrendingUp } from "lucide-react";
import { type Market, stroopsToXlm, formatViews, formatDeadline, computePercent } from "@/lib/api";

interface Props {
  market: Market | null;
}

export default function MarketStats({ market }: Props) {
  if (!market) {
    return (
      <div className="border border-white/5 bg-[#0D0D0D] p-5">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-[10px] font-black text-muted-foreground tracking-[0.3em] uppercase">
            MARKET STATS — AWAITING
          </p>
        </div>
        <p className="text-[10px] text-muted-foreground/50 tracking-wide">Paste a YouTube URL to load market data.</p>
      </div>
    );
  }

  const yesXlm = parseFloat(stroopsToXlm(market.yes_pool));
  const noXlm = parseFloat(stroopsToXlm(market.no_pool));
  const totalXlm = yesXlm + noXlm;
  const hasLiquidity = totalXlm > 0;
  const yesPct = hasLiquidity ? computePercent(market.yes_pool, market.no_pool) : 0;
  const noPct = hasLiquidity ? 100 - yesPct : 0;
  const deadline = formatDeadline(market.deadline);
  const threshold = formatViews(market.threshold);
  const isActive = market.status === "ACTIVE";

  return (
    <div className="border border-white/10 bg-[#0D0D0D] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-white/[0.01]">
        <span className="text-[9px] font-black text-primary tracking-[0.35em] uppercase">MARKET STATS</span>
        <span
          className={`text-[8px] font-black tracking-widest uppercase px-2 py-0.5 border ${
            isActive
              ? "border-primary/30 text-primary bg-primary/5"
              : "border-white/10 text-muted-foreground"
          }`}
        >
          {market.status.replace("_", " ")}
        </span>
      </div>

      <div className="p-5 space-y-5">
        {/* Threshold */}
        <div>
          <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">TARGET THRESHOLD</p>
          <p className="text-2xl font-black text-white italic tracking-tighter">{threshold} VIEWS</p>
          <p className="text-[9px] text-muted-foreground mt-0.5">within {market.window_hours}h window</p>
        </div>

        {/* Visual pool bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">POOL DISTRIBUTION</p>
            <p className="text-[8px] font-black text-white italic">{totalXlm.toFixed(0)} XLM total</p>
          </div>

          {/* Combined bar */}
          <div className="h-6 flex w-full overflow-hidden border border-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${yesPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full bg-primary flex items-center justify-center"
            >
              {yesPct >= 20 && (
                <span className="text-[8px] font-black text-black tracking-wider">YES {yesPct}%</span>
              )}
            </motion.div>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${noPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full bg-white/15 flex items-center justify-center"
            >
              {noPct >= 20 && (
                <span className="text-[8px] font-black text-white/60 tracking-wider">NO {noPct}%</span>
              )}
            </motion.div>
          </div>

          {/* Pool breakdown */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="p-3 border border-primary/15 bg-primary/5">
              <p className="text-[8px] font-black text-primary uppercase tracking-widest mb-1">YES POOL</p>
              <p className="text-sm font-black text-white italic">{yesXlm.toFixed(1)} XLM</p>
              <p className="text-[8px] text-primary/70 font-bold mt-0.5">{yesPct}%</p>
            </div>
            <div className="p-3 border border-white/8 bg-white/[0.02]">
              <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">NO POOL</p>
              <p className="text-sm font-black text-white italic">{noXlm.toFixed(1)} XLM</p>
              <p className="text-[8px] text-muted-foreground font-bold mt-0.5">{noPct}%</p>
            </div>
          </div>
        </div>

        {/* Meta row */}
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/8">
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
            <div>
              <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">CLOSES</p>
              <p className="text-xs font-black text-white italic">{deadline}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-3 h-3 text-muted-foreground shrink-0" />
            <div>
              <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">BETTORS</p>
              <p className="text-xs font-black text-white italic">{market.total_bettors}</p>
            </div>
          </div>
        </div>

        {/* Outcome badge */}
        {market.outcome && (
          <div
            className={`px-3 py-2 border text-center ${
              market.outcome === "YES"
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-white/15 bg-white/5 text-white"
            }`}
          >
            <p className="text-[9px] font-black uppercase tracking-widest">
              RESOLVED: {market.outcome}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
