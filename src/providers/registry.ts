import { ContentProvider } from '../interfaces/contentProvider';
import { MarketResolver } from '../interfaces/marketResolver';

class ProviderRegistry {
  private contentProviders: ContentProvider[] = [];
  private resolver!: MarketResolver;

  // Register a content provider
  registerContentProvider(provider: ContentProvider): void {
    this.contentProviders.push(provider);
  }

  // Set the active market resolver
  setResolver(resolver: MarketResolver): void {
    this.resolver = resolver;
  }

  // Find the provider that can handle a given URL
  getProviderForUrl(url: string): ContentProvider | null {
    return this.contentProviders.find(p => p.canHandle(url)) || null;
  }

  // Get provider by platform name
  getProviderByPlatform(platform: string): ContentProvider | null {
    return this.contentProviders.find(p => p.platform === platform) || null;
  }

  // Get the active resolver
  getResolver(): MarketResolver {
    return this.resolver;
  }

  // List all supported platforms
  getSupportedPlatforms(): string[] {
    return this.contentProviders.map(p => p.platform);
  }
}

// Singleton — initialized in index.ts
export const registry = new ProviderRegistry();
