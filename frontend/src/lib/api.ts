/** Deployed apps must set this to the HTTPS API origin, e.g. https://api.example.com/api */
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
  return data as T;
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface TiersResponse {
  platform: string;
  external_id: string;
  title: string;
  author: string;
  thumbnail: string;
  published_at: string;
  current_views: number;
  available_tiers: number[];
  available_windows: number[];
  window_unit?: "hours" | "minutes";
  existing_markets: { threshold: number; window_hours: number; market_id: string }[];
}

/** First tier + window pair that does not already have a market for this video. */
export function pickFirstAvailableTierWindow(data: TiersResponse): {
  tier: number | null;
  window: number;
} {
  for (const t of data.available_tiers) {
    for (const w of data.available_windows) {
      const taken = data.existing_markets.some(
        (m) => m.threshold === t && m.window_hours === w
      );
      if (!taken) return { tier: t, window: w };
    }
  }
  const fallbackWindow = data.available_windows.includes(24)
    ? 24
    : data.available_windows[0] ?? 24;
  return {
    tier: data.available_tiers[0] ?? null,
    window: fallbackWindow,
  };
}

/** True when every combination of available tier × window already exists. */
export function allTierWindowSlotsTaken(data: TiersResponse): boolean {
  if (data.available_tiers.length === 0 || data.available_windows.length === 0) return false;
  return data.available_tiers.every((t) =>
    data.available_windows.every((w) =>
      data.existing_markets.some((m) => m.threshold === t && m.window_hours === w)
    )
  );
}

export interface MarketCreated {
  id: string;
  onchain_id: number;
  contract_address: string;
  threshold: number;
  window_hours: number;
  deadline: string;
  tx_hash: string | null;
}

export interface SubmitContentResponse {
  content_id: string;
  markets_created?: MarketCreated[];
  interactions?: { interaction_id: string; xdr: string; threshold: number; window_hours: number }[];
  tx_hashes?: string[];
}

export interface BetResponse {
  status: "confirmed" | "unsigned";
  tx_hash?: string;
  xdr?: string;
  interaction_id?: string;
  bet?: {
    id: string;
    market_id: string;
    side: string;
    amount: string;
    new_yes_pool: string;
    new_no_pool: string;
  };
}

export type WindowUnit = "hours" | "minutes";

/** Prediction window length; avoids ambiguous H/M next to view counts (e.g. 1M views vs 1 min). */
export function formatWindowLabel(value: number, unit?: WindowUnit): string {
  const u = unit ?? "hours";
  if (u === "minutes") return value === 1 ? "1 min" : `${value} min`;
  return value === 1 ? "1 hr" : `${value} hr`;
}

export interface Market {
  id: string;
  onchain_id: number;
  contract_address: string;
  threshold: number;
  window_hours: number;
  /** From API: matches backend MARKET_WINDOW_UNIT */
  window_unit?: WindowUnit;
  deadline: string;
  resolution_deadline: string;
  min_bet: string;
  yes_pool: string;
  no_pool: string;
  yes_weighted_pool?: string;
  no_weighted_pool?: string;
  total_bettors: number;
  status: "ACTIVE" | "RESOLVED_YES" | "RESOLVED_NO" | "EXPIRED";
  outcome: "YES" | "NO" | null;
  resolved_at: string | null;
  created_at: string;
}

export interface MarketContent {
  id?: string;
  video_id: string;
  title: string;
  channel: string;
  thumbnail: string;
  current_views: number;
}

export interface MarketDetail extends Market {
  content?: MarketContent;
  related_markets?: Array<{
    id: string;
    threshold: number;
    window_hours: number;
    window_unit?: WindowUnit;
    deadline: string;
    status: "ACTIVE" | "RESOLVED_YES" | "RESOLVED_NO" | "EXPIRED";
    yes_pool: string;
    no_pool: string;
  }>;
}

export interface MarketBet {
  id: string;
  side: "YES" | "NO";
  amount: string;
  payout: string | null;
  claimed: boolean;
  tx_hash: string;
  user_address: string;
  placed_at: string;
}

export interface FeedItem {
  content: {
    id: string;
    video_id: string;
    title: string;
    channel: string;
    thumbnail: string;
    current_views: number;
  };
  markets: Market[];
  total_volume: string;
  total_bettors: number;
}

export interface FeedResponse {
  items: FeedItem[];
  page: number;
  has_more: boolean;
}

export interface Portfolio {
  address: string;
  total_wagered: string;
  total_won: string;
  pnl: string;
  active_bets: number;
  markets_won: number;
  markets_lost: number;
}

export interface BetRecord {
  id: string;
  market: {
    id: string;
    content_title: string;
    content_thumbnail: string;
    threshold: string;
    window_hours: number;
    deadline: string;
    status: string;
    outcome: string | null;
  };
  side: "YES" | "NO";
  amount: string;
  payout: string | null;
  claimed: boolean;
  /** On-chain tx where the bet (token transfer) was submitted */
  tx_hash: string;
  /** On-chain tx where winnings were claimed (after resolution); null until claimed */
  claim_tx_hash: string | null;
  placed_at: string;
}

/** Open transaction on Stellar Expert (matches NEXT_PUBLIC_STELLAR_NETWORK). */
export function stellarExpertTxUrl(txHash: string): string {
  const n = (process.env.NEXT_PUBLIC_STELLAR_NETWORK || "TESTNET").toUpperCase();
  const network = n === "MAINNET" ? "public" : "testnet";
  return `https://stellar.expert/explorer/${network}/tx/${txHash}`;
}

export interface WalletInfo {
  custodial_address: string;
  balance: string;
  owner_address: string;
  created_at: string;
}

// ── API Functions ─────────────────────────────────────────────────────────────

export function getContentTiers(url: string): Promise<TiersResponse> {
  return req("/content/tiers", { method: "POST", body: JSON.stringify({ url }) });
}

export function submitContent(
  url: string,
  tiers: number[],
  windows: number[],
  user_address: string
): Promise<SubmitContentResponse> {
  return req("/content/submit", {
    method: "POST",
    body: JSON.stringify({ url, tiers, windows, user_address }),
  });
}

export function placeBet(
  marketId: string,
  side: "yes" | "no",
  amount: number,
  user_address: string
): Promise<BetResponse> {
  return req(`/markets/${marketId}/bet`, {
    method: "POST",
    body: JSON.stringify({ side, amount, user_address }),
  });
}

export function confirmTx(
  interaction_id: string,
  tx_hash: string
): Promise<{ status: string; market_id?: string }> {
  return req("/confirm", {
    method: "POST",
    body: JSON.stringify({ interaction_id, tx_hash }),
  });
}

/** Testnet only — backend must enable ENABLE_TESTNET_TOKEN_FAUCET + TOKEN_FAUCET_SECRET_KEY */
export function fundCustodialTestnetTokens(user_address: string): Promise<{ tx_hash: string }> {
  return req("/wallet/fund-token-testnet", {
    method: "POST",
    body: JSON.stringify({ user_address }),
  });
}

export function submitSignedTx(signed_xdr: string): Promise<{ tx_hash: string }> {
  return req("/submit", {
    method: "POST",
    body: JSON.stringify({ signed_xdr }),
  });
}

export function getFeed(page = 1, limit = 6): Promise<FeedResponse> {
  return req(`/feed?page=${page}&limit=${limit}`);
}

export function getMarket(id: string): Promise<MarketDetail> {
  return req(`/markets/${id}`);
}

export function getMarketBets(id: string): Promise<{ bets: MarketBet[]; total: number }> {
  return req(`/markets/${id}/bets`);
}

export function getMarkets(params: {
  status?: string;
  content_id?: string;
  sort?: string;
  page?: number;
  limit?: number;
}): Promise<{ markets: Array<Market & { content?: MarketContent }>; total: number; page: number; pages: number }> {
  const q = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))
  );
  return req(`/markets?${q}`);
}

export interface PlatformStats {
  total_volume: string;
  total_bettors: number;
  active_markets: number;
  total_markets: number;
}

export function getPlatformStats(): Promise<PlatformStats> {
  return req('/markets/stats');
}

export function getUserPortfolio(address: string): Promise<Portfolio> {
  return req(`/users/${address}/portfolio`);
}

export function getUserBets(
  address: string,
  status?: "active" | "won" | "lost",
  page = 1,
  limit = 10
): Promise<{ bets: BetRecord[]; total: number; page: number; pages: number }> {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) q.set("status", status);
  return req(`/users/${address}/bets?${q}`);
}

export function createWallet(user_address: string): Promise<{ custodial_address: string; status: string }> {
  return req("/wallet/create", { method: "POST", body: JSON.stringify({ user_address }) });
}

export function getWallet(address: string): Promise<WalletInfo> {
  return req(`/wallet/${address}`);
}

export function withdrawWallet(
  custodial_address: string,
  amount: number,
  destination: string
): Promise<{ tx_hash: string; new_balance: string }> {
  return req("/wallet/withdraw", {
    method: "POST",
    body: JSON.stringify({ custodial_address, amount, destination }),
  });
}

// ── Formatting Helpers ────────────────────────────────────────────────────────

export function stroopsToXlm(stroops: string | number | bigint): string {
  const n = typeof stroops === "bigint" ? Number(stroops) : Number(stroops);
  return (n / 10_000_000).toFixed(2);
}

export function xlmToStroops(xlm: number): number {
  return Math.floor(xlm * 10_000_000);
}

export function formatViews(views: number | string | bigint): string {
  const n = Number(views);
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function formatDeadline(deadline: string): string {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return "CLOSED";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

/** Share of YES pool in total liquidity; `null` when there are no stakes (do not show as 50/50). */
export function computePercent(yesPool: string | number, noPool: string | number): number | null {
  const yes = Number(yesPool);
  const no = Number(noPool);
  const total = yes + no;
  if (total === 0) return null;
  return Math.round((yes / total) * 100);
}

export function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}
