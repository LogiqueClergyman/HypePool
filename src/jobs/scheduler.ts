import cron from 'node-cron';
import { resolveMarkets } from './resolveMarkets';
import { syncState } from './syncState';
import { refreshContent } from './refreshContent';

export function startScheduler() {
  console.log('Background Jobs Scheduler started.');
  cron.schedule('* * * * *', resolveMarkets);       // every 1 minute
  cron.schedule('*/5 * * * *', syncState);           // every 5 minutes
  cron.schedule('*/10 * * * *', refreshContent);     // every 10 minutes
}
