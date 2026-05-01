function parseEnvNumberList(key: string, fallback: number[]): number[] {
  const raw = process.env[key];
  if (!raw || !raw.trim()) return fallback;

  const parsed = raw
    .split(',')
    .map((v) => Number(v.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (!parsed.length) return fallback;

  return Array.from(new Set(parsed)).sort((a, b) => a - b);
}

const isTestMode = (process.env.APP_MODE || '').toLowerCase() === 'testmode';

const DEFAULT_VIEW_LADDER: number[] = [
  1_000, 5_000, 10_000, 25_000, 50_000, 100_000,
  250_000, 500_000, 1_000_000, 2_500_000, 5_000_000,
  10_000_000, 25_000_000, 50_000_000, 100_000_000,
  500_000_000, 1_000_000_000, 2_000_000_000, 5_000_000_000
];

export const VIEW_LADDER: number[] = parseEnvNumberList('MARKET_VIEW_LADDER', DEFAULT_VIEW_LADDER);

// Max tiers offered per content
export const MAX_TIERS = isTestMode
  ? 1
  : Number(process.env.MARKET_MAX_TIERS || '4');

// Available time windows in hours
const DEFAULT_TIME_WINDOWS = [12, 24, 48, 72];
export const TIME_WINDOWS: number[] = isTestMode
  ? [1]
  : parseEnvNumberList('MARKET_TIME_WINDOWS', DEFAULT_TIME_WINDOWS);

// Resolution grace period — oracle has this many hours after deadline to resolve
export const RESOLUTION_GRACE_HOURS = isTestMode ? 10 : 2;

// Default minimum bet in stroops (0.1 XLM = 1_000_000 stroops)
export const DEFAULT_MIN_BET = 1_000_000n;

// Platform fee in basis points (2% = 200 bps)
export const PLATFORM_FEE_BPS = 200;

// Interaction XDR expiry time in minutes
export const INTERACTION_EXPIRY_MINUTES = 10;

// Initial funding amount for new custodial accounts (1.5 XLM in stroops)
export const CUSTODIAL_FUNDING_AMOUNT = 15_000_000n;
