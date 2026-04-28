// Standardized metadata returned by all providers
export interface ContentMetadata {
  platform: string;           // "youtube", "twitter", "instagram", etc.
  externalId: string;         // Platform-specific ID
  url: string;                // Canonical URL
  title: string;
  author: string;             // Channel name, username, handle
  thumbnailUrl: string;
  publishedAt: Date;
  currentViews: number;
}

// Every platform provider must implement this
export interface ContentProvider {
  // Unique platform identifier
  readonly platform: string;

  // Check if this provider can handle the given URL
  canHandle(url: string): boolean;

  // Extract the platform-specific content ID from the URL
  extractId(url: string): string | null;

  // Fetch full metadata + current view count for a single piece of content
  getContentDetails(externalId: string): Promise<ContentMetadata | null>;

  // Batch fetch current view counts for multiple content IDs
  // Returns map of externalId → currentViews
  batchGetViewCounts(externalIds: string[]): Promise<Map<string, number>>;
}
