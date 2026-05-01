"use client";

import { motion } from "framer-motion";

const STATS = [
  { label: "AGGREGATED_VOLUME", value: "$142.1M" },
  { label: "PROTOCOL_NODES", value: "847" },
  { label: "VERIFIED_USERS", value: "12,847" },
  { label: "LATENCY_THRESHOLD", value: "< 2.5S" },
];

export default function StatsBar() {
  return (
    <section className="py-16 bg-black border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-12">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 5 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
              className="flex flex-col items-center lg:items-start"
            >
              <span className="text-4xl font-black text-primary tracking-tighter italic mb-2">
                {s.value}
              </span>
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                {s.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}


