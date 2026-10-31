import { describe, expect, it } from 'vitest';
import { addDaysIso, can, defaultDays, formatQuantity, urgencyText } from './food.js';

const at = (level, daysLeft, dateKind = 'use_by') => ({
  status: 'active',
  dateKind,
  urgency: { level, daysLeft },
});

describe('urgencyText', () => {
  it.each([
    [at('expired', -1), 'Expired 1 day ago'],
    [at('expired', -3, 'best_before'), 'Past best before (3 days)'],
    [at('today', 0), 'Use today'],
    [at('today', 0, 'best_before'), 'Best before today'],
    [at('soon', 1), 'Tomorrow'],
    [at('week', 5), 'In 5 days'],
    [at('later', 40), 'In 40 days'],
    [{ status: 'finished', urgency: null }, 'Finished'],
    [{ status: 'discarded', urgency: null }, 'Thrown away'],
  ])('%o → %s', (item, text) => {
    expect(urgencyText(item)).toBe(text);
  });
});

describe('helpers', () => {
  it('formats amounts without float noise', () => {
    expect(formatQuantity(2, 'carton')).toBe('2 carton');
    expect(formatQuantity(0.1 + 0.2, 'kg')).toBe('0.3 kg');
  });

  it('ranks roles', () => {
    expect(can({ householdRole: 'manager' }, 'member')).toBe(true);
    expect(can({ householdRole: 'member' }, 'manager')).toBe(false);
    expect(can({ householdRole: 'viewer' }, 'viewer')).toBe(true);
    expect(can({ householdRole: null }, 'viewer')).toBe(false);
  });

  it('finds the default days and adds them', () => {
    const dairy = { fridgeDays: 7, freezerDays: 90, pantryDays: null };
    expect(defaultDays(dairy, 'fridge')).toBe(7);
    expect(defaultDays(dairy, 'pantry')).toBe(null);
    expect(defaultDays(dairy, 'other')).toBe(null);
    expect(addDaysIso('2026-10-31', 7)).toBe('2026-11-07');
  });
});
