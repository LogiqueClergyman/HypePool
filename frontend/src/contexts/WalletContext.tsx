"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

export interface WalletState {
  address: string | null;
  network: "TESTNET" | "MAINNET" | null;
  connected: boolean;
}

interface WalletContextValue extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  connecting: boolean;
  error: string | null;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    address: null,
    network: null,
    connected: false,
  });
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      // Dynamic import to avoid SSR issues
      const { isConnected, requestAccess, getAddress, getNetwork } = await import(
        "@stellar/freighter-api"
      );

      const hasFreighter = await isConnected();
      if (!hasFreighter) {
        throw new Error("Freighter not installed. Visit freighter.app to install.");
      }

      await requestAccess();
      const addressResult = await getAddress();
      const address = typeof addressResult === "string" ? addressResult : (addressResult as { address: string }).address;
      const networkResult = await getNetwork();
      const network = typeof networkResult === "string" ? networkResult : (networkResult as { network: string }).network;

      setState({
        address,
        network: network === "TESTNET" ? "TESTNET" : "MAINNET",
        connected: true,
      });
      localStorage.setItem("hp_wallet_connected", "1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect wallet");
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({ address: null, network: null, connected: false });
    setError(null);
    localStorage.removeItem("hp_wallet_connected");
  }, []);

  // Auto-reconnect on page load if user previously connected
  useEffect(() => {
    const wasConnected = localStorage.getItem("hp_wallet_connected");
    if (!wasConnected) return;
    (async () => {
      try {
        const { isConnected, getAddress, getNetwork } = await import("@stellar/freighter-api");
        const status = await isConnected();
        const ok = typeof status === "boolean" ? status : (status as { isConnected: boolean }).isConnected;
        if (!ok) return;
        const addressResult = await getAddress();
        const address = typeof addressResult === "string" ? addressResult : (addressResult as { address: string }).address;
        if (!address) return;
        const networkResult = await getNetwork();
        const network = typeof networkResult === "string" ? networkResult : (networkResult as { network: string }).network;
        setState({ address, network: network === "TESTNET" ? "TESTNET" : "MAINNET", connected: true });
      } catch {
        localStorage.removeItem("hp_wallet_connected");
      }
    })();
  }, []);

  return (
    <WalletContext.Provider
      value={{ ...state, connect, disconnect, connecting, error }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
