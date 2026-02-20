import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { auth } from './lib/auth';
import { jobsRoute } from './routes/jobs';
import { clipsRoute } from './routes/clips';
import { exportsRoute } from './routes/exports';
import { startPoller } from './services/poller';
import { env } from './env';

const app = new Elysia()
  .use(cors({
    origin: env.CORS_ORIGIN,
    credentials: true, // Allow cookies for auth
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }))
  .use(swagger({ path: '/docs' }))
  .get('/api/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))
  .all('/api/auth/*', ({ request }) => auth.handler(request))
  .use(jobsRoute)
  .use(clipsRoute)
  .use(exportsRoute)
  .listen({ port: env.PORT, hostname: '0.0.0.0' });

startPoller();
console.log(`🦊 AICR API running on port ${env.PORT}`);
