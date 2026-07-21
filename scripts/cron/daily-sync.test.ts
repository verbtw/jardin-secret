import {describe, expect, it, vi} from 'vitest';
import {createDailySyncHandler} from '../../api/daily-sync';

function response() {
  const state = {status: 200, body: ''};
  return {
    state,
    api: {
      status(code: number) { state.status = code; return this; },
      json(body: unknown) { state.body = JSON.stringify(body); },
    },
  };
}

describe('daily sync endpoint', () => {
  it('rejects requests without the Vercel cron secret', async () => {
    const run = vi.fn();
    const handler = createDailySyncHandler(run, {CRON_SECRET: 'secret'});
    const target = response();
    await handler({headers: {}}, target.api);
    expect(target.state.status).toBe(401);
    expect(run).not.toHaveBeenCalled();
  });

  it('runs the protected sync and returns its summary', async () => {
    const run = vi.fn().mockResolvedValue({catalog: {matched: 3}, pricing: {published: 2}});
    const handler = createDailySyncHandler(run, {CRON_SECRET: 'secret'});
    const target = response();
    await handler({headers: {authorization: 'Bearer secret'}}, target.api);
    expect(target.state.status).toBe(200);
    expect(JSON.parse(target.state.body)).toEqual({ok: true, catalog: {matched: 3}, pricing: {published: 2}});
  });

  it('does not leak internal errors in the HTTP response', async () => {
    const handler = createDailySyncHandler(vi.fn().mockRejectedValue(new Error('database-password')), {CRON_SECRET: 'secret'});
    const target = response();
    await handler({headers: {authorization: 'Bearer secret'}}, target.api);
    expect(target.state.status).toBe(500);
    expect(target.state.body).toBe('{"ok":false,"error":"Daily sync failed"}');
  });
});
