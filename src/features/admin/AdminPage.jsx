import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../app/AuthContext.jsx';
import {
  Button,
  Card,
  ErrorNotice,
  Field,
  Input,
  PageHeader,
  Select,
  Spinner,
} from '../../components/ui/index.jsx';
import { ROLE_LABEL } from '../../lib/food.js';
import {
  useCreateHousehold,
  useCreateUser,
  useDeleteHousehold,
  useHouseholds,
  useResetPassword,
  useUpdateUser,
  useUsers,
} from './hooks.js';

const ZONES = [
  'Asia/Singapore',
  'Asia/Manila',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Europe/London',
  'America/New_York',
  'America/Los_Angeles',
  'UTC',
];

/** Shown once after creating an account or resetting a password. */
function TemporaryPassword({ who, password, onDone }) {
  return (
    <div
      role="status"
      className="space-y-2 rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm"
    >
      <p>
        Temporary password for <strong>{who}</strong>. Give it to them now: it is not shown again.
        They choose their own when they sign in.
      </p>
      <p className="font-mono text-base tracking-wider select-all">{password}</p>
      <Button size="sm" variant="secondary" onClick={onDone}>
        Done
      </Button>
    </div>
  );
}

function Households() {
  const { data = [], isPending, error } = useHouseholds();
  const create = useCreateHousehold();
  const del = useDeleteHousehold();
  const [name, setName] = useState('');
  const [timeZone, setTimeZone] = useState('Asia/Singapore');

  if (isPending) return <Spinner />;
  return (
    <div className="space-y-3">
      {(error ?? create.error ?? del.error) && (
        <ErrorNotice error={error ?? create.error ?? del.error} />
      )}
      {data.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No households yet. Create one, for example “Suarez Family”. It starts with a fridge,
          freezer, pantry and common food categories.
        </p>
      )}
      <ul className="divide-y text-sm">
        {data.map((h) => (
          <li key={h.id} className="flex items-center gap-2 py-2">
            <span className="flex-1">
              {h.name}{' '}
              <span className="text-muted-foreground">
                · {h.memberCount} {h.memberCount === 1 ? 'person' : 'people'} · {h.timeZone}
              </span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Delete ${h.name}`}
              disabled={h.memberCount > 0 || del.isPending}
              title={h.memberCount > 0 ? 'Move everyone out first' : undefined}
              onClick={() => del.mutate(h.id)}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ul>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          create.mutate({ name: name.trim(), timeZone }, { onSuccess: () => setName('') });
        }}
      >
        <div className="min-w-48 flex-1">
          <Field label="New household">
            {(p) => (
              <Input
                {...p}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                placeholder="Suarez Family"
              />
            )}
          </Field>
        </div>
        <Field label="Time zone">
          {(p) => (
            <Select
              {...p}
              value={timeZone}
              onChange={(e) => setTimeZone(e.target.value)}
              className="w-auto"
            >
              {ZONES.map((z) => (
                <option key={z}>{z}</option>
              ))}
            </Select>
          )}
        </Field>
        <Button type="submit" loading={create.isPending}>
          Create
        </Button>
      </form>
    </div>
  );
}

const blankUser = {
  username: '',
  email: '',
  name: '',
  householdId: '',
  householdRole: 'member',
  admin: false,
};

function NewPerson({ households, onCreated }) {
  const create = useCreateUser();
  const [form, setForm] = useState(blankUser);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const fieldError = (path) => create.error?.details?.find((d) => d.path === path)?.message;

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        create.mutate(
          {
            username: form.username.trim(),
            email: form.email.trim(),
            name: form.name.trim(),
            role: form.admin ? 'admin' : 'user',
            householdId: form.householdId || null,
            ...(form.householdId ? { householdRole: form.householdRole } : {}),
          },
          {
            onSuccess: (data) => {
              setForm(blankUser);
              onCreated(data);
            },
          },
        );
      }}
    >
      <h3 className="font-medium">Add a person</h3>
      {create.error && !create.error.details && <ErrorNotice error={create.error} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" error={fieldError('name')}>
          {(p) => (
            <Input
              {...p}
              value={form.name}
              onChange={set('name')}
              placeholder="Mia"
              maxLength={60}
            />
          )}
        </Field>
        <Field label="Username" error={fieldError('username')} hint="What they type to sign in.">
          {(p) => (
            <Input
              {...p}
              value={form.username}
              onChange={set('username')}
              placeholder="mia"
              autoCapitalize="none"
              maxLength={32}
            />
          )}
        </Field>
        <Field
          label="Email"
          error={fieldError('email')}
          hint="They can sign in with it too. The daily summary is emailed here."
        >
          {(p) => (
            <Input
              {...p}
              type="email"
              inputMode="email"
              autoCapitalize="none"
              value={form.email}
              onChange={set('email')}
              placeholder="mia@example.com"
              maxLength={254}
            />
          )}
        </Field>
        <Field label="Household">
          {(p) => (
            <Select {...p} value={form.householdId} onChange={set('householdId')}>
              <option value="">None yet</option>
              {households.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Role in the household">
          {(p) => (
            <Select
              {...p}
              value={form.householdRole}
              onChange={set('householdRole')}
              disabled={!form.householdId}
            >
              <option value="manager">Manager: everything</option>
              <option value="member">Member: add and use food</option>
              <option value="viewer">Viewer: look only</option>
            </Select>
          )}
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.admin}
          onChange={(e) => setForm((f) => ({ ...f, admin: e.target.checked }))}
          className="accent-primary"
        />
        Also an administrator (can manage households and people)
      </label>
      <Button type="submit" loading={create.isPending}>
        Add person
      </Button>
    </form>
  );
}

function PersonRow({ person, households, isSelf, onReset }) {
  const update = useUpdateUser();
  const reset = useResetPassword();
  const [email, setEmail] = useState(null); // the email being edited, or null
  const change = (body, opts) => update.mutate({ id: person.id, ...body }, opts);
  return (
    <li className="space-y-2 py-3">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-medium">{person.name}</span>
        <span className="text-sm text-muted-foreground">
          {person.username}
          {person.role === 'admin' && ' · admin'}
          {person.disabledAt && ' · disabled'}
          {person.mustChangePassword && ' · has a temporary password'}
        </span>
      </div>
      {email === null ? (
        <p className="text-sm">
          {person.email ?? <span className="text-warning">No email yet</span>}{' '}
          <button
            type="button"
            className="text-muted-foreground underline"
            onClick={() => setEmail(person.email ?? '')}
          >
            {person.email ? 'Change' : 'Add email'}
          </button>
        </p>
      ) : (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            change({ email: email.trim() }, { onSuccess: () => setEmail(null) });
          }}
        >
          <Input
            aria-label={`${person.name}'s email`}
            type="email"
            inputMode="email"
            autoCapitalize="none"
            className="w-64"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={254}
            autoFocus
          />
          <Button type="submit" size="sm" loading={update.isPending}>
            Save
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEmail(null)}>
            Cancel
          </Button>
        </form>
      )}
      {(update.error ?? reset.error) && <ErrorNotice error={update.error ?? reset.error} />}
      <div className="flex flex-wrap gap-2">
        <Select
          aria-label={`${person.name}'s household`}
          className="w-auto"
          value={person.household?.id ?? ''}
          disabled={update.isPending}
          onChange={(e) => change({ householdId: e.target.value || null })}
        >
          <option value="">No household</option>
          {households.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </Select>
        {person.household && (
          <Select
            aria-label={`${person.name}'s role`}
            className="w-auto"
            value={person.householdRole}
            disabled={update.isPending}
            onChange={(e) => change({ householdRole: e.target.value })}
          >
            {Object.entries(ROLE_LABEL).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </Select>
        )}
        {!isSelf && (
          <>
            <Button
              variant="secondary"
              size="sm"
              loading={reset.isPending}
              onClick={() =>
                reset.mutate(person.id, {
                  onSuccess: (data) =>
                    onReset({ user: data.user, temporaryPassword: data.temporaryPassword }),
                })
              }
            >
              Reset password
            </Button>
            <Button
              variant={person.disabledAt ? 'secondary' : 'ghost'}
              size="sm"
              disabled={update.isPending}
              onClick={() => change({ disabled: !person.disabledAt })}
            >
              {person.disabledAt ? 'Enable' : 'Disable'}
            </Button>
          </>
        )}
      </div>
    </li>
  );
}

/** Admin only: households, the people in them and their roles. */
export function AdminPage() {
  const { user } = useAuth();
  const { data: households = [] } = useHouseholds();
  const users = useUsers();
  const [shown, setShown] = useState(null);

  return (
    <>
      <PageHeader
        title="Households & people"
        description="Create the household, add your family and choose what each person can do."
      />
      {!user.household && households.length > 0 && (
        <p className="mb-4 rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm">
          You are not in a household yet. Pick one for yourself below (as Manager) to use the food
          pages.
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">Households</h2>
          <Households />
        </Card>
        <Card className="space-y-4">
          <h2 className="font-semibold">People</h2>
          {shown && (
            <TemporaryPassword
              who={shown.user.username}
              password={shown.temporaryPassword}
              onDone={() => setShown(null)}
            />
          )}
          {users.isPending ? (
            <Spinner />
          ) : users.error ? (
            <ErrorNotice error={users.error} />
          ) : (
            <ul className="divide-y">
              {users.data.map((p) => (
                <PersonRow
                  key={p.id}
                  person={p}
                  households={households}
                  isSelf={p.id === user.id}
                  onReset={setShown}
                />
              ))}
            </ul>
          )}
          <NewPerson households={households} onCreated={setShown} />
        </Card>
      </div>
    </>
  );
}
