import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { auth } from './lib/auth';
import { jobsRoute } from './routes/jobs';
import { clipsRoute } from './routes/clips';
import { exportsRoute } from './routes/exports';
import { startPoller } from './services/poller';

const app = new Elysia()
  .use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }))
  .use(swagger({ path: '/docs' }))
  .all('/api/auth/*', ({ request }) => auth.handler(request))
  .use(jobsRoute)
  .use(clipsRoute)
  .use(exportsRoute)
  .listen(3000);

startPoller();
console.log('🦊 AICR API running on port 3000');
