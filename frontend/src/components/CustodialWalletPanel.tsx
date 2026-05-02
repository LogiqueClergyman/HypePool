"use client";

import { FormEvent, useMemo, useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { withdrawWallet, stroopsToXlm, xlmToStroops, fundCustodialTestnetTokens } from "@/lib/api";
import { Loader2, RefreshCw, Wallet, ArrowUpRight, Copy, ExternalLink } from "lucide-react";

export default function CustodialWalletPanel() {
  const {
    address,
    network,
    connected,
    connect,
    connecting,
    custodialWallet,
    custodialLoading,
    createCustodialWallet,
    refreshCustodialWallet,
  } = useWallet();

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [fundAmount, setFundAmount] = useState("2");
  const [funding, setFunding] = useState(false);
  const [tokenFunding, setTokenFunding] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const balanceXlm = useMemo(() => {
    if (!custodialWallet) return "0.00";
    return stroopsToXlm(custodialWallet.balance);
  }, [custodialWallet]);

  const handleCreate = async () => {
    setError(null);
    setSuccess(null);
    try {
      await createCustodialWallet();
      setSuccess("Custodial wallet created. Send XLM for fees and platform tokens for bets (see below).");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create custodial wallet.");
    }
  };

  const handleRefresh = async () => {
    setError(null);
    setSuccess(null);
    try {
      await refreshCustodialWallet();
      setSuccess("Balance refreshed.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to refresh wallet.");
    }
  };

  const handleWithdraw = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!custodialWallet) return;

    const parsed = Number(withdrawAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Enter a valid XLM amount greater than 0.");
      return;
    }

    setError(null);
    setSuccess(null);
    setWithdrawing(true);
    try {
      const amountStroops = xlmToStroops(parsed);
      const result = await withdrawWallet(
        custodialWallet.custodial_address,
        amountStroops,
        custodialWallet.owner_address
      );
      await refreshCustodialWallet();
      setWithdrawAmount("");
      setSuccess(`Withdraw submitted: ${result.tx_hash.slice(0, 10)}...`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Withdraw failed.");
    } finally {
      setWithdrawing(false);
    }
  };

  const handleFundFromWallet = async () => {
    if (!custodialWallet || !address || !network) {
      setError("Connect wallet first.");
      return;
    }

    const parsed = Number(fundAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Enter a valid funding amount greater than 0.");
      return;
    }

    setError(null);
    setSuccess(null);
    setFunding(true);
    try {
      const { Horizon, TransactionBuilder, Operation, Asset, Networks } = await import("@stellar/stellar-sdk");
      const { signTransaction } = await import("@stellar/freighter-api");

      const horizonUrl =
        network === "TESTNET"
          ? "https://horizon-testnet.stellar.org"
          : "https://horizon.stellar.org";
      const networkPassphrase =
        network === "TESTNET"
          ? Networks.TESTNET
          : Networks.PUBLIC;

      const server = new Horizon.Server(horizonUrl);
      const sourceAccount = await server.loadAccount(address);
      const fee = String(await server.fetchBaseFee());
      const amount = parsed.toFixed(7);

      const tx = new TransactionBuilder(sourceAccount, {
        fee,
        networkPassphrase,
      })
        .addOperation(Operation.payment({
          destination: custodialWallet.custodial_address,
          asset: Asset.native(),
          amount,
        }))
        .setTimeout(30)
        .build();

      const signed = await signTransaction(tx.toXDR(), { networkPassphrase });
      const signedXdr = typeof signed === "string" ? signed : signed.signedTxXdr;
      const signedTx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase);

      const submit = await server.submitTransaction(signedTx);
      await refreshCustodialWallet();
      setSuccess(`Funding submitted: ${submit.hash.slice(0, 10)}...`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Funding transaction failed.");
    } finally {
      setFunding(false);
    }
  };

  const handleTestnetTokenTopUp = async () => {
    if (!address) return;
    setError(null);
    setSuccess(null);
    setTokenFunding(true);
    try {
      await fundCustodialTestnetTokens(address);
      await refreshCustodialWallet();
      setSuccess("Testnet platform token transfer submitted. Wait a few seconds and refresh balance.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Token faucet request failed (enable ENABLE_TESTNET_TOKEN_FAUCET on API).");
    } finally {
      setTokenFunding(false);
    }
  };

  const handleCopyAddress = async () => {
    if (!custodialWallet) return;
    try {
      await navigator.clipboard.writeText(custodialWallet.custodial_address);
      setError(null);
      setSuccess("Custodial address copied.");
    } catch {
      setError("Failed to copy address.");
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-8 pt-24 pb-10">
      <div className="border border-white/10 bg-white/[0.02] p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-[9px] font-black text-primary uppercase tracking-[0.35em] mb-2">
              Custodial Wallet
            </p>
            <h2 className="text-xl font-black text-white uppercase italic tracking-tight">
              Manage balance and withdrawals
            </h2>
          </div>
          {!connected && (
            <button
              onClick={connect}
              disabled={connecting}
              className="h-10 px-4 border border-white/20 text-white text-xs font-black uppercase tracking-widest hover:border-primary hover:text-primary disabled:opacity-50"
            >
              {connecting ? "CONNECTING..." : "CONNECT WALLET"}
            </button>
          )}
        </div>

        {connected && !custodialWallet && (
          <div className="mt-5 flex flex-col md:flex-row gap-4 md:items-center md:justify-between border border-white/10 p-4">
            <p className="text-sm text-muted-foreground">
              Create a custodial wallet to place and settle bets faster.
            </p>
            <button
              onClick={handleCreate}
              disabled={custodialLoading}
              className="h-10 px-5 bg-primary text-black text-xs font-black uppercase tracking-widest hover:bg-white disabled:opacity-50"
            >
              {custodialLoading ? "CREATING..." : "CREATE WALLET"}
            </button>
          </div>
        )}

        {connected && custodialWallet && (
          <div className="mt-5 grid lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 border border-white/10 p-4 space-y-3">
              <div className="flex items-center gap-2 text-white">
                <Wallet className="w-4 h-4 text-primary" />
                <span className="text-xs font-black uppercase tracking-widest">Wallet details</span>
              </div>
              <p className="text-xs text-muted-foreground break-all">
                Custodial: {custodialWallet.custodial_address}
              </p>
              <p className="text-xs text-muted-foreground break-all">
                Owner: {custodialWallet.owner_address}
              </p>
              <p className="text-2xl font-black text-white pt-2">{balanceXlm} XLM</p>

              <div className="border border-white/10 p-3 bg-black/50 space-y-2">
                <p className="text-[11px] font-black uppercase tracking-widest text-white">Fund your wallet</p>
                <p className="text-xs text-muted-foreground">
                  Bets use the platform <span className="text-white/90">Soroban token</span>, not XLM. XLM only pays
                  network fees. Send XLM to the custodial address for fees, then ensure the custodial account holds the
                  platform token (testnet: use &quot;Get test tokens&quot; when the API faucet is enabled).
                </p>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.000001"
                      value={fundAmount}
                      onChange={(e) => setFundAmount(e.target.value)}
                      className="h-9 w-24 px-2 bg-black border border-white/15 text-white text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                      placeholder="2"
                    />
                    <button
                      type="button"
                      onClick={handleFundFromWallet}
                      disabled={funding || !connected}
                      className="h-9 px-3 bg-primary text-black text-[11px] font-black uppercase tracking-widest hover:bg-white disabled:opacity-50 inline-flex items-center gap-2"
                    >
                      {funding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      {funding ? "Funding..." : "Fund from wallet"}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyAddress}
                    className="h-9 px-3 border border-white/20 text-[11px] font-black uppercase tracking-widest text-white hover:border-primary hover:text-primary inline-flex items-center gap-2"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy Address
                  </button>
                  {network === "TESTNET" && (
                    <a
                      href={`https://friendbot.stellar.org/?addr=${custodialWallet.custodial_address}`}
                      target="_blank"
                      rel="noreferrer"
                      className="h-9 px-3 border border-white/20 text-[11px] font-black uppercase tracking-widest text-white hover:border-primary hover:text-primary inline-flex items-center gap-2"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open Friendbot
                    </a>
                  )}
                  {network === "TESTNET" && (
                    <button
                      type="button"
                      onClick={handleTestnetTokenTopUp}
                      disabled={tokenFunding}
                      className="h-9 px-3 border border-primary/50 text-[11px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 disabled:opacity-50 inline-flex items-center gap-2"
                    >
                      {tokenFunding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      {tokenFunding ? "Requesting…" : "Get test tokens (platform)"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={custodialLoading}
                    className="h-9 px-3 border border-white/20 text-[11px] font-black uppercase tracking-widest text-white hover:border-primary hover:text-primary disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${custodialLoading ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            <form onSubmit={handleWithdraw} className="border border-white/10 p-4 space-y-3">
              <div className="flex items-center gap-2 text-white">
                <ArrowUpRight className="w-4 h-4 text-primary" />
                <span className="text-xs font-black uppercase tracking-widest">Withdraw to owner</span>
              </div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                Amount (XLM)
              </label>
              <input
                type="number"
                min="0"
                step="0.000001"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="w-full h-10 px-3 bg-black border border-white/15 text-white text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                placeholder="0.00"
              />
              <button
                type="submit"
                disabled={withdrawing || custodialLoading}
                className="w-full h-10 bg-primary text-black text-xs font-black uppercase tracking-widest hover:bg-white disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {withdrawing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {withdrawing ? "WITHDRAWING..." : "WITHDRAW"}
              </button>
            </form>
          </div>
        )}

        {(error || success) && (
          <div
            className={`mt-4 border px-3 py-2 text-xs font-bold ${
              error
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : "border-primary/30 bg-primary/10 text-primary"
            }`}
          >
            {error || success}
          </div>
        )}
      </div>
    </section>
  );
}
