import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { localIso } from '../../lib/food.js';
import { item, mockApi, renderApp, signedIn } from '../../test/render.jsx';
import { frozenText, monthsBetween } from './FreezerPage.jsx';

afterEach(() => vi.restoreAllMocks());

describe('monthsBetween', () => {
  it('counts a month only once its day is reached', () => {
    expect(monthsBetween('2026-10-01', '2026-10-31')).toBe(0);
    expect(monthsBetween('2026-09-30', '2026-10-29')).toBe(0);
    expect(monthsBetween('2026-09-30', '2026-10-30')).toBe(1);
    expect(monthsBetween('2025-11-15', '2026-10-31')).toBe(11);
    expect(frozenText(1)).toBe('Frozen 1 month ago');
  });
});

describe('Freezer', () => {
  it('lists every freezer, grouped by how long ago it went in', async () => {
    const back = (days) => {
      const d = new Date();
      d.setDate(d.getDate() - days);
      return localIso(-days);
    };
    const freezer = { id: 'p2', name: 'Freezer', kind: 'freezer' };
    const calls = mockApi({
      ...signedIn(),
      'GET /stock': () => [
        item({
          id: 'a',
          food: { id: 'fa', name: 'Peas', category: null },
          place: freezer,
          placedOn: back(0),
        }),
        item({
          id: 'b',
          food: { id: 'fb', name: 'Beef', category: null },
          place: freezer,
          placedOn: back(200),
        }),
      ],
    });
    renderApp('/freezer');
    expect(await screen.findByText('This month')).toBeInTheDocument();
    expect(screen.getByText('6 months or more')).toBeInTheDocument();
    expect(screen.getByText('Frozen this month')).toBeInTheDocument();
    expect(screen.getByText(/^Frozen \d+ months ago$/)).toBeInTheDocument();
    expect(calls.find((c) => c.path === '/stock').query).toEqual({
      status: 'active',
      placeKind: 'freezer',
    });
  });
});
