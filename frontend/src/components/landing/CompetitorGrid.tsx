"use client";

import { motion } from "framer-motion";

const ROWS = [
  { label: "CONTENT_TYPE", poly: "POLITICS / FINANCE", zora: "CREATOR_TOKENS", hp: "VIRAL_SOCIAL_DATA" },
  { label: "MIN_POSITION", poly: "$1.00+", zora: "VARIABLE", hp: "$0.10_USDC" },
  { label: "TIME_HORIZON", poly: "WEEKS_TO_MONTHS", zora: "OPEN_ENDED", hp: "24–72_HOURS" },
  { label: "SETTLEMENT", poly: "UMA_ORACLE", zora: "PRICE_ACTION", hp: "VERIFIED_API_NODES" },
  { label: "PROTOCOL_FEES", poly: "POLYGON_GAS", zora: "SOLANA_BASE", hp: "STELLAR_$0.00001" },
  { label: "USER_PROFILE", poly: "TRADERS", zora: "COLLECTORS", hp: "ALPHA_SCOUTS" },
];

export default function CompetitorGrid() {
  return (
    <section className="py-32 bg-black border-y border-white/5 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12 mb-20">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-6"
            >
              BENCHMARK_ANALYSIS_V2
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl sm:text-5xl font-black text-white uppercase italic tracking-tighter"
            >
              SUPERIOR <span className="text-primary">EXECUTION</span>
            </motion.h2>
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-muted-foreground font-bold uppercase text-sm max-w-md"
          >
            HypePool is engineered for the high-velocity attention economy. 
            Legacy platforms lack the latency and fee structure for micro-alpha.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="border-2 border-border overflow-x-auto"
        >
          {/* Header */}
          <div className="grid grid-cols-4 min-w-[800px] border-b-2 border-border bg-white/5">
            <div className="px-8 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest">METRIC</div>
            <div className="px-8 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">POLYMARKET</div>
            <div className="px-8 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">ZORA</div>
            <div className="px-8 py-6 text-[10px] font-black text-primary uppercase tracking-widest text-center bg-primary/5">HYPEPOOL</div>
          </div>

          {/* Rows */}
          {ROWS.map((row, i) => (
            <div
              key={row.label}
              className="grid grid-cols-4 min-w-[800px] border-b border-white/5 hover:bg-white/[0.02] transition-colors"
            >
              <div className="px-8 py-6 text-[10px] font-black text-white uppercase tracking-wider border-r border-white/5">
                {row.label}
              </div>
              <div className="px-8 py-6 text-xs font-bold text-muted-foreground uppercase text-center border-r border-white/5 opacity-50">
                {row.poly}
              </div>
              <div className="px-8 py-6 text-xs font-bold text-muted-foreground uppercase text-center border-r border-white/5 opacity-50">
                {row.zora}
              </div>
              <div className="px-8 py-6 text-xs font-black text-primary uppercase text-center italic bg-primary/5">
                {row.hp}
              </div>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-12 p-8 border border-white/5 bg-white/[0.01] text-center"
        >
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] max-w-3xl mx-auto leading-relaxed">
            SYSTEM_ADVISORY: Attention markets fail when friction exceeds expected value. 
            Stellar&apos;s protocol layer eliminates the &quot;Gas Tax&quot; on micro-alpha.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

