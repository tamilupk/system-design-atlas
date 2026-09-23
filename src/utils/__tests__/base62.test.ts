import { describe, it, expect } from 'vitest';
import { encodeBase62, decodeBase62, BASE62_ALPHABET } from '../base62';

describe('Base62 Canonical Encoding', () => {
  it('uses the exact 62-character alphabet 0-9, A-Z, a-z', () => {
    expect(BASE62_ALPHABET).toBe('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz');
    expect(BASE62_ALPHABET.length).toBe(62);
  });

  it('matches all specified benchmark conversions', () => {
    expect(encodeBase62(125)).toBe('21');
    expect(encodeBase62(1_000_000)).toBe('4C92');
    expect(encodeBase62(35_000_000)).toBe('2Mr68');
  });

  it('encodes edge numbers', () => {
    expect(encodeBase62(0)).toBe('0');
    expect(encodeBase62(1)).toBe('1');
    expect(encodeBase62(61)).toBe('z');
    expect(encodeBase62(62)).toBe('10');
  });

  it('round-trips correctly with decodeBase62', () => {
    const testValues = [0, 1, 61, 62, 125, 1_000_000, 35_000_000, 3_500_000_000_000];
    for (const val of testValues) {
      const encoded = encodeBase62(val);
      const decoded = decodeBase62(encoded);
      expect(Number(decoded)).toBe(val);
    }
  });

  it('throws for negative numbers and invalid characters', () => {
    expect(() => encodeBase62(-1)).toThrow();
    expect(() => decodeBase62('invalid-!@#')).toThrow();
  });
});
