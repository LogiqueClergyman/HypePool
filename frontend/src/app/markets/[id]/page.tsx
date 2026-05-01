"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, TrendingUp, TrendingDown, CheckCircle, Loader2, Zap, Trophy, XCircle } from "lucide-react";
import Link from "next/link";
import { useWallet } from "@/contexts/WalletContext";
import {
  getMarket, getMarketBets, placeBet, confirmTx, submitSignedTx,
  getContentTiers, submitContent,
  stroopsToXlm, xlmToStroops, formatViews, formatDeadline, computePercent,
  type MarketDetail, type MarketBet, type TiersResponse,
} from "@/lib/api";

type UiError = { message: string; detail?: string };

function formatUiError(error: unknown, fallback: string): UiError {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const msg = raw.trim();
  const lowered = msg.toLowerCase();

  if (!msg) return { message: fallback };
  if (lowered.includes("market_closed") || lowered.includes("betting window has closed")) {
    return { message: "Betting window has closed for this market." };
  }
  if (lowered.includes("below_min_bet") || lowered.includes("minimum bet")) {
    return { message: "Bet amount is below the market minimum." };
  }
  if (lowered.includes("insufficient") || lowered.includes("balance")) {
    return { message: "Insufficient balance to place this bet." };
  }
  if (lowered.includes("simulation failed") || lowered.includes("hosterror") || lowered.includes("invalidaction")) {
    return {
      message: "Transaction simulation failed. Try a smaller amount or retry in a moment.",
      detail: msg,
    };
  }
  if (lowered.includes("fetch failed") || lowered.includes("networkerror") || lowered.includes("network error")) {
    return { message: "Network error while placing bet. Check API/server connection." };
  }

  if (msg.length > 220) {
    return { message: fallback, detail: msg };
  }
  return { message: msg };
}

// ── Donut Chart ───────────────────────────────────────────────────────────────

// ── Odds Bar ──────────────────────────────────────────────────────────────────

function OddsBar({ yesPct, noPct, yesXlm, noXlm }: { yesPct: number; noPct: number; yesXlm: number; noXlm: number }) {
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

function VideoMarketCreateBox({
  videoId,
  userAddress,
  onCreated,
}: {
  videoId: string;
  userAddress: string | null;
  onCreated: (marketId: string) => void;
}) {
  const { connect, connecting } = useWallet();
  const [tiersData, setTiersData] = useState<TiersResponse | null>(null);
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [selectedWindow, setSelectedWindow] = useState<number>(24);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const windowLabel = tiersData?.window_unit === "minutes" ? "M" : "H";

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getContentTiers(videoUrl);
        if (cancelled) return;
        setTiersData(data);
        setSelectedTier(data.available_tiers[0] ?? null);
        setSelectedWindow(data.available_windows.includes(24) ? 24 : (data.available_windows[0] ?? 24));
      } catch (e: unknown) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load available tiers");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [videoUrl]);

  const existingForSelection = tiersData?.existing_markets.some(
    (m) => m.threshold === selectedTier && m.window_hours === selectedWindow
  );

  const handleCreate = async () => {
    if (!userAddress) {
      setError("Connect wallet first.");
      return;
    }
    if (!selectedTier) return;

    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const res = await submitContent(videoUrl, [selectedTier], [selectedWindow], userAddress);
      const createdId = res.markets_created?.[0]?.id;
      if (createdId) {
        setMessage("Market ready. Redirecting...");
        onCreated(createdId);
        return;
      }
      setMessage("Market request submitted.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create market.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#0D0D0D] border border-white/10 rounded-xl p-6 space-y-4">
      {loading && <p className="text-[10px] text-muted-foreground">Loading options...</p>}
      {!loading && tiersData && (
        <div className="space-y-4">
          <div>
            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-2">Select Tier</p>
            <div className="flex flex-wrap gap-2">
              {tiersData.available_tiers.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTier(t)}
                  className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest border rounded-md transition-all ${
                    selectedTier === t
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-white/10 text-muted-foreground hover:text-white hover:border-white/30"
                  }`}
                >
                  {formatViews(t)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-2">Select Window</p>
            <div className="flex gap-2">
              {tiersData.available_windows.map((w) => (
                <button
                  key={w}
                  onClick={() => setSelectedWindow(w)}
                  className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest border rounded-md transition-all ${
                    selectedWindow === w
                      ? "border-white text-white bg-white/10"
                      : "border-white/10 text-muted-foreground hover:text-white hover:border-white/30"
                  }`}
                >
                  {w}{windowLabel}
                </button>
              ))}
            </div>
          </div>

          {!!existingForSelection && (
             <p className="text-[9px] text-yellow-400 font-bold">
               This tier + window already exists.
             </p>
          )}

          {!userAddress ? (
            <button
              onClick={connect}
              disabled={connecting}
              className="w-full py-4 border border-white/20 rounded-lg text-xs font-black uppercase tracking-widest text-white hover:border-primary hover:text-primary transition-all disabled:opacity-50"
            >
              {connecting ? "CONNECTING..." : "CONNECT WALLET"}
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={submitting || !selectedTier || !!existingForSelection}
              className="w-full py-4 border border-primary rounded-lg text-primary text-xs font-black uppercase tracking-widest hover:bg-primary/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:border-white/10 disabled:text-muted-foreground"
            >
              {submitting ? (
                "CREATING..."
              ) : (
                <>
                  <div className="w-4 h-4 rounded-full border border-current flex items-center justify-center shrink-0">
                    <div className="w-2 h-0.5 bg-current absolute" />
                    <div className="h-2 w-0.5 bg-current absolute" />
                  </div>
                  CREATE NEW MARKET
                </>
              )}
            </button>
          )}
        </div>
      )}
      {message && <p className="text-[9px] text-primary font-bold">{message}</p>}
      {error && <p className="text-[9px] text-red-400 font-bold">{error}</p>}
    </div>
  );
}

function RelatedMarketRow({
  market,
  currentId,
  onSelect,
}: {
  market: NonNullable<MarketDetail["related_markets"]>[number];
  currentId: string;
  onSelect: (marketId: string) => void;
}) {
  const active = market.status === "ACTIVE";
  const hasLiquidity = Number(market.yes_pool) + Number(market.no_pool) > 0;
  const yesPct = hasLiquidity ? computePercent(market.yes_pool, market.no_pool) : 0;
  const totalXlm = parseFloat(stroopsToXlm((BigInt(market.yes_pool) + BigInt(market.no_pool)).toString()));
  const isCurrent = market.id === currentId;

  return (
    <button
      type="button"
      onClick={() => onSelect(market.id)}
      className={`w-full flex items-center justify-between px-4 py-3 border border-white/10 rounded-lg hover:border-white/30 transition-all ${
        isCurrent ? "bg-primary/5 border-primary/30" : "bg-black/20"
      }`}
    >
      <div className="text-left">
        <p className="text-sm font-medium text-white mb-1">
          {formatViews(market.threshold)} · {market.window_hours}H
        </p>
        <p className="text-xs text-muted-foreground">
          {active ? formatDeadline(market.deadline) : market.status.replace("_", " ")}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium text-white">{totalXlm.toFixed(1)} XLM</p>
        <p className="text-xs text-muted-foreground">{yesPct}% YES</p>
      </div>
    </button>
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
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const minXlm = parseFloat(stroopsToXlm(minBet));

  const handleBet = async () => {
    if (!address) return;
    const xlm = parseFloat(amount);
    if (isNaN(xlm) || xlm < minXlm) {
      setErrorMsg(`Minimum bet is ${minXlm} XLM`);
      setErrorDetail(null);
      setStatus("error");
      return;
    }
    setStatus("loading");
    setErrorMsg(null);
    setErrorDetail(null);
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
      const parsed = formatUiError(e, "Transaction failed. Please try again.");
      setErrorMsg(parsed.message);
      setErrorDetail(parsed.detail ?? null);
      setStatus("error");
    }
  };

  if (!isActive) {
    return (
      <div className="bg-[#0D0D0D] border border-white/5 rounded-xl flex items-center justify-center p-8 min-h-[140px]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500/50" />
          <p className="text-xs font-black text-muted-foreground uppercase tracking-widest text-center">
            MARKET CLOSED
          </p>
        </div>
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
    <div className="w-full flex flex-col gap-4">
      {!connected ? (
        <button
          onClick={connect}
          disabled={connecting}
          className="group flex items-center justify-center gap-2 w-full py-4 bg-primary text-black text-sm font-black uppercase tracking-[0.2em] hover:bg-white transition-all disabled:opacity-50 rounded-sm"
        >
          {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {connecting ? "CONNECTING…" : "CONNECT WALLET"}
        </button>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setSide("yes")}
              className={`flex items-center justify-center gap-3 py-4 rounded-sm text-sm font-black uppercase tracking-widest border transition-all ${
                side === "yes"
                  ? "border-primary text-primary bg-primary/5 shadow-[0_0_15px_rgba(0,255,128,0.1)]"
                  : "border-white/10 text-white/60 hover:border-white/30 hover:text-white bg-transparent"
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              YES
            </button>
            <button
              onClick={() => setSide("no")}
              className={`flex items-center justify-center gap-3 py-4 rounded-sm text-sm font-black uppercase tracking-widest border transition-all ${
                side === "no"
                  ? "border-white/40 text-white bg-white/5"
                  : "border-white/10 text-white/60 hover:border-white/30 hover:text-white bg-transparent"
              }`}
            >
              <TrendingDown className="w-4 h-4" />
              NO
            </button>
          </div>

          <div className="flex gap-4 items-center">
            <div className="flex-1 flex items-center gap-2 border border-white/10 rounded-sm bg-black/40 px-4 py-3 focus-within:border-primary/40 transition-colors">
              <input
                type="number"
                min={minXlm}
                step="0.1"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setStatus("idle");
                  setErrorMsg(null);
                  setErrorDetail(null);
                }}
                placeholder={`min ${minXlm}`}
                className="flex-1 bg-transparent text-sm font-black text-white placeholder:text-white/30 outline-none w-full"
              />
              <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">XLM</span>
            </div>
            
            <button
              onClick={handleBet}
              disabled={status === "loading" || !amount}
              className={`px-8 py-3 rounded-sm font-black uppercase text-xs tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 h-full ${
                side === "yes"
                  ? "bg-primary text-black hover:bg-white"
                  : "bg-white text-black hover:bg-white/80"
              }`}
            >
              {status === "loading" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>BET {side.toUpperCase()}</>
              )}
            </button>
          </div>

          {status === "error" && errorMsg && (
            <div className="space-y-1.5 px-4 py-2 border border-red-500/20 bg-red-500/5 rounded-lg">
              <p className="text-[10px] font-bold text-red-400">{errorMsg}</p>
              {errorDetail && (
                <details className="text-[9px] text-red-300/80 break-all">
                  <summary className="cursor-pointer font-bold uppercase tracking-wide">Show technical error</summary>
                  <p className="mt-1.5 font-mono">{errorDetail}</p>
                </details>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MarketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { address } = useWallet();
  const [activeMarketId, setActiveMarketId] = useState(id);
  const [market, setMarket] = useState<MarketDetail | null>(null);
  const [bets, setBets] = useState<MarketBet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getMarket(activeMarketId), getMarketBets(activeMarketId)])
      .then(([m, b]) => { setMarket(m); setBets(b.bets); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeMarketId]);

  useEffect(() => {
    setActiveMarketId(id);
  }, [id]);

  const handleSwitchMarket = (marketId: string) => {
    if (marketId === activeMarketId) return;
    setLoading(true);
    setActiveMarketId(marketId);
    router.replace(`/markets/${marketId}`);
  };

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
  const hasLiquidity = yesXlm + noXlm > 0;
  const yesPct = hasLiquidity ? computePercent(market.yes_pool, market.no_pool) : 0;
  const noPct = hasLiquidity ? 100 - yesPct : 0;
  const isActive = market.status === "ACTIVE";
  const isResolved = market.status === "RESOLVED_YES" || market.status === "RESOLVED_NO";
  const threshold = formatViews(market.threshold);

  return (
    <div className="min-h-screen bg-black overflow-hidden flex flex-col">
      <div className="max-w-[1600px] w-full mx-auto px-6 lg:px-8 xl:px-12 pt-24 pb-6 flex-1 min-h-0">

        {/* ── MAIN GRID ── */}
        <div className="grid lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px] gap-8 h-full">

          {/* ── LEFT COLUMN ── */}
          <div className="bg-[#0D0D0D] border border-white/10 rounded-sm p-6 md:p-8 flex flex-col gap-6 h-full overflow-y-auto lg:overflow-hidden">

            {/* Header elements container to prevent them from shrinking */}
            <div className="shrink-0 flex flex-col gap-6">
              {/* Back */}
              <Link
                href="/markets"
                className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors text-[10px] font-black tracking-widest uppercase"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> BACK TO MARKETS
              </Link>

              {/* Title + meta */}
              {market.content && (
                <div>
                  <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1.5">
                    {market.content.channel} · {formatViews(market.content.current_views)} views
                  </p>
                  <h1 className="text-xl md:text-2xl font-black text-white uppercase italic leading-snug tracking-tight">
                    WILL &ldquo;{market.content.title}&rdquo; REACH{" "}
                    <span className="text-primary">{threshold} VIEWS</span> IN {market.window_hours}H?
                  </h1>
                </div>
              )}
            </div>

            {/* Video */}
            <div className="relative w-full aspect-video min-h-[280px] lg:min-h-[380px] bg-black border border-white/10 overflow-hidden rounded-sm shrink-0 shadow-[0_0_20px_rgba(0,255,128,0.03)]">
              {market.content?.video_id ? (
                <iframe
                  src={`https://www.youtube.com/embed/${market.content.video_id}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-white/40 text-xs tracking-widest">NO VIDEO</p>
                </div>
              )}
            </div>

            {/* Bottom elements container */}
            <div className="shrink-0 flex flex-col gap-6">
              {/* Bet widget */}
              <BetWidget marketId={activeMarketId} isActive={isActive} minBet={market.min_bet} />

              {/* Stats panel */}
              <div className="border border-white/10 rounded-sm p-5 md:p-6 flex flex-col md:flex-row gap-6 items-start">
                <div className="md:w-32 shrink-0">
                  <p className="text-[10px] font-black text-white uppercase tracking-widest">OTHER INFO</p>
                </div>

                <div className="flex-1 flex flex-col gap-6 w-full">
                  {/* Odds bars */}
                  <OddsBar yesPct={yesPct} noPct={noPct} yesXlm={yesXlm} noXlm={noXlm} />

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-4 border-t border-white/5 pt-5">
                    <div>
                      <p className="text-[8px] font-bold text-white/50 uppercase tracking-widest mb-0.5">TVL</p>
                      <p className="text-sm font-black text-primary italic">{totalXlm.toFixed(1)} XLM</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-white/50 uppercase tracking-widest mb-0.5">VIEWS</p>
                      <p className="text-sm font-black text-white">{formatViews(market.content?.current_views ?? 0)}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-white/50 uppercase tracking-widest mb-0.5">TIME LEFT</p>
                      <p className="text-sm font-black text-white">
                        {isActive ? formatDeadline(market.deadline) : market.status.replace("_", " ")}
                      </p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-white/50 uppercase tracking-widest mb-0.5">BETS</p>
                      <p className="text-sm font-black text-white">{bets.length}</p>
                    </div>
                    {totalXlm > 0 && (
                      <>
                        <div>
                          <p className="text-[8px] font-bold text-white/50 uppercase tracking-widest mb-0.5">YES PAYOUT</p>
                          <p className="text-sm font-black text-primary">~{(1 + noXlm / Math.max(yesXlm, 0.001)).toFixed(2)}x</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-bold text-white/50 uppercase tracking-widest mb-0.5">NO PAYOUT</p>
                          <p className="text-sm font-black text-white/70">~{(1 + yesXlm / Math.max(noXlm, 0.001)).toFixed(2)}x</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="flex flex-col gap-6 lg:h-full lg:overflow-hidden">

            {/* Active markets list */}
            <div className="bg-[#0D0D0D] border border-white/10 rounded-sm flex flex-col min-h-0 flex-1">
              <div className="px-6 py-5 shrink-0">
                <p className="text-[10px] font-black text-white uppercase tracking-widest">ACTIVE MARKETS</p>
              </div>
              {market.related_markets?.length ? (
                <div className="px-4 pb-4 space-y-2 overflow-y-auto flex-1">
                  {market.related_markets.map((m) => (
                    <RelatedMarketRow
                      key={m.id}
                      market={m}
                      currentId={market.id}
                      onSelect={handleSwitchMarket}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-white/50 px-6 pb-6 tracking-widest">NO OTHER MARKETS</p>
              )}
            </div>

            {/* Create new market */}
            {market.content?.video_id && (
              <div className="shrink-0">
                <VideoMarketCreateBox
                  videoId={market.content.video_id}
                  userAddress={address}
                  onCreated={handleSwitchMarket}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
