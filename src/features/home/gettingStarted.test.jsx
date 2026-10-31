import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockApi, renderApp, signedIn, userWith } from '../../test/render.jsx';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

const summary = (total) => ({
  today: '2026-11-01',
  counts: { expired: 0, today: 0, soon: 0, week: 0, total },
  attention: [],
});
const household = (n) => ({
  id: 'h1',
  name: 'Victoria',
  timeZone: 'Asia/Singapore',
  members: Array.from({ length: n }, (_, i) => ({ id: `u${i}`, name: `P${i}`, role: 'manager' })),
});
const settings = (over = {}) => ({
  enabled: true,
  hour: 8,
  push: true,
  email: true,
  devices: 0,
  emailAddress: null,
  available: { push: true, email: true },
  ...over,
});

describe('Getting started', () => {
  it('lists what is left for an admin of a new household, and hides', async () => {
    mockApi({
      ...signedIn(userWith({ role: 'admin' })),
      'GET /stock/summary': () => summary(0),
      'GET /household': () => household(1),
      'GET /push/settings': () => settings(),
    });
    renderApp('/');
    const card = await screen.findByRole('region', { name: 'Getting started' });
    expect(within(card).getByText('4 steps left')).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: 'Households & people' })).toHaveAttribute(
      'href',
      '/admin',
    );
    await userEvent.click(within(card).getByRole('button', { name: 'Add food' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('button', { name: 'Hide' }));
    expect(screen.queryByText('Getting started')).not.toBeInTheDocument();
    expect(localStorage.getItem('usefirst.gettingStarted.hidden.u1')).toBe('1');
  });

  it('ticks steps off from real data and goes when everything is done', async () => {
    mockApi({
      ...signedIn(userWith({ householdRole: 'member' })),
      'GET /stock/summary': () => summary(3),
      'GET /household': () => household(2),
      'GET /push/settings': () => settings({ devices: 1 }),
    });
    renderApp('/');
    await screen.findByText('Use these first');
    expect(screen.queryByText('Getting started')).not.toBeInTheDocument();
  });

  it('counts an emailed summary as on', async () => {
    mockApi({
      ...signedIn(userWith({ householdRole: 'viewer' })),
      'GET /stock/summary': () => summary(0),
      'GET /household': () => household(2),
      'GET /push/settings': () => settings({ emailAddress: 'alex@example.com' }),
    });
    renderApp('/');
    expect(await screen.findByText('1 step left')).toBeInTheDocument();
    expect(screen.getByText('Put UseFirst on your phone')).toBeInTheDocument();
  });
});
