import { describe, it, expect, beforeAll } from 'bun:test';
import { createHmac } from 'node:crypto';

// Env must be set BEFORE importing the app/env module.
const TEST_SECRET = 'test-webhook-secret-placeholder-32chars';
process.env.DATABASE_URL ||= 'libsql://test.test';
process.env.DATABASE_AUTH_TOKEN ||= 'x';
process.env.UPSTASH_REDIS_REST_URL ||= 'https://x.test';
process.env.UPSTASH_REDIS_REST_TOKEN ||= 'x';
process.env.REAP_API_KEY ||= 'x';
process.env.REKA_API_KEY ||= 'x';
process.env.BETTER_AUTH_SECRET ||= '12345678901234567890123456789012';
process.env.BETTER_AUTH_URL ||= 'http://localhost:3000';
process.env.CORS_ORIGIN ||= 'http://localhost:3001';
process.env.OWNER_USER_ID ||= 'test-owner';
process.env.REAP_WEBHOOK_SECRET = TEST_SECRET;
process.env.NODE_ENV = 'test';

let webhooksRoute: any;
beforeAll(async () => {
  ({ webhooksRoute } = await import('./webhooks'));
});

const post = (body: string, headers: Record<string, string> = {}, qs = '') =>
  webhooksRoute.handle(
    new Request(`http://localhost/api/webhooks/reap${qs}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body,
    }),
  );

describe('POST /api/webhooks/reap — signature verification (VULN-001)', () => {
  it('rejects unsigned requests with 401', async () => {
    const res = await post(JSON.stringify({ projectId: 'p1', status: 'completed' }));
    expect(res.status).toBe(401);
  });

  it('rejects HMAC with wrong signature', async () => {
    const body = JSON.stringify({ projectId: 'p1', status: 'completed' });
    const res = await post(body, { 'x-reap-signature': 'deadbeef' });
    expect(res.status).toBe(401);
  });

  it('rejects malformed HMAC (non-hex)', async () => {
    const body = JSON.stringify({ projectId: 'p1' });
    const res = await post(body, { 'x-reap-signature': 'not-hex-zzzzz' });
    expect(res.status).toBe(401);
  });

  it('rejects wrong bearer token', async () => {
    const res = await post(
      JSON.stringify({ projectId: 'p1' }),
      { authorization: 'Bearer wrong-secret-value-123456789' },
    );
    expect(res.status).toBe(401);
  });

  it('rejects wrong query token', async () => {
    const res = await post(JSON.stringify({ projectId: 'p1' }), {}, '?token=wrong');
    expect(res.status).toBe(401);
  });

  it('accepts valid HMAC-SHA256 hex signature', async () => {
    const body = JSON.stringify({ projectId: 'no-such-project-id', status: 'processing' });
    const sig = createHmac('sha256', TEST_SECRET).update(body).digest('hex');
    const res = await post(body, { 'x-reap-signature': sig });
    expect(res.status).toBe(200);
  });

  it('accepts HMAC with sha256= prefix', async () => {
    const body = JSON.stringify({ projectId: 'p1', status: 'processing' });
    const sig = createHmac('sha256', TEST_SECRET).update(body).digest('hex');
    const res = await post(body, { 'x-reap-signature': `sha256=${sig}` });
    expect(res.status).toBe(200);
  });

  it('accepts valid bearer token', async () => {
    const res = await post(
      JSON.stringify({ projectId: 'p1' }),
      { authorization: `Bearer ${TEST_SECRET}` },
    );
    expect(res.status).toBe(200);
  });

  it('accepts valid query token', async () => {
    const res = await post(
      JSON.stringify({ projectId: 'p1' }),
      {},
      `?token=${encodeURIComponent(TEST_SECRET)}`,
    );
    expect(res.status).toBe(200);
  });

  it('returns 400 on authenticated but malformed JSON', async () => {
    const body = '{not-json';
    const sig = createHmac('sha256', TEST_SECRET).update(body).digest('hex');
    const res = await post(body, { 'x-reap-signature': sig });
    expect(res.status).toBe(400);
  });

  it('returns 400 on authenticated but missing projectId', async () => {
    const body = JSON.stringify({ status: 'completed' });
    const sig = createHmac('sha256', TEST_SECRET).update(body).digest('hex');
    const res = await post(body, { 'x-reap-signature': sig });
    expect(res.status).toBe(400);
  });

  it('rejects HMAC against a body that was tampered with', async () => {
    const realBody = JSON.stringify({ projectId: 'p1', status: 'processing' });
    const sig = createHmac('sha256', TEST_SECRET).update(realBody).digest('hex');
    // Send a *different* body with the signature for the original
    const tampered = JSON.stringify({ projectId: 'p1', status: 'completed' });
    const res = await post(tampered, { 'x-reap-signature': sig });
    expect(res.status).toBe(401);
  });
});
