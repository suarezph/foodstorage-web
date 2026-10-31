import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Select,
  Spinner,
} from '../../components/ui/index.jsx';
import { api } from '../../lib/api/client.js';

const REASON = { expired: 'It expired', spoiled: 'It went bad early', other: 'Something else' };
const monthName = (ym) =>
  new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' }).format(
    new Date(`${ym}-01T00:00:00`),
  );

/** A row with a bar; the number is always written too (never the bar alone). */
function Bar({ label, value, max, tone = 'bg-negative' }) {
  return (
    <li className="space-y-1 text-sm">
      <div className="flex justify-between gap-2">
        <span className="truncate">{label}</span>
        <span className="tabular-nums">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div
          className={`h-2 rounded-full ${tone}`}
          style={{ width: `${max ? (value / max) * 100 : 0}%` }}
        />
      </div>
    </li>
  );
}

/** What gets thrown away against what gets eaten, counted in batches. */
export function WastePage() {
  const [months, setMonths] = useState(3);
  const report = useQuery({
    queryKey: ['reports', 'waste', months],
    queryFn: () => api('/reports/waste', { query: { months } }),
  });
  const r = report.data;

  return (
    <>
      <PageHeader
        title="Waste"
        description="What was thrown away, so you can buy less of it."
        actions={
          <Select
            aria-label="Period"
            className="w-auto"
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
          >
            <option value={1}>This month</option>
            <option value={3}>Last 3 months</option>
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
          </Select>
        }
      />
      {report.isPending ? (
        <Spinner />
      ) : report.error ? (
        <ErrorNotice error={report.error} onRetry={report.refetch} />
      ) : r.finished + r.discarded === 0 ? (
        <EmptyState title="Nothing used up yet">
          When food is finished or thrown away, this page shows how much was wasted.
        </EmptyState>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="space-y-1">
            <p className="text-sm text-muted-foreground">Thrown away</p>
            <p className="text-3xl font-semibold tabular-nums">{r.wastePercent}%</p>
            <p className="text-sm text-muted-foreground">
              {r.discarded} thrown away, {r.finished} eaten or used ({r.discarded + r.finished}{' '}
              items)
            </p>
          </Card>
          <Card className="space-y-3">
            <h2 className="font-semibold">Why</h2>
            <ul className="space-y-2">
              {Object.entries(REASON).map(([k, label]) => (
                <Bar key={k} label={label} value={r.byReason[k]} max={r.discarded} />
              ))}
            </ul>
          </Card>
          {r.topFoods.length > 0 && (
            <Card className="space-y-3">
              <h2 className="font-semibold">Thrown away most</h2>
              <ul className="space-y-2">
                {r.topFoods.map((f) => (
                  <Bar key={f.name} label={f.name} value={f.count} max={r.topFoods[0].count} />
                ))}
              </ul>
            </Card>
          )}
          {r.byCategory.length > 0 && (
            <Card className="space-y-3">
              <h2 className="font-semibold">By category</h2>
              <ul className="space-y-2">
                {r.byCategory.map((c) => (
                  <Bar key={c.name} label={c.name} value={c.count} max={r.byCategory[0].count} />
                ))}
              </ul>
            </Card>
          )}
          <Card className="space-y-2 lg:col-span-2">
            <h2 className="font-semibold">Per month</h2>
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="font-normal">Month</th>
                  <th className="text-right font-normal">Eaten</th>
                  <th className="text-right font-normal">Thrown away</th>
                </tr>
              </thead>
              <tbody>
                {r.byMonth.map((m) => (
                  <tr key={m.month}>
                    <td>{monthName(m.month)}</td>
                    <td className="text-right tabular-nums">{m.finished}</td>
                    <td className="text-right tabular-nums">{m.discarded}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </>
  );
}
