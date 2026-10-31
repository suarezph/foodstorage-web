import { Pill } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSummary } from '../stock/hooks.js';

/** One line on Home when medicine is expired or expires within 14 days (members and managers). */
export function MedicineNotice() {
  const { data } = useSummary('medicine');
  if (!data) return null;
  const { expired, today, soon } = data.counts;
  if (!expired && !today && !soon) return null;
  const parts = [
    expired && `${expired} expired`,
    today && `${today} expiring today`,
    soon && `${soon} within 14 days`,
  ].filter(Boolean);
  return (
    <Link
      to="/medicine"
      className="flex items-center gap-3 rounded-xl border bg-card p-4 text-sm transition-colors hover:bg-muted/50"
    >
      <Pill className="size-5 shrink-0 text-warning" aria-hidden="true" />
      <span>
        <strong>Medicine:</strong> {parts.join(', ')}
      </span>
    </Link>
  );
}
