"use client";

import { useState, useCallback, useMemo } from "react";
import { ArrowRight, Loader2, CheckCircle, AlertCircle, Link as LinkIcon, TrendingUp } from "lucide-react";
import {
  getContentTiers,
  submitContent,
  placeBet,
  confirmTx,
  getWallet,
  createWallet,
  xlmToStroops,
  stroopsToXlm,
  formatViews,
  extractYouTubeId,
  type TiersResponse,
  type Market,
  type MarketCreated,
} from "@/lib/api";
import { signWithFreighter, submitStellarTx } from "@/lib/stellar";
import { cn } from "@/lib/utils";

type Step = "idle" | "loading" | "tiersLoaded" | "submitting" | "success" | "error";

interface Props {
  userAddress: string | null;
  walletNetwork: "TESTNET" | "MAINNET" | null;
  onContentLoaded: (data: TiersResponse, videoId: string) => void;
  onMarketReady: (market: MarketCreated) => void;
  onBetPlaced: () => void;
  market?: Market | null;
}

const TIME_WINDOWS = [12, 24, 48, 72];
const MIN_BET_XLM = 1;

export default function BetPanel({
  userAddress,
  walletNetwork,
  onContentLoaded,
  onMarketReady,
  onBetPlaced,
  market,
}: Props) {
  const [step, setStep] = useState<Step>("idle");
  const [url, setUrl] = useState("");
  const [tiers, setTiers] = useState<TiersResponse | null>(null);
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [selectedWindow, setSelectedWindow] = useState<number>(24);
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [amountXlm, setAmountXlm] = useState("1");
  const [activeMarketId, setActiveMarketId] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Estimated payout calculation ───────────────────────────────────────────
  const estimatedPayout = useMemo(() => {
    if (!market) return null;
    const amount = parseFloat(amountXlm);
    if (isNaN(amount) || amount <= 0) return null;

    const yesPool = parseFloat(stroopsToXlm(market.yes_pool));
    const noPool = parseFloat(stroopsToXlm(market.no_pool));
    const amountStroops = xlmToStroops(amount) / 1_000_000;

    if (side === "yes") {
      const newYesPool = yesPool + amountStroops;
      const totalPool = yesPool + noPool + amountStroops;
      const payout = totalPool === 0 ? amountStroops : (amountStroops / newYesPool) * totalPool;
      return payout.toFixed(2);
    } else {
      const newNoPool = noPool + amountStroops;
      const totalPool = yesPool + noPool + amountStroops;
      const payout = totalPool === 0 ? amountStroops : (amountStroops / newNoPool) * totalPool;
      return payout.toFixed(2);
    }
  }, [market, amountXlm, side]);

  const handleAnalyze = useCallback(async () => {
    if (!url.trim()) return;
    setStep("loading");
    setError(null);
    try {
      const data = await getContentTiers(url.trim());
      setTiers(data);
      setSelectedTier(data.available_tiers[0] ?? null);
      const videoId = extractYouTubeId(url.trim());
      if (videoId) onContentLoaded(data, videoId);

      const existing = data.existing_markets.find(
        (m) => m.threshold === data.available_tiers[0] && m.window_hours === 24
      );
      if (existing) {
        setActiveMarketId(existing.market_id);
        onMarketReady({
          id: existing.market_id,
          onchain_id: 0,
          contract_address: "",
          threshold: existing.threshold,
          window_hours: existing.window_hours,
          deadline: "",
          tx_hash: null,
        });
      }
      setStep("tiersLoaded");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch content data.");
      setStep("error");
    }
  }, [url, onContentLoaded, onMarketReady]);

  const handleTierOrWindowChange = (tier: number, window: number) => {
    if (!tiers) return;
    const existing = tiers.existing_markets.find(
      (m) => m.threshold === tier && m.window_hours === window
    );
    if (existing) {
      setActiveMarketId(existing.market_id);
      onMarketReady({
        id: existing.market_id,
        onchain_id: 0,
        contract_address: "",
        threshold: existing.threshold,
        window_hours: existing.window_hours,
        deadline: "",
        tx_hash: null,
      });
    } else {
      setActiveMarketId(null);
    }
  };

  const ensureCustodialWallet = async (address: string): Promise<void> => {
    try {
      await getWallet(address);
    } catch {
      await createWallet(address);
    }
  };

  const handlePlaceBet = useCallback(async () => {
    if (!userAddress || !selectedTier || !tiers) return;
    const amount = parseFloat(amountXlm);
    if (isNaN(amount) || amount < MIN_BET_XLM) {
      setError(`Minimum bet is ${MIN_BET_XLM} XLM.`);
      return;
    }
    setStep("submitting");
    setError(null);

    try {
      await ensureCustodialWallet(userAddress);
      let marketId = activeMarketId;

      if (!marketId) {
        const submitRes = await submitContent(url.trim(), [selectedTier], [selectedWindow], userAddress);
        if (submitRes.markets_created?.length) {
          const created = submitRes.markets_created[0];
          marketId = created.id;
          setActiveMarketId(created.id);
          onMarketReady(created);
        } else if (submitRes.interactions?.length) {
          for (const interaction of submitRes.interactions) {
            const signed = await signWithFreighter(interaction.xdr, walletNetwork ?? "TESTNET");
            const hash = await submitStellarTx(signed, walletNetwork ?? "TESTNET");
            await confirmTx(interaction.interaction_id, hash);
          }
          const existing = tiers.existing_markets.find(
            (m) => m.threshold === selectedTier && m.window_hours === selectedWindow
          );
          marketId = existing?.market_id ?? null;
        }
      }

      if (!marketId) throw new Error("Market creation failed. Try again.");

      const stroops = xlmToStroops(amount);
      const betRes = await placeBet(marketId, side, stroops, userAddress);

      if (betRes.status === "unsigned" && betRes.xdr && betRes.interaction_id) {
        const signed = await signWithFreighter(betRes.xdr, walletNetwork ?? "TESTNET");
        const hash = await submitStellarTx(signed, walletNetwork ?? "TESTNET");
        await confirmTx(betRes.interaction_id, hash);
        setTxHash(hash);
      } else if (betRes.tx_hash) {
        setTxHash(betRes.tx_hash);
      }

      setStep("success");
      onBetPlaced();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Transaction failed.");
      setStep("error");
    }
  }, [
    userAddress,
    walletNetwork,
    selectedTier,
    selectedWindow,
    side,
    amountXlm,
    activeMarketId,
    tiers,
    url,
    onMarketReady,
    onBetPlaced,
  ]);

  const reset = () => {
    setStep("tiersLoaded");
    setError(null);
    setTxHash(null);
    setAmountXlm("1");
  };

  const hasTiers = step === "tiersLoaded" || step === "submitting" || step === "success" || step === "error";

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto">
      {/* URL Input */}
      <div className="border border-white/10 bg-[#0D0D0D] p-5">
        <p className="text-[9px] font-black text-primary tracking-[0.35em] uppercase mb-3">PASTE VIDEO URL</p>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 border border-white/10 bg-white/[0.02] px-3 py-3 focus-within:border-primary/40 transition-colors">
            <LinkIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              placeholder="https://youtube.com/watch?v=..."
              className="flex-1 bg-transparent text-xs font-medium text-white placeholder:text-muted-foreground/40 outline-none"
            />
          </div>
          <button
            onClick={handleAnalyze}
            disabled={step === "loading" || !url.trim()}
            className="flex items-center gap-2 px-4 py-3 bg-primary text-black text-[9px] font-black uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {step === "loading" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>ANALYZE <ArrowRight className="w-3.5 h-3.5" /></>
            )}
          </button>
        </div>

        {/* Video meta */}
        {tiers && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">VIDEO</p>
            <p className="text-xs font-bold text-white truncate">{tiers.title}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">
              {(tiers.current_views / 1_000_000).toFixed(1)}M current views · {tiers.author}
            </p>
          </div>
        )}
      </div>

      {/* Bet form */}
      {hasTiers && tiers && (
        <>
          {/* Tier + Window in one card */}
          <div className="border border-white/10 bg-[#0D0D0D] p-5 space-y-4">
            <div>
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2.5">
                VIEW MILESTONE
              </p>
              {tiers.available_tiers.length === 0 ? (
                <p className="text-[10px] text-muted-foreground">Video has exceeded all thresholds.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tiers.available_tiers.map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setSelectedTier(t);
                        handleTierOrWindowChange(t, selectedWindow);
                      }}
                      className={cn(
                        "px-4 py-2 text-[9px] font-black uppercase tracking-widest border transition-all",
                        selectedTier === t
                          ? "bg-primary border-primary text-black"
                          : "border-white/10 text-muted-foreground hover:border-white/30 hover:text-white"
                      )}
                    >
                      {formatViews(t)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2.5">
                TIME WINDOW
              </p>
              <div className="flex gap-2">
                {TIME_WINDOWS.map((w) => (
                  <button
                    key={w}
                    onClick={() => {
                      setSelectedWindow(w);
                      if (selectedTier) handleTierOrWindowChange(selectedTier, w);
                    }}
                    className={cn(
                      "flex-1 py-2.5 text-[9px] font-black uppercase tracking-widest border transition-all",
                      selectedWindow === w
                        ? "bg-white/10 border-white text-white"
                        : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-white"
                    )}
                  >
                    {w}H
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Position + Amount */}
          <div className="border border-white/10 bg-[#0D0D0D] p-5 space-y-4">
            {/* Side */}
            <div>
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2.5">POSITION</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSide("yes")}
                  className={cn(
                    "py-3.5 text-[9px] font-black uppercase tracking-widest border transition-all",
                    side === "yes"
                      ? "bg-primary border-primary text-black"
                      : "border-primary/20 text-primary hover:bg-primary/10"
                  )}
                >
                  YES — WILL HIT
                </button>
                <button
                  onClick={() => setSide("no")}
                  className={cn(
                    "py-3.5 text-[9px] font-black uppercase tracking-widest border transition-all",
                    side === "no"
                      ? "bg-white border-white text-black"
                      : "border-white/20 text-white hover:bg-white/10"
                  )}
                >
                  NO — WON'T HIT
                </button>
              </div>
            </div>

            {/* Amount */}
            <div>
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                AMOUNT (XLM) — min {MIN_BET_XLM} XLM
              </p>
              <div className="flex items-center border border-white/10 bg-white/[0.02] px-3 py-3 focus-within:border-primary/40 transition-colors">
                <input
                  type="number"
                  min={MIN_BET_XLM}
                  step="0.5"
                  value={amountXlm}
                  onChange={(e) => setAmountXlm(e.target.value)}
                  className="flex-1 bg-transparent text-base font-black text-white italic tracking-tighter outline-none"
                />
                <span className="text-[9px] font-black text-muted-foreground tracking-widest">XLM</span>
              </div>
            </div>

            {/* Estimated payout */}
            {estimatedPayout && (
              <div className="flex items-center gap-2 px-3 py-2.5 border border-primary/15 bg-primary/5">
                <TrendingUp className="w-3.5 h-3.5 text-primary shrink-0" />
                <div className="flex items-center justify-between flex-1">
                  <p className="text-[9px] font-black text-primary/80 uppercase tracking-widest">
                    EST. PAYOUT IF {side.toUpperCase()} WINS
                  </p>
                  <p className="text-sm font-black text-primary italic">~{estimatedPayout} XLM</p>
                </div>
              </div>
            )}

            {/* Error */}
            {(step === "error") && error && (
              <div className="flex items-start gap-2 px-3 py-2.5 border border-red-500/30 bg-red-500/5">
                <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold text-red-400">{error}</p>
              </div>
            )}

            {/* Success */}
            {step === "success" && txHash && (
              <div className="flex items-start gap-2 px-3 py-2.5 border border-primary/30 bg-primary/5">
                <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-[9px] font-black text-primary tracking-[0.2em] uppercase">BET CONFIRMED</p>
                  <p className="text-[8px] text-muted-foreground mt-0.5 font-mono break-all">
                    {txHash.slice(0, 16)}…{txHash.slice(-8)}
                  </p>
                </div>
              </div>
            )}

            {/* Submit */}
            {!userAddress ? (
              <p className="text-[9px] font-black text-muted-foreground tracking-[0.2em] uppercase text-center py-3 border border-white/5">
                CONNECT WALLET TO BET
              </p>
            ) : step === "success" ? (
              <button
                onClick={reset}
                className="w-full py-4 border border-white/10 text-white text-[9px] font-black uppercase tracking-[0.2em] hover:border-white/30 transition-all"
              >
                PLACE ANOTHER BET
              </button>
            ) : (
              <button
                onClick={handlePlaceBet}
                disabled={step === "submitting" || !selectedTier || tiers.available_tiers.length === 0}
                className="w-full py-4 bg-primary text-black text-[9px] font-black uppercase tracking-[0.2em] hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {step === "submitting" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> PROCESSING…
                  </>
                ) : (
                  <>PLACE BET <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
