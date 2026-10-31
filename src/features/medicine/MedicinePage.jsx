import { cn } from 'cn';
import { Plus, Search } from 'lucide-react';
import { useState } from 'react';
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
import { useHousehold } from '../household/hooks.js';
import { AddFoodDialog } from '../stock/AddFoodDialog.jsx';
import { useStock, useSummary } from '../stock/hooks.js';
import { ItemDialog } from '../stock/ItemDialog.jsx';
import { StockRow } from '../stock/StockRow.jsx';

const TILES = [
  ['expired', 'Expired', 'text-negative'],
  ['today', 'Expires today', 'text-negative'],
  ['soon', 'Next 14 days', 'text-warning'],
  ['total', 'In the cabinet', ''],
];

/**
 * Medicine (API ADR 0008): what the household has, who it is for, and what to replace. Flagged
 * from 14 days before its date. Members and managers only.
 */
export function MedicinePage() {
  const [status, setStatus] = useState('active');
  const [forUserId, setForUserId] = useState('');
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState(null);
  const summary = useSummary('medicine');
  const household = useHousehold();
  const list = useStock({
    kind: 'medicine',
    status,
    forUserId: forUserId || undefined,
    q: q.trim() || undefined,
  });
  const members = household.data?.members ?? [];

  return (
    <>
      <PageHeader
        title="Medicine"
        description="What you have, who it is for, and what to replace before it expires."
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus aria-hidden="true" /> Add medicine
          </Button>
        }
      />

      {summary.data && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TILES.map(([level, label, tone]) => (
            <div key={level} className="rounded-xl border bg-card p-4">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p
                className={cn(
                  'mt-1 text-3xl font-semibold tabular-nums',
                  summary.data.counts[level] > 0 && tone,
                )}
              >
                {summary.data.counts[level]}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-48 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            aria-label="Search medicine"
            placeholder="Search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select
          aria-label="For"
          className="w-auto"
          value={forUserId}
          onChange={(e) => setForUserId(e.target.value)}
        >
          <option value="">For anyone</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              For {m.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Show"
          className="w-auto"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="active">In the cabinet</option>
          <option value="finished">Used up</option>
          <option value="discarded">Thrown away</option>
        </Select>
      </div>

      {list.isPending ? (
        <Spinner />
      ) : list.error ? (
        <ErrorNotice error={list.error} onRetry={list.refetch} />
      ) : list.data.length === 0 ? (
        <EmptyState title={q || forUserId ? 'Nothing matches' : 'No medicine yet'}>
          {status === 'active' &&
            !q &&
            !forUserId &&
            'Add what is in your medicine cabinet and first-aid kit, with the date printed on the box.'}
        </EmptyState>
      ) : (
        <Card className="p-2">
          <ul className="divide-y">
            {list.data.map((item) => (
              <StockRow
                key={item.id}
                item={item}
                onOpen={setOpenId}
                extra={
                  [item.forUser && `For ${item.forUser.name}`, item.food.doseNote]
                    .filter(Boolean)
                    .join(' · ') || undefined
                }
              />
            ))}
          </ul>
        </Card>
      )}

      <AddFoodDialog kind="medicine" open={adding} onClose={() => setAdding(false)} />
      <ItemDialog id={openId} onClose={() => setOpenId(null)} />
    </>
  );
}
