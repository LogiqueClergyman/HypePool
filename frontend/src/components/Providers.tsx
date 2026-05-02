"use client";

import { WalletProvider } from "@/contexts/WalletContext";
import NetworkMismatchBanner from "@/components/NetworkMismatchBanner";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <NetworkMismatchBanner />
      {children}
    </WalletProvider>
  );
}
