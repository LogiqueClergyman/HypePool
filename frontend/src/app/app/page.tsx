"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useWallet } from "@/contexts/WalletContext";
import {
  getUserPortfolio,
  getUserBets,
  stroopsToXlm,
  formatViews,
  stellarExpertTxUrl,
  type Portfolio,
  type BetRecord,
} from "@/lib/api";
import { Zap, ExternalLink } from "lucide-react";
import CustodialWalletPanel from "@/components/CustodialWalletPanel";

type FilterTab = "all" | "active" | "won" | "lost";

const TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "ALL" },
  { key: "active", label: "ACTIVE" },
  { key: "won", label: "WON" },
  { key: "lost", label: "LOST" },
];

function StatCard({
  label,
  value,
  accent,
  delay = 0,
}: {
  label: string;
  value: string;
  accent?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className="border border-white/10 bg-white/[0.02] p-5"
    >
      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-2.5">
        {label}
      </p>
      <p className={`text-2xl font-black tracking-tighter ${accent ?? "text-white"}`}>
        {value}
      </p>
    </motion.div>
  );
}

function BetCard({ bet, delay = 0 }: { bet: BetRecord; delay?: number }) {
  const side = bet.side.toString().toUpperCase();
  const amount = stroopsToXlm(bet.amount);
  const isActive = bet.market.status === "ACTIVE";
  const outcome = bet.market.outcome?.toUpperCase() ?? null;
  const isWon = !isActive && outcome !== null && side === outcome;
  const isLost = !isActive && outcome !== null && side !== outcome;
  const thresholdStr = formatViews(Number(bet.market.threshold));
  const betTxHref = bet.tx_hash ? stellarExpertTxUrl(bet.tx_hash) : null;
  const claimTxHref = bet.claim_tx_hash ? stellarExpertTxUrl(bet.claim_tx_hash) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
      className="flex items-start gap-4 p-4 border border-white/8 bg-white/[0.01] hover:bg-white/[0.03] transition-colors"
    >
      {/* Thumbnail */}
      <div className="shrink-0 w-[72px] h-[42px] border border-white/10 bg-white/5 overflow-hidden">
        {bet.market.content_thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bet.market.content_thumbnail}
            alt=""
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-white leading-snug line-clamp-1 mb-1.5">
          {bet.market.content_title}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] font-black text-[#6B6FE8] tracking-widest">
            {thresholdStr} VIEWS
          </span>
          <span className="text-white/20 text-[9px]">·</span>
          <span
            className={`text-[9px] font-black tracking-widest ${
              side === "YES" ? "text-[#00FF85]" : "text-red-400"
            }`}
          >
            {side}
          </span>
          <span className="text-white/20 text-[9px]">·</span>
          <span className="text-[9px] text-muted-foreground tracking-widest">
            {amount} XLM
          </span>
        </div>
        <div className="mt-2 flex flex-col gap-1">
          {betTxHref && (
            <a
              href={betTxHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[8px] font-bold text-muted-foreground hover:text-[#00FF85] tracking-wide"
            >
              <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
              Bet on-chain (explorer)
            </a>
          )}
          {isWon && !bet.claimed && (
            <p className="text-[8px] text-amber-400/90 font-bold tracking-wide">
              Win settled — payout processing (backend auto-claim). Refresh shortly.
            </p>
          )}
          {isWon && bet.claimed && claimTxHref && (
            <a
              href={claimTxHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[8px] font-bold text-muted-foreground hover:text-[#00FF85] tracking-wide"
            >
              <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
              Payout / claim on-chain
            </a>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="shrink-0 text-right space-y-1">
        {isActive && (
          <span className="inline-block px-2 py-0.5 text-[8px] font-black tracking-widest text-[#00FF85] border border-[#00FF85]/30 bg-[#00FF85]/5">
            LIVE
          </span>
        )}
        {isWon && (
          <>
            <div>
              <span className="inline-block px-2 py-0.5 text-[8px] font-black tracking-widest text-[#00FF85] border border-[#00FF85]/30 bg-[#00FF85]/5">
                WON
              </span>
            </div>
            <p className="text-[10px] font-black text-[#00FF85]">
              +{stroopsToXlm(bet.payout!)} XLM
            </p>
          </>
        )}
        {isLost && (
          <>
            <div>
              <span className="inline-block px-2 py-0.5 text-[8px] font-black tracking-widest text-red-400 border border-red-400/30 bg-red-400/5">
                LOST
              </span>
            </div>
            <p className="text-[10px] font-black text-red-400">-{amount} XLM</p>
          </>
        )}
      </div>
    </motion.div>
  );
}

export default function PortfolioPage() {
  const { address, connected, connect, connecting } = useWallet();

  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [bets, setBets] = useState<BetRecord[]>([]);
  const [tab, setTab] = useState<FilterTab>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  const fetchStats = useCallback(async (addr: string) => {
    setStatsLoading(true);
    try {
      const p = await getUserPortfolio(addr);
      setPortfolio(p);
    } catch {}
    setStatsLoading(false);
  }, []);

  const fetchBets = useCallback(
    async (addr: string, filter: FilterTab, pg: number) => {
      setLoading(true);
      try {
        const statusParam = filter === "all" ? undefined : filter;
        const res = await getUserBets(addr, statusParam as any, pg, 10);
        setBets(res.bets);
        setTotalPages(res.pages || 1);
      } catch {
        setBets([]);
      }
      setLoading(false);
    },
    []
  );

  useEffect(() => {
    if (!address) return;
    fetchStats(address);
  }, [address, fetchStats]);

  useEffect(() => {
    if (!address) return;
    setBets([]);
    setPage(1);
    fetchBets(address, tab, 1);
  }, [address, tab, fetchBets]);

  useEffect(() => {
    if (!address || page === 1) return;
    fetchBets(address, tab, page);
  }, [address, tab, page, fetchBets]);

  // ── Not connected ──────────────────────────────────────────────────────────
  if (!connected || !address) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="text-center max-w-xs"
        >
          <div className="w-12 h-12 border border-white/10 flex items-center justify-center mx-auto mb-6">
            <Zap className="w-5 h-5 text-[#00FF85]" />
          </div>
          <p className="text-[10px] font-black text-white tracking-[0.3em] uppercase mb-2">
            PORTFOLIO
          </p>
          <p className="text-[11px] text-muted-foreground mb-8 leading-relaxed">
            Connect your wallet to see your bets, winnings, and positions.
          </p>
          <button
            onClick={connect}
            disabled={connecting}
            className="px-8 py-3 bg-[#00FF85] text-black text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white transition-colors disabled:opacity-50 w-full"
          >
            {connecting ? "CONNECTING…" : "CONNECT WALLET"}
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const pnl = portfolio ? Number(portfolio.pnl) : 0;
  const pnlXlm = stroopsToXlm(Math.abs(pnl));
  const positive = pnl >= 0;
  const winRate =
    portfolio && portfolio.markets_won + portfolio.markets_lost > 0
      ? `${Math.round(
          (portfolio.markets_won / (portfolio.markets_won + portfolio.markets_lost)) * 100
        )}%`
      : "—";

  return (
    <div>
      <CustodialWalletPanel />
      <div className="max-w-3xl mx-auto px-5 py-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <p className="text-[9px] font-black text-muted-foreground tracking-[0.4em] uppercase mb-1">
          PORTFOLIO
        </p>
        <p className="text-[11px] text-white/40 font-mono tracking-widest">
          {address.slice(0, 8)}…{address.slice(-8)}
        </p>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        <StatCard
          label="ACTIVE BETS"
          value={statsLoading ? "—" : String(portfolio?.active_bets ?? 0)}
          accent="text-white"
          delay={0}
        />
        <StatCard
          label="TOTAL WAGERED"
          value={statsLoading ? "—" : `${stroopsToXlm(portfolio?.total_wagered ?? "0")} XLM`}
          delay={0.05}
        />
        <StatCard
          label="P&L"
          value={statsLoading ? "—" : `${positive ? "+" : "-"}${pnlXlm} XLM`}
          accent={statsLoading ? "text-white" : positive ? "text-[#00FF85]" : "text-red-400"}
          delay={0.1}
        />
        <StatCard
          label="WIN RATE"
          value={statsLoading ? "—" : winRate}
          accent={winRate !== "—" && winRate !== "0%" ? "text-[#00FF85]" : "text-white"}
          delay={0.15}
        />
      </div>

      <p className="text-[10px] text-muted-foreground leading-relaxed mb-6 border border-white/10 bg-white/[0.02] px-4 py-3">
        <span className="font-black text-white/80 uppercase tracking-widest text-[9px] block mb-1">
          Transactions
        </span>
        Every bet and payout is a Stellar transaction. Use{" "}
        <strong className="text-white/90">Bet on-chain</strong> to confirm your stake went through. After you win,{" "}
        <strong className="text-white/90">Payout / claim</strong> shows the claim tx once processed (custodial and
        Freighter bets are recorded under your connected account; stakes move from your custodial address when using
        custodial mode).
      </p>

      {/* Tabs */}
      <div className="flex border-b border-white/8 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-3 text-[9px] font-black uppercase tracking-[0.25em] border-b-2 transition-all ${
              tab === t.key
                ? "border-[#6B6FE8] text-white"
                : "border-transparent text-muted-foreground hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Bet list */}
      <div className="min-h-[120px]">
        {loading ? (
          <div className="py-16 text-center">
            <p className="text-[9px] font-black text-muted-foreground tracking-[0.3em] animate-pulse">
              LOADING…
            </p>
          </div>
        ) : bets.length === 0 ? (
          <div className="py-16 text-center border border-white/8">
            <p className="text-[9px] font-black text-muted-foreground tracking-[0.3em]">
              {tab === "active"
                ? "NO ACTIVE BETS"
                : tab === "won"
                ? "NO WINNING BETS YET"
                : tab === "lost"
                ? "NO LOSING BETS"
                : "NO BETS PLACED YET"}
            </p>
            {tab === "all" && (
              <a
                href="/markets"
                className="inline-block mt-4 px-6 py-2.5 bg-[#6B6FE8] text-white text-[9px] font-black uppercase tracking-[0.2em] hover:bg-[#5a5ed4] transition-colors"
              >
                BROWSE MARKETS →
              </a>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {bets.map((bet, i) => (
              <BetCard key={bet.id} bet={bet} delay={i * 0.04} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-white/10 text-[9px] font-black text-muted-foreground uppercase tracking-widest hover:border-white/30 hover:text-white transition-all disabled:opacity-30"
          >
            PREV
          </button>
          <span className="text-[9px] font-black text-muted-foreground tracking-widest">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-white/10 text-[9px] font-black text-muted-foreground uppercase tracking-widest hover:border-white/30 hover:text-white transition-all disabled:opacity-30"
          >
            NEXT
          </button>
        </div>
      )}
      </div>
    </div>
  );
}
