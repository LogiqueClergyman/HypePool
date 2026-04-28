export interface ResolutionResult {
  outcome: 'Yes' | 'No';
  actualValue: number;        // The actual view/engagement count at resolution
  source: string;             // "youtube_api", "manual_human", etc.
  resolvedAt: Date;
}

export interface MarketResolver {
  // Unique identifier for this resolver type
  readonly resolverType: string;

  // Determine the outcome for a market
  // Returns null if resolution cannot be determined yet (e.g., waiting for human input)
  resolve(market: {
    contentPlatform: string;
    contentExternalId: string;
    threshold: number;
    metric: string;
  }): Promise<ResolutionResult | null>;
}
