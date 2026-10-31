import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockApi, renderApp, signedIn, userWith } from '../test/render.jsx';

afterEach(() => vi.restoreAllMocks());

const summary = {
  today: '2026-10-31',
  counts: { expired: 0, today: 0, soon: 0, week: 0, total: 0 },
  attention: [],
};

describe('signing in', () => {
  it('signs in with a username and lands on Home', async () => {
    const user = userWith();
    const calls = mockApi({
      'POST /auth/refresh': () => ({
        status: 401,
        error: { code: 'UNAUTHENTICATED', message: 'No session' },
      }),
      'POST /auth/login': () => ({ accessToken: 't', expiresIn: 900, user }),
      ...Object.fromEntries(
        Object.entries(signedIn(user)).filter(([k]) => k !== 'POST /auth/refresh'),
      ),
      'GET /stock/summary': () => summary,
    });
    renderApp('/');
    await userEvent.type(await screen.findByLabelText('Username or email'), 'alex');
    await userEvent.type(screen.getByLabelText('Password'), 'correct horse battery');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('heading', { name: 'Hi, Alex' })).toBeInTheDocument();
    expect(calls.find((c) => c.path === '/auth/login').body).toEqual({
      username: 'alex',
      password: 'correct horse battery',
    });
  });

  it('shows the server message for a wrong password', async () => {
    mockApi({
      'POST /auth/refresh': () => ({
        status: 401,
        error: { code: 'UNAUTHENTICATED', message: 'No session' },
      }),
      'POST /auth/login': () => ({
        status: 401,
        error: { code: 'UNAUTHENTICATED', message: 'Incorrect username or password' },
      }),
    });
    renderApp('/login');
    await userEvent.type(await screen.findByLabelText('Username or email'), 'alex');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Incorrect username or password')).toBeInTheDocument();
  });

  it('holds a temporary password on the change-password page', async () => {
    mockApi(signedIn(userWith({ mustChangePassword: true })));
    renderApp('/storage');
    expect(
      await screen.findByRole('heading', { name: 'Choose your own password' }),
    ).toBeInTheDocument();
  });
});

describe('households', () => {
  it('tells someone without a household to ask the admin', async () => {
    mockApi(signedIn(userWith({ household: null, householdRole: null })));
    renderApp('/');
    expect(await screen.findByText('You are not in a household yet')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Storage' })).not.toBeInTheDocument();
  });

  it('sends an admin without a household to set one up', async () => {
    mockApi({
      ...signedIn(userWith({ role: 'admin', household: null, householdRole: null })),
      'GET /admin/households': () => [],
      'GET /admin/users': () => [],
    });
    renderApp('/');
    expect(await screen.findByRole('heading', { name: 'Households & people' })).toBeInTheDocument();
    expect(await screen.findByText(/No households yet/)).toBeInTheDocument();
  });

  it('keeps the admin page from people who are not admins', async () => {
    mockApi({ ...signedIn(userWith()), 'GET /stock/summary': () => summary });
    renderApp('/admin');
    expect(await screen.findByRole('heading', { name: 'Hi, Alex' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Households & people' })).not.toBeInTheDocument();
  });

  it('shows the household name in the sidebar', async () => {
    mockApi({ ...signedIn(userWith()), 'GET /stock/summary': () => summary });
    renderApp('/');
    expect(await screen.findAllByText('Suarez Family Food Storage')).not.toHaveLength(0);
  });
});
