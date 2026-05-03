import { env } from '../env';
import { auth } from '../lib/auth';

export const requireOwner = async (ctx: any, next: any) => {
  const request = ctx?.request as any;
  try {
    const api: any = (auth as any).api;
    if (api && typeof api.getSession === 'function') {
      const session: any = await api.getSession({ headers: request?.headers as any });
      const userId: string | undefined = session?.user?.id;

      if (!userId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (userId !== env.OWNER_USER_ID) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return next(ctx);
    }
  } catch {
  }

  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
};
