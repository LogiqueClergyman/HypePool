// View count threshold ladder — tiers are always picked from this list
export const VIEW_LADDER: number[] = [
  1_000, 5_000, 10_000, 25_000, 50_000, 100_000,
  250_000, 500_000, 1_000_000, 2_500_000, 5_000_000,
  10_000_000, 25_000_000, 50_000_000, 100_000_000,
];

// Max tiers offered per content
export const MAX_TIERS = 4;

// Available time windows in hours
export const TIME_WINDOWS = [12, 24, 48, 72] as const;

// Resolution grace period — oracle has this many hours after deadline to resolve
export const RESOLUTION_GRACE_HOURS = 2;

// Default minimum bet in stroops (0.1 XLM = 1_000_000 stroops)
export const DEFAULT_MIN_BET = 1_000_000n;

// Platform fee in basis points (2% = 200 bps)
export const PLATFORM_FEE_BPS = 200;

// Interaction XDR expiry time in minutes
export const INTERACTION_EXPIRY_MINUTES = 10;

// Initial funding amount for new custodial accounts (1.5 XLM in stroops)
export const CUSTODIAL_FUNDING_AMOUNT = 15_000_000n;
