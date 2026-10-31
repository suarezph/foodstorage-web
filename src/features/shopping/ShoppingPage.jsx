import { cn } from 'cn';
import { PackageCheck, Plus, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useAuth } from '../../app/AuthContext.jsx';
import {
  Button,
  Card,
  EmptyState,
  ErrorNotice,
  Input,
  PageHeader,
  Spinner,
} from '../../components/ui/index.jsx';
import { can, formatQuantity } from '../../lib/food.js';
import { AddFoodDialog } from '../stock/AddFoodDialog.jsx';
import { useFoods } from '../stock/hooks.js';
import {
  useAddShopping,
  useClearBought,
  useDeleteShopping,
  useShopping,
  useUpdateShopping,
} from './hooks.js';

/**
 * The household's shopping list: tick things off in the shop, then "Put away" opens Add food filled
 * in. Staples running low are suggested; finished or thrown-away food can be added from the item.
 */
export function ShoppingPage() {
  const { user } = useAuth();
  const list = useShopping();
  // Loaded now so "Put away" can fill in a known food's category, unit and place at once.
  useFoods();
  const add = useAddShopping();
  const update = useUpdateShopping();
  const del = useDeleteShopping();
  const clear = useClearBought();
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  // A bought item being put away: Add food opens filled in; once added it leaves the list.
  const [putAway, setPutAway] = useState(null);
  const removed = useRef(null);
  const onPutAway = () => {
    if (putAway && removed.current !== putAway.id) {
      removed.current = putAway.id;
      del.mutate(putAway.id);
    }
  };
  const isMember = can(user, 'member');
  const fail = add.error ?? update.error ?? del.error ?? clear.error;

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await add.mutateAsync({ name: name.trim(), ...(note.trim() ? { note: note.trim() } : {}) });
      setName('');
      setNote('');
    } catch {
      // shown from add.error
    }
  };

  const items = list.data?.items ?? [];
  const toBuy = items.filter((i) => !i.done);
  const bought = items.filter((i) => i.done);
  const suggestions = list.data?.suggestions ?? [];

  return (
    <>
      <PageHeader title="Shopping list" description="Tick things off as they go in the basket." />
      {fail && <ErrorNotice error={fail} />}

      {isMember && (
        <form onSubmit={submit} className="mb-4 flex flex-wrap gap-2">
          <Input
            aria-label="What to buy"
            placeholder="What to buy"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            className="min-w-40 flex-[2]"
          />
          <Input
            aria-label="How much (optional)"
            placeholder="How much (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={120}
            className="min-w-32 flex-1"
          />
          <Button type="submit" loading={add.isPending}>
            <Plus aria-hidden="true" /> Add
          </Button>
        </form>
      )}

      {list.isPending ? (
        <Spinner />
      ) : list.error ? (
        <ErrorNotice error={list.error} onRetry={list.refetch} />
      ) : (
        <div className="space-y-4">
          {suggestions.length > 0 && (
            <Card className="space-y-2">
              <h2 className="font-semibold">Running low</h2>
              <ul className="space-y-1">
                {suggestions.map((s) => (
                  <li key={s.foodId} className="flex items-center justify-between gap-2 text-sm">
                    <span>
                      {s.name}{' '}
                      <span className="text-muted-foreground">
                        ({formatQuantity(s.have, s.unit)} left, keep{' '}
                        {formatQuantity(s.keepAtLeast, s.unit)})
                      </span>
                    </span>
                    {isMember && (
                      <Button
                        variant="secondary"
                        onClick={() => add.mutate({ name: s.name, foodId: s.foodId })}
                        disabled={add.isPending}
                      >
                        Add {s.name}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {toBuy.length === 0 && bought.length === 0 ? (
            <EmptyState title="Nothing to buy">
              {isMember
                ? 'Add things here, or tick "Add to the shopping list" when food is used up.'
                : 'The list is empty.'}
            </EmptyState>
          ) : (
            <Card className="p-2">
              <ul className="divide-y">
                {[...toBuy, ...bought].map((i) => (
                  <li key={i.id} className="flex items-center gap-3 px-2 py-2.5">
                    <input
                      type="checkbox"
                      className="size-5 accent-primary"
                      checked={i.done}
                      disabled={!isMember}
                      aria-label={`${i.done ? 'Bought' : 'To buy'}: ${i.name}`}
                      onChange={(e) => update.mutate({ id: i.id, done: e.target.checked })}
                    />
                    <div
                      className={cn(
                        'min-w-0 flex-1',
                        i.done && 'text-muted-foreground line-through',
                      )}
                    >
                      <p className="truncate">{i.name}</p>
                      {(i.note || i.addedBy) && (
                        <p className="truncate text-xs text-muted-foreground">
                          {[i.note, i.addedBy && `added by ${i.addedBy}`]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      )}
                    </div>
                    {isMember && i.done && (
                      <Button variant="secondary" size="sm" onClick={() => setPutAway(i)}>
                        <PackageCheck aria-hidden="true" /> Put away
                      </Button>
                    )}
                    {isMember && (
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Remove ${i.name}`}
                        onClick={() => del.mutate(i.id)}
                      >
                        <X aria-hidden="true" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {isMember && bought.length > 0 && (
            <Button variant="secondary" loading={clear.isPending} onClick={() => clear.mutate()}>
              Clear {bought.length} bought
            </Button>
          )}
        </div>
      )}

      {putAway && (
        <AddFoodDialog
          key={putAway.id}
          open
          prefill={{ name: putAway.name }}
          onAdded={onPutAway}
          onClose={() => setPutAway(null)}
        />
      )}
    </>
  );
}
