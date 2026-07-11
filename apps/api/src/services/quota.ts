import { db } from '../db/client';
import { jobs } from '../db/schema';
import { sql } from 'drizzle-orm';

export async function getMonthlyJobCount(userId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(jobs)
    .where(sql`${jobs.userId} = ${userId} AND ${jobs.createdAt} >= date('now', 'start of month') AND ${jobs.experimentId} IS NULL`);
  return result[0]?.count ?? 0;
}
