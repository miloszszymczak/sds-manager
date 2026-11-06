import { describe, it, expect } from 'vitest';
import { freshnessOf, FRESHNESS_LABEL, STALE_AFTER_DAYS } from './freshness';

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

describe('freshnessOf', () => {
  it('brak daty → never', () => {
    expect(freshnessOf(null)).toBe('never');
    expect(freshnessOf(undefined)).toBe('never');
  });
  it('świeża weryfikacja → fresh', () => {
    expect(freshnessOf(daysAgo(10))).toBe('fresh');
  });
  it('tuż przed progiem → fresh, tuż za progiem → stale', () => {
    expect(freshnessOf(daysAgo(STALE_AFTER_DAYS - 1))).toBe('fresh');
    expect(freshnessOf(daysAgo(STALE_AFTER_DAYS + 1))).toBe('stale');
  });
  it('data nieczytelna → never (bez fałszywego „fresh")', () => {
    expect(freshnessOf('nie-data')).toBe('never');
  });
  it('akceptuje datę jako string ISO', () => {
    expect(freshnessOf(daysAgo(5).toISOString())).toBe('fresh');
  });
  it('każdy stan ma etykietę', () => {
    expect(FRESHNESS_LABEL.never).toBeTruthy();
    expect(FRESHNESS_LABEL.fresh).toBeTruthy();
    expect(FRESHNESS_LABEL.stale).toBeTruthy();
  });
});
