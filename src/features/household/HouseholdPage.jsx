import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../app/AuthContext.jsx';
import {
  Button,
  Card,
  ErrorNotice,
  Input,
  PageHeader,
  Select,
  Spinner,
} from '../../components/ui/index.jsx';
import { can, PLACE_KINDS, ROLE_LABEL } from '../../lib/food.js';
import { useCategories, useHousehold, usePlaces, useSave } from './hooks.js';

function Members() {
  const { data, isPending, error } = useHousehold();
  if (isPending) return <Spinner />;
  if (error) return <ErrorNotice error={error} />;
  return (
    <ul className="divide-y text-sm">
      {data.members.map((m) => (
        <li key={m.id} className="flex justify-between py-2">
          <span>{m.name}</span>
          <span className="text-muted-foreground">{ROLE_LABEL[m.role]}</span>
        </li>
      ))}
    </ul>
  );
}

function Places({ manage }) {
  const { data: places = [] } = usePlaces();
  const save = useSave('places');
  const [name, setName] = useState('');
  const [kind, setKind] = useState('fridge');

  return (
    <div className="space-y-3">
      {save.error && <ErrorNotice error={save.error} />}
      <ul className="divide-y text-sm">
        {places.map((p) => (
          <li key={p.id} className="flex items-center gap-2 py-2">
            <span className="flex-1">
              {p.name}{' '}
              <span className="text-muted-foreground">
                · {PLACE_KINDS.find(([k]) => k === p.kind)?.[1]} · {p.activeCount} items
              </span>
            </span>
            {manage && (
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Delete ${p.name}`}
                disabled={p.activeCount > 0 || save.isPending}
                title={p.activeCount > 0 ? 'Move or finish the food in it first' : undefined}
                onClick={() => save.mutate({ id: p.id, remove: true })}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            )}
          </li>
        ))}
      </ul>
      {manage && (
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            save.mutate(
              { name: name.trim(), kind, position: places.length },
              { onSuccess: () => setName('') },
            );
          }}
        >
          <Input
            aria-label="New place"
            placeholder="Garage freezer"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-w-40 flex-1"
            maxLength={40}
          />
          <Select
            aria-label="Kind"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="w-auto"
          >
            {PLACE_KINDS.map(([k, label]) => (
              <option key={k} value={k}>
                Works like: {label}
              </option>
            ))}
          </Select>
          <Button type="submit" loading={save.isPending}>
            Add place
          </Button>
        </form>
      )}
    </div>
  );
}

const DAY_FIELDS = [
  ['fridgeDays', 'Fridge'],
  ['freezerDays', 'Freezer'],
  ['pantryDays', 'Pantry'],
  ['openedDays', 'Once opened'],
];

// Medicine always has its printed date: only "once opened" applies (ADR 0008).
const MEDICINE_FIELDS = [['openedDays', 'Once opened']];

const toForm = (c, fields) =>
  Object.fromEntries(fields.map(([k]) => [k, c[k] === null ? '' : String(c[k])]));
const toDays = (v) => (v.trim() === '' ? null : Number(v));

function CategoryRow({ category, manage, save, fields }) {
  const [form, setForm] = useState(() => toForm(category, fields));
  const dirty = fields.some(([k]) => toDays(form[k]) !== category[k]);
  return (
    <tr className="border-t">
      <th scope="row" className="py-2 pr-2 text-left font-normal">
        {category.name}
      </th>
      {fields.map(([k, label]) => (
        <td key={k} className="w-20 px-1 py-1">
          {manage ? (
            <Input
              aria-label={`${category.name}, ${label}, days`}
              type="number"
              inputMode="numeric"
              min="1"
              max="3650"
              value={form[k]}
              onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
              className="ml-auto h-8 w-16 px-2 text-right"
            />
          ) : (
            <span className="block text-right tabular-nums">{category[k] ?? '–'}</span>
          )}
        </td>
      ))}
      {manage && (
        <td className="py-1 pl-1 whitespace-nowrap">
          <Button
            size="sm"
            variant={dirty ? 'primary' : 'ghost'}
            disabled={!dirty || save.isPending}
            onClick={() =>
              save.mutate({
                id: category.id,
                ...Object.fromEntries(fields.map(([k]) => [k, toDays(form[k])])),
              })
            }
          >
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label={`Delete ${category.name}`}
            disabled={save.isPending}
            onClick={() => save.mutate({ id: category.id, remove: true })}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </td>
      )}
    </tr>
  );
}

function Categories({ manage, kind = 'food' }) {
  const { data: all = [] } = useCategories();
  const categories = all.filter((c) => (c.kind ?? 'food') === kind);
  const fields = kind === 'medicine' ? MEDICINE_FIELDS : DAY_FIELDS;
  const save = useSave('categories');
  const [name, setName] = useState('');
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {kind === 'medicine'
          ? 'Medicine always needs the date printed on it. Some keep only a short time once opened (eye drops: 28 days); empty means no limit.'
          : 'How many days food keeps when the package has no date, by place, and once opened. Empty means no default. A printed date always wins.'}
      </p>
      {save.error && <ErrorNotice error={save.error} />}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1 font-medium">Category</th>
              {fields.map(([k, label]) => (
                <th key={k} className="w-20 px-1 py-1 text-right font-medium whitespace-nowrap">
                  {label}
                </th>
              ))}
              {/* A real cell (only its text is hidden), so the columns line up with the rows. */}
              {manage && (
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <CategoryRow
                key={`${c.id}-${fields.map(([k]) => c[k]).join('-')}`}
                category={c}
                manage={manage}
                save={save}
                fields={fields}
              />
            ))}
          </tbody>
        </table>
      </div>
      {manage && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            save.mutate({ kind, name: name.trim() }, { onSuccess: () => setName('') });
          }}
        >
          <Input
            aria-label={kind === 'medicine' ? 'New medicine category' : 'New category'}
            placeholder={kind === 'medicine' ? 'Inhalers' : 'Kimchi'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            className="flex-1"
          />
          <Button type="submit" loading={save.isPending}>
            Add category
          </Button>
        </form>
      )}
    </div>
  );
}

/** Who is in the household, and (managers) the places and categories everyone uses. */
export function HouseholdPage() {
  const { user } = useAuth();
  const manage = can(user, 'manager');
  return (
    <>
      <PageHeader
        title={user.household.name}
        description={
          manage
            ? 'You manage this household: its places and categories.'
            : `You are a ${ROLE_LABEL[user.householdRole].toLowerCase()} here.`
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-2 font-semibold">People</h2>
          <Members />
        </Card>
        <Card>
          <h2 className="mb-2 font-semibold">Places</h2>
          <Places manage={manage} />
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="mb-2 font-semibold">Food categories</h2>
          <Categories manage={manage} />
        </Card>
        {can(user, 'member') && (
          <Card className="lg:col-span-2">
            <h2 className="mb-2 font-semibold">Medicine categories</h2>
            <Categories manage={manage} kind="medicine" />
          </Card>
        )}
      </div>
    </>
  );
}
