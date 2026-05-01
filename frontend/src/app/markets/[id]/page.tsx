"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Clock, Users, TrendingUp, TrendingDown,
  CheckCircle, XCircle, Loader2, Trophy, Zap, Wallet,
} from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useWallet } from "@/contexts/WalletContext";
import {
  getMarket, getMarketBets, placeBet, confirmTx, submitSignedTx,
  stroopsToXlm, xlmToStroops, formatViews, formatDeadline, computePercent,
  type MarketDetail, type MarketBet,
} from "@/lib/api";

// ── Donut Chart ───────────────────────────────────────────────────────────────

function DonutChart({ yesPct }: { yesPct: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const yesDash = (yesPct / 100) * circ;
  const noDash = circ - yesDash;
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full">
      <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
      <motion.circle
        cx="60" cy="60" r={r}
        fill="none" stroke="#00FF85" strokeWidth="12" strokeLinecap="butt"
        strokeDasharray={`${yesDash} ${noDash}`}
        strokeDashoffset={circ / 4}
        initial={{ strokeDasharray: `0 ${circ}` }}
        animate={{ strokeDasharray: `${yesDash} ${noDash}` }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />
      <text x="60" y="54" textAnchor="middle" fill="white" fontSize="18" fontWeight="900" fontStyle="italic">{yesPct}%</text>
      <text x="60" y="70" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="7" fontWeight="700" letterSpacing="3">YES</text>
    </svg>
  );
}

// ── Odds Bar ──────────────────────────────────────────────────────────────────

function OddsBar({ yesPct, yesXlm, noXlm }: { yesPct: number; yesXlm: number; noXlm: number }) {
  const noPct = 100 - yesPct;
  return (
    <div className="space-y-3">
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary" />
            <span className="text-[10px] font-black text-primary tracking-widest">YES</span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-primary italic">{yesPct}%</span>
            <span className="text-[9px] text-primary/60 ml-2 font-bold">{yesXlm.toFixed(1)} XLM</span>
          </div>
        </div>
        <div className="h-3 bg-white/5 w-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${yesPct}%` }} transition={{ duration: 1, ease: "easeOut" }} className="h-full bg-primary" />
        </div>
      </div>
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-white/30" />
            <span className="text-[10px] font-black text-muted-foreground tracking-widest">NO</span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-white italic">{noPct}%</span>
            <span className="text-[9px] text-muted-foreground ml-2 font-bold">{noXlm.toFixed(1)} XLM</span>
          </div>
        </div>
        <div className="h-3 bg-white/5 w-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${noPct}%` }} transition={{ duration: 1, ease: "easeOut", delay: 0.1 }} className="h-full bg-white/25" />
        </div>
      </div>
    </div>
  );
}

// ── Bet Row ───────────────────────────────────────────────────────────────────

function BetRow({ bet, outcome, index }: { bet: MarketBet; outcome: string | null; index: number }) {
  const isYes = bet.side === "YES";
  const won = outcome ? bet.side === outcome : null;
  const xlm = parseFloat(stroopsToXlm(bet.amount));
  const payoutXlm = bet.payout ? parseFloat(stroopsToXlm(bet.payout)) : null;
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex items-center justify-between py-3 border-b border-white/5 last:border-0"
    >
      <div className="flex items-center gap-3">
        {won === true && <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" />}
        {won === false && <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
        {won === null && <div className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0" />}
        <span className={`text-[9px] font-black tracking-widest px-2 py-0.5 ${isYes ? "bg-primary/15 text-primary" : "bg-white/8 text-white/60"}`}>
          {bet.side}
        </span>
        <p className="hidden sm:block text-[9px] font-mono text-muted-foreground">
          {bet.user_address.slice(0, 6)}…{bet.user_address.slice(-4)}
        </p>
      </div>
      <div className="text-right">
        <p className="text-xs font-black text-white italic">{xlm.toFixed(2)} XLM</p>
        {payoutXlm && won && <p className="text-[9px] font-black text-primary">+{payoutXlm.toFixed(2)} XLM</p>}
        {won === false && <p className="text-[9px] font-black text-red-400">LOST</p>}
        <p className="text-[8px] text-muted-foreground/50">
          {new Date(bet.placed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </motion.div>
  );
}

// ── Resolution Banner ─────────────────────────────────────────────────────────

function ResolutionBanner({ outcome, threshold }: { outcome: string; threshold: number }) {
  const won = outcome === "YES";
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-4 px-6 py-4 border ${won ? "border-primary/40 bg-primary/8" : "border-red-500/30 bg-red-500/5"}`}
    >
      {won ? <Trophy className="w-5 h-5 text-primary shrink-0" /> : <XCircle className="w-5 h-5 text-red-400 shrink-0" />}
      <div>
        <p className={`text-sm font-black uppercase italic tracking-tight ${won ? "text-primary" : "text-red-400"}`}>
          {won ? `Video HIT ${formatViews(threshold)} views — YES wins!` : `Video MISSED ${formatViews(threshold)} views — NO wins`}
        </p>
        <p className="text-[9px] text-muted-foreground mt-0.5 tracking-widest">
          {won ? "YES bettors receive their stake + share of NO pool" : "NO bettors receive their stake + share of YES pool"}
        </p>
      </div>
    </motion.div>
  );
}

// ── Bet Widget ────────────────────────────────────────────────────────────────

type BetStatus = "idle" | "loading" | "success" | "error";

function BetWidget({ marketId, isActive, minBet }: { marketId: string; isActive: boolean; minBet: string }) {
  const router = useRouter();
  const { address, network, connected, connect, connecting } = useWallet();
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<BetStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const minXlm = parseFloat(stroopsToXlm(minBet));

  const handleBet = async () => {
    if (!address) return;
    const xlm = parseFloat(amount);
    if (isNaN(xlm) || xlm < minXlm) {
      setErrorMsg(`Minimum bet is ${minXlm} XLM`);
      setStatus("error");
      return;
    }
    setStatus("loading");
    setErrorMsg(null);
    try {
      const result = await placeBet(marketId, side, xlmToStroops(xlm), address);

      if (result.status === "confirmed") {
        // Custodial wallet — backend already signed and submitted
        setTxHash(result.tx_hash ?? null);
        setStatus("success");
        setTimeout(() => router.push("/app"), 1800);
      } else if (result.status === "unsigned" && result.xdr && result.interaction_id) {
        // Freighter flow: sign → submit → confirm
        const { signTransaction } = await import("@stellar/freighter-api");
        const networkPassphrase =
          network === "TESTNET"
            ? "Test SDF Network ; September 2015"
            : "Public Global Stellar Network ; September 2015";

        const signResult = await signTransaction(result.xdr, { networkPassphrase });
        const signedXdr =
          typeof signResult === "string"
            ? signResult
            : (signResult as { signedTxXdr: string }).signedTxXdr;

        const { tx_hash } = await submitSignedTx(signedXdr);
        await confirmTx(result.interaction_id, tx_hash);
        setTxHash(tx_hash);
        setStatus("success");
        setTimeout(() => router.push("/app"), 1800);
      } else {
        throw new Error("Unexpected response from server");
      }
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Transaction failed.");
      setStatus("error");
    }
  };

  if (!isActive) {
    return (
      <div className="bg-[#0D0D0D] border border-white/8 p-5">
        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest text-center py-2">
          Market Closed
        </p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0D0D0D] border border-primary/30 p-5 space-y-4"
      >
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-primary" />
          <p className="text-[10px] font-black text-primary tracking-widest uppercase">Bet Placed!</p>
        </div>
        {txHash && (
          <p className="text-[9px] font-mono text-muted-foreground break-all">
            tx: {txHash.slice(0, 20)}…
          </p>
        )}
        <p className="text-[9px] text-muted-foreground tracking-widest">Redirecting to portfolio…</p>
        <Link
          href="/app"
          className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-black text-[9px] font-black uppercase tracking-widest hover:bg-white transition-all"
        >
          VIEW IN PORTFOLIO →
        </Link>
      </motion.div>
    );
  }

  return (
    <div className="bg-[#0D0D0D] border border-white/8 p-5 space-y-4">
      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.35em]">PLACE A BET</p>

      {!connected ? (
        <button
          onClick={connect}
          disabled={connecting}
          className="flex items-center justify-center gap-2 w-full py-3.5 bg-primary text-black text-[9px] font-black uppercase tracking-widest hover:bg-white transition-all disabled:opacity-50"
        >
          {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
          {connecting ? "CONNECTING…" : "CONNECT WALLET"}
        </button>
      ) : (
        <>
          {/* Side toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSide("yes")}
              className={`py-3 text-[9px] font-black uppercase tracking-widest border-2 transition-all ${
                side === "yes"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-white"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 mx-auto mb-1" />
              YES
            </button>
            <button
              onClick={() => setSide("no")}
              className={`py-3 text-[9px] font-black uppercase tracking-widest border-2 transition-all ${
                side === "no"
                  ? "border-red-400 bg-red-400/10 text-red-400"
                  : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-white"
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5 mx-auto mb-1" />
              NO
            </button>
          </div>

          {/* Amount */}
          <div>
            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">
              AMOUNT (min {minXlm} XLM)
            </p>
            <div className="flex items-center gap-2 border border-white/10 bg-white/[0.02] px-3 py-3 focus-within:border-primary/40 transition-colors">
              <input
                type="number"
                min={minXlm}
                step="0.1"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setStatus("idle"); setErrorMsg(null); }}
                placeholder={`${minXlm}`}
                className="flex-1 bg-transparent text-sm font-black text-white placeholder:text-muted-foreground/40 outline-none"
              />
              <span className="text-[9px] font-black text-muted-foreground">XLM</span>
            </div>
          </div>

          {/* Error */}
          {status === "error" && errorMsg && (
            <p className="text-[9px] font-bold text-red-400">{errorMsg}</p>
          )}

          {/* Submit */}
          <button
            onClick={handleBet}
            disabled={status === "loading" || !amount}
            className={`flex items-center justify-center gap-2 w-full py-4 font-black uppercase text-[9px] tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              side === "yes"
                ? "bg-primary text-black hover:bg-white"
                : "bg-red-500 text-white hover:bg-red-400"
            }`}
          >
            {status === "loading" ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> CONFIRMING…</>
            ) : (
              <>BET {side.toUpperCase()} →</>
            )}
          </button>

          <p className="text-[8px] text-muted-foreground/50 text-center tracking-widest">
            {address?.slice(0, 6)}…{address?.slice(-4)}
          </p>
        </>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MarketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [market, setMarket] = useState<MarketDetail | null>(null);
  const [bets, setBets] = useState<MarketBet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getMarket(id), getMarketBets(id)])
      .then(([m, b]) => { setMarket(m); setBets(b.bets); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (!market) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <p className="text-white font-black uppercase italic text-2xl">Market not found</p>
        <Link href="/markets" className="text-primary text-sm underline">← Back to markets</Link>
      </div>
    );
  }

  const yesXlm = parseFloat(stroopsToXlm(market.yes_pool));
  const noXlm = parseFloat(stroopsToXlm(market.no_pool));
  const totalXlm = yesXlm + noXlm;
  const yesPct = computePercent(market.yes_pool, market.no_pool);
  const isActive = market.status === "ACTIVE";
  const isResolved = market.status === "RESOLVED_YES" || market.status === "RESOLVED_NO";
  const threshold = formatViews(market.threshold);

  return (
    <div className="min-h-screen bg-black">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 lg:px-8 pt-28 pb-20">
        {/* Back */}
        <Link
          href="/markets"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-white transition-colors text-[10px] font-black tracking-widest uppercase mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> BACK TO MARKETS
        </Link>

        {/* Resolution banner */}
        {isResolved && market.outcome && (
          <div className="mb-6">
            <ResolutionBanner outcome={market.outcome} threshold={market.threshold} />
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_380px] gap-6 items-start">
          {/* ── LEFT COLUMN ── */}
          <div className="space-y-5">
            {/* YouTube embed */}
            {market.content?.video_id && (
              <div className="relative w-full aspect-video bg-black border border-white/10 overflow-hidden">
                <iframe
                  src={`https://www.youtube.com/embed/${market.content.video_id}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            )}

            {/* Odds card */}
            <div className="bg-[#0D0D0D] border border-white/8 p-6">
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.35em] mb-5">CURRENT ODDS</p>
              <div className="grid grid-cols-[1fr_auto] gap-6 items-center">
                <OddsBar yesPct={yesPct} yesXlm={yesXlm} noXlm={noXlm} />
                <div className="w-24 h-24 shrink-0">
                  <DonutChart yesPct={yesPct} />
                </div>
              </div>
            </div>

            {/* How you win */}
            <div className="bg-[#0D0D0D] border border-white/8 p-5">
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.35em] mb-4">HOW YOU WIN</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className={`p-4 border ${isResolved && market.outcome === "YES" ? "border-primary/40 bg-primary/8" : "border-primary/15 bg-primary/5"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[9px] font-black text-primary tracking-widest">BET YES</span>
                    {isResolved && market.outcome === "YES" && <Trophy className="w-3 h-3 text-primary ml-auto" />}
                  </div>
                  <p className="text-[10px] text-white/70 leading-relaxed">
                    Win if the video reaches <span className="text-primary font-bold">{threshold} views</span> before the deadline. You get your stake back + a share of the NO pool.
                  </p>
                  {totalXlm > 0 && (
                    <p className="text-[9px] text-primary font-black mt-2">
                      Current payout: ~{(1 + noXlm / Math.max(yesXlm, 0.001)).toFixed(2)}x
                    </p>
                  )}
                </div>
                <div className={`p-4 border ${isResolved && market.outcome === "NO" ? "border-red-400/40 bg-red-400/5" : "border-white/8 bg-white/[0.02]"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-3.5 h-3.5 text-white/60" />
                    <span className="text-[9px] font-black text-white/60 tracking-widest">BET NO</span>
                    {isResolved && market.outcome === "NO" && <Trophy className="w-3 h-3 text-white ml-auto" />}
                  </div>
                  <p className="text-[10px] text-white/70 leading-relaxed">
                    Win if the video <span className="font-bold text-white">fails to reach</span> {threshold} views in time. You get your stake back + a share of the YES pool.
                  </p>
                  {totalXlm > 0 && (
                    <p className="text-[9px] text-white/60 font-black mt-2">
                      Current payout: ~{(1 + yesXlm / Math.max(noXlm, 0.001)).toFixed(2)}x
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Bet history */}
            <div className="bg-[#0D0D0D] border border-white/8">
              <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.35em]">BET HISTORY</p>
                <p className="text-[9px] font-black text-muted-foreground">{bets.length} bets</p>
              </div>
              <div className="px-5">
                {bets.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground py-6 text-center tracking-widest">NO BETS YET — BE FIRST</p>
                ) : (
                  bets.map((bet, i) => (
                    <BetRow key={bet.id} bet={bet} outcome={market.outcome ?? null} index={i} />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="space-y-4 lg:sticky lg:top-24">
            {/* Title + meta */}
            {market.content && (
              <div>
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                  {market.content.channel} · {formatViews(market.content.current_views)} current views
                </p>
                <h1 className="text-base font-black text-white uppercase italic leading-snug tracking-tight">
                  WILL "{market.content.title?.slice(0, 55)}" REACH{" "}
                  <span className="text-primary">{threshold} VIEWS</span> IN {market.window_hours}H?
                </h1>
              </div>
            )}

            {/* Market info */}
            <div className="bg-[#0D0D0D] border border-white/8 p-5">
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.35em] mb-4">MARKET INFO</p>
              <div className="space-y-3">
                <div>
                  <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">STATUS</p>
                  <span className={`text-[9px] font-black tracking-widest px-3 py-1 border ${
                    isActive ? "border-primary/30 text-primary bg-primary/5"
                    : market.outcome === "YES" ? "border-primary/30 text-primary bg-primary/10"
                    : "border-red-400/30 text-red-400 bg-red-400/5"
                  }`}>
                    {isActive ? "● LIVE" : `RESOLVED ${market.outcome}`}
                  </span>
                </div>
                <div>
                  <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">DEADLINE</p>
                  <p className="text-sm font-black text-white italic">
                    {isActive ? formatDeadline(market.deadline) : new Date(market.deadline).toLocaleDateString()}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">VOLUME</p>
                    <p className="text-sm font-black text-white italic">{totalXlm.toFixed(1)} XLM</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">BETTORS</p>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-muted-foreground" />
                      <p className="text-sm font-black text-white italic">{market.total_bettors}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">MIN BET</p>
                    <p className="text-sm font-black text-white italic">{stroopsToXlm(market.min_bet)} XLM</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bet widget */}
            <BetWidget marketId={id} isActive={isActive} minBet={market.min_bet} />

            {/* Contract */}
            <div className="bg-[#0D0D0D] border border-white/5 p-4">
              <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">CONTRACT</p>
              <p className="text-[9px] font-mono text-white/40 break-all leading-relaxed">
                {market.contract_address || "Not deployed"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
