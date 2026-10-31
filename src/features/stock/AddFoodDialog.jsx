import { useId, useState } from 'react';
import { z } from 'zod';
import { Button, Dialog, ErrorNotice, Field, Input, Select } from '../../components/ui/index.jsx';
import { addDaysIso, defaultDays, formatDay, localIso, UNITS } from '../../lib/food.js';
import { useCategories, usePlaces } from '../household/hooks.js';
import { useAddFood, useFoods } from './hooks.js';

const schema = z.object({
  name: z.string().trim().min(1, 'What is it?').max(80),
  placeId: z.string().min(1, 'Where is it kept?'),
  quantity: z.coerce.number().positive('More than 0').max(99999),
  unit: z.string().trim().min(1).max(16),
});

const blank = (placeId = '') => ({
  name: '',
  categoryId: '',
  placeId,
  quantity: '1',
  unit: 'pcs',
  dateKind: 'use_by',
  expiresOn: '',
  notes: '',
});

/**
 * Add food in a few taps. Typing a name the household had before fills in its category, unit and
 * place. Without a printed date the category's default is used, and the form says which date that
 * will be.
 */
export function AddFoodDialog({ open, onClose, defaultPlaceId }) {
  const { data: places = [] } = usePlaces();
  const { data: categories = [] } = useCategories();
  const { data: foods = [] } = useFoods();
  const add = useAddFood();
  const listId = useId();
  const [form, setForm] = useState(() => blank(defaultPlaceId ?? ''));
  const [errors, setErrors] = useState({});
  const [added, setAdded] = useState(null);

  const placeId = form.placeId || places[0]?.id || '';
  const place = places.find((p) => p.id === placeId);
  const category = categories.find((c) => c.id === form.categoryId);
  const days = defaultDays(category, place?.kind);
  const estimate = days ? addDaysIso(localIso(), days) : null;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const onName = (e) => {
    const name = e.target.value;
    const known = foods.find((f) => f.name.toLowerCase() === name.trim().toLowerCase());
    setForm((f) =>
      known
        ? {
            ...f,
            name,
            categoryId: known.category?.id ?? '',
            unit: known.unit,
            placeId: known.lastPlaceId ?? f.placeId,
          }
        : { ...f, name },
    );
  };

  const close = () => {
    setForm(blank(defaultPlaceId ?? ''));
    setErrors({});
    setAdded(null);
    add.reset();
    onClose();
  };

  const submit = async (e, again) => {
    e.preventDefault();
    const parsed = schema.safeParse({ ...form, placeId });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    if (!form.expiresOn && !estimate) {
      setErrors({ expiresOn: 'Enter the date on the package' });
      return;
    }
    setErrors({});
    try {
      const item = await add.mutateAsync({
        name: parsed.data.name,
        categoryId: form.categoryId || null,
        placeId,
        quantity: parsed.data.quantity,
        unit: parsed.data.unit,
        dateKind: form.dateKind,
        ...(form.expiresOn ? { expiresOn: form.expiresOn } : {}),
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      });
      if (again) {
        setAdded(item);
        setForm(blank(placeId));
      } else close();
    } catch {
      // shown below from add.error
    }
  };

  return (
    <Dialog open={open} onClose={close} title="Add food">
      <form onSubmit={(e) => submit(e, false)} noValidate className="space-y-4">
        {add.error && <ErrorNotice error={add.error} />}
        {added && (
          <p role="status" className="text-sm text-positive">
            Added {added.food.name}. Add the next one.
          </p>
        )}
        <Field label="What is it?" error={errors.name}>
          {(p) => (
            <>
              <Input
                {...p}
                list={listId}
                value={form.name}
                onChange={onName}
                placeholder="Fresh milk"
                autoComplete="off"
                autoFocus
              />
              <datalist id={listId}>
                {foods.map((f) => (
                  <option key={f.id} value={f.name} />
                ))}
              </datalist>
            </>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            {(p) => (
              <Select {...p} value={form.categoryId} onChange={set('categoryId')}>
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Kept in" error={errors.placeId}>
            {(p) => (
              <Select
                {...p}
                value={placeId}
                onChange={(e) => setForm((f) => ({ ...f, placeId: e.target.value }))}
              >
                {places.map((pl) => (
                  <option key={pl.id} value={pl.id}>
                    {pl.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="How many" error={errors.quantity}>
            {(p) => (
              <Input
                {...p}
                type="number"
                inputMode="decimal"
                min="0.01"
                step="any"
                value={form.quantity}
                onChange={set('quantity')}
              />
            )}
          </Field>
          <Field label="Unit" error={errors.unit}>
            {(p) => (
              <Select {...p} value={form.unit} onChange={set('unit')}>
                {[...new Set([form.unit, ...UNITS])].map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">The date on the package says</legend>
          <div className="flex gap-4 text-sm">
            {[
              ['use_by', 'Use by'],
              ['best_before', 'Best before'],
            ].map(([value, label]) => (
              <label key={value} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="dateKind"
                  value={value}
                  checked={form.dateKind === value}
                  onChange={set('dateKind')}
                  className="accent-primary"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <Field
          label={form.dateKind === 'best_before' ? 'Best before' : 'Use by'}
          error={errors.expiresOn}
          hint={
            form.expiresOn
              ? undefined
              : estimate
                ? `Leave empty to use ${category.name} in the ${place.name.toLowerCase()}: about ${days} days, until ${formatDay(estimate)}.`
                : 'No printed date? Pick a category with a default for this place, or enter a date.'
          }
        >
          {(p) => <Input {...p} type="date" value={form.expiresOn} onChange={set('expiresOn')} />}
        </Field>

        <Field label="Notes (optional)">
          {(p) => (
            <Input
              {...p}
              value={form.notes}
              onChange={set('notes')}
              maxLength={300}
              placeholder="Top shelf"
            />
          )}
        </Field>

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={(e) => submit(e, true)} disabled={add.isPending}>
            Add and add another
          </Button>
          <Button type="submit" loading={add.isPending}>
            Add
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
