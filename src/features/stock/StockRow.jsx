import { cn } from 'cn';
import { ChevronRight } from 'lucide-react';
import { formatDay, formatQuantity, URGENCY_TONE, urgencyText } from '../../lib/food.js';

/** The urgency as a pill: colour plus words, never colour alone. */
export function UrgencyBadge({ item, className }) {
  const tone = item.urgency ? URGENCY_TONE[item.urgency.level] : 'bg-muted text-muted-foreground';
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        tone,
        className,
      )}
    >
      {urgencyText(item)}
    </span>
  );
}

/** One batch in a list. The whole row opens it. `extra` adds a second line ("Frozen 2 months ago"). */
export function StockRow({ item, today, onOpen, showPlace = true, extra }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(item.id)}
        className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-ring"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{item.food.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {formatQuantity(item.quantity, item.unit)}
            {showPlace && ` · ${item.place.name}`}
            {item.openedOn && ' · opened'}
            {item.status === 'active' &&
              ` · ${item.dateKind === 'best_before' ? 'best before' : 'use by'} ${formatDay(item.useBefore, today)}`}
            {item.expiresEstimated && item.status === 'active' && ' (estimated)'}
          </p>
          {extra && <p className="truncate text-xs text-muted-foreground">{extra}</p>}
        </div>
        <UrgencyBadge item={item} />
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>
    </li>
  );
}
