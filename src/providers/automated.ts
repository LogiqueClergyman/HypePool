import { MarketResolver, ResolutionResult } from '../interfaces/marketResolver';
import { registry } from './registry';

export class AutomatedResolver implements MarketResolver {
  readonly resolverType = 'automated';

  async resolve(market: {
    contentPlatform: string;
    contentExternalId: string;
    threshold: number;
    metric: string;
  }): Promise<ResolutionResult | null> {
    const provider = registry.getProviderByPlatform(market.contentPlatform);
    if (!provider) return null;

    const details = await provider.getContentDetails(market.contentExternalId);
    if (!details) return null;

    const actualValue = details.currentViews;
    const outcome = actualValue >= market.threshold ? 'Yes' : 'No';

    return {
      outcome,
      actualValue,
      source: `${market.contentPlatform}_api`,
      resolvedAt: new Date(),
    };
  }
}
