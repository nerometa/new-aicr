import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { auth } from './lib/auth';
import { jobsRoute } from './routes/jobs';
import { clipsRoute } from './routes/clips';
import { webhooksRoute } from './routes/webhooks';
import { providersRoute } from './routes/providers';
import { experimentsRoute } from './routes/experiments';
import { userRoute } from './routes/user';
import { startPoller } from './services/poller';
import { env } from './env';

const isDev = process.env.NODE_ENV !== 'production';

const app = new Elysia()
  .use(cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }))
  .use(isDev ? swagger({ path: '/docs' }) : false)
  .get('/api/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))
  .all('/api/auth/*', ({ request }) => auth.handler(request))
  .use(jobsRoute)
  .use(clipsRoute)
  .use(webhooksRoute)
  .use(providersRoute)
  .use(userRoute)
  .use(experimentsRoute)
  .listen({ port: env.PORT, hostname: '0.0.0.0' });

startPoller();
console.log(`🦊 AICR API running on port ${env.PORT}`);
export { app };
export default app;
