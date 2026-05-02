"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode, useMemo } from "react";
import { getWallet, createWallet, type WalletInfo } from "@/lib/api";

export interface WalletState {
  address: string | null;
  network: "TESTNET" | "MAINNET" | null;
  connected: boolean;
  custodialWallet: WalletInfo | null;
  custodialLoading: boolean;
}

interface WalletContextValue extends WalletState {
  /** True when NEXT_PUBLIC_STELLAR_NETWORK disagrees with Freighter’s network */
  networkMismatch: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  connecting: boolean;
  error: string | null;
  createCustodialWallet: () => Promise<void>;
  refreshCustodialWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    address: null,
    network: null,
    connected: false,
    custodialWallet: null,
    custodialLoading: false,
  });
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCustodialWallet = useCallback(async (address: string) => {
    setState(prev => ({ ...prev, custodialLoading: true }));
    try {
      const wallet = await getWallet(address);
      setState(prev => ({ ...prev, custodialWallet: wallet, custodialLoading: false }));
    } catch {
      // 404 = no custodial wallet yet, that's fine
      setState(prev => ({ ...prev, custodialWallet: null, custodialLoading: false }));
    }
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
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

      setState(prev => ({
        ...prev,
        address,
        network: network === "TESTNET" ? "TESTNET" : "MAINNET",
        connected: true,
      }));
      localStorage.setItem("hp_wallet_connected", "1");

      // Check custodial wallet after connecting
      fetchCustodialWallet(address);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect wallet");
    } finally {
      setConnecting(false);
    }
  }, [fetchCustodialWallet]);

  const disconnect = useCallback(() => {
    setState({ address: null, network: null, connected: false, custodialWallet: null, custodialLoading: false });
    setError(null);
    localStorage.removeItem("hp_wallet_connected");
  }, []);

  const createCustodialWallet = useCallback(async () => {
    if (!state.address) return;
    setState(prev => ({ ...prev, custodialLoading: true }));
    try {
      await createWallet(state.address);
      await fetchCustodialWallet(state.address);
    } catch (err) {
      setState(prev => ({ ...prev, custodialLoading: false }));
      throw err;
    }
  }, [state.address, fetchCustodialWallet]);

  const refreshCustodialWallet = useCallback(async () => {
    if (!state.address) return;
    await fetchCustodialWallet(state.address);
  }, [state.address, fetchCustodialWallet]);

  // Auto-reconnect on page load
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
        setState(prev => ({ ...prev, address, network: network === "TESTNET" ? "TESTNET" : "MAINNET", connected: true }));
        fetchCustodialWallet(address);
      } catch {
        localStorage.removeItem("hp_wallet_connected");
      }
    })();
  }, [fetchCustodialWallet]);

  const networkMismatch = useMemo(() => {
    const expected = process.env.NEXT_PUBLIC_STELLAR_NETWORK?.trim().toUpperCase();
    if (expected !== "TESTNET" && expected !== "MAINNET") return false;
    if (!state.connected || !state.network) return false;
    return state.network !== expected;
  }, [state.connected, state.network]);

  return (
    <WalletContext.Provider
      value={{
        ...state,
        networkMismatch,
        connect,
        disconnect,
        connecting,
        error,
        createCustodialWallet,
        refreshCustodialWallet,
      }}
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
