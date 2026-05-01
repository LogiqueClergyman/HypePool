"use client";

import Link from "next/link";
import { useWallet } from "@/contexts/WalletContext";
import { User, LogOut, Zap } from "lucide-react";
import { Logo } from "../Logo";

export default function AppNav() {
  const { address, connected, connect, disconnect, connecting } = useWallet();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-white/10 bg-[#080808]/90 backdrop-blur-md flex items-center px-6">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 mr-10 shrink-0 group">
        <Logo size={22} />
        <span className="font-black text-[15px] tracking-tighter text-white uppercase italic leading-none">
          HYPE<span className="text-primary">POOL</span>
        </span>
      </Link>

      {/* Nav links */}
      <nav className="hidden md:flex items-center gap-1 flex-1">
        <Link
          href="/markets"
          className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-white transition-colors"
        >
          MARKETS
        </Link>
        <Link
          href="/app"
          className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-white transition-colors"
        >
          PORTFOLIO
        </Link>
      </nav>

      {/* Wallet */}
      <div className="ml-auto flex items-center gap-3">
        {connected && address ? (
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 border border-white/10 bg-white/[0.03]">
              <User className="w-3 h-3 text-[#00FF85]" />
              <span className="text-[10px] font-black text-white tracking-widest">
                {address.slice(0, 4)}…{address.slice(-4)}
              </span>
            </div>
            <button
              onClick={disconnect}
              className="flex items-center gap-2 px-3 py-1.5 border border-white/10 text-[10px] font-black text-muted-foreground uppercase tracking-widest hover:border-white/30 hover:text-white transition-all"
            >
              <LogOut className="w-3 h-3" />
              <span className="hidden sm:inline">DISCONNECT</span>
            </button>
          </div>
        ) : (
          <button
            onClick={connect}
            disabled={connecting}
            className="flex items-center gap-2 px-5 py-2 bg-[#00FF85] text-black text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white transition-colors disabled:opacity-50"
          >
            <Zap className="w-3 h-3" />
            {connecting ? "CONNECTING…" : "CONNECT_WALLET"}
          </button>
        )}
      </div>
    </header>
  );
}
