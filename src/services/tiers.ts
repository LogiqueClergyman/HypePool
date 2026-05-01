import { VIEW_LADDER, MAX_TIERS } from '../constants';

export class TierService {
  static computeTiers(currentViews: number): number[] {
    if ((process.env.APP_MODE || '').toLowerCase() === 'testmode') {
      // In testmode we target +1 view so markets can resolve quickly.
      return [Math.max(1, Math.floor(currentViews) + 1)];
    }
    return VIEW_LADDER.filter(t => t > currentViews).slice(0, MAX_TIERS);
  }

  static validateTiers(tiers: number[]): boolean {
    if ((process.env.APP_MODE || '').toLowerCase() === 'testmode') {
      return tiers.every(t => Number.isInteger(t) && t > 0);
    }
    return tiers.every(t => VIEW_LADDER.includes(t));
  }
}
