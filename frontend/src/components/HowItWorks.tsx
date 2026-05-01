"use client";

import { motion } from "framer-motion";

const STEPS = [
  {
    n: "01",
    title: "PASTE A VIDEO",
    body: "Drop any YouTube link. We pull the live view count instantly.",
    detail: "youtube.com/watch?v=...",
  },
  {
    n: "02",
    title: "PLACE YOUR BET",
    body: "Pick a view milestone and timeframe. Stake XLM on YES or NO.",
    detail: "Will it hit 50M in 24h?",
  },
  {
    n: "03",
    title: "COLLECT YOUR WIN",
    body: "Soroban smart contracts check the count and pay out winners automatically.",
    detail: "Winner takes the pool.",
  },
];

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15, delayChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: "easeOut" } },
};

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-32 bg-black relative overflow-hidden">
      {/* Top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/[0.025] blur-[120px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-10">
        {/* Header */}
        <div className="mb-20">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-[9px] font-black text-primary uppercase tracking-[0.4em] mb-4"
          >
            HOW IT WORKS
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl sm:text-5xl lg:text-6xl font-black text-white uppercase italic tracking-tighter leading-none"
          >
            THREE STEPS.
            <br />
            <span className="text-primary">THAT'S IT.</span>
          </motion.h2>
        </div>

        {/* Steps */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid lg:grid-cols-3 gap-0 border border-white/[0.06]"
        >
          {STEPS.map((step, i) => (
            <motion.div
              key={step.n}
              variants={item as any}
              className={`group relative p-10 lg:p-14 hover:bg-white/[0.015] transition-all duration-300 ${
                i < STEPS.length - 1 ? "border-b lg:border-b-0 lg:border-r border-white/[0.06]" : ""
              }`}
            >
              {/* Number */}
              <div className="flex items-start justify-between mb-10">
                <span className="text-[10px] font-black text-primary tracking-widest">{step.n}</span>
                <motion.div
                  animate={{ opacity: [0.3, 0.8, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity, delay: i * 0.8 }}
                  className="w-6 h-6 border border-primary/20 flex items-center justify-center"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                </motion.div>
              </div>

              {/* Title */}
              <h3 className="text-2xl lg:text-3xl font-black text-white uppercase italic tracking-tighter mb-4 group-hover:text-primary transition-colors duration-300">
                {step.title}
              </h3>

              {/* Body */}
              <p className="text-sm text-muted-foreground leading-relaxed mb-8">
                {step.body}
              </p>

              {/* Detail pill */}
              <div className="inline-flex items-center gap-2.5 px-3.5 py-2 border border-white/[0.06] bg-white/[0.02]">
                <span className="w-1 h-1 rounded-full bg-primary/50 block" />
                <span className="text-[9px] font-black text-muted-foreground tracking-widest uppercase">{step.detail}</span>
              </div>

              {/* Hover bottom bar */}
              <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-primary/0 group-hover:bg-primary/30 transition-all duration-500" />
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <motion.a
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            href="/app"
            className="px-12 py-4 bg-primary text-black font-black uppercase text-xs tracking-[0.2em] hover:bg-white transition-all neon-glow"
          >
            START BETTING
          </motion.a>
          <motion.a
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            href="/markets"
            className="px-12 py-4 border border-white/10 text-white font-black uppercase text-xs tracking-[0.2em] hover:border-primary hover:text-primary transition-all"
          >
            BROWSE MARKETS
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}
