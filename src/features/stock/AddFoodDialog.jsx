import { ScanBarcode } from 'lucide-react';
import { useCallback, useId, useState } from 'react';
import { z } from 'zod';
import { Button, Dialog, ErrorNotice, Field, Input, Select } from '../../components/ui/index.jsx';
import { addDaysIso, defaultDays, formatDay, localIso, UNITS } from '../../lib/food.js';
import { useCategories, useHousehold, usePlaces } from '../household/hooks.js';
import { BarcodeScanner, canScan } from './BarcodeScanner.jsx';
import { lookupBarcode, useAddFood, useFoods } from './hooks.js';

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
  barcode: '',
  forUserId: '',
  doseNote: '',
});

const BARCODE = /^[0-9]{8,14}$/;

/** A name the household had before brings its category, unit and usual place. */
function withName(foods, f, name) {
  const known = foods.find((x) => x.name.toLowerCase() === name.trim().toLowerCase());
  return known
    ? {
        ...f,
        name,
        categoryId: known.category?.id ?? '',
        unit: known.unit,
        placeId: known.lastPlaceId ?? f.placeId,
      }
    : { ...f, name };
}

/**
 * Add food in a few taps. Typing a name the household had before, or scanning its barcode, fills in
 * its category, unit and place. An unknown barcode gets its name from Open Food Facts and is
 * remembered once added. Without a printed date the category's default is used, and the form says
 * which date that will be. `prefill` ({ name }) opens it filled in (putting away a bought shopping
 * item); `onAdded(item)` is told about each batch added.
 *
 * `kind="medicine"` (ADR 0008): "Add medicine", medicine categories, the cabinet first, the
 * printed expiry date always, who it is for and a dose note; barcodes only from the household.
 */
export function AddFoodDialog({ open, onClose, defaultPlaceId, prefill, onAdded, kind = 'food' }) {
  const medicine = kind === 'medicine';
  const { data: allPlaces = [] } = usePlaces();
  const { data: allCategories = [] } = useCategories();
  const { data: foods = [] } = useFoods(kind);
  const household = useHousehold();
  const members = medicine ? (household.data?.members ?? []) : [];
  // Medicine: the cabinet first. Food: the cabinet last. Otherwise the household's own order.
  const cabinetRank = (p) => (p.kind === 'cabinet' ? (medicine ? -1 : 1) : 0);
  const places = [...allPlaces].sort((a, b) => cabinetRank(a) - cabinetRank(b));
  const categories = allCategories.filter((c) => (c.kind ?? 'food') === kind);
  const add = useAddFood();
  const listId = useId();
  // `prefill` is read when the dialog mounts: the shopping list mounts it per item.
  const [form, setForm] = useState(() =>
    prefill?.name
      ? withName(foods, blank(defaultPlaceId ?? ''), prefill.name)
      : blank(defaultPlaceId ?? ''),
  );
  const [errors, setErrors] = useState({});
  const [added, setAdded] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [found, setFound] = useState(null); // what the barcode lookup said
  const [looking, setLooking] = useState(false);

  const placeId = form.placeId || places[0]?.id || '';
  const place = places.find((p) => p.id === placeId);
  const category = categories.find((c) => c.id === form.categoryId);
  const days = defaultDays(category, place?.kind);
  const estimate = days ? addDaysIso(localIso(), days) : null;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const onName = (e) => setForm((f) => withName(foods, f, e.target.value));

  const lookUp = useCallback(
    async (code) => {
      setScanning(false);
      setForm((f) => ({ ...f, barcode: code }));
      if (!BARCODE.test(code)) {
        setFound({ text: 'A barcode is 8 to 14 digits.', error: true });
        return;
      }
      setLooking(true);
      try {
        const r = await lookupBarcode(code, kind);
        if (r.food) {
          setForm((f) => ({
            ...f,
            barcode: code,
            name: r.food.name,
            categoryId: r.food.category?.id ?? '',
            unit: r.food.unit,
            placeId: r.food.lastPlaceId ?? f.placeId,
          }));
          setFound({ text: `${r.food.name}: you have had this before.` });
        } else if (r.product && !medicine) {
          setForm((f) => ({ ...f, barcode: code, name: r.product.name }));
          setFound({
            text: `Found: ${[r.product.brand, r.product.quantity].filter(Boolean).join(', ') || r.product.name}. Check the name and pick a category.`,
          });
        } else {
          setFound({ text: 'Not found. Type the name: this barcode will be remembered.' });
        }
      } catch (err) {
        setFound({ text: err.message, error: true });
      } finally {
        setLooking(false);
      }
    },
    [kind, medicine],
  );

  const close = () => {
    setForm(blank(defaultPlaceId ?? ''));
    setErrors({});
    setAdded(null);
    setScanning(false);
    setFound(null);
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
    if (!form.expiresOn && (medicine || !estimate)) {
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
        dateKind: medicine ? 'use_by' : form.dateKind,
        ...(form.expiresOn ? { expiresOn: form.expiresOn } : {}),
        ...(medicine
          ? {
              kind,
              ...(form.forUserId ? { forUserId: form.forUserId } : {}),
              ...(form.doseNote.trim() ? { doseNote: form.doseNote.trim() } : {}),
            }
          : {}),
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
        ...(BARCODE.test(form.barcode) ? { barcode: form.barcode } : {}),
      });
      onAdded?.(item);
      if (again) {
        setAdded(item);
        setFound(null);
        setForm(blank(placeId));
      } else close();
    } catch {
      // shown below from add.error
    }
  };

  return (
    <Dialog open={open} onClose={close} title={medicine ? 'Add medicine' : 'Add food'}>
      <form onSubmit={(e) => submit(e, false)} noValidate className="space-y-4">
        {add.error && <ErrorNotice error={add.error} />}
        {added && (
          <p role="status" className="text-sm text-positive">
            Added {added.food.name}. Add the next one.
          </p>
        )}
        <div className="space-y-2 rounded-lg border p-3">
          {scanning ? (
            <BarcodeScanner onCode={lookUp} onCancel={() => setScanning(false)} />
          ) : (
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-40 flex-1">
                <Field label="Barcode (optional)">
                  {(p) => (
                    <Input
                      {...p}
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="Numbers under the barcode"
                      value={form.barcode}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, barcode: e.target.value.replace(/\D/g, '') }))
                      }
                    />
                  )}
                </Field>
              </div>
              <Button
                variant="secondary"
                loading={looking}
                disabled={!form.barcode}
                onClick={() => lookUp(form.barcode)}
              >
                Look up
              </Button>
              {canScan() && (
                <Button variant="secondary" onClick={() => setScanning(true)}>
                  <ScanBarcode aria-hidden="true" /> Scan
                </Button>
              )}
            </div>
          )}
          {found && (
            <p role="status" className={found.error ? 'text-sm text-negative' : 'text-sm'}>
              {found.text}
            </p>
          )}
        </div>

        <Field label="What is it?" error={errors.name}>
          {(p) => (
            <>
              <Input
                {...p}
                list={listId}
                value={form.name}
                onChange={onName}
                placeholder={medicine ? 'Paracetamol syrup' : 'Fresh milk'}
                autoComplete="off"
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

        {!medicine && (
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
        )}

        <Field
          label={
            medicine
              ? 'Expires (EXP on the box)'
              : form.dateKind === 'best_before'
                ? 'Best before'
                : 'Use by'
          }
          error={errors.expiresOn}
          hint={
            form.expiresOn
              ? undefined
              : medicine
                ? 'Medicine always needs the date printed on it.'
                : estimate
                  ? `Leave empty to use ${category.name} in the ${place.name.toLowerCase()}: about ${days} days, until ${formatDay(estimate)}.`
                  : 'No printed date? Pick a category with a default for this place, or enter a date.'
          }
        >
          {(p) => <Input {...p} type="date" value={form.expiresOn} onChange={set('expiresOn')} />}
        </Field>

        {medicine && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="For (optional)">
              {(p) => (
                <Select {...p} value={form.forUserId} onChange={set('forUserId')}>
                  <option value="">Anyone</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Dose (optional)" hint="As written on the box. Never checked by the app.">
              {(p) => (
                <Input
                  {...p}
                  value={form.doseNote}
                  onChange={set('doseNote')}
                  maxLength={200}
                  placeholder="5 ml every 6 hours"
                />
              )}
            </Field>
          </div>
        )}

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
