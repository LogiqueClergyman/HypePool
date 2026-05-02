"use client";

import { useWallet } from "@/contexts/WalletContext";

export default function NetworkMismatchBanner() {
  const { networkMismatch, network } = useWallet();
  const expected = process.env.NEXT_PUBLIC_STELLAR_NETWORK?.trim().toUpperCase();

  if (!networkMismatch || !expected) return null;

  return (
    <div
      role="alert"
      className="fixed top-0 left-0 right-0 z-[70] px-4 py-2.5 bg-amber-500/95 text-black text-center text-[11px] font-bold tracking-wide border-b border-amber-600"
    >
      Freighter is on <span className="font-black">{network}</span> but this deployment expects{" "}
      <span className="font-black">{expected}</span>. Switch network in Freighter settings, then refresh.
    </div>
  );
}
