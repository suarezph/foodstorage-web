import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockApi, renderApp, signedIn, userWith } from '../../test/render.jsx';

afterEach(() => vi.restoreAllMocks());

const settings = {
  enabled: true,
  hour: 8,
  push: true,
  email: true,
  devices: 0,
  emailAddress: 'alex@example.com',
  available: { push: true, email: true },
};

describe('Notifications settings', () => {
  it('says when the server has no push keys', async () => {
    mockApi({
      ...signedIn(),
      'GET /push/key': () => ({ enabled: false, publicKey: null }),
      'GET /push/settings': () => ({ ...settings, available: { push: false, email: false } }),
    });
    renderApp('/settings');
    expect(
      await screen.findByText('Notifications are not set up on the server yet.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Email is not set up on the server yet.')).toBeInTheDocument();
  });

  it('explains when this browser cannot show notifications', async () => {
    mockApi({
      ...signedIn(),
      'GET /push/key': () => ({ enabled: true, publicKey: 'BKey' }),
      'GET /push/settings': () => settings,
    });
    renderApp('/settings'); // jsdom has no service worker or PushManager
    expect(await screen.findByText('This browser cannot show notifications.')).toBeInTheDocument();
  });

  it('tells iPhone users to add the app to the Home Screen first', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15',
    );
    mockApi({
      ...signedIn(),
      'GET /push/key': () => ({ enabled: true, publicKey: 'BKey' }),
      'GET /push/settings': () => settings,
    });
    renderApp('/settings');
    expect(await screen.findByText(/Add to Home Screen/)).toBeInTheDocument();
  });

  it('emails the summary, turns email off, and sends a test email', async () => {
    let current = { ...settings };
    const calls = mockApi({
      ...signedIn(),
      'GET /push/key': () => ({ enabled: true, publicKey: 'BKey' }),
      'GET /push/settings': () => current,
      'PATCH /push/settings': (body) => (current = { ...current, ...body }),
      'POST /push/test-email': () => ({ sent: 1 }),
    });
    renderApp('/settings');
    const box = await screen.findByLabelText('Email it to alex@example.com');
    expect(box).toBeChecked();
    await userEvent.click(box);
    expect(calls.find((c) => c.method === 'PATCH').body).toEqual({ email: false });
    await userEvent.click(screen.getByRole('button', { name: 'Send a test email' }));
    expect(await screen.findByText(/Check your inbox/)).toBeInTheDocument();
    expect(screen.getByText('alex@example.com', { selector: 'dd' })).toBeInTheDocument();
  });

  it('says when your account has no email', async () => {
    mockApi({
      ...signedIn(),
      'GET /push/key': () => ({ enabled: true, publicKey: 'BKey' }),
      'GET /push/settings': () => ({ ...settings, emailAddress: null }),
    });
    renderApp('/settings');
    expect(await screen.findByText(/Your account has no email address/)).toBeInTheDocument();
  });

  it('shows test buttons to managers only', async () => {
    mockApi({
      ...signedIn(userWith({ householdRole: 'member' })),
      'GET /push/key': () => ({ enabled: true, publicKey: 'BKey' }),
      'GET /push/settings': () => settings,
    });
    renderApp('/settings');
    expect(await screen.findByLabelText('Email it to alex@example.com')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send a test email' })).not.toBeInTheDocument();
  });
});
