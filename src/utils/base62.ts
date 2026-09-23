/**
 * Canonical Base62 implementation using the standard alphabet:
 * 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz
 *
 * Guaranteed mappings:
 *   125        -> "21"
 *   1000000    -> "4C92"
 *   35000000   -> "2Mr68"
 */

export const BASE62_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export function encodeBase62(num: number | bigint): string {
  let n = typeof num === 'number' ? BigInt(num) : num;
  if (n === 0n) return BASE62_ALPHABET.charAt(0);
  if (n < 0n) throw new Error('Base62 encoding requires non-negative integers');

  let result = '';
  const base = 62n;

  while (n > 0n) {
    const remainder = Number(n % base);
    result = BASE62_ALPHABET.charAt(remainder) + result;
    n = n / base;
  }

  return result;
}

export function decodeBase62(str: string): bigint {
  if (!str) throw new Error('Input string cannot be empty');

  let result = 0n;
  const base = 62n;

  for (let i = 0; i < str.length; i++) {
    const char = str.charAt(i);
    const index = BASE62_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid Base62 character: "${char}"`);
    }
    result = result * base + BigInt(index);
  }

  return result;
}
