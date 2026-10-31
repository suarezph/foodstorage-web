import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { item, mockApi, renderApp, signedIn } from '../../test/render.jsx';

afterEach(() => vi.restoreAllMocks());

describe('adding by barcode', () => {
  it('fills in a food the household had, and sends the barcode with it', async () => {
    const calls = mockApi({
      ...signedIn(),
      'GET /stock': () => [],
      'GET /foods/barcode/4800361002257': () => ({
        code: '4800361002257',
        food: {
          id: 'f1',
          name: 'Fresh milk',
          unit: 'carton',
          category: { id: 'c1', name: 'Dairy' },
          lastPlaceId: 'p1',
        },
        product: null,
      }),
      'POST /stock': (body) => item({ food: { id: 'f1', name: body.name, category: null } }),
    });
    renderApp('/storage');
    await userEvent.click(await screen.findByRole('button', { name: 'Add food' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Barcode (optional)'), '4800-3610 02257');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Look up' }));
    expect(
      await within(dialog).findByText('Fresh milk: you have had this before.'),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText('What is it?')).toHaveValue('Fresh milk');
    expect(within(dialog).getByLabelText('Category')).toHaveValue('c1');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add' }));
    expect(calls.find((c) => c.path === '/stock' && c.method === 'POST').body).toMatchObject({
      name: 'Fresh milk',
      categoryId: 'c1',
      unit: 'carton',
      barcode: '4800361002257',
    });
  });

  it('uses the Open Food Facts name for a new barcode', async () => {
    mockApi({
      ...signedIn(),
      'GET /stock': () => [],
      'GET /foods/barcode/12345678': () => ({
        code: '12345678',
        food: null,
        product: { name: 'Corned beef', brand: 'Argentina', quantity: '150 g' },
      }),
    });
    renderApp('/storage');
    await userEvent.click(await screen.findByRole('button', { name: 'Add food' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Barcode (optional)'), '12345678');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Look up' }));
    expect(await within(dialog).findByText(/Found: Argentina, 150 g/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText('What is it?')).toHaveValue('Corned beef');
    // No camera API in this browser: no Scan button, typing still works.
    expect(within(dialog).queryByRole('button', { name: /Scan/ })).not.toBeInTheDocument();
  });
});
