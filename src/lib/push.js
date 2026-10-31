// Web push in this browser (API ADR 0004). The server holds the subscription; this file only asks
// the browser for permission and a subscription, and says why push cannot work where it cannot.
import { api } from './api/client.js';

const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent);
const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;

/**
 * What this browser can do: 'ok', 'ios-install' (iPhone: add to Home Screen first),
 * 'unsupported' or 'denied' (blocked in the browser's settings).
 */
export function pushSupport() {
  if (typeof window === 'undefined') return 'unsupported';
  if (isIos() && !isStandalone()) return 'ios-install';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window))
    return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  return 'ok';
}

/** The VAPID key as the bytes pushManager.subscribe wants. */
function keyBytes(base64url) {
  const b64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function registration() {
  return (
    (await navigator.serviceWorker.getRegistration()) ??
    (await navigator.serviceWorker.register('/sw.js'))
  );
}

/** This browser's current subscription, or null. */
export async function currentSubscription() {
  if (pushSupport() !== 'ok') return null;
  return (await registration()).pushManager.getSubscription();
}

/** Ask permission, subscribe, and tell the server. Returns the new settings. */
export async function turnOnPush(publicKey) {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(
      permission === 'denied'
        ? 'Notifications are blocked for this site. Allow them in the browser settings.'
        : 'Notifications were not allowed.',
    );
  }
  const reg = await registration();
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(publicKey),
    }));
  return api('/push/subscriptions', { method: 'POST', body: sub.toJSON() });
}

/** Stop notifications on this browser only. */
export async function turnOffPush() {
  const sub = await currentSubscription();
  if (!sub) return null;
  const settings = await api('/push/subscriptions', {
    method: 'DELETE',
    body: { endpoint: sub.endpoint },
  });
  await sub.unsubscribe();
  return settings;
}
