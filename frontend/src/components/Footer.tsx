"use client";

import { Logo } from "./Logo";

const XIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
  </svg>
);

export default function Footer() {
  return (
    <footer className="bg-black border-t border-white/[0.05] py-14">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 flex flex-col sm:flex-row items-center justify-between gap-8">

        {/* Brand */}
        <a href="/" className="flex items-center gap-3 group">
          <Logo size={22} />
          <span className="font-black text-[15px] tracking-tighter text-white uppercase italic">
            HYPE<span className="text-primary">POOL</span>
          </span>
        </a>

        {/* X link */}
        <a
          href="https://x.com/hypepool0"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 text-muted-foreground hover:text-white transition-colors text-xs font-black uppercase tracking-widest"
        >
          <XIcon />
          @hypepool0
        </a>

        {/* Copyright */}
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center sm:text-right">
          © {new Date().getFullYear()} HYPEPOOL — BUILT ON STELLAR
        </p>
      </div>
    </footer>
  );
}
