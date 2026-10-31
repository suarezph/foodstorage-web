import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockApi, renderApp, signedIn, userWith } from '../../test/render.jsx';

afterEach(() => vi.restoreAllMocks());

describe('Households & people', () => {
  it('creates a household, then a person with a temporary password shown once', async () => {
    const admin = userWith({ role: 'admin', household: null, householdRole: null });
    const households = [];
    const people = [{ ...admin, household: null, disabledAt: null, lastLoginAt: null }];
    const calls = mockApi({
      ...signedIn(admin),
      'GET /admin/households': () => households,
      'GET /admin/users': () => people,
      'POST /admin/households': (body) => {
        households.push({ id: 'h1', memberCount: 0, ...body });
        return households[0];
      },
      'POST /admin/users': (body) => {
        const user = {
          id: 'u2',
          ...body,
          household: { id: 'h1', name: 'Suarez Family Food Storage' },
          disabledAt: null,
          mustChangePassword: true,
        };
        people.push(user);
        return { user, temporaryPassword: 'Hk7m-Q2xP-9tRw-aB4n' };
      },
    });
    renderApp('/admin');

    await userEvent.type(
      await screen.findByLabelText('New household'),
      'Suarez Family Food Storage',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(calls.find((c) => c.path === '/admin/households' && c.method === 'POST').body).toEqual({
      name: 'Suarez Family Food Storage',
      timeZone: 'Asia/Singapore',
    });
    expect(await screen.findByText(/You are not in a household yet/)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Name'), 'Mia');
    await userEvent.type(screen.getByLabelText('Username'), 'mia');
    await userEvent.selectOptions(screen.getByLabelText('Household'), 'Suarez Family Food Storage');
    await userEvent.selectOptions(screen.getByLabelText('Role in the household'), 'viewer');
    await userEvent.click(screen.getByRole('button', { name: 'Add person' }));

    expect(calls.find((c) => c.path === '/admin/users' && c.method === 'POST').body).toEqual({
      username: 'mia',
      name: 'Mia',
      role: 'user',
      householdId: 'h1',
      householdRole: 'viewer',
    });
    const shown = await screen.findByRole('status');
    expect(within(shown).getByText('Hk7m-Q2xP-9tRw-aB4n')).toBeInTheDocument();
    await userEvent.click(within(shown).getByRole('button', { name: 'Done' }));
    expect(screen.queryByText('Hk7m-Q2xP-9tRw-aB4n')).not.toBeInTheDocument();
  });

  it('puts the admin in a household as a manager', async () => {
    let admin = userWith({ role: 'admin', household: null, householdRole: null });
    const calls = mockApi({
      ...signedIn(admin),
      'GET /me': () => admin,
      'GET /admin/households': () => [
        { id: 'h1', name: 'Home', timeZone: 'Asia/Singapore', memberCount: 0 },
      ],
      'GET /admin/users': () => [{ ...admin, disabledAt: null, lastLoginAt: null }],
      'PATCH /admin/users/u1': (body) => {
        admin = userWith({
          role: 'admin',
          household: { id: 'h1', name: 'Home', timeZone: 'Asia/Singapore' },
          householdRole: 'manager',
        });
        return { ...admin, ...body };
      },
    });
    renderApp('/admin');
    // No reset or disable for yourself.
    expect(await screen.findByLabelText("Alex's household")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Disable' })).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Alex's household"), 'Home');
    expect(calls.find((c) => c.method === 'PATCH').body).toEqual({ householdId: 'h1' });
    expect(await screen.findByRole('link', { name: 'Storage' })).toBeInTheDocument();
  });
});
