// How food dates, amounts and roles are shown. The API decides urgency (in the household's own
// time zone); this file only words it.

const day = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});
const dayYear = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/** "Tue, 4 Nov" (this year) or "4 Nov 2027". Dates are plain YYYY-MM-DD, shown as written. */
export function formatDay(iso, today) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  return today && iso.slice(0, 4) !== today.slice(0, 4) ? dayYear.format(d) : day.format(d);
}

export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * The words for a batch's urgency. Use by is about safety ("do not eat"), best before about
 * quality ("check it").
 */
export function urgencyText(item) {
  const u = item.urgency;
  if (!u) return item.status === 'finished' ? 'Finished' : 'Thrown away';
  const bestBefore = item.dateKind === 'best_before';
  switch (u.level) {
    case 'expired':
      return bestBefore
        ? `Past best before (${plural(-u.daysLeft, 'day')})`
        : `Expired ${plural(-u.daysLeft, 'day')} ago`;
    case 'today':
      return bestBefore ? 'Best before today' : 'Use today';
    case 'soon':
    case 'week':
      return u.daysLeft === 1 ? 'Tomorrow' : `In ${u.daysLeft} days`;
    default:
      return `In ${u.daysLeft} days`;
  }
}

/** Tailwind classes per urgency level (tokens only; the text says it too, never colour alone). */
export const URGENCY_TONE = {
  expired: 'bg-negative/15 text-negative',
  today: 'bg-negative/15 text-negative',
  soon: 'bg-warning/20 text-warning',
  week: 'bg-muted text-foreground',
  later: 'bg-muted text-muted-foreground',
};

/** "2 cartons", "0.5 kg", "3 pcs". */
export function formatQuantity(quantity, unit) {
  const n = Number.isInteger(quantity) ? String(quantity) : String(Number(quantity.toFixed(2)));
  return `${n} ${unit}`;
}

export const UNITS = [
  'pcs',
  'pack',
  'bottle',
  'carton',
  'can',
  'jar',
  'bag',
  'box',
  'g',
  'kg',
  'ml',
  'L',
];

export const PLACE_KINDS = [
  ['fridge', 'Fridge'],
  ['freezer', 'Freezer'],
  ['pantry', 'Pantry'],
  ['other', 'Other'],
];

export const ROLE_LABEL = { manager: 'Manager', member: 'Member', viewer: 'Viewer' };
const RANK = { viewer: 1, member: 2, manager: 3 };

/** Whether the signed-in person's household role is at least `min`. The API checks it too. */
export const can = (user, min) => (RANK[user?.householdRole] ?? 0) >= RANK[min];

/** The category's default days for a kind of place, or null. */
export const defaultDays = (category, placeKind) =>
  category
    ? ({ fridge: category.fridgeDays, freezer: category.freezerDays, pantry: category.pantryDays }[
        placeKind
      ] ?? null)
    : null;

/** Today in the browser, plus n days, as YYYY-MM-DD (for form defaults only). */
export function localIso(n = 0) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const pad = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDaysIso(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
