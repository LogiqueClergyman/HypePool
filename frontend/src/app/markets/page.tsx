"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, Clock, Users, ChevronRight, Zap, Loader2,
  AlertCircle, CheckCircle, Link as LinkIcon, Wallet, ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getFeed, getContentTiers, submitContent,
  formatViews, formatDeadline, computePercent,
  type FeedItem, type TiersResponse,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import Navbar from "@/components/Navbar";

// ── Market Row (inside a content card) ───────────────────────────────────────

function MarketRow({ market, index }: { market: FeedItem["markets"][number]; index: number }) {
  const yes = Number(market.yes_pool);
  const no = Number(market.no_pool);
  const hasLiquidity = yes + no > 0;
  const yesPct = hasLiquidity ? computePercent(yes, no) : 0;
  const noPct = hasLiquidity ? 100 - yesPct : 0;
  const totalXlm = ((yes + no) / 10_000_000).toFixed(0);
  const isActive = market.status === "ACTIVE";

  return (
    <Link
      href={`/markets/${market.id}`}
      className={cn(
        "flex items-center gap-3 px-4 py-3 border-t border-white/5 hover:bg-white/[0.03] transition-colors group/row",
        !isActive && "opacity-50"
      )}
    >
      {/* Threshold + window */}
      <div className="w-28 shrink-0">
        <p className="text-[10px] font-black text-white tracking-tight">
          {formatViews(market.threshold)}
        </p>
        <p className="text-[8px] font-bold text-muted-foreground tracking-widest mt-0.5">
          {market.window_hours}H WINDOW
        </p>
      </div>

      {/* Pool bars */}
      <div className="flex-1 space-y-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-black text-primary w-6 shrink-0">{yesPct}%</span>
          <div className="flex-1 h-1.5 bg-white/5">
            <div className="h-full bg-primary transition-all" style={{ width: `${yesPct}%` }} />
          </div>
          <span className="text-[8px] font-black text-muted-foreground w-6 text-right shrink-0">{noPct}%</span>
        </div>
      </div>

      {/* Volume + time */}
      <div className="text-right shrink-0 hidden sm:block">
        <p className="text-[9px] font-black text-white italic">{parseInt(totalXlm).toLocaleString()} XLM</p>
        {isActive && (
          <p className="text-[8px] font-bold text-muted-foreground flex items-center gap-1 justify-end mt-0.5">
            <Clock className="w-2.5 h-2.5" />
            {formatDeadline(market.deadline)}
          </p>
        )}
        {!isActive && (
          <p className="text-[8px] font-black text-muted-foreground tracking-widest mt-0.5">
            {market.status.replace("_", " ")}
          </p>
        )}
      </div>

      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover/row:text-primary transition-colors shrink-0" />
    </Link>
  );
}

// ── Content Card ─────────────────────────────────────────────────────────────

function ContentCard({ item, index }: { item: FeedItem; index: number }) {
  const { content, markets, total_volume, total_bettors } = item;
  const totalXlm = (Number(total_volume) / 10_000_000).toFixed(0);
  const activeCount = markets.filter(m => m.status === "ACTIVE").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      className="bg-[#0D0D0D] border border-white/8 hover:border-primary/30 transition-all overflow-hidden"
    >
      {/* Thumbnail — shown ONCE for the video */}
      <div className="relative w-full aspect-video bg-[#111] overflow-hidden">
        {content.thumbnail ? (
          <img
            src={content.thumbnail}
            alt={content.title}
            className="w-full h-full object-cover opacity-80"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/5 to-transparent">
            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
              <div className="w-0 h-0 border-t-[7px] border-b-[7px] border-l-[12px] border-t-transparent border-b-transparent border-l-white/50 ml-1" />
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {/* Active badge */}
        {activeCount > 0 && (
          <div className="absolute top-2 left-2">
            <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-widest bg-primary/90 text-black">
              {activeCount} ACTIVE
            </span>
          </div>
        )}

        {/* Current views */}
        <div className="absolute bottom-2 right-2">
          <span className="px-2 py-0.5 text-[8px] font-black tracking-widest bg-black/70 text-white border border-white/10">
            {formatViews(content.current_views)} VIEWS
          </span>
        </div>
      </div>

      {/* Content info — shown ONCE */}
      <div className="px-4 py-3 border-b border-white/5">
        <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">
          {content.channel || "YOUTUBE"}
        </p>
        <h3 className="text-[11px] font-black text-white uppercase italic tracking-tight leading-snug line-clamp-2">
          {content.title}
        </h3>
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <Users className="w-3 h-3 text-muted-foreground" />
            <span className="text-[9px] font-black text-muted-foreground">{total_bettors} bettors</span>
          </div>
          <span className="text-[9px] font-black text-white italic">{parseInt(totalXlm).toLocaleString()} XLM total</span>
        </div>
      </div>

      {/* Markets — one row per market */}
      <div>
        {markets.map((market, i) => (
          <MarketRow key={market.id} market={market} index={i} />
        ))}
      </div>
    </motion.div>
  );
}

// ── Create Market Modal ───────────────────────────────────────────────────────

type ModalStep = "idle" | "loading" | "tiersLoaded" | "submitting" | "success" | "error";

function CreateMarketModal({ onClose, userAddress, onCreated, initialUrl }: {
  onClose: () => void;
  userAddress: string | null;
  onCreated: () => void;
  initialUrl?: string;
}) {
  const router = useRouter();
  const { connect, connecting } = useWallet();
  const [step, setStep] = useState<ModalStep>("idle");
  const [url, setUrl] = useState(initialUrl ?? "");
  const [tiers, setTiers] = useState<TiersResponse | null>(null);
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [selectedWindow, setSelectedWindow] = useState(24);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const windowLabel = tiers?.window_unit === "minutes" ? "M" : "H";

  const handleFetchTiers = async () => {
    if (!url.trim()) return;
    setStep("loading");
    setError(null);
    try {
      const data = await getContentTiers(url.trim());
      if (data.existing_markets.length > 0) {
        const firstMarketId = data.existing_markets[0]?.market_id;
        if (firstMarketId) {
          setSuccessMsg("Existing market found. Redirecting...");
          setStep("success");
          setTimeout(() => {
            onClose();
            router.push(`/markets/${firstMarketId}`);
          }, 500);
          return;
        }
        setError("A market for this video already exists.");
        setStep("error");
        return;
      }
      setTiers(data);
      setSelectedTier(data.available_tiers[0] ?? null);
      setSelectedWindow(data.available_windows.includes(24) ? 24 : (data.available_windows[0] ?? 24));
      setStep("tiersLoaded");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch video data.");
      setStep("error");
    }
  };

  const handleCreate = async () => {
    if (!selectedTier || !tiers || !userAddress) {
      if (!userAddress) setError("Connect your wallet first.");
      setStep("error");
      return;
    }
    setStep("submitting");
    setError(null);
    try {
      const result = await submitContent(url.trim(), [selectedTier], [selectedWindow], userAddress);
      if (result.markets_created?.length) {
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
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
          <div>
            <p className="text-[9px] font-black text-primary uppercase tracking-[0.3em] mb-0.5">NEW MARKET</p>
            <h2 className="text-base font-black text-white uppercase italic tracking-tight">CREATE A PREDICTION</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-white hover:border-white/30 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {!userAddress && (
            <div className="flex items-center justify-between gap-4 px-4 py-3 border border-yellow-500/20 bg-yellow-500/5">
              <div className="flex items-center gap-2">
                <Wallet className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                <p className="text-[10px] font-bold text-yellow-400">Connect wallet to create markets.</p>
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

          {(step === "tiersLoaded" || step === "submitting" || step === "success") && tiers && (
            <>
              {tiers.title && (
                <div className="border border-white/8 overflow-hidden">
                  {tiers.thumbnail && (
                    <div className="relative w-full aspect-video bg-[#111]">
                      <img src={tiers.thumbnail} alt={tiers.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute bottom-2 left-2">
                        <span className="px-2 py-0.5 text-[8px] font-black tracking-widest bg-primary/90 text-black">
                          {formatViews(tiers.current_views)} VIEWS
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="p-3 bg-white/[0.02]">
                    <p className="text-xs font-bold text-white leading-snug">{tiers.title}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{tiers.author}</p>
                  </div>
                </div>
              )}

              <div>
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">TARGET MILESTONE</p>
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
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">TIME WINDOW</p>
                <div className="flex flex-wrap gap-2">
                  {tiers.available_windows.map((w) => (
                    <button
                      key={w}
                      onClick={() => setSelectedWindow(w)}
                      className={cn(
                        "px-4 py-2.5 text-[9px] font-black uppercase tracking-widest border transition-all min-w-[72px]",
                        selectedWindow === w
                          ? "bg-white/10 border-white text-white"
                          : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-white"
                      )}
                    >
                      {w}{windowLabel}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === "error" && error && (
            <div className="flex items-start gap-2 px-3 py-3 border border-red-500/30 bg-red-500/5">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-[10px] font-bold text-red-400">{error}</p>
            </div>
          )}

          {step === "success" && successMsg && (
            <div className="flex items-center gap-2 px-4 py-3 border border-primary/30 bg-primary/5">
              <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" />
              <p className="text-[10px] font-black text-primary">{successMsg}</p>
            </div>
          )}

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
                disabled={step !== "tiersLoaded" || !selectedTier || !tiers || tiers.available_tiers.length === 0}
                className="flex-1 py-4 bg-primary text-black text-[9px] font-black uppercase tracking-widest hover:bg-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {step === "submitting" ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> CREATING…</>
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
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [prefillUrl, setPrefillUrl] = useState("");

  const fetchFeed = useCallback(async (pageNum: number, replace: boolean) => {
    setLoading(true);
    try {
      const res = await getFeed(pageNum, 10);
      setItems(prev => replace ? res.items : [...prev, ...res.items]);
      setHasMore(res.has_more);
    } catch {
      // keep existing state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    fetchFeed(1, true);
  }, [fetchFeed]);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchFeed(next, false);
  };

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const createFor = query.get("createFor");
    if (!createFor) return;
    const decoded = decodeURIComponent(createFor);
    setPrefillUrl(decoded);
    setShowModal(true);
    window.history.replaceState({}, "", "/markets");
  }, []);

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
                PREDICTION FEED
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-5xl font-black text-white uppercase italic tracking-tighter"
              >
                ALL <span className="text-primary">MARKETS</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-sm text-muted-foreground mt-2 font-medium"
              >
                Each video grouped with all its prediction markets
              </motion.p>
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
        </div>
      </div>

      {/* Feed */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        {loading && items.length === 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-[#0D0D0D] border border-white/8 overflow-hidden animate-pulse">
                <div className="w-full aspect-video bg-white/5" />
                <div className="p-4 space-y-2">
                  <div className="h-3 w-3/4 bg-white/5" />
                  <div className="h-3 w-1/2 bg-white/5" />
                </div>
                <div className="border-t border-white/5 px-4 py-3 space-y-2">
                  <div className="h-8 bg-white/5" />
                  <div className="h-8 bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-lg font-black text-white uppercase italic mb-2">No markets yet</p>
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
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {items.map((item, i) => (
                <ContentCard key={item.content.id} item={item} index={i} />
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

      <AnimatePresence>
        {showModal && (
          <CreateMarketModal
            onClose={() => setShowModal(false)}
            userAddress={address}
            initialUrl={prefillUrl}
            onCreated={() => { setPage(1); fetchFeed(1, true); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
