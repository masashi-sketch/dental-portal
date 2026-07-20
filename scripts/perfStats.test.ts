import { describe, expect, it } from 'vitest';
import { percentile, summarize } from './perfStats.mjs';

describe('percentile', () => {
  it('returns null for empty input', () => {
    expect(percentile([], 50)).toBeNull();
  });

  it('returns the single value regardless of p', () => {
    expect(percentile([42], 95)).toBe(42);
  });

  it('interpolates between ranks', () => {
    const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(percentile(sorted, 50)).toBeCloseTo(5.5, 5);
    expect(percentile(sorted, 0)).toBe(1);
    expect(percentile(sorted, 100)).toBe(10);
  });

  it('matches a known p95 interpolation', () => {
    const sorted = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    // rank = 0.95 * 9 = 8.55 -> between index 8 (90) and 9 (100), weight 0.55
    expect(percentile(sorted, 95)).toBeCloseTo(95.5, 5);
  });
});

describe('summarize', () => {
  it('computes count/min/max/percentiles without mutating input', () => {
    const samples = [5, 1, 4, 2, 3];
    const result = summarize(samples);
    expect(samples).toEqual([5, 1, 4, 2, 3]);
    expect(result).toEqual({
      count: 5,
      min: 1,
      p50: 3,
      p75: 4,
      p95: 4.8,
      max: 5,
    });
  });

  it('handles a single sample', () => {
    expect(summarize([7])).toEqual({
      count: 1,
      min: 7,
      p50: 7,
      p75: 7,
      p95: 7,
      max: 7,
    });
  });
});
