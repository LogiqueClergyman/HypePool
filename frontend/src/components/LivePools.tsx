"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, ChevronRight, Zap, Users, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getFeed, formatViews, formatDeadline, computePercent, stroopsToXlm } from "@/lib/api";

type Pool = {
  id: string;
  title: string;
  thumbnail: string;
  timeLeft: string;
  totalStaked: number;
  yesPercent: number;
  bettors: number;
  tag: string;
  hot: boolean;
};

const FALLBACK_POOLS: Pool[] = [
  {
    id: "p1",
    title: "WILL THIS VIDEO REACH 1B VIEWS?",
    thumbnail: "",
    timeLeft: "14H 07M",
    totalStaked: 284100,
    yesPercent: 74,
    bettors: 1429,
    tag: "VIRAL",
    hot: true,
  },
  {
    id: "p2",
    title: "WILL THIS CREATOR HIT 5B VIEWS THIS YEAR?",
    thumbnail: "",
    timeLeft: "47H 12M",
    totalStaked: 3820500,
    yesPercent: 42,
    bettors: 892,
    tag: "VIRAL",
    hot: false,
  },
  {
    id: "p3",
    title: "WILL THIS VIDEO SURPASS 500M VIEWS BY Q4?",
    thumbnail: "",
    timeLeft: "22H 55M",
    totalStaked: 1620000,
    yesPercent: 61,
    bettors: 2140,
    tag: "VIRAL",
    hot: true,
  },
];

const TABS = ["ALL", "HIGH VOLUME", "CLOSING SOON"] as const;

function PoolCard({ pool, index }: { pool: Pool; index: number }) {
  return (
    <motion.a
      href="/markets"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
      className="group bg-[#0D0D0D] border border-white/8 hover:border-primary/40 transition-all overflow-hidden flex flex-col cursor-pointer block"
    >
      {/* Thumbnail */}
      <div className="relative w-full aspect-video bg-[#111] overflow-hidden">
        {pool.thumbnail ? (
          <img
            src={pool.thumbnail}
            alt={pool.title}
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
          <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-widest bg-black/70 text-white border border-white/10">
            {pool.tag}
          </span>
          {pool.hot && (
            <span className="flex items-center gap-1 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest bg-primary/20 text-primary border border-primary/30">
              <Zap className="w-2.5 h-2.5 fill-primary" /> HOT
            </span>
          )}
        </div>
        <div className="absolute top-2 right-2 flex items-center gap-1 text-[8px] font-black text-white bg-black/70 px-2 py-0.5 border border-white/10">
          <Clock className="w-2.5 h-2.5" />
          {pool.timeLeft}
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-[11px] font-black text-white mb-4 leading-tight uppercase tracking-tight group-hover:text-primary transition-colors min-h-[2.5rem]">
          {pool.title}
        </h3>

        {/* Pool bars */}
        <div className="space-y-2 mb-5">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[8px] font-black text-primary tracking-widest">YES</span>
              <span className="text-[8px] font-black text-primary">{pool.yesPercent}%</span>
            </div>
            <div className="h-1.5 bg-white/5 w-full">
              <div
                className="h-full bg-primary transition-all duration-700"
                style={{ width: `${pool.yesPercent}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[8px] font-black text-muted-foreground tracking-widest">NO</span>
              <span className="text-[8px] font-black text-muted-foreground">{100 - pool.yesPercent}%</span>
            </div>
            <div className="h-1.5 bg-white/5 w-full">
              <div
                className="h-full bg-white/30 transition-all duration-700"
                style={{ width: `${100 - pool.yesPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between pt-3 border-t border-white/5">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-[7px] font-black text-muted-foreground uppercase tracking-widest">VOLUME</p>
              <p className="text-xs font-black text-white italic">{(pool.totalStaked / 1000).toFixed(0)}K XLM</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-3 h-3 text-muted-foreground" />
              <p className="text-xs font-black text-white italic">{pool.bettors.toLocaleString()}</p>
            </div>
          </div>
          <div className="w-8 h-8 border border-white/10 flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all">
            <ChevronRight className="w-4 h-4 text-white group-hover:text-black transition-colors" />
          </div>
        </div>
      </div>
    </motion.a>
  );
}

function PoolSkeleton() {
  return (
    <div className="bg-[#0D0D0D] border border-white/8 overflow-hidden animate-pulse">
      <div className="w-full aspect-video bg-white/5" />
      <div className="p-5 space-y-3">
        <div className="h-8 w-full bg-white/5" />
        <div className="h-4 w-full bg-white/5" />
        <div className="h-4 w-3/4 bg-white/5" />
        <div className="h-8 w-full bg-white/5 mt-4" />
      </div>
    </div>
  );
}

export default function LivePools() {
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getFeed(1, 6)
      .then((data) => {
        const mapped: Pool[] = data.items.flatMap((item) =>
          item.markets.slice(0, 1).map((m) => {
            const yes = Number(m.yes_pool);
            const no = Number(m.no_pool);
            const total = yes + no;
            const yesPct = total > 0 ? computePercent(m.yes_pool, m.no_pool) : 0;
            return {
              id: m.id,
              title: `WILL "${item.content.title.slice(0, 40).toUpperCase()}" REACH ${formatViews(m.threshold)} VIEWS?`,
              thumbnail: item.content.thumbnail || "",
              timeLeft: formatDeadline(m.deadline),
              totalStaked: total,
              yesPercent: yesPct,
              bettors: item.total_bettors,
              tag: "VIRAL",
              hot: item.total_bettors > 3,
            };
          })
        );

        let sorted = mapped.length > 0 ? mapped : FALLBACK_POOLS;
        if (activeTab === "HIGH VOLUME") sorted = [...sorted].sort((a, b) => b.totalStaked - a.totalStaked);
        if (activeTab === "CLOSING SOON") sorted = [...sorted].sort((a, b) => a.timeLeft.localeCompare(b.timeLeft));
        setPools(sorted);
      })
      .catch(() => setPools(FALLBACK_POOLS))
      .finally(() => setLoading(false));
  }, [activeTab]);

  return (
    <section id="markets" className="py-24 bg-black border-y border-white/5">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
          <div>
            <p className="text-[9px] font-black text-primary uppercase tracking-[0.4em] mb-3">LIVE MARKETS</p>
            <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter">
              ACTIVE <span className="text-primary">POOLS</span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-5 py-2.5 text-[9px] font-black tracking-widest transition-all border",
                  activeTab === tab
                    ? "bg-primary border-primary text-black"
                    : "border-white/10 text-muted-foreground hover:text-white hover:border-white/20"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {loading
            ? [0, 1, 2].map((i) => <PoolSkeleton key={i} />)
            : pools.map((pool, i) => <PoolCard key={pool.id} pool={pool} index={i} />)}
        </div>

        <div className="mt-14 flex flex-col items-center">
          <a
            href="/markets"
            className="group flex items-center gap-3 px-10 py-5 bg-transparent border border-primary text-primary font-black uppercase tracking-[0.25em] transition-all hover:bg-primary hover:text-black neon-glow text-xs"
          >
            <BarChart3 className="w-4 h-4" />
            VIEW ALL MARKETS
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </div>
    </section>
  );
}
