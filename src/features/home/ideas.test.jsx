import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockApi, renderApp, signedIn, userWith } from '../../test/render.jsx';

afterEach(() => vi.restoreAllMocks());

const summary = {
  today: '2026-10-31',
  counts: { expired: 0, today: 0, soon: 0, week: 0, total: 0 },
  attention: [],
};

describe('What can I cook?', () => {
  it('shows ideas with what they use and the steps', async () => {
    mockApi({
      ...signedIn(),
      'GET /stock/summary': () => summary,
      'POST /ideas': () => ({
        ideas: [
          {
            title: 'Chicken adobo',
            why: 'Uses the chicken today',
            uses: ['Chicken thighs', 'Rice'],
            alsoNeeds: ['soy sauce'],
            steps: ['Brown the chicken', 'Simmer'],
            minutes: 45,
          },
        ],
        basedOn: ['Chicken thighs'],
      }),
    });
    renderApp('/');
    await screen.findByText('Your storage is empty');
    await userEvent.click(screen.getByRole('button', { name: 'What can I cook?' }));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('Chicken adobo')).toBeInTheDocument();
    expect(within(dialog).getByText(/Uses:/).parentElement).toHaveTextContent(
      'Uses: Chicken thighs, Rice · Also needs: soy sauce',
    );
    expect(within(dialog).getByText('Simmer')).toBeInTheDocument();
  });

  it('says why there are no ideas', async () => {
    mockApi({
      ...signedIn(),
      'GET /stock/summary': () => summary,
      'POST /ideas': () => ({
        status: 422,
        error: { code: 'NOTHING_SOON', message: 'Nothing needs using up this week' },
      }),
    });
    renderApp('/');
    await screen.findByText('Your storage is empty');
    await userEvent.click(screen.getByRole('button', { name: 'What can I cook?' }));
    expect(await screen.findByText(/Nothing needs using up this week/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('is not offered to viewers', async () => {
    mockApi({
      ...signedIn(userWith({ householdRole: 'viewer' })),
      'GET /stock/summary': () => summary,
    });
    renderApp('/');
    await screen.findByText('Your storage is empty');
    expect(screen.queryByRole('button', { name: 'What can I cook?' })).not.toBeInTheDocument();
  });
});
