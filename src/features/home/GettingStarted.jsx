import { useQuery } from '@tanstack/react-query';
import { cn } from 'cn';
import { Check, Circle } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card } from '../../components/ui/index.jsx';
import { api } from '../../lib/api/client.js';
import { can } from '../../lib/food.js';
import { useHousehold } from '../household/hooks.js';

// Hiding the list is a per-browser convenience; it may be lost (private window) and that is fine.
const hiddenKey = (userId) => `usefirst.gettingStarted.hidden.${userId}`;
const readHidden = (userId) => {
  try {
    return localStorage.getItem(hiddenKey(userId)) === '1';
  } catch {
    return false;
  }
};

const installed = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true);

/**
 * The first steps for a new household: food in, family in, the daily summary on, the app on the
 * phone. Each step ticks itself off from real data; the card goes when all are done or hidden.
 */
export function GettingStarted({ user, total, onAddFood }) {
  const household = useHousehold();
  const settings = useQuery({
    queryKey: ['push', 'settings'],
    queryFn: () => api('/push/settings'),
  });
  const [hidden, setHidden] = useState(() => readHidden(user.id));
  if (hidden || household.isPending || settings.isPending) return null;

  const s = settings.data;
  const summaryOn =
    Boolean(s) &&
    s.enabled &&
    (s.devices > 0 || (s.email && Boolean(s.emailAddress) && s.available.email));

  const steps = [
    can(user, 'member') && {
      id: 'food',
      done: total > 0,
      title: 'Add what is in your fridge, freezer and pantry',
      action: (
        <Button size="sm" variant="secondary" onClick={onAddFood}>
          Add food
        </Button>
      ),
    },
    user.role === 'admin' && {
      id: 'family',
      done: (household.data?.members.length ?? 0) > 1,
      title: 'Add your family, each with their own sign-in',
      action: (
        <Link to="/admin" className="text-sm underline">
          Households & people
        </Link>
      ),
    },
    {
      id: 'summary',
      done: summaryOn,
      title: 'Get the daily "use these first" summary by email or notification',
      action: (
        <Link to="/settings" className="text-sm underline">
          Settings
        </Link>
      ),
    },
    {
      id: 'install',
      done: installed() || (s?.devices ?? 0) > 0,
      title: 'Put UseFirst on your phone',
      hint: 'Chrome: menu, "Install app". iPhone Safari: Share, "Add to Home Screen".',
    },
  ].filter(Boolean);

  if (steps.every((st) => st.done)) return null;
  const left = steps.filter((st) => !st.done).length;

  const hide = () => {
    try {
      localStorage.setItem(hiddenKey(user.id), '1');
    } catch {
      // not saved: it shows again next time, which is harmless
    }
    setHidden(true);
  };

  return (
    <Card className="space-y-3" role="region" aria-label="Getting started">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold">Getting started</h2>
          <p className="text-sm text-muted-foreground">
            {left} {left === 1 ? 'step' : 'steps'} left
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={hide}>
          Hide
        </Button>
      </div>
      <ul className="space-y-3">
        {steps.map((st) => (
          <li key={st.id} className="flex items-start gap-3">
            {st.done ? (
              <Check className="mt-0.5 size-5 shrink-0 text-positive" aria-label="Done" />
            ) : (
              <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-label="To do" />
            )}
            <div className="min-w-0 flex-1 space-y-1">
              <p className={cn('text-sm', st.done && 'text-muted-foreground line-through')}>
                {st.title}
              </p>
              {!st.done && st.hint && <p className="text-xs text-muted-foreground">{st.hint}</p>}
            </div>
            {!st.done && st.action}
          </li>
        ))}
      </ul>
    </Card>
  );
}
