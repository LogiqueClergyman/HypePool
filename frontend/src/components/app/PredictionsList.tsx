"use client";

import { useEffect, useState } from "react";
import { getMarketBets, stroopsToXlm, type MarketBet } from "@/lib/api";

interface Props {
  marketId: string | null;
  refreshTrigger?: number;
}

export default function PredictionsList({ marketId, refreshTrigger }: Props) {
  const [bets, setBets] = useState<MarketBet[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!marketId) return;
    let cancelled = false;
    setLoading(true);
    getMarketBets(marketId)
      .then((data) => { if (!cancelled) setBets(data.bets.slice(0, 12)); })
      .catch(() => { if (!cancelled) setBets([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [marketId, refreshTrigger]);

  if (!marketId) {
    return (
      <div className="border border-white/5 bg-white/[0.01] p-6">
        <p className="text-[10px] font-black text-muted-foreground tracking-[0.3em] uppercase">
          PREDICTIONS::AWAITING
        </p>
      </div>
    );
  }

  return (
    <div className="border border-white/10 bg-black p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-black text-[#00FF85] tracking-[0.3em] uppercase">
          RECENT_PREDICTIONS
        </span>
        {loading && (
          <span className="text-[9px] text-muted-foreground tracking-widest animate-pulse">SYNCING…</span>
        )}
      </div>

      {!loading && bets.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-[10px] font-black text-muted-foreground tracking-[0.2em] uppercase">
            NO_BETS_RECORDED
          </p>
          <p className="text-[9px] text-muted-foreground mt-1">Be the first to predict.</p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
          {bets.map((bet) => (
            <div
              key={bet.id}
              className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border ${
                    bet.side === "YES"
                      ? "border-[#00FF85]/30 text-[#00FF85] bg-[#00FF85]/5"
                      : "border-white/20 text-white bg-white/5"
                  }`}
                >
                  {bet.side}
                </span>
                <span className="text-[9px] font-black text-muted-foreground tracking-widest font-mono">
                  {bet.user_address.slice(0, 4)}…{bet.user_address.slice(-4)}
                </span>
              </div>
              <span className="text-[10px] font-black text-white italic tracking-tighter">
                {stroopsToXlm(bet.amount)} XLM
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
