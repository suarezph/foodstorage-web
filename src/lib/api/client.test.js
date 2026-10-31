import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  api,
  getAccessToken,
  setAccessToken,
  setSessionExpiredHandler,
} from './client.js';

const json = (status, body) =>
  new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

beforeEach(() => {
  setAccessToken('old');
  setSessionExpiredHandler(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('api client', () => {
  it('sends the bearer token and unwraps data', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(json(200, { data: { ok: 1 } }));
    expect(await api('/me')).toEqual({ ok: 1 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/v1/me');
    expect(init.headers.Authorization).toBe('Bearer old');
    expect(init.credentials).toBe('include');
  });

  it('serialises query params and skips empty ones', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(200, { data: [] }));
    await api('/transactions', {
      query: { q: 'tea', accountId: '', cursor: undefined, limit: 25 },
    });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/transactions?q=tea&limit=25');
  });

  it('refreshes once on 401 and retries with the new token', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json(401, { error: { code: 'UNAUTHENTICATED', message: 'expired' } }))
      .mockResolvedValueOnce(json(200, { data: { accessToken: 'new', user: {} } })) // /auth/refresh
      .mockResolvedValueOnce(json(200, { data: 'secret-data' }));
    expect(await api('/accounts')).toBe('secret-data');
    expect(getAccessToken()).toBe('new');
    expect(fetchMock.mock.calls[1][0]).toBe('/api/v1/auth/refresh');
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe('Bearer new');
  });

  it('shares one refresh between concurrent 401s', async () => {
    let refreshCalls = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      if (url.endsWith('/auth/refresh')) {
        refreshCalls += 1;
        return json(200, { data: { accessToken: 'new', user: {} } });
      }
      return init.headers.Authorization === 'Bearer new'
        ? json(200, { data: 'ok' })
        : json(401, { error: { code: 'UNAUTHENTICATED', message: 'expired' } });
    });
    const results = await Promise.all([api('/a'), api('/b'), api('/c')]);
    expect(results).toEqual(['ok', 'ok', 'ok']);
    expect(refreshCalls).toBe(1);
  });

  it('calls the expiry handler and throws when refresh fails', async () => {
    const expired = vi.fn();
    setSessionExpiredHandler(expired);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      json(401, { error: { code: 'UNAUTHENTICATED', message: 'nope' } }),
    );
    await expect(api('/accounts')).rejects.toMatchObject({ status: 401 });
    expect(expired).toHaveBeenCalledOnce();
  });

  it('maps API errors and network failures to ApiError', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      json(422, { error: { code: 'VALIDATION_FAILED', message: 'bad', details: [{ path: 'x' }] } }),
    );
    await expect(api('/x', { method: 'POST', body: {} })).rejects.toMatchObject({
      status: 422,
      code: 'VALIDATION_FAILED',
      details: [{ path: 'x' }],
    });
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('failed'));
    const err = await api('/x').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('NETWORK');
  });

  it('returns null for 204', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
    expect(await api('/x', { method: 'DELETE' })).toBeNull();
  });
});
