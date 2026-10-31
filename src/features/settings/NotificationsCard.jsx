import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Button, Card, ErrorNotice, Select } from '../../components/ui/index.jsx';
import { api } from '../../lib/api/client.js';
import { currentSubscription, pushSupport, turnOffPush, turnOnPush } from '../../lib/push.js';

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const hourText = (h) =>
  new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(
    new Date(2026, 0, 1, h),
  );

const WHY_NOT = {
  'ios-install':
    'On iPhone, notifications work once Food Storage is on your Home Screen: tap Share, then "Add to Home Screen", and open it from there.',
  unsupported: 'This browser cannot show notifications.',
  denied:
    'Notifications are blocked for this site. Allow them in the browser settings, then reload.',
};

/** Your daily "use these first" message: on this device, at which hour, and a test. */
export function NotificationsCard() {
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
  const fail = on.error ?? off.error ?? patch.error ?? test.error ?? settings.error;

  const body = () => {
    if (key.isPending || settings.isPending) return <p className="text-sm">Loading…</p>;
    if (!key.data?.enabled)
      return (
        <p className="text-sm text-muted-foreground">
          Notifications are not set up on the server yet.
        </p>
      );
    if (support !== 'ok')
      return <p className="text-sm text-muted-foreground">{WHY_NOT[support]}</p>;
    const s = settings.data;
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Once a day, what expires today and in the next 3 days. Nothing on days with nothing to use
          up.
        </p>
        {here ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" loading={test.isPending} onClick={() => test.mutate()}>
              Send a test
            </Button>
            <Button
              variant="ghost"
              loading={off.isPending}
              onClick={() => off.mutate(undefined, { onSuccess: () => setHere(false) })}
            >
              Turn off on this device
            </Button>
          </div>
        ) : (
          <Button
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
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span>Daily message</span>
            <Select
              value={s.enabled ? 'on' : 'off'}
              onChange={(e) => patch.mutate({ enabled: e.target.value === 'on' })}
            >
              <option value="on">On</option>
              <option value="off">Off on all my devices</option>
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
        <p className="text-xs text-muted-foreground">
          {s.devices === 0
            ? 'No devices yet.'
            : `${s.devices} ${s.devices === 1 ? 'device' : 'devices'} get it.`}{' '}
          {"The time is your household's time."}
        </p>
      </div>
    );
  };

  return (
    <Card className="space-y-2">
      <h2 className="font-semibold">Notifications</h2>
      {fail && <ErrorNotice error={fail} />}
      {body()}
    </Card>
  );
}
