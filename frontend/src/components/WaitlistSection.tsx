"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, ArrowRight, Users, Zap } from "lucide-react";

type Status = "idle" | "loading" | "success" | "error";

export default function WaitlistSection() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (res.ok) {
        setStatus("success");
        setEmail("");
      } else {
        const data = await res.json();
        setErrorMsg(data.message ?? "Something went wrong. Try again.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  };

  return (
    <section id="waitlist" className="py-40 relative bg-black overflow-hidden border-t border-white/5">
      <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(circle_at_50%_50%,#00FF85_0%,transparent_70%)]" />

      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-3 px-4 py-2 border border-primary/30 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-12"
        >
          <Zap className="w-3 h-3 fill-primary" />
          <span>BETA_ACCESS_OPEN_04.27</span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-5xl sm:text-7xl font-black text-white mb-8 uppercase italic tracking-tighter"
        >
          SECURE YOUR <br />
          <span className="text-primary">POSITION_ON_CHAIN</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-sm text-muted-foreground mb-16 max-w-2xl mx-auto font-bold uppercase tracking-tight leading-relaxed"
        >
          Join the elite group of protocol scouts. Verified registrants receive 
          priority settlement status and zero-fee transactions for the pilot cycle.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-md mx-auto"
        >
          <AnimatePresence mode="wait">
            {status === "success" ? (
              <motion.div
                key="success"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-6 p-12 border-2 border-primary bg-primary/5"
              >
                <div className="w-16 h-16 border-2 border-primary flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-2xl font-black text-white uppercase italic">ACCESS_GRANTED</h3>
                <p className="text-muted-foreground font-black uppercase text-xs tracking-tight">
                  Verification protocol initiated. Check your terminal for confirmation.
                </p>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                onSubmit={handleSubmit}
                className="flex flex-col gap-6"
              >
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="USER@PROTOCOL.COM"
                    className="w-full px-8 py-6 bg-transparent border-2 border-border focus:border-primary focus:outline-none text-white placeholder:text-muted-foreground text-sm font-black uppercase tracking-widest transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={status === "loading" || !email.trim()}
                  className="flex items-center justify-center gap-4 px-10 py-6 bg-primary text-black font-black uppercase text-xs tracking-[0.3em] transition-all hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed neon-glow"
                >
                  {status === "loading" ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      INITIALIZE_ACCESS
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {status === "error" && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 text-xs font-black text-red-500 uppercase tracking-widest"
            >
              {errorMsg}
            </motion.p>
          )}

          <div className="mt-12 flex items-center justify-center gap-10 opacity-40">
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">12,847_NODES_ACTIVE</span>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-[#00FF85]" />
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">LIVE_IN_T-14D</span>
          </div>
        </motion.div>

        {/* Perks Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-32 grid sm:grid-cols-3 gap-8 text-left"
        >
          {[
            { label: "BETA_PROTOCOL", desc: "Priority execution on live creator pools via Soroban nodes." },
            { label: "FEE_REBATE", desc: "Protocol fee elimination for all verified early adopters." },
            { label: "LP_PRIORITY", desc: "Advanced access to protocol-level liquidity yields." },
          ].map((perk) => (
            <div
              key={perk.label}
              className="p-10 border-2 border-border bg-black hover:border-white/20 transition-all"
            >
              <p className="text-sm font-black text-primary mb-4 uppercase italic tracking-tighter">{perk.label}</p>
              <p className="text-xs text-muted-foreground font-black uppercase tracking-tight leading-relaxed">{perk.desc}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
