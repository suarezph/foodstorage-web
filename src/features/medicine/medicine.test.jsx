import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { item, mockApi, renderApp, signedIn, userWith } from '../../test/render.jsx';

afterEach(() => vi.restoreAllMocks());

const household = {
  id: 'h1',
  name: 'Victoria',
  timeZone: 'Asia/Singapore',
  members: [
    { id: 'u1', name: 'Alex', role: 'manager' },
    { id: 'u3', name: 'Mia', role: 'viewer' },
  ],
};
const calpol = (over = {}) =>
  item({
    id: 'm1',
    food: {
      id: 'fm1',
      kind: 'medicine',
      name: 'Calpol',
      category: { id: 'm1', name: 'Pain & fever' },
      doseNote: '5 ml every 6 hours',
    },
    place: { id: 'p4', name: 'Medicine cabinet', kind: 'cabinet' },
    unit: 'bottle',
    quantity: 1,
    useBefore: '2026-11-11',
    expiresOn: '2026-11-11',
    urgency: { level: 'soon', daysLeft: 10 },
    forUser: { id: 'u3', name: 'Mia' },
    ...over,
  });
const medSummary = {
  today: '2026-11-01',
  kind: 'medicine',
  counts: { expired: 1, today: 0, soon: 1, total: 3 },
  attention: [],
};

describe('Medicine', () => {
  it('lists medicine with who it is for, and adds one with its printed date', async () => {
    const calls = mockApi({
      ...signedIn(),
      'GET /household': () => household,
      'GET /stock/summary': () => medSummary,
      'GET /stock': () => [calpol()],
      'POST /stock': (body) => calpol({ food: { ...calpol().food, name: body.name } }),
    });
    renderApp('/medicine');
    expect(await screen.findByText('Calpol')).toBeInTheDocument();
    expect(screen.getByText('Expires in 10 days')).toBeInTheDocument();
    expect(screen.getByText('For Mia · 5 ml every 6 hours')).toBeInTheDocument();
    expect(calls.find((c) => c.path === '/stock').query).toMatchObject({
      kind: 'medicine',
      status: 'active',
    });

    await userEvent.click(screen.getByRole('button', { name: 'Add medicine' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add medicine' });
    // Medicine categories only; the cabinet first; no "use by / best before" choice.
    const cats = within(dialog).getByLabelText('Category');
    expect(
      within(cats)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['No category', 'Pain & fever']);
    expect(within(dialog).getByLabelText('Kept in')).toHaveValue('p4');
    expect(within(dialog).queryByText('Best before')).not.toBeInTheDocument();

    await userEvent.type(within(dialog).getByLabelText('What is it?'), 'Ibuprofen');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add' }));
    expect(await within(dialog).findByText('Enter the date on the package')).toBeInTheDocument();

    await userEvent.type(within(dialog).getByLabelText('Expires (EXP on the box)'), '2027-03-01');
    await userEvent.selectOptions(within(dialog).getByLabelText('For (optional)'), 'Mia');
    await userEvent.type(within(dialog).getByLabelText('Dose (optional)'), '1 tablet with food');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add' }));
    expect(calls.find((c) => c.method === 'POST' && c.path === '/stock').body).toEqual({
      kind: 'medicine',
      name: 'Ibuprofen',
      categoryId: null,
      placeId: 'p4',
      quantity: 1,
      unit: 'pcs',
      dateKind: 'use_by',
      expiresOn: '2027-03-01',
      forUserId: 'u3',
      doseNote: '1 tablet with food',
    });
  });

  it('says to dispose of expired medicine, and shows who it is for and the dose', async () => {
    mockApi({
      ...signedIn(),
      'GET /household': () => household,
      'GET /stock/summary': () => medSummary,
      'GET /stock': () => [calpol({ urgency: { level: 'expired', daysLeft: -2 } })],
      'GET /stock/m1': () => ({
        ...calpol({ urgency: { level: 'expired', daysLeft: -2 } }),
        events: [],
      }),
    });
    renderApp('/medicine');
    await userEvent.click(await screen.findByRole('button', { name: /Calpol/ }));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText(/Do not use. Dispose of it safely/)).toBeInTheDocument();
    expect(within(dialog).getByText('Expired: dispose of it')).toBeInTheDocument();
    expect(within(dialog).getByText('Mia')).toBeInTheDocument();
    expect(within(dialog).getByText('5 ml every 6 hours')).toBeInTheDocument();
  });

  it('is hidden from viewers', async () => {
    mockApi({
      ...signedIn(userWith({ householdRole: 'viewer' })),
      'GET /stock/summary': () => ({
        today: '2026-11-01',
        counts: { expired: 0, today: 0, soon: 0, week: 0, total: 0 },
        attention: [],
      }),
    });
    renderApp('/medicine');
    // Sent home instead.
    expect(await screen.findByText('Your storage is empty')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Medicine' })).not.toBeInTheDocument();
  });

  it('shows a one-line notice on Home for members', async () => {
    mockApi({
      ...signedIn(userWith({ householdRole: 'member' })),
      'GET /stock/summary': (_b, url) =>
        url.searchParams.get('kind') === 'medicine'
          ? medSummary
          : {
              today: '2026-11-01',
              counts: { expired: 0, today: 0, soon: 0, week: 0, total: 2 },
              attention: [],
            },
    });
    renderApp('/');
    const notice = await screen.findByRole('link', {
      name: /Medicine: 1 expired, 1 within 14 days/,
    });
    expect(notice).toHaveAttribute('href', '/medicine');
  });
});
