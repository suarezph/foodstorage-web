import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { item, mockApi, renderApp, signedIn, userWith } from '../../test/render.jsx';

afterEach(() => vi.restoreAllMocks());

const entry = (overrides) => ({
  id: 'l1',
  name: 'Eggs',
  note: '1 tray',
  foodId: null,
  done: false,
  doneAt: null,
  addedBy: 'Mia',
  createdAt: '2026-10-31T01:00:00Z',
  ...overrides,
});

describe('Shopping list', () => {
  it('adds, ticks off, suggests staples and clears what was bought', async () => {
    let items = [entry(), entry({ id: 'l2', name: 'Rice', note: null, done: true })];
    const calls = mockApi({
      ...signedIn(),
      'GET /shopping': () => ({
        items,
        suggestions: [
          { foodId: 'f1', name: 'Fresh milk', unit: 'carton', have: 1, keepAtLeast: 2 },
        ],
      }),
      'POST /shopping': (body) => {
        items = [...items, entry({ id: 'l3', name: body.name, note: body.note ?? null })];
        return items.at(-1);
      },
      'PATCH /shopping/l1': (body) => {
        items = items.map((i) => (i.id === 'l1' ? { ...i, done: body.done } : i));
        return items[0];
      },
      'POST /shopping/clear-done': () => ({ count: 1 }),
    });
    renderApp('/shopping');
    expect(await screen.findByText('1 tray · added by Mia')).toBeInTheDocument();
    expect(screen.getByText(/1 carton left, keep 2 carton/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Add Fresh milk' }));
    expect(calls.find((c) => c.method === 'POST' && c.path === '/shopping').body).toEqual({
      name: 'Fresh milk',
      foodId: 'f1',
    });

    await userEvent.type(screen.getByLabelText('What to buy'), 'Bananas');
    await userEvent.type(screen.getByLabelText('How much (optional)'), '1 bunch');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(calls.filter((c) => c.method === 'POST' && c.path === '/shopping').at(-1).body).toEqual({
      name: 'Bananas',
      note: '1 bunch',
    });

    await userEvent.click(screen.getByRole('checkbox', { name: 'To buy: Eggs' }));
    expect(calls.find((c) => c.method === 'PATCH').body).toEqual({ done: true });

    await userEvent.click(await screen.findByRole('button', { name: /Clear \d bought/ }));
    expect(calls.some((c) => c.path === '/shopping/clear-done')).toBe(true);
  });

  it('is read-only for a viewer', async () => {
    mockApi({
      ...signedIn(userWith({ householdRole: 'viewer' })),
      'GET /shopping': () => ({ items: [entry()], suggestions: [] }),
    });
    renderApp('/shopping');
    expect(await screen.findByRole('checkbox', { name: 'To buy: Eggs' })).toBeDisabled();
    expect(screen.queryByLabelText('What to buy')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove Eggs' })).not.toBeInTheDocument();
  });
});

describe('finishing food', () => {
  it('can put it on the shopping list, and mark it a staple', async () => {
    const calls = mockApi({
      ...signedIn(userWith({ householdRole: 'member' })),
      'GET /stock': () => [item()],
      'GET /stock/s1': () => ({ ...item(), events: [] }),
      'POST /stock/s1/finish': () => item({ status: 'finished', quantity: 0, urgency: null }),
      'PATCH /foods/f1': (body) => ({
        id: 'f1',
        name: 'Fresh milk',
        keepAtLeast: body.keepAtLeast,
      }),
    });
    renderApp('/storage');
    await userEvent.click(await screen.findByRole('button', { name: /Fresh milk/ }));
    let dialog = await screen.findByRole('dialog');

    await userEvent.click(within(dialog).getByRole('button', { name: 'Mark as staple' }));
    await userEvent.type(within(dialog).getByLabelText('Always keep at least (carton)'), '2');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(calls.find((c) => c.method === 'PATCH').body).toEqual({ keepAtLeast: 2 });

    dialog = screen.getByRole('dialog');
    await userEvent.click(await within(dialog).findByRole('button', { name: 'All used' }));
    await userEvent.click(within(dialog).getByLabelText('Add to the shopping list'));
    await userEvent.click(within(dialog).getByRole('button', { name: 'All used' }));
    expect(calls.find((c) => c.path === '/stock/s1/finish').body).toEqual({ addToShopping: true });
  });
});
