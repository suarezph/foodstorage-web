import { useState } from 'react';
import { useAuth } from '../../app/AuthContext.jsx';
import {
  Button,
  Dialog,
  ErrorNotice,
  Field,
  Input,
  Select,
  Spinner,
} from '../../components/ui/index.jsx';
import { can, formatDay, formatQuantity, UNITS } from '../../lib/food.js';
import { usePlaces } from '../household/hooks.js';
import { useAction, useDeleteItem, useEditItem, useItem } from './hooks.js';
import { UrgencyBadge } from './StockRow.jsx';

const EVENT_TEXT = {
  added: 'Added',
  used: 'Used',
  opened: 'Opened',
  moved: 'Moved',
  edited: 'Corrected',
  finished: 'Finished',
  discarded: 'Thrown away',
};

const time = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

function Facts({ item }) {
  const rows = [
    ['Amount', formatQuantity(item.quantity, item.unit)],
    ['Kept in', item.place.name],
    ['Category', item.food.category?.name ?? 'None'],
    [
      item.dateKind === 'best_before' ? 'Best before' : 'Use by',
      `${formatDay(item.expiresOn)}${item.expiresEstimated ? ' (estimated)' : ''}`,
    ],
    item.openedOn && [
      'Opened',
      `${formatDay(item.openedOn)}${item.openedExpiresOn ? `, use by ${formatDay(item.openedExpiresOn)}` : ''}`,
    ],
    ['Added', `${formatDay(item.addedOn)}${item.addedBy ? ` by ${item.addedBy}` : ''}`],
    item.notes && ['Notes', item.notes],
  ].filter(Boolean);
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted-foreground">{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** One batch: what it is, what to do with it, and what happened to it. */
export function ItemDialog({ id, onClose }) {
  const { user } = useAuth();
  const { data: item, isPending, error } = useItem(id);
  const { data: places = [] } = usePlaces();
  const action = useAction();
  const edit = useEditItem();
  const del = useDeleteItem();
  const [mode, setMode] = useState(null);
  const [value, setValue] = useState({});

  const isMember = can(user, 'member');
  const isManager = can(user, 'manager');
  const active = item?.status === 'active';
  const busy = action.isPending || edit.isPending || del.isPending;
  const fail = action.error ?? edit.error ?? del.error;

  const close = () => {
    setMode(null);
    action.reset();
    edit.reset();
    del.reset();
    onClose();
  };
  const start = (m, initial = {}) => {
    action.reset();
    edit.reset();
    setValue(initial);
    setMode(m);
  };
  const run = async (name, body) => {
    try {
      const updated = await action.mutateAsync({ id, action: name, body });
      setMode(null);
      // Finished or thrown away: nothing more to do here.
      if (updated.status !== 'active') close();
    } catch {
      // shown from action.error
    }
  };

  return (
    <Dialog open={Boolean(id)} onClose={close} title={item?.food.name ?? 'Food'}>
      {isPending ? (
        <Spinner />
      ) : error ? (
        <ErrorNotice error={error} />
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <UrgencyBadge item={item} />
            {item.dateKind === 'use_by' && item.urgency?.level === 'expired' && (
              <span className="text-sm font-medium text-negative">Do not eat</span>
            )}
          </div>
          <Facts item={item} />
          {fail && <ErrorNotice error={fail} />}

          {active && isMember && mode === null && (
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => start('use', { quantity: '1' })}>Use some</Button>
              <Button variant="secondary" onClick={() => run('finish')} disabled={busy}>
                All used
              </Button>
              {!item.openedOn && (
                <Button variant="secondary" onClick={() => run('open')} disabled={busy}>
                  Opened today
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => start('move', { placeId: item.place.id, expiresOn: '' })}
              >
                Move
              </Button>
              <Button variant="danger" onClick={() => start('discard', { reason: 'expired' })}>
                Thrown away
              </Button>
              {isManager && (
                <Button
                  variant="ghost"
                  onClick={() =>
                    start('edit', {
                      name: item.food.name,
                      quantity: String(item.quantity),
                      unit: item.unit,
                      expiresOn: item.expiresOn,
                    })
                  }
                >
                  Correct
                </Button>
              )}
            </div>
          )}

          {mode === 'use' && (
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                run('use', { quantity: Number(value.quantity) });
              }}
            >
              <div className="flex-1">
                <Field
                  label={`How much (${item.unit}, ${formatQuantity(item.quantity, item.unit)} left)`}
                >
                  {(p) => (
                    <Input
                      {...p}
                      type="number"
                      inputMode="decimal"
                      min="0.01"
                      step="any"
                      value={value.quantity}
                      onChange={(e) => setValue({ quantity: e.target.value })}
                      autoFocus
                    />
                  )}
                </Field>
              </div>
              <Button type="submit" loading={busy}>
                Use
              </Button>
              <Button variant="ghost" onClick={() => setMode(null)}>
                Cancel
              </Button>
            </form>
          )}

          {mode === 'move' && (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                run('move', {
                  placeId: value.placeId,
                  ...(value.expiresOn ? { expiresOn: value.expiresOn } : {}),
                });
              }}
            >
              <Field label="Move to">
                {(p) => (
                  <Select
                    {...p}
                    value={value.placeId}
                    onChange={(e) => setValue((v) => ({ ...v, placeId: e.target.value }))}
                  >
                    {places.map((pl) => (
                      <option key={pl.id} value={pl.id}>
                        {pl.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field
                label="New date (optional)"
                hint="Freezing usually gives food a new, later date."
              >
                {(p) => (
                  <Input
                    {...p}
                    type="date"
                    value={value.expiresOn}
                    onChange={(e) => setValue((v) => ({ ...v, expiresOn: e.target.value }))}
                  />
                )}
              </Field>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setMode(null)}>
                  Cancel
                </Button>
                <Button type="submit" loading={busy}>
                  Move
                </Button>
              </div>
            </form>
          )}

          {mode === 'discard' && (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                run('discard', { reason: value.reason });
              }}
            >
              <Field label="Why">
                {(p) => (
                  <Select
                    {...p}
                    value={value.reason}
                    onChange={(e) => setValue({ reason: e.target.value })}
                  >
                    <option value="expired">It expired</option>
                    <option value="spoiled">It went bad early</option>
                    <option value="other">Something else</option>
                  </Select>
                )}
              </Field>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setMode(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="danger" loading={busy}>
                  Thrown away
                </Button>
              </div>
            </form>
          )}

          {mode === 'edit' && (
            <form
              className="space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await edit.mutateAsync({
                    id,
                    name: value.name.trim(),
                    quantity: Number(value.quantity),
                    unit: value.unit,
                    ...(value.expiresOn ? { expiresOn: value.expiresOn } : {}),
                  });
                  setMode(null);
                } catch {
                  // shown from edit.error
                }
              }}
            >
              <Field label="Name">
                {(p) => (
                  <Input
                    {...p}
                    value={value.name}
                    onChange={(e) => setValue((v) => ({ ...v, name: e.target.value }))}
                  />
                )}
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Amount left">
                  {(p) => (
                    <Input
                      {...p}
                      type="number"
                      inputMode="decimal"
                      step="any"
                      value={value.quantity}
                      onChange={(e) => setValue((v) => ({ ...v, quantity: e.target.value }))}
                    />
                  )}
                </Field>
                <Field label="Unit">
                  {(p) => (
                    <Select
                      {...p}
                      value={value.unit}
                      onChange={(e) => setValue((v) => ({ ...v, unit: e.target.value }))}
                    >
                      {[...new Set([value.unit, ...UNITS])].map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              </div>
              <Field label="Date on the package">
                {(p) => (
                  <Input
                    {...p}
                    type="date"
                    value={value.expiresOn}
                    onChange={(e) => setValue((v) => ({ ...v, expiresOn: e.target.value }))}
                  />
                )}
              </Field>
              <div className="flex flex-wrap justify-between gap-2">
                <Button
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => setMode('delete')}
                >
                  Delete (entered by mistake)
                </Button>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setMode(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" loading={busy}>
                    Save
                  </Button>
                </div>
              </div>
            </form>
          )}

          {mode === 'delete' && (
            <div className="space-y-3 rounded-lg border border-destructive/40 p-3">
              <p className="text-sm">
                Delete this entry and its history? Use this only for mistakes; for food that was
                eaten or thrown away, use All used or Thrown away.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setMode(null)}>
                  Keep it
                </Button>
                <Button
                  variant="danger"
                  loading={busy}
                  onClick={async () => {
                    try {
                      await del.mutateAsync(id);
                      close();
                    } catch {
                      // shown from del.error
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          )}

          <section aria-label="History">
            <h3 className="mb-2 text-sm font-medium">History</h3>
            <ol className="space-y-1 text-sm text-muted-foreground">
              {item.events.map((ev) => (
                <li key={ev.id}>
                  {EVENT_TEXT[ev.kind]}
                  {ev.quantity !== null &&
                    ev.kind !== 'discarded' &&
                    ` ${formatQuantity(ev.quantity, item.unit)}`}
                  {ev.note && ev.kind === 'moved' && ` ${ev.note}`}
                  {ev.by && ` by ${ev.by}`} · {time.format(new Date(ev.at))}
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </Dialog>
  );
}
