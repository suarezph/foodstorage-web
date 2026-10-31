import { cn } from 'cn';
import { Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../app/AuthContext.jsx';
import {
  Button,
  Card,
  EmptyState,
  ErrorNotice,
  Input,
  PageHeader,
  Select,
  Spinner,
} from '../../components/ui/index.jsx';
import { can } from '../../lib/food.js';
import { usePlaces } from '../household/hooks.js';
import { AddFoodDialog } from './AddFoodDialog.jsx';
import { useStock } from './hooks.js';
import { ItemDialog } from './ItemDialog.jsx';
import { StockRow } from './StockRow.jsx';

const URGENCY_LABEL = {
  expired: 'Expired',
  today: 'Today',
  soon: 'Next 3 days',
  week: 'This week',
  attention: 'Needs attention',
};

/** Everything in the household's places, the most urgent first. Filters live in the address. */
export function StoragePage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const placeId = params.get('place') ?? '';
  const status = params.get('status') ?? 'active';
  const urgency = params.get('urgency') ?? '';
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState(null);
  const { data: places = [] } = usePlaces();
  const list = useStock({
    status,
    placeId: placeId || undefined,
    urgency: urgency || undefined,
    q: q.trim() || undefined,
  });

  const setParam = (key, value) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );

  const chip = (active) =>
    cn(
      'shrink-0 rounded-full border px-3 py-1 text-sm transition-colors',
      active ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted',
    );

  return (
    <>
      <PageHeader
        title="Storage"
        description="What you have, the most urgent first."
        actions={
          can(user, 'member') && (
            <Button onClick={() => setAdding(true)}>
              <Plus aria-hidden="true" /> Add food
            </Button>
          )
        }
      />

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Place">
        <button
          type="button"
          className={chip(!placeId)}
          aria-pressed={!placeId}
          onClick={() => setParam('place', '')}
        >
          All
        </button>
        {/* Medicine has its own page (ADR 0008): the cabinet is not a food place. */}
        {places
          .filter((p) => p.kind !== 'cabinet')
          .map((p) => (
            <button
              key={p.id}
              type="button"
              className={chip(placeId === p.id)}
              aria-pressed={placeId === p.id}
              onClick={() => setParam('place', p.id)}
            >
              {p.name}
              {status === 'active' && <span className="ml-1 opacity-70">{p.activeCount}</span>}
            </button>
          ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-48 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            aria-label="Search food"
            placeholder="Search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select
          aria-label="Show"
          className="w-auto"
          value={status}
          onChange={(e) => setParam('status', e.target.value === 'active' ? '' : e.target.value)}
        >
          <option value="active">In storage</option>
          <option value="finished">Finished</option>
          <option value="discarded">Thrown away</option>
        </Select>
      </div>

      {urgency && status === 'active' && (
        <p className="mb-3 text-sm">
          Showing: <strong>{URGENCY_LABEL[urgency]}</strong>{' '}
          <button type="button" className="underline" onClick={() => setParam('urgency', '')}>
            Show all
          </button>
        </p>
      )}

      {list.isPending ? (
        <Spinner />
      ) : list.error ? (
        <ErrorNotice error={list.error} onRetry={list.refetch} />
      ) : list.data.length === 0 ? (
        <EmptyState title={q || urgency || placeId ? 'Nothing matches' : 'Nothing here yet'}>
          {status === 'active' &&
            can(user, 'member') &&
            !q &&
            'Add what is in your fridge, freezer and pantry.'}
        </EmptyState>
      ) : (
        <Card className="p-2">
          <ul className="divide-y">
            {list.data.map((item) => (
              <StockRow key={item.id} item={item} onOpen={setOpenId} showPlace={!placeId} />
            ))}
          </ul>
        </Card>
      )}

      <AddFoodDialog
        open={adding}
        onClose={() => setAdding(false)}
        defaultPlaceId={placeId || undefined}
      />
      <ItemDialog id={openId} onClose={() => setOpenId(null)} />
    </>
  );
}
