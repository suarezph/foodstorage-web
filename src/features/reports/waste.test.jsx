import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockApi, renderApp, signedIn } from '../../test/render.jsx';

afterEach(() => vi.restoreAllMocks());

const report = {
  from: '2026-08-01',
  to: '2026-10-31',
  finished: 1,
  discarded: 3,
  wastePercent: 75,
  byReason: { expired: 2, spoiled: 1, other: 0 },
  byCategory: [{ name: 'Dairy', count: 2 }],
  topFoods: [
    { name: 'Milk', count: 2 },
    { name: 'Spinach', count: 1 },
  ],
  byMonth: [
    { month: '2026-08', finished: 0, discarded: 0 },
    { month: '2026-09', finished: 0, discarded: 1 },
    { month: '2026-10', finished: 1, discarded: 2 },
  ],
};

describe('Waste', () => {
  it('shows the share thrown away, why, and what, with numbers next to the bars', async () => {
    const calls = mockApi({ ...signedIn(), 'GET /reports/waste': () => report });
    renderApp('/waste');
    expect(await screen.findByText('75%')).toBeInTheDocument();
    expect(screen.getByText('3 thrown away, 1 eaten or used (4 items)')).toBeInTheDocument();
    expect(screen.getByText('It expired').nextSibling).toHaveTextContent('2');
    expect(screen.getByText('Spinach')).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Period'), 'Last 12 months');
    expect(calls.filter((c) => c.path === '/reports/waste').at(-1).query).toEqual({ months: '12' });
  });

  it('explains an empty report', async () => {
    mockApi({
      ...signedIn(),
      'GET /reports/waste': () => ({ ...report, finished: 0, discarded: 0, wastePercent: null }),
    });
    renderApp('/waste');
    expect(await screen.findByText('Nothing used up yet')).toBeInTheDocument();
  });
});
