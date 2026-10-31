import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useAuth } from '../../app/AuthContext.jsx';
import { Button, Card, ErrorNotice, Select } from '../../components/ui/index.jsx';
import { api } from '../../lib/api/client.js';
import { can } from '../../lib/food.js';
import { currentSubscription, pushSupport, turnOffPush, turnOnPush } from '../../lib/push.js';

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const hourText = (h) =>
  new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(
    new Date(2026, 0, 1, h),
  );

const WHY_NOT = {
  'ios-install':
    'On iPhone, notifications work once UseFirst is on your Home Screen: tap Share, then "Add to Home Screen", and open it from there.',
  unsupported: 'This browser cannot show notifications.',
  denied:
    'Notifications are blocked for this site. Allow them in the browser settings, then reload.',
};

const Check = ({ checked, onChange, disabled, children }) => (
  <label className="flex items-center gap-2 text-sm">
    <input
      type="checkbox"
      className="size-4 accent-primary"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
    />
    {children}
  </label>
);

/**
 * Your daily "use these first" summary (API ADR 0004, 0007): on or off, the hour, and the ways it
 * comes: email, push to this device, or both.
 */
export function NotificationsCard() {
  const { user } = useAuth();
  // Test messages are for whoever sets the family up (the API allows managers only).
  const tester = can(user, 'manager');
  const qc = useQueryClient();
  const key = useQuery({ queryKey: ['push', 'key'], queryFn: () => api('/push/key') });
  const settings = useQuery({
    queryKey: ['push', 'settings'],
    queryFn: () => api('/push/settings'),
  });
  const [support] = useState(pushSupport);
  const [here, setHere] = useState(null); // is this browser subscribed?

  useEffect(() => {
    currentSubscription()
      .then((s) => setHere(Boolean(s)))
      .catch(() => setHere(false));
  }, []);

  const save = (data) => qc.setQueryData(['push', 'settings'], data);
  const on = useMutation({ mutationFn: () => turnOnPush(key.data.publicKey), onSuccess: save });
  const off = useMutation({ mutationFn: turnOffPush, onSuccess: (d) => d && save(d) });
  const patch = useMutation({
    mutationFn: (body) => api('/push/settings', { method: 'PATCH', body }),
    onSuccess: save,
  });
  const test = useMutation({ mutationFn: () => api('/push/test', { method: 'POST' }) });
  const testEmail = useMutation({
    mutationFn: () => api('/push/test-email', { method: 'POST' }),
  });
  const fail =
    on.error ?? off.error ?? patch.error ?? test.error ?? testEmail.error ?? settings.error;

  const body = () => {
    if (key.isPending || settings.isPending) return <p className="text-sm">Loading…</p>;
    const s = settings.data;
    if (!s) return null;
    const pushReady = key.data?.enabled && support === 'ok';
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Once a day, what expires today and in the next 3 days. Nothing on days with nothing to use
          up.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span>Daily summary</span>
            <Select
              value={s.enabled ? 'on' : 'off'}
              onChange={(e) => patch.mutate({ enabled: e.target.value === 'on' })}
            >
              <option value="on">On</option>
              <option value="off">Off</option>
            </Select>
          </label>
          <label className="space-y-1 text-sm">
            <span>At</span>
            <Select
              value={s.hour}
              onChange={(e) => patch.mutate({ hour: Number(e.target.value) })}
              disabled={!s.enabled}
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {hourText(h)}
                </option>
              ))}
            </Select>
          </label>
        </div>

        <section className="space-y-2" aria-label="By email">
          <h3 className="text-sm font-medium">By email</h3>
          {!s.available.email ? (
            <p className="text-sm text-muted-foreground">Email is not set up on the server yet.</p>
          ) : !s.emailAddress ? (
            <p className="text-sm text-muted-foreground">
              Your account has no email address. Ask the administrator to add one.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <Check
                checked={s.email}
                disabled={!s.enabled}
                onChange={(email) => patch.mutate({ email })}
              >
                Email it to {s.emailAddress}
              </Check>
              {tester && (
                <Button
                  variant="secondary"
                  size="sm"
                  loading={testEmail.isPending}
                  onClick={() => testEmail.mutate()}
                >
                  Send a test email
                </Button>
              )}
            </div>
          )}
          {testEmail.data && (
            <p role="status" className="text-sm text-positive">
              Sent. Check your inbox (and spam, the first time).
            </p>
          )}
        </section>

        <section className="space-y-2" aria-label="As a notification">
          <h3 className="text-sm font-medium">As a notification</h3>
          {!key.data?.enabled ? (
            <p className="text-sm text-muted-foreground">
              Notifications are not set up on the server yet.
            </p>
          ) : support !== 'ok' ? (
            <p className="text-sm text-muted-foreground">{WHY_NOT[support]}</p>
          ) : null}
          {pushReady && (
            <>
              <Check
                checked={s.push}
                disabled={!s.enabled}
                onChange={(push) => patch.mutate({ push })}
              >
                Send it to my devices
              </Check>
              {here ? (
                <div className="flex flex-wrap gap-2">
                  {tester && (
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={test.isPending}
                      onClick={() => test.mutate()}
                    >
                      Send a test
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={off.isPending}
                    onClick={() => off.mutate(undefined, { onSuccess: () => setHere(false) })}
                  >
                    Turn off on this device
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  loading={on.isPending}
                  onClick={() => on.mutate(undefined, { onSuccess: () => setHere(true) })}
                >
                  Turn on for this device
                </Button>
              )}
              {test.data && (
                <p role="status" className="text-sm text-positive">
                  Sent to {test.data.sent} {test.data.sent === 1 ? 'device' : 'devices'}.
                </p>
              )}
            </>
          )}
          <p className="text-xs text-muted-foreground">
            {s.devices === 0
              ? 'No devices yet.'
              : `${s.devices} ${s.devices === 1 ? 'device' : 'devices'} get notifications.`}{' '}
            {"The time is your household's time."}
          </p>
        </section>
      </div>
    );
  };

  return (
    <Card className="space-y-2">
      <h2 className="font-semibold">Daily summary</h2>
      {fail && <ErrorNotice error={fail} />}
      {body()}
    </Card>
  );
}
