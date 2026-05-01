import cron from 'node-cron';
import { resolveMarkets } from './resolveMarkets';
import { syncState } from './syncState';
import { refreshContent } from './refreshContent';

function withLock(name: string, fn: () => Promise<void>): () => void {
  let running = false;
  return () => {
    if (running) {
      console.warn(`[scheduler] ${name} still running, skipping tick`);
      return;
    }
    running = true;
    fn().catch(e => console.error(`[scheduler] ${name} error:`, e)).finally(() => { running = false; });
  };
}

export function startScheduler() {
  console.log('Background Jobs Scheduler started.');
  cron.schedule('* * * * *',    withLock('resolveMarkets', resolveMarkets));  // every 1 min
  cron.schedule('*/5 * * * *',  withLock('syncState', syncState));             // every 5 min
  cron.schedule('*/10 * * * *', withLock('refreshContent', refreshContent));  // every 10 min
}
