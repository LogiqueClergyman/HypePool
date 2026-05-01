"use client";

import { motion } from "framer-motion";
import { Wallet, Timer, Link2, BarChart3, ShieldCheck, Database, Server, Zap } from "lucide-react";

const features = [
  {
    icon: Wallet,
    title: "MICRO_STAKE_ENABLED",
    description: "Stellar's protocol-level fee structure allows for $0.10 positions without gas friction.",
    stat: "$0.00001",
    statLabel: "TRANS_FEE",
  },
  {
    icon: Timer,
    title: "INSTANT_SETTLEMENT",
    description: "Soroban contracts execute with sub-5 second finality for immediate pool resolution.",
    stat: "< 2.5S",
    statLabel: "LATENCY",
  },
  {
    icon: Link2,
    title: "ORACLE_VERIFIED",
    description: "Direct social API integrations ensure outcomes are settled by objective data feeds.",
    stat: "100%",
    statLabel: "ACCURACY",
  },
  {
    icon: BarChart3,
    title: "EARLY_SCOUT_MULTIPLIER",
    description: "Conviction is rewarded. The earlier you spot the trend, the higher the protocol payout.",
    stat: "8.0X",
    statLabel: "MAX_YIELD",
  },
];

export default function WhyStellar() {
  return (
    <section id="why-stellar" className="py-32 bg-black relative overflow-hidden">
      {/* Background Ornaments */}
      <div className="absolute top-0 right-0 w-1/3 h-1/2 bg-primary/5 blur-[120px] -z-10" />
      <div className="absolute bottom-0 left-0 w-1/4 h-1/3 bg-primary/5 blur-[100px] -z-10" />
      
      {/* Grid line */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      
      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12 mb-24">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-8"
            >
              INFRASTRUCTURE_REPORT::SOROBAN
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-5xl lg:text-6xl font-black text-white uppercase italic tracking-tighter leading-none"
            >
              PRECISION <br />
              <span className="text-primary italic">INFRASTRUCTURE</span>
            </motion.h2>
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="max-w-md"
          >
            <p className="text-muted-foreground font-bold uppercase text-sm leading-relaxed mb-6">
              High-velocity micro-transactions demand a protocol that eliminates friction. 
              HypePool leverages Stellar for clinical execution.
            </p>
            <div className="flex items-center gap-4 text-primary opacity-50">
              <Server className="w-4 h-4" />
              <span className="text-[10px] font-black tracking-widest uppercase">STELLAR_CORE_MAINNET</span>
            </div>
          </motion.div>
        </div>

        <div className="grid sm:grid-cols-2 gap-px bg-white/5 border border-white/5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="p-12 lg:p-16 bg-black hover:bg-white/[0.02] transition-all group relative overflow-hidden"
            >
              {/* Card ornaments */}
              <div className="absolute top-0 right-0 w-16 h-16 opacity-0 group-hover:opacity-10 transition-opacity">
                <f.icon className="w-full h-full text-primary" />
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-12 h-12 border-2 border-white/10 flex items-center justify-center group-hover:border-primary transition-colors">
                    <f.icon className="w-5 h-5 text-white group-hover:text-primary transition-colors" />
                  </div>
                  <h3 className="text-xl font-black text-white tracking-tighter uppercase italic">{f.title}</h3>
                </div>
                
                <p className="text-sm text-muted-foreground font-bold uppercase tracking-tight mb-12 leading-relaxed max-w-sm">
                  {f.description}
                </p>
                
                <div className="flex items-end gap-4">
                  <span className="text-4xl font-black text-primary italic leading-none tracking-tighter">{f.stat}</span>
                  <div className="mb-1">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">{f.statLabel}</p>
                    <div className="w-8 h-0.5 bg-primary/30" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Audit row */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-24 p-8 border border-white/5 flex flex-wrap items-center justify-center gap-12 bg-white/[0.01]"
        >
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">SECURITY_AUDIT: PASS</span>
          </div>
          <div className="w-px h-4 bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-3">
            <Database className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">NODE_SYNC: 100%</span>
          </div>
          <div className="w-px h-4 bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-3">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">UPTIME: 99.99%</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}


