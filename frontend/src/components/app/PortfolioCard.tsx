"use client";

import { useEffect, useState } from "react";
import { getUserPortfolio, stroopsToXlm, type Portfolio } from "@/lib/api";
import { BarChart3, TrendingUp, TrendingDown } from "lucide-react";

interface Props {
  address: string | null;
  refreshTrigger?: number;
}

export default function PortfolioCard({ address, refreshTrigger }: Props) {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    setLoading(true);
    getUserPortfolio(address)
      .then((p) => { if (!cancelled) setPortfolio(p); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [address, refreshTrigger]);

  if (!address) {
    return (
      <div className="border border-white/10 bg-black p-5">
        <p className="text-[10px] font-black text-muted-foreground tracking-[0.3em] uppercase mb-2">
          PORTFOLIO
        </p>
        <p className="text-[9px] text-muted-foreground tracking-widest">
          Connect wallet to view stats.
        </p>
      </div>
    );
  }

  const pnl = portfolio ? Number(portfolio.pnl) : 0;
  const pnlXlm = stroopsToXlm(Math.abs(pnl));
  const positive = pnl >= 0;

  return (
    <div className="border border-white/10 bg-black p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5 text-[#00FF85]" />
          <span className="text-[10px] font-black text-[#00FF85] tracking-[0.3em] uppercase">
            PORTFOLIO
          </span>
        </div>
        {loading && (
          <span className="text-[9px] text-muted-foreground tracking-widest animate-pulse">
            LOADING…
          </span>
        )}
      </div>

      {portfolio ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">
              ACTIVE_BETS
            </p>
            <p className="text-xl font-black text-white italic tracking-tighter">
              {portfolio.active_bets}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">
              TOTAL_WAGERED
            </p>
            <p className="text-xl font-black text-white italic tracking-tighter">
              {stroopsToXlm(portfolio.total_wagered)} XLM
            </p>
          </div>
          <div>
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">
              PNL
            </p>
            <div className="flex items-center gap-1.5">
              {positive ? (
                <TrendingUp className="w-3.5 h-3.5 text-[#00FF85]" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-red-400" />
              )}
              <p
                className={`text-xl font-black italic tracking-tighter ${
                  positive ? "text-[#00FF85]" : "text-red-400"
                }`}
              >
                {positive ? "+" : "-"}{pnlXlm} XLM
              </p>
            </div>
          </div>
          <div>
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">
              WIN_RATE
            </p>
            <p className="text-xl font-black text-white italic tracking-tighter">
              {portfolio.markets_won + portfolio.markets_lost > 0
                ? `${Math.round(
                    (portfolio.markets_won /
                      (portfolio.markets_won + portfolio.markets_lost)) *
                      100
                  )}%`
                : "—"}
            </p>
          </div>
        </div>
      ) : (
        <div className="py-4 text-center">
          <p className="text-[9px] font-black text-muted-foreground tracking-[0.2em] uppercase">
            NO_DATA
          </p>
        </div>
      )}
    </div>
  );
}
