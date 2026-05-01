"use client";

import { motion, type Variants } from "framer-motion";

const platforms = [
  {
    name: "YouTube",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
    status: "LIVE" as const,
    color: "text-primary",
    border: "border-primary/30",
    bg: "bg-primary/5",
    badge: "bg-primary text-black",
  },
  {
    name: "Instagram",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
      </svg>
    ),
    status: "SOON" as const,
    color: "text-white/30",
    border: "border-white/8",
    bg: "bg-white/[0.02]",
    badge: "bg-white/10 text-white/40",
  },
  {
    name: "TikTok",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
    status: "SOON" as const,
    color: "text-white/30",
    border: "border-white/8",
    bg: "bg-white/[0.02]",
    badge: "bg-white/10 text-white/40",
  },
  {
    name: "Twitch",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
      </svg>
    ),
    status: "SOON" as const,
    color: "text-white/30",
    border: "border-white/8",
    bg: "bg-white/[0.02]",
    badge: "bg-white/10 text-white/40",
  },
  {
    name: "X / Twitter",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    status: "SOON" as const,
    color: "text-white/30",
    border: "border-white/8",
    bg: "bg-white/[0.02]",
    badge: "bg-white/10 text-white/40",
  },
];

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function Platforms() {
  return (
    <section className="py-20 px-6 lg:px-8 border-t border-white/5">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12 flex flex-col items-center">
          <p className="text-[9px] font-black text-primary tracking-[0.4em] uppercase mb-3">
            THE MULTIVERSE OF ATTENTION
          </p>
          <h2 className="text-2xl sm:text-3xl font-black text-white uppercase italic tracking-tight mb-4">
            BET ON ANY PLATFORM
          </h2>
          <p className="text-xs sm:text-sm font-black text-white/70 uppercase tracking-widest max-w-lg mx-auto">
            YOUTUBE IS LIVE. TIKTOK, X, AND TWITCH ARE INCOMING. THE ENTIRE ATTENTION ECONOMY WILL BE TOKENIZED.
          </p>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
        >
          {platforms.map((p) => (
            <motion.div
              key={p.name}
              variants={item}
              className={`relative flex flex-col items-center gap-3 p-5 border ${p.border} ${p.bg} transition-all`}
            >
              <span className={p.color}>{p.icon}</span>
              <p className={`text-[10px] font-black tracking-widest uppercase ${p.color}`}>
                {p.name}
              </p>
              <span
                className={`text-[8px] font-black tracking-[0.2em] uppercase px-2 py-0.5 ${p.badge}`}
              >
                {p.status === "LIVE" ? "● LIVE" : "COMING SOON"}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
