"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  Clock,
  Users,
  ChevronRight,
  Zap,
  Loader2,
  AlertCircle,
  CheckCircle,
  Filter,
  BarChart3,
  ArrowRight,
  Link as LinkIcon,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import {
  getMarkets,
  getContentTiers,
  submitContent,
  formatViews,
  formatDeadline,
  computePercent,
  type Market,
  type MarketContent,
  type TiersResponse,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import Navbar from "@/components/Navbar";

type MarketWithContent = Market & { content?: MarketContent };

type FilterTab = "ALL" | "CLOSING_SOON" | "HIGH_VOLUME";

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "ALL", label: "ALL" },
  { key: "CLOSING_SOON", label: "CLOSING SOON" },
  { key: "HIGH_VOLUME", label: "HIGH VOLUME" },
];

// ── Market Card ───────────────────────────────────────────────────────────────

function MarketCard({ market, index }: { market: MarketWithContent; index: number }) {
  const yes = Number(market.yes_pool);
  const no = Number(market.no_pool);
  const totalXlm = ((yes + no) / 1_000_000).toFixed(0);
  const yesPct = computePercent(market.yes_pool, market.no_pool);
  const noPct = 100 - yesPct;
  const timeLeft = formatDeadline(market.deadline);
  const threshold = formatViews(market.threshold);
  const isActive = market.status === "ACTIVE";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      className="group bg-[#0D0D0D] border border-white/8 hover:border-primary/40 transition-all overflow-hidden flex flex-col cursor-pointer"
    >
    <Link href={`/markets/${market.id}`} className="contents">
      {/* Thumbnail */}
      <div className="relative w-full aspect-video bg-[#111] overflow-hidden">
        {market.content?.thumbnail ? (
          <img
            src={market.content.thumbnail}
            alt={market.content.title || "Video"}
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-white/2 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
              <div className="w-0 h-0 border-t-[8px] border-b-[8px] border-l-[14px] border-t-transparent border-b-transparent border-l-white/50 ml-1" />
            </div>
          </div>
        )}

        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <span
            className={cn(
              "px-2 py-0.5 text-[8px] font-black uppercase tracking-widest border",
              isActive
                ? "bg-primary/20 text-primary border-primary/30"
                : "bg-white/5 text-muted-foreground border-white/10"
            )}
          >
            {market.status.replace("_", " ")}
          </span>
        </div>

        {isActive && (
          <div className="absolute top-2 right-2 flex items-center gap-1 text-[8px] font-black text-white bg-black/70 px-2 py-0.5 border border-white/10">
            <Clock className="w-2.5 h-2.5" />
            {timeLeft}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col flex-1">
        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">
          {market.content?.channel || "YOUTUBE"}
        </p>
        <h3 className="text-[11px] font-black text-white mb-1 leading-tight uppercase tracking-tight group-hover:text-primary transition-colors min-h-[2.5rem]">
          {market.content?.title
            ? `WILL "${market.content.title.slice(0, 44).toUpperCase()}" REACH ${threshold} VIEWS?`
            : `REACH ${threshold} VIEWS IN ${market.window_hours}H?`}
        </h3>

        {/* Pool bars */}
        <div className="space-y-2 mb-4 mt-3">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[8px] font-black text-primary tracking-widest">YES</span>
              <span className="text-[8px] font-black text-primary">{yesPct}%</span>
            </div>
            <div className="h-2 bg-white/5 w-full">
              <div
                className="h-full bg-primary transition-all duration-700"
                style={{ width: `${yesPct}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[8px] font-black text-muted-foreground tracking-widest">NO</span>
              <span className="text-[8px] font-black text-muted-foreground">{noPct}%</span>
            </div>
            <div className="h-2 bg-white/5 w-full">
              <div
                className="h-full bg-white/25 transition-all duration-700"
                style={{ width: `${noPct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between pt-3 border-t border-white/5">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-[7px] font-black text-muted-foreground uppercase tracking-widest">VOLUME</p>
              <p className="text-xs font-black text-white italic">{parseInt(totalXlm).toLocaleString()} XLM</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-3 h-3 text-muted-foreground" />
              <p className="text-xs font-black text-white italic">{market.total_bettors}</p>
            </div>
          </div>
          {isActive && (
            <Link
              href={`/markets/${market.id}`}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-black text-[9px] font-black uppercase tracking-widest hover:bg-white transition-all"
              onClick={e => e.stopPropagation()}
            >
              VIEW <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>
    </Link>
    </motion.div>
  );
}

// ── Create Market Modal ───────────────────────────────────────────────────────

type ModalStep = "idle" | "loading" | "tiersLoaded" | "submitting" | "success" | "error";

function CreateMarketModal({ onClose, userAddress, onCreated }: { onClose: () => void; userAddress: string | null; onCreated: () => void }) {
  const { connect, connecting } = useWallet();
  const [step, setStep] = useState<ModalStep>("idle");
  const [url, setUrl] = useState("");
  const [tiers, setTiers] = useState<TiersResponse | null>(null);
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [selectedWindow, setSelectedWindow] = useState(24);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [createdMarketId, setCreatedMarketId] = useState<string | null>(null);

  const handleFetchTiers = async () => {
    if (!url.trim()) return;
    setStep("loading");
    setError(null);
    try {
      const data = await getContentTiers(url.trim());
      setTiers(data);
      setSelectedTier(data.available_tiers[0] ?? null);
      setStep("tiersLoaded");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch video data.");
      setStep("error");
    }
  };

  const handleCreate = async () => {
    if (!selectedTier || !tiers) return;
    if (!userAddress) {
      setError("Connect your wallet first.");
      setStep("error");
      return;
    }
    setStep("submitting");
    setError(null);
    try {
      const result = await submitContent(url.trim(), [selectedTier], [selectedWindow], userAddress);
      if (result.markets_created?.length) {
        setCreatedMarketId(result.markets_created[0].id);
        setSuccessMsg(`Market created! Threshold: ${formatViews(result.markets_created[0].threshold)}`);
      } else {
        setSuccessMsg("Market submitted successfully.");
      }
      setStep("success");
      onCreated();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create market.");
      setStep("error");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg bg-[#0D0D0D] border border-white/10 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
          <div>
            <p className="text-[9px] font-black text-primary uppercase tracking-[0.3em] mb-0.5">NEW MARKET</p>
            <h2 className="text-base font-black text-white uppercase italic tracking-tight">CREATE A PREDICTION</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-white hover:border-white/30 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Wallet not connected — show inline connect */}
          {!userAddress && (
            <div className="flex items-center justify-between gap-4 px-4 py-3 border border-yellow-500/20 bg-yellow-500/5">
              <div className="flex items-center gap-2">
                <Wallet className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                <p className="text-[10px] font-bold text-yellow-400">Wallet not connected — connect to create markets.</p>
              </div>
              <button
                onClick={connect}
                disabled={connecting}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-primary text-black text-[9px] font-black uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-50"
              >
                {connecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                {connecting ? "CONNECTING…" : "CONNECT"}
              </button>
            </div>
          )}

          {/* URL Input */}
          <div>
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">YOUTUBE URL</p>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 border border-white/10 bg-white/[0.02] px-3 py-3 focus-within:border-primary/40 transition-colors">
                <LinkIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && step === "idle" && handleFetchTiers()}
                  placeholder="https://youtube.com/watch?v=..."
                  className="flex-1 bg-transparent text-xs font-medium text-white placeholder:text-muted-foreground/50 outline-none"
                />
              </div>
              <button
                onClick={handleFetchTiers}
                disabled={step === "loading" || !url.trim() || step === "tiersLoaded" || step === "success"}
                className="flex items-center gap-2 px-4 py-3 bg-primary text-black text-[9px] font-black uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                {step === "loading" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "FETCH"}
              </button>
            </div>
          </div>

          {/* Tiers */}
          {(step === "tiersLoaded" || step === "submitting" || step === "success") && tiers && (
            <>
              {tiers.title && (
                <div className="border border-white/8 overflow-hidden">
                  {tiers.thumbnail && (
                    <div className="relative w-full aspect-video bg-[#111] overflow-hidden">
                      <img
                        src={tiers.thumbnail}
                        alt={tiers.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
                        <span className="px-2 py-0.5 text-[8px] font-black tracking-widest bg-primary/90 text-black">
                          {formatViews(tiers.current_views)} VIEWS
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="p-3 bg-white/[0.02]">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">VIDEO</p>
                    <p className="text-xs font-bold text-white leading-snug">{tiers.title}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{tiers.author}</p>
                  </div>
                </div>
              )}

              <div>
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                  TARGET MILESTONE
                </p>
                {tiers.available_tiers.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground">Video has exceeded all available thresholds.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {tiers.available_tiers.map((t) => (
                      <button
                        key={t}
                        onClick={() => setSelectedTier(t)}
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
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                  TIME WINDOW
                </p>
                <div className="flex gap-2">
                  {[12, 24, 48, 72].map((w) => (
                    <button
                      key={w}
                      onClick={() => setSelectedWindow(w)}
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
            </>
          )}

          {/* Error */}
          {(step === "error") && error && (
            <div className="flex items-start gap-2 px-3 py-3 border border-red-500/30 bg-red-500/5">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-[10px] font-bold text-red-400">{error}</p>
            </div>
          )}

          {/* Success */}
          {step === "success" && successMsg && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 border border-primary/30 bg-primary/5">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                <p className="text-[10px] font-black text-primary">{successMsg}</p>
              </div>
              {createdMarketId && (
                <a
                  href={`/markets/${createdMarketId}`}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-primary text-black text-[9px] font-black uppercase tracking-widest hover:bg-white transition-colors"
                >
                  VIEW <ArrowRight className="w-3 h-3" />
                </a>
              )}
            </div>
          )}

          {/* CTA */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-4 border border-white/10 text-white text-[9px] font-black uppercase tracking-widest hover:border-white/30 transition-all"
            >
              {step === "success" ? "CLOSE" : "CANCEL"}
            </button>
            {step !== "success" && (
              <button
                onClick={handleCreate}
                disabled={
                  step !== "tiersLoaded" ||
                  !selectedTier ||
                  !tiers ||
                  tiers.available_tiers.length === 0
                }
                className="flex-1 py-4 bg-primary text-black text-[9px] font-black uppercase tracking-widest hover:bg-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {step === "submitting" ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> CREATING…
                  </>
                ) : (
                  <>CREATE MARKET <ArrowRight className="w-3.5 h-3.5" /></>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MarketsPage() {
  const { address, connect, connecting, connected } = useWallet();
  const [markets, setMarkets] = useState<MarketWithContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("ALL");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);

  const fetchMarkets = useCallback(
    async (pageNum: number, currentFilter: FilterTab, replace: boolean) => {
      setLoading(true);
      try {
        const sortMap: Record<FilterTab, string | undefined> = {
          ALL: undefined,
          CLOSING_SOON: "closing_soon",
          HIGH_VOLUME: "volume",
        };
        const res = await getMarkets({
          status: "ACTIVE",
          sort: sortMap[currentFilter],
          page: pageNum,
          limit: 12,
        });
        setMarkets((prev) => (replace ? res.markets : [...prev, ...res.markets]));
        setTotal(res.total);
        setHasMore(pageNum < res.pages);
      } catch {
        // silently keep existing state
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    setPage(1);
    fetchMarkets(1, filter, true);
  }, [filter, fetchMarkets]);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchMarkets(next, filter, false);
  };

  return (
    <div className="min-h-screen bg-black">
      <Navbar />

      {/* Header */}
      <div className="pt-32 pb-12 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[9px] font-black text-primary uppercase tracking-[0.4em] mb-3"
              >
                MARKET MAP
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-5xl font-black text-white uppercase italic tracking-tighter"
              >
                ALL <span className="text-primary">MARKETS</span>
              </motion.h1>
              {!loading && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-sm text-muted-foreground mt-2 font-medium"
                >
                  {total.toLocaleString()} active prediction markets
                </motion.p>
              )}
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
              className="flex items-center gap-3 shrink-0"
            >
              {connected && address ? (
                <div className="hidden sm:flex items-center gap-2 px-3 py-2 border border-white/10 bg-white/[0.02]">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-[10px] font-black text-white tracking-widest">
                    {address.slice(0, 4)}…{address.slice(-4)}
                  </span>
                </div>
              ) : (
                <button
                  onClick={connect}
                  disabled={connecting}
                  className="flex items-center gap-2 px-5 py-4 border border-white/10 text-white text-xs font-black uppercase tracking-widest hover:border-primary hover:text-primary transition-all disabled:opacity-50"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  {connecting ? "CONNECTING…" : "CONNECT WALLET"}
                </button>
              )}
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-3 px-8 py-4 bg-primary text-black font-black uppercase text-xs tracking-widest hover:bg-white transition-all neon-glow"
              >
                <Plus className="w-4 h-4" />
                CREATE MARKET
              </button>
            </motion.div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 mt-8">
            <Filter className="w-3.5 h-3.5 text-muted-foreground mr-1" />
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={cn(
                  "px-5 py-2.5 text-[9px] font-black tracking-widest transition-all border",
                  filter === tab.key
                    ? "bg-primary border-primary text-black"
                    : "border-white/10 text-muted-foreground hover:text-white hover:border-white/20"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        {loading && markets.length === 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-[#0D0D0D] border border-white/8 overflow-hidden animate-pulse">
                <div className="w-full aspect-video bg-white/5" />
                <div className="p-5 space-y-3">
                  <div className="h-8 w-full bg-white/5" />
                  <div className="h-4 w-full bg-white/5" />
                  <div className="h-4 w-3/4 bg-white/5" />
                  <div className="h-8 w-full bg-white/5 mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : markets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-black text-white uppercase italic mb-2">No markets found</p>
            <p className="text-sm text-muted-foreground mb-6">Be the first to create a prediction market.</p>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-8 py-4 bg-primary text-black font-black uppercase text-xs tracking-widest"
            >
              <Plus className="w-4 h-4" /> CREATE MARKET
            </button>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {markets.map((market, i) => (
                <MarketCard key={market.id} market={market} index={i} />
              ))}
            </div>

            {hasMore && (
              <div className="mt-12 flex justify-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="flex items-center gap-3 px-10 py-4 border border-white/15 text-white font-black uppercase text-xs tracking-widest hover:border-primary hover:text-primary transition-all disabled:opacity-40"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  LOAD MORE
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Market Modal */}
      <AnimatePresence>
        {showModal && (
          <CreateMarketModal
            onClose={() => setShowModal(false)}
            userAddress={address}
            onCreated={() => fetchMarkets(1, filter, true)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
