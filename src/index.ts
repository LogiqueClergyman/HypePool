import express from 'express';
import cors from 'cors';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { startScheduler } from './jobs/scheduler';

import { registry } from './providers/registry';
import { YouTubeProvider } from './providers/youtube';
import { AutomatedResolver } from './providers/automated';

registry.registerContentProvider(new YouTubeProvider(config.youtube.apiKey));
registry.setResolver(new AutomatedResolver());

import contentRoutes from './routes/content';
import marketRoutes from './routes/markets';
import bettingRoutes from './routes/betting';
import feedRoutes from './routes/feed';
import userRoutes from './routes/users';
import walletRoutes from './routes/wallet';
import confirmRoutes from './routes/confirm';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/content', contentRoutes);
app.use('/api/markets', marketRoutes);
app.use('/api/markets', bettingRoutes); // mounts market betting inside routes/betting.ts
app.use('/api/feed', feedRoutes);
app.use('/api/users', userRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/confirm', confirmRoutes);

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
  startScheduler();
});
