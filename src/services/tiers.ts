import { VIEW_LADDER, MAX_TIERS } from '../constants';

export class TierService {
  static computeTiers(currentViews: number): number[] {
    return VIEW_LADDER.filter(t => t > currentViews).slice(0, MAX_TIERS);
  }

  static validateTiers(tiers: number[]): boolean {
    return tiers.every(t => VIEW_LADDER.includes(t));
  }
}
