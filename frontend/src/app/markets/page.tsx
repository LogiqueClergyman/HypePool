"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, Zap, Loader2,
  AlertCircle, CheckCircle, Link as LinkIcon, Wallet, ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getFeed, getContentTiers, submitContent,
  formatViews, computePercent, stroopsToXlm, formatDeadline,
  type FeedItem, type TiersResponse,
} from "@/lib/api";
import { cn } from "@/lib/utils";
function FeaturedContentCard({ item, index }: { item: FeedItem; index: number }) {
  const { content, markets, total_volume, total_bettors } = item;
  const primaryMarket = markets.find(m => m.status === "ACTIVE") ?? markets[0];
  const percent = primaryMarket ? computePercent(primaryMarket.yes_pool, primaryMarket.no_pool) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      className="h-full"
    >
      <Link
        href={primaryMarket ? `/markets/${primaryMarket.id}` : "#"}
        className="group flex flex-col md:flex-row bg-[#0D0D0D] border border-primary/50 hover:border-primary transition-all overflow-hidden h-full shadow-[0_0_15px_rgba(0,255,128,0.1)] hover:shadow-[0_0_20px_rgba(0,255,128,0.2)] rounded-sm relative"
      >
        <div className="p-6 md:p-8 flex flex-col flex-1 order-2 md:order-1 relative z-10 w-full md:w-[60%]">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">
              FEATURED MARKET
            </span>
          </div>
          
          <h2 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-tighter leading-[1.1] mb-8 line-clamp-3 group-hover:textShadow-[0_0_15px_rgba(255,255,255,0.3)] transition-all">
            WILL [{content.title}] HIT {formatViews(primaryMarket?.threshold || 0)} VIEWS IN {primaryMarket?.window_hours}H?
          </h2>

          <div className="space-y-4 mb-8 pr-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-black uppercase">
                <div className="flex items-center gap-2">
                  <span className="text-white">YES</span>
                  <span className="px-2 py-0.5 text-[8px] bg-primary/20 border border-primary/40 text-primary rounded-sm tracking-widest">LIVE MARKET</span>
                </div>
                <span className="text-primary">{percent}%</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 flex rounded-full overflow-hidden">
                <div className="h-full bg-primary shadow-[0_0_10px_rgba(0,255,128,0.5)]" style={{ width: `${percent}%` }} />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-black uppercase">
                <span className="text-white">NO</span>
                <span className="text-white/60">{100 - percent}%</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 flex rounded-full overflow-hidden">
                <div className="h-full bg-white/30" style={{ width: `${100 - percent}%` }} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-auto mb-4">
            <div>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">VOLUME</p>
              <p className="text-sm font-black text-white">{stroopsToXlm(total_volume)} XLM</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">BETTORS</p>
              <p className="text-sm font-black text-white">{total_bettors}</p>
            </div>
          </div>
        </div>

        <div className="relative w-full md:w-[40%] aspect-video md:aspect-auto order-1 md:order-2 bg-[#111]">
          {content.thumbnail ? (
            <img src={content.thumbnail} alt={content.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
          ) : (
             <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/5 to-transparent" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0D0D0D] via-transparent to-transparent hidden md:block" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D] via-transparent to-transparent md:hidden" />
          <div className="absolute bottom-6 right-6 hidden md:block z-20">
            <button className="px-6 py-3 bg-primary text-black font-black uppercase tracking-widest text-[10px] hover:bg-white transition-colors flex items-center gap-2">
              BET NOW <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="md:hidden w-full order-3 border-t border-primary p-4">
            <button className="w-full py-3 bg-primary text-black font-black uppercase tracking-widest text-[10px] hover:bg-white transition-colors flex items-center justify-center gap-2">
              BET NOW <ArrowRight className="w-3 h-3" />
            </button>
        </div>
        
        {/* Full width bottom highlight bar to match design */}
        <div className="hidden md:block absolute bottom-0 left-0 right-0 h-1 bg-primary group-hover:h-1.5 transition-all" />
      </Link>
    </motion.div>
  );
}

function ContentCard({ item, index }: { item: FeedItem; index: number }) {
  const { content, markets, total_volume } = item;
  const primaryMarket = markets.find(m => m.status === "ACTIVE") ?? markets[0];
  const activeCount = markets.filter(m => m.status === "ACTIVE").length;
  const percent = primaryMarket ? computePercent(primaryMarket.yes_pool, primaryMarket.no_pool) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      className="h-full"
    >
      <Link
        href={primaryMarket ? `/markets/${primaryMarket.id}` : "#"}
        className="group flex flex-col bg-[#0D0D0D] border border-white/10 hover:border-primary/50 transition-all overflow-hidden h-full rounded-sm"
      >
        <div className="relative w-full aspect-[16/10] bg-[#111]">
          {content.thumbnail ? (
            <img src={content.thumbnail} alt={content.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
          ) : (
             <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/5 to-transparent" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <div className="absolute bottom-2 right-2">
            <span className="px-2 py-0.5 text-[9px] font-black tracking-widest bg-black/60 backdrop-blur-md text-white border border-white/10">
              {formatViews(content.current_views)} VIEWS
            </span>
          </div>
        </div>

        <div className="p-4 flex flex-col flex-1 border-b border-white/5">
          <p className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-1.5 line-clamp-1">
            {content.channel || "YOUTUBE"}
          </p>
          <div className="flex justify-between items-start gap-2 mb-2">
            <h3 className="text-sm font-black text-white uppercase italic tracking-tight leading-snug line-clamp-2 group-hover:text-primary transition-colors">
              {content.title}
            </h3>
            {activeCount > 0 && (
              <span className="shrink-0 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest bg-primary/10 text-primary border border-primary/20 rounded-sm">
                LIVE
              </span>
            )}
          </div>
        </div>
        
        {primaryMarket && (
          <div className="px-4 py-3 bg-white/[0.02]">
            <div className="flex justify-between items-center mb-3">
               <div>
                  <p className="text-[10px] font-black text-white">{formatViews(primaryMarket.threshold)}</p>
                  <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">{primaryMarket.window_hours}H WINDOW</p>
                </div>
                <div className="flex-1 px-4">
                  <div className="flex items-center justify-between text-[9px] font-black mb-1">
                    <span className="text-primary">{percent}%</span>
                    <span className="text-white/40">{100 - percent}%</span>
                  </div>
                  <div className="h-1 w-full bg-white/10 overflow-hidden flex rounded-full">
                    <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
                    <div className="h-full bg-white/20" style={{ width: `${100 - percent}%` }} />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-white">{stroopsToXlm(total_volume)} XLM</p>
                  <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-1 justify-end mt-0.5">
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {formatDeadline(primaryMarket.deadline)}
                  </p>
                </div>
            </div>
          </div>
        )}
      </Link>
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
      {/* Feed */}
      <div className="max-w-[1600px] w-full mx-auto px-6 lg:px-12 pt-32 pb-12">
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
            <div className="flex justify-end mb-6">
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 border border-primary/40 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-black hover:border-primary transition-all rounded"
              >
                <Plus className="w-3.5 h-3.5" /> CREATE NEW MARKET
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {items.map((item, i) => {
                if (i === 0) {
                  return (
                    <div key={item.content.id} className="md:col-span-2">
                      <FeaturedContentCard item={item} index={i} />
                    </div>
                  );
                }
                return (
                  <div key={item.content.id} className="h-full">
                    <ContentCard item={item} index={i} />
                  </div>
                );
              })}
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
