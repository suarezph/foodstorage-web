import { useState } from 'react';
import { Card, EmptyState, ErrorNotice, PageHeader, Spinner } from '../../components/ui/index.jsx';
import { localIso } from '../../lib/food.js';
import { useStock } from './hooks.js';
import { ItemDialog } from './ItemDialog.jsx';
import { StockRow } from './StockRow.jsx';

/** Whole months from `from` to `to` (YYYY-MM-DD), counting a month only once the day is reached. */
export function monthsBetween(from, to) {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  return Math.max(0, (ty - fy) * 12 + (tm - fm) - (td < fd ? 1 : 0));
}

const GROUPS = [
  [0, 'This month'],
  [1, '1-2 months ago'],
  [3, '3-5 months ago'],
  [6, '6 months or more'],
];

export const frozenText = (months) =>
  months === 0 ? 'Frozen this month' : `Frozen ${months} ${months === 1 ? 'month' : 'months'} ago`;

/**
 * Everything in every freezer, grouped by how long ago it went in (oldest first within a group),
 * so old food is found before it is forgotten.
 */
export function FreezerPage() {
  const list = useStock({ status: 'active', placeKind: 'freezer' });
  const [openId, setOpenId] = useState(null);
  const today = localIso();

  const header = (
    <PageHeader title="Freezer" description="What is frozen, and how long ago it went in." />
  );
  if (list.isPending)
    return (
      <>
        {header}
        <Spinner />
      </>
    );
  if (list.error)
    return (
      <>
        {header}
        <ErrorNotice error={list.error} onRetry={list.refetch} />
      </>
    );

  const items = list.data
    .map((i) => ({ ...i, months: monthsBetween(i.placedOn ?? i.addedOn, today) }))
    .sort((a, b) => (a.placedOn ?? a.addedOn).localeCompare(b.placedOn ?? b.addedOn));
  const groups = GROUPS.map(([min], g) => {
    const max = GROUPS[g + 1]?.[0] ?? Infinity;
    return items.filter((i) => i.months >= min && i.months < max);
  });

  return (
    <>
      {header}
      {items.length === 0 ? (
        <EmptyState title="Nothing in the freezer">
          Food moved or added to a freezer shows here.
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {GROUPS.map(([, label], g) =>
            groups[g].length ? (
              <Card key={label} className="p-2">
                <h2 className="px-2 pt-2 pb-1 font-semibold">{label}</h2>
                <ul className="divide-y">
                  {groups[g].map((item) => (
                    <StockRow
                      key={item.id}
                      item={item}
                      onOpen={setOpenId}
                      extra={frozenText(item.months)}
                    />
                  ))}
                </ul>
              </Card>
            ) : null,
          )}
        </div>
      )}
      <ItemDialog id={openId} onClose={() => setOpenId(null)} />
    </>
  );
}
