import { Elysia, t } from 'elysia';
import { db } from '../db/client';
import { user, jobs } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { auth } from '../lib/auth';
import { getTierConfig } from '../services/tier';
import { getMonthlyJobCount } from '../services/quota';

export const userRoute = new Elysia({ prefix: '/api/user' })
  .patch('/tier', async ({ body, set, request }) => {
    const session = await (auth as any).api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      set.status = 401;
      return { error: 'Unauthorized', message: 'Authentication required' };
    }

    const { plan } = body as { plan: string };
    if (!['free', 'pro', 'business'].includes(plan)) {
      set.status = 400;
      return { error: 'Invalid plan', message: 'Plan must be one of: free, pro, business' };
    }

    await db.update(user).set({ plan }).where(eq(user.id, session.user.id));
    return { plan };
  }, {
    body: t.Object({
      plan: t.String(),
    }),
  })
  .get('/usage', async ({ set, request }) => {
    const session = await (auth as any).api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      set.status = 401;
      return { error: 'Unauthorized', message: 'Authentication required' };
    }

    const [found] = await db.select().from(user).where(eq(user.id, session.user.id));
    if (!found) {
      set.status = 401;
      return { error: 'Unauthorized', message: 'User not found' };
    }

    const tierConfig = getTierConfig(found.plan);
    const jobsThisMonth = await getMonthlyJobCount(found.id);
    const overageCount = Math.max(0, jobsThisMonth - tierConfig.jobsPerMonth);
    const estimatedTotal = tierConfig.price + overageCount * tierConfig.overageRate;
    const resetDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString();

    const recentJobs = await db.select()
      .from(jobs)
      .where(eq(jobs.userId, found.id))
      .orderBy(desc(jobs.createdAt))
      .limit(5);

    return {
      plan: found.plan,
      jobsThisMonth,
      tierLimit: tierConfig.jobsPerMonth,
      overageCount,
      overageRate: tierConfig.overageRate,
      estimatedTotal,
      resetDate,
      recentJobs: recentJobs.map(j => ({
        id: j.id,
        provider: j.provider,
        createdAt: j.createdAt.toISOString(),
        status: j.status,
      })),
    };
  });
