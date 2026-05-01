"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
  </svg>
);

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        scrolled
          ? "bg-black/80 backdrop-blur-xl border-b border-white/[0.06] py-4"
          : "bg-transparent py-7"
      )}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a href="/" className="flex items-center gap-3 group">
            <Logo size={26} />
            <span className="font-black text-[18px] tracking-tighter text-white uppercase italic leading-none">
              HYPE<span className="text-primary">POOL</span>
            </span>
          </a>

          {/* Desktop right side */}
          <div className="hidden md:flex items-center gap-5">
            <a
              href="https://x.com/hypepool0"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors duration-200 text-xs font-black uppercase tracking-widest"
            >
              <XIcon />
              <span>@hypepool0</span>
            </a>
            <a
              href="/markets"
              className="px-5 py-2 text-xs font-black uppercase tracking-widest border border-white/10 text-white hover:border-white/30 transition-all duration-200"
            >
              MARKETS
            </a>
            <a
              href="/app"
              className="px-6 py-2.5 text-xs font-black uppercase tracking-widest bg-primary text-black hover:bg-white transition-all duration-200 neon-glow"
            >
              PORTFOLIO
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden absolute top-full left-0 right-0 bg-black/95 backdrop-blur-xl border-b border-white/[0.06] overflow-hidden"
          >
            <div className="px-6 py-8 space-y-6">
              <a
                href="https://x.com/hypepool0"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-xs font-black tracking-widest text-muted-foreground hover:text-white transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                <XIcon /> @hypepool0
              </a>
              <a
                href="/markets"
                className="block text-xs font-black tracking-widest text-white hover:text-primary transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                MARKETS
              </a>
              <div className="pt-4 border-t border-white/[0.06]">
                <a
                  href="/app"
                  className="block w-full py-3 text-xs font-black tracking-widest bg-primary text-black uppercase text-center"
                  onClick={() => setMobileOpen(false)}
                >
                  PORTFOLIO
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
