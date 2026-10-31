import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { item, mockApi, renderApp, signedIn, userWith } from '../../test/render.jsx';

afterEach(() => vi.restoreAllMocks());

const expired = item({
  id: 's2',
  food: { id: 'f2', name: 'Yoghurt', category: null },
  quantity: 1,
  unit: 'pcs',
  useBefore: '2026-10-29',
  expiresOn: '2026-10-29',
  urgency: { level: 'expired', daysLeft: -2 },
});

const summary = {
  today: '2026-10-31',
  counts: { expired: 1, today: 0, soon: 1, week: 0, total: 2 },
  attention: [expired, item()],
};

const detail = (overrides) => ({
  ...item(overrides),
  events: [
    { id: 'e1', kind: 'added', quantity: 2, note: null, by: 'Alex', at: '2026-10-30T08:00:00Z' },
  ],
});

describe('Home', () => {
  it('counts what needs attention and words use by and best before differently', async () => {
    mockApi({ ...signedIn(), 'GET /stock/summary': () => summary });
    renderApp('/');
    expect(await screen.findByText('Use these first')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Expired\s*1/ })).toHaveAttribute(
      'href',
      '/storage?urgency=expired',
    );
    expect(screen.getByText('Expired 2 days ago')).toBeInTheDocument();
    expect(screen.getByText('In 2 days')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'All 2 in storage' })).toBeInTheDocument();
  });

  it('opens an item and uses some of it', async () => {
    let quantity = 2;
    const calls = mockApi({
      ...signedIn(userWith({ householdRole: 'member' })),
      'GET /stock/summary': () => summary,
      'GET /stock/s1': () => detail({ quantity }),
      'POST /stock/s1/use': (body) => {
        quantity -= body.quantity;
        return item({ quantity });
      },
    });
    renderApp('/');
    await userEvent.click(await screen.findByRole('button', { name: /Fresh milk/ }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('2 carton')).toBeInTheDocument();
    // Who added it, in the facts and in the history.
    expect(within(dialog).getAllByText(/by Alex/)).toHaveLength(2);
    // A member cannot correct or delete.
    expect(within(dialog).queryByRole('button', { name: 'Correct' })).not.toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Use some' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Use' }));
    expect(calls.find((c) => c.path === '/stock/s1/use').body).toEqual({ quantity: 1 });
    expect(await within(dialog).findByText('1 carton')).toBeInTheDocument();
  });

  it('says "do not eat" for expired use-by food', async () => {
    mockApi({
      ...signedIn(),
      'GET /stock/summary': () => summary,
      'GET /stock/s2': () => ({ ...expired, events: [] }),
    });
    renderApp('/');
    await userEvent.click(await screen.findByRole('button', { name: /Yoghurt/ }));
    expect(await screen.findByText('Do not eat')).toBeInTheDocument();
  });
});

describe('roles', () => {
  it('lets a viewer look but not add or act', async () => {
    mockApi({
      ...signedIn(userWith({ householdRole: 'viewer' })),
      'GET /stock/summary': () => summary,
      'GET /stock/s1': () => detail(),
    });
    renderApp('/');
    await screen.findByText('Use these first');
    expect(screen.queryByRole('button', { name: 'Add food' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Fresh milk/ }));
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByText('History');
    expect(within(dialog).queryByRole('button', { name: 'Use some' })).not.toBeInTheDocument();
  });

  it('lets a manager correct an item', async () => {
    const calls = mockApi({
      ...signedIn(),
      'GET /stock/summary': () => summary,
      'GET /stock/s1': () => detail(),
      'PATCH /stock/s1': (body) => item({ quantity: body.quantity }),
    });
    renderApp('/');
    await userEvent.click(await screen.findByRole('button', { name: /Fresh milk/ }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Correct' }));
    const amount = within(dialog).getByLabelText('Amount left');
    await userEvent.clear(amount);
    await userEvent.type(amount, '1.5');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(calls.find((c) => c.method === 'PATCH').body).toMatchObject({
      name: 'Fresh milk',
      quantity: 1.5,
      unit: 'carton',
    });
  });
});

describe('adding food', () => {
  it('suggests the estimated date and sends no date when it is left empty', async () => {
    const calls = mockApi({
      ...signedIn(),
      'GET /stock': () => [],
      'POST /stock': (body) => item({ food: { id: 'f9', name: body.name, category: null } }),
    });
    renderApp('/storage');
    await userEvent.click(await screen.findByRole('button', { name: 'Add food' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('What is it?'), 'Fresh milk');
    await userEvent.selectOptions(within(dialog).getByLabelText('Category'), 'Dairy');
    expect(within(dialog).getByText(/Dairy in the fridge: about 7 days/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add' }));
    const post = calls.find((c) => c.method === 'POST' && c.path === '/stock');
    expect(post.body).toEqual({
      name: 'Fresh milk',
      categoryId: 'c1',
      placeId: 'p1',
      quantity: 1,
      unit: 'pcs',
      dateKind: 'use_by',
    });
  });

  it('asks for the date when the category has no default for that place', async () => {
    const calls = mockApi({ ...signedIn(), 'GET /stock': () => [] });
    renderApp('/storage');
    await userEvent.click(await screen.findByRole('button', { name: 'Add food' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('What is it?'), 'Chips');
    await userEvent.selectOptions(within(dialog).getByLabelText('Category'), 'Snacks');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add' }));
    expect(await within(dialog).findByText('Enter the date on the package')).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'POST' && c.path === '/stock')).toBe(false);
  });
});

describe('Storage', () => {
  it('filters by place and keeps the filter in the address', async () => {
    const calls = mockApi({ ...signedIn(), 'GET /stock': () => [item()] });
    renderApp('/storage?urgency=soon');
    expect(await screen.findByText('Next 3 days')).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: /^Freezer/ }));
    const last = calls.filter((c) => c.path === '/stock').at(-1);
    expect(last.query).toMatchObject({ status: 'active', placeId: 'p2', urgency: 'soon' });
  });
});
