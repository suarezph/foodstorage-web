import { cn } from 'cn';
import { ChefHat, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../app/AuthContext.jsx';
import {
  Button,
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
} from '../../components/ui/index.jsx';
import { can } from '../../lib/food.js';
import { AddFoodDialog } from '../stock/AddFoodDialog.jsx';
import { useSummary } from '../stock/hooks.js';
import { MedicineNotice } from './MedicineNotice.jsx';
import { ItemDialog } from '../stock/ItemDialog.jsx';
import { GettingStarted } from './GettingStarted.jsx';
import { IdeasDialog } from './IdeasDialog.jsx';
import { StockRow } from '../stock/StockRow.jsx';

const TILES = [
  ['expired', 'Expired', 'text-negative'],
  ['today', 'Use today', 'text-negative'],
  ['soon', 'Next 3 days', 'text-warning'],
  ['week', 'This week', ''],
];

/** What needs attention now: expired, today and the next 3 days, with one tap to act. */
export function HomePage() {
  const { user } = useAuth();
  const summary = useSummary();
  const [params, setParams] = useSearchParams();
  // The installed app's "Add food" shortcut opens /?add=1.
  const [adding, setAdding] = useState(() => params.get('add') === '1' && can(user, 'member'));
  const [openId, setOpenId] = useState(null);
  const [ideas, setIdeas] = useState(false);
  const stopAdding = () => {
    setAdding(false);
    if (params.has('add')) setParams({}, { replace: true });
  };

  const header = (
    <PageHeader
      title={`Hi, ${user.name}`}
      description={user.household.name}
      actions={
        can(user, 'member') && (
          <>
            <Button variant="secondary" onClick={() => setIdeas(true)}>
              <ChefHat aria-hidden="true" /> What can I cook?
            </Button>
            <Button onClick={() => setAdding(true)}>
              <Plus aria-hidden="true" /> Add food
            </Button>
          </>
        )
      }
    />
  );

  if (summary.isPending)
    return (
      <>
        {header}
        <Spinner />
      </>
    );
  if (summary.error)
    return (
      <>
        {header}
        <ErrorNotice error={summary.error} onRetry={summary.refetch} />
      </>
    );

  const { counts, attention, today } = summary.data;

  return (
    <div className="space-y-4">
      {header}
      <GettingStarted user={user} total={counts.total} onAddFood={() => setAdding(true)} />
      {can(user, 'member') && <MedicineNotice />}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TILES.map(([level, label, tone]) => (
          <Link
            key={level}
            to={`/storage?urgency=${level}`}
            className="rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50"
          >
            <p className="text-sm text-muted-foreground">{label}</p>
            <p
              className={cn('mt-1 text-3xl font-semibold tabular-nums', counts[level] > 0 && tone)}
            >
              {counts[level]}
            </p>
          </Link>
        ))}
      </div>

      {counts.total === 0 ? (
        <EmptyState title="Your storage is empty">
          {can(user, 'member')
            ? 'Add what is in your fridge, freezer and pantry. A date is suggested when the package has none.'
            : 'Nothing has been added yet.'}
        </EmptyState>
      ) : (
        <Card className="p-2">
          <div className="flex items-center justify-between px-2 pt-2 pb-1">
            <h2 className="font-semibold">Use these first</h2>
            <Link to="/storage" className="text-sm text-muted-foreground hover:text-foreground">
              All {counts.total} in storage
            </Link>
          </div>
          {attention.length === 0 ? (
            <p className="px-2 py-4 text-sm text-muted-foreground">
              Nothing expires in the next 3 days.
            </p>
          ) : (
            <ul className="divide-y">
              {attention.map((item) => (
                <StockRow key={item.id} item={item} today={today} onOpen={setOpenId} />
              ))}
            </ul>
          )}
        </Card>
      )}

      <AddFoodDialog open={adding} onClose={stopAdding} />
      <ItemDialog id={openId} onClose={() => setOpenId(null)} />
      <IdeasDialog open={ideas} onClose={() => setIdeas(false)} />
    </div>
  );
}
