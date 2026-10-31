import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockApi, renderApp, signedIn } from '../../test/render.jsx';

afterEach(() => vi.restoreAllMocks());

const settings = { enabled: true, hour: 8, devices: 0 };

describe('Notifications settings', () => {
  it('says when the server has no push keys', async () => {
    mockApi({
      ...signedIn(),
      'GET /push/key': () => ({ enabled: false, publicKey: null }),
      'GET /push/settings': () => settings,
    });
    renderApp('/settings');
    expect(
      await screen.findByText('Notifications are not set up on the server yet.'),
    ).toBeInTheDocument();
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
});
