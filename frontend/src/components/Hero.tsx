"use client";

import React from "react";
import { motion, useMotionValue, useTransform, animate, useInView } from "framer-motion";
import { ArrowRight, Clock, Users, TrendingUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  getPlatformStats, getMarkets, stroopsToXlm, formatViews, computePercent,
  type PlatformStats, type Market, type MarketContent,
} from "@/lib/api";

/* ── Animated counter ─────────────────────────────── */
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const val = useMotionValue(0);
  const display = useTransform(val, (v) => {
    if (to >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M${suffix}`;
    if (to >= 1_000) return `${(v / 1_000).toFixed(0)}K${suffix}`;
    return `${Math.round(v)}${suffix}`;
  });
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const ctrl = animate(val, to, { duration: 2.2, ease: "easeOut", delay: 0.3 });
    return ctrl.stop;
  }, [val, to, inView]);

  return <motion.span ref={ref}>{display}</motion.span>;
}

/* ── Ticker ───────────────────────────────────────── */
const FALLBACK_TICKER = [
  "MrBeast • 250M views in 24h",
  "Sidemen • 80M views in 48h",
  "Samay Raina • 5M views in 12h",
  "KSI • 100M views in 72h",
  "CarryMinati • 20M views in 24h",
];

function Ticker({ items }: { items: string[] }) {
  const doubled = [...items, ...items];
  return (
    <div className="overflow-hidden border-y border-white/[0.05] py-3 bg-white/[0.01]">
      <div className="flex gap-0 animate-ticker whitespace-nowrap">
        {doubled.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-6 px-8 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            <span className="w-1 h-1 rounded-full bg-primary inline-block" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Live bar ─────────────────────────────────────── */
function LiveBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 bg-white/5 w-full overflow-hidden">
      <motion.div
        initial={{ width: "0%" }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1.4, ease: "easeOut", delay: 0.6 }}
        className="h-full"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}

/* ── Live Card ────────────────────────────────────── */
type FeaturedMarket = Market & { content?: MarketContent };

function LiveCard({ market }: { market: FeaturedMarket | null }) {
  const yesPct = market ? computePercent(market.yes_pool, market.no_pool) : 68;
  const noPct = 100 - yesPct;
  const totalXlm = market
    ? parseFloat(stroopsToXlm(String(Number(market.yes_pool) + Number(market.no_pool))))
    : 0;
  const bettors = market?.total_bettors ?? 0;
  const channel = market?.content?.channel ?? "HYPEPOOL";
  const threshold = market ? formatViews(market.threshold) : "100M";
  const windowH = market?.window_hours ?? 48;
  const title = market?.content?.title
    ? `WILL "${market.content.title.slice(0, 40).toUpperCase()}" HIT ${threshold} VIEWS IN ${windowH}H?`
    : `WILL THIS VIDEO HIT ${threshold} VIEWS IN ${windowH} HOURS?`;

  // Real countdown from deadline
  const [timeStr, setTimeStr] = useState("--:--:--");
  useEffect(() => {
    if (!market) return;
    const update = () => {
      const diff = new Date(market.deadline).getTime() - Date.now();
      if (diff <= 0) { setTimeStr("CLOSED"); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setTimeStr(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [market]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="animate-float relative w-full max-w-sm mx-auto lg:max-w-none"
    >
      <motion.div
        animate={{ opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -inset-8 bg-primary/8 blur-[60px] -z-10 rounded-full"
      />

      <div className="bg-[#080808] border border-white/[0.08] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.05] bg-white/[0.015]">
          <div className="flex items-center gap-2">
            <motion.span
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-primary block"
            />
            <span className="text-[9px] font-black text-primary tracking-[0.3em] uppercase">LIVE MARKET</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-black text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span className="tabular-nums">{timeStr}</span>
          </div>
        </div>

        {/* Thumbnail */}
        <div className="relative w-full aspect-video overflow-hidden">
          {market?.content?.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={market.content.thumbnail} alt={market.content.title || ""} className="w-full h-full object-cover opacity-80" />
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-[#1a0533] via-[#0d1b2e] to-[#001a0a]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm"
                >
                  <div className="w-0 h-0 border-t-[9px] border-b-[9px] border-l-[16px] border-t-transparent border-b-transparent border-l-white ml-1" />
                </motion.div>
              </div>
            </>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm border border-white/10 px-2.5 py-1">
            <span className="text-[8px] font-black text-white uppercase tracking-wider">{channel}</span>
          </div>
        </div>

        {/* Title */}
        <div className="px-5 pt-4 pb-3">
          <p className="text-[11px] font-black text-white uppercase tracking-tight leading-tight line-clamp-2">
            {title.split(threshold).map((part, i, arr) => (
              <React.Fragment key={i}>
                {part}
                {i < arr.length - 1 && <span className="text-primary">{threshold} VIEWS</span>}
              </React.Fragment>
            ))}
          </p>
        </div>

        {/* Pool bars */}
        <div className="px-5 pb-4 space-y-2.5">
          <div>
            <div className="flex justify-between mb-1.5">
              <span className="text-[9px] font-black text-primary tracking-widest">YES</span>
              <span className="text-[9px] font-black text-primary">{yesPct}%</span>
            </div>
            <LiveBar pct={yesPct} color="#00FF85" />
          </div>
          <div>
            <div className="flex justify-between mb-1.5">
              <span className="text-[9px] font-black text-muted-foreground tracking-widest">NO</span>
              <span className="text-[9px] font-black text-muted-foreground">{noPct}%</span>
            </div>
            <LiveBar pct={noPct} color="rgba(255,255,255,0.25)" />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/[0.05] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-[7px] font-black text-muted-foreground uppercase tracking-widest">VOLUME</p>
              <p className="text-xs font-black text-white italic">
                {totalXlm >= 1000 ? `${(totalXlm / 1000).toFixed(0)}K` : totalXlm.toFixed(0)} XLM
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-3 h-3 text-muted-foreground" />
              <p className="text-xs font-black text-white italic">{bettors.toLocaleString()}</p>
            </div>
          </div>
          <motion.a
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            href={market ? `/markets/${market.id}` : "/markets"}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-black text-[9px] font-black uppercase tracking-widest neon-glow"
          >
            BET NOW <ArrowRight className="w-3 h-3" />
          </motion.a>
        </div>
      </div>

      {/* Floating badges */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-5 -right-5 bg-black/90 border border-primary/25 px-4 py-2 backdrop-blur-xl hidden lg:flex items-center gap-2"
      >
        <TrendingUp className="w-3 h-3 text-primary" />
        <span className="text-[9px] font-black text-primary tracking-widest">
          {yesPct > 50 ? `${yesPct}% BETTING YES` : `${noPct}% BETTING NO`}
        </span>
      </motion.div>

      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
        className="absolute -bottom-5 -left-5 bg-black/90 border border-white/10 px-4 py-2 backdrop-blur-xl hidden lg:flex items-center gap-2"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse block" />
        <span className="text-[8px] font-black text-muted-foreground tracking-widest">POOL</span>
        <span className="text-[10px] font-black text-white">
          {totalXlm >= 1000 ? `${(totalXlm / 1000).toFixed(1)}K` : totalXlm.toFixed(0)} XLM
        </span>
      </motion.div>
    </motion.div>
  );
}

/* ── FadeUp ───────────────────────────────────────── */
function FadeUp({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.75, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Hero ─────────────────────────────────────────── */
export default function Hero() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [featuredMarket, setFeaturedMarket] = useState<FeaturedMarket | null>(null);
  const [tickerItems, setTickerItems] = useState<string[]>(FALLBACK_TICKER);

  useEffect(() => {
    getPlatformStats().then(setStats).catch(() => {});

    getMarkets({ status: "ACTIVE", sort: "volume", limit: 6 })
      .then((res) => {
        if (res.markets.length > 0) {
          setFeaturedMarket(res.markets[0]);
          const items = res.markets.map((m) => {
            const ch = m.content?.channel ?? "UNKNOWN";
            const thr = formatViews(m.threshold);
            return `${ch} • ${thr} views in ${m.window_hours}h`;
          });
          setTickerItems(items.length >= 3 ? items : FALLBACK_TICKER);
        }
      })
      .catch(() => {});
  }, []);

  const totalVolXlm = stats ? Math.floor(Number(stats.total_volume) / 1_000_000) : 0;

  return (
    <>
      <section className="relative min-h-screen flex flex-col justify-center pt-28 pb-10 overflow-hidden bg-black">
        {/* Background orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="animate-orb-drift absolute top-[15%] right-[10%] w-[480px] h-[480px] rounded-full bg-primary/[0.04] blur-[100px]" />
          <div className="animate-orb-drift-2 absolute bottom-[10%] left-[5%] w-[360px] h-[360px] rounded-full bg-[#6B6FE8]/[0.05] blur-[90px]" />
          <div className="absolute top-[40%] left-[40%] w-[200px] h-[200px] rounded-full bg-primary/[0.025] blur-[60px]" />
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
              backgroundSize: "80px 80px",
            }}
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 w-full">
          <div className="grid lg:grid-cols-2 gap-16 xl:gap-24 items-center">
            {/* Left */}
            <div>
              <FadeUp delay={0.1}>
                <div className="inline-flex items-center gap-2.5 px-4 py-1.5 border border-primary/20 text-primary text-[9px] font-black uppercase tracking-[0.4em] mb-10 bg-primary/[0.04]">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse block" />
                  STELLAR-POWERED PREDICTION MARKETS
                </div>
              </FadeUp>

              <FadeUp delay={0.2}>
                <h1 className="text-[clamp(4.5rem,10vw,7.5rem)] font-black leading-[0.82] tracking-tighter text-white uppercase italic mb-8">
                  BET ON
                  <br />
                  <span className="text-primary">VIRAL</span>
                  <br />
                  CONTENT.
                </h1>
              </FadeUp>

              <FadeUp delay={0.32}>
                <p className="text-base text-muted-foreground mb-10 max-w-[380px] leading-relaxed">
                  Paste a YouTube URL. Predict if it hits a view milestone. Win XLM if you're right — settled automatically on Stellar Soroban.
                </p>
              </FadeUp>

              <FadeUp delay={0.42}>
                <div className="flex flex-wrap gap-3 mb-14">
                  <motion.a
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    href="/markets"
                    className="group inline-flex items-center gap-3 px-10 py-4 bg-primary text-black font-black uppercase tracking-widest text-xs neon-glow transition-colors hover:bg-white"
                  >
                    BROWSE MARKETS
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </motion.a>
                  <motion.a
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    href="/app"
                    className="inline-flex items-center gap-3 px-10 py-4 border border-white/[0.12] text-white font-black uppercase tracking-widest text-xs hover:border-primary hover:text-primary transition-all"
                  >
                    MY PORTFOLIO
                  </motion.a>
                </div>
              </FadeUp>

              {/* Stats — real data */}
              <FadeUp delay={0.52}>
                <div className="grid grid-cols-3 divide-x divide-white/[0.06] border border-white/[0.06]">
                  {[
                    { label: "TOTAL VOLUME", to: totalVolXlm, suffix: " XLM" },
                    { label: "ACTIVE MARKETS", to: stats?.active_markets ?? 0, suffix: "" },
                    { label: "BETTORS", to: stats?.total_bettors ?? 0, suffix: "" },
                  ].map((s, i) => (
                    <div key={i} className="px-5 py-4">
                      <p className="text-[7px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-1.5">{s.label}</p>
                      <p className="text-xl font-black text-white italic tracking-tighter">
                        <Counter to={s.to} suffix={s.suffix} />
                      </p>
                    </div>
                  ))}
                </div>
              </FadeUp>
            </div>

            {/* Right — real market card */}
            <div className="relative lg:pl-6">
              <LiveCard market={featuredMarket} />
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black to-transparent pointer-events-none" />
      </section>

      <Ticker items={tickerItems} />
    </>
  );
}
