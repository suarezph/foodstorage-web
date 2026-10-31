// Fetch wrapper for foodstorage-api. The access token lives in this module's memory only:
// never in localStorage/sessionStorage. The refresh cookie is HttpOnly, set by the API.
const BASE = (import.meta.env?.VITE_API_URL ?? '/api/v1').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let accessToken = null;
let refreshInFlight = null;
let onSessionExpired = () => {};

export const setAccessToken = (token) => {
  accessToken = token;
};
export const getAccessToken = () => accessToken;
/** Called when a refresh fails, so the app can drop back to the login screen. */
export const setSessionExpiredHandler = (fn) => {
  onSessionExpired = fn;
};

function buildUrl(path, query) {
  const url = `${BASE}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function send(path, { method = 'GET', body, query, auth = true } = {}) {
  const headers = { Accept: 'application/json' };
  // A FormData body (file upload) sets its own multipart Content-Type with the boundary.
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let res;
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      headers,
      credentials: 'include',
      body: body === undefined || isForm ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      0,
      'NETWORK',
      'Cannot reach the server. Check your connection and try again.',
    );
  }

  if (res.status === 204) return { res, json: null };
  let json = null;
  try {
    json = await res.json();
  } catch {
    // non-JSON body
  }
  return { res, json };
}

function toError(res, json) {
  const e = json?.error;
  return new ApiError(
    res.status,
    e?.code ?? 'UNKNOWN',
    e?.message ?? `Request failed (${res.status})`,
    e?.details,
  );
}

/** Exchange the refresh cookie for a new access token. Concurrent calls share one request. */
export function refreshSession() {
  refreshInFlight ??= (async () => {
    const { res, json } = await send('/auth/refresh', { method: 'POST', auth: false });
    if (!res.ok) {
      accessToken = null;
      throw toError(res, json);
    }
    accessToken = json.data.accessToken;
    return json.data;
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

/**
 * Perform a request and return `data` (plus `meta` when requested).
 * On a 401 for an authenticated call it refreshes the session once and retries.
 */
export async function api(path, options = {}) {
  const { auth = true, withMeta = false } = options;
  let { res, json } = await send(path, options);

  if (res.status === 401 && auth && path !== '/auth/refresh') {
    try {
      await refreshSession();
    } catch {
      onSessionExpired();
      throw toError(res, json);
    }
    ({ res, json } = await send(path, options));
  }

  if (!res.ok) throw toError(res, json);
  if (json === null) return null;
  return withMeta ? { data: json.data, meta: json.meta } : json.data;
}
