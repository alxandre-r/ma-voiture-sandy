import { describe, expect, it } from 'vitest';
import { quoteFilterValue, toIlikePattern } from '@/lib/utils/postgrestFilter';

describe('toIlikePattern', () => {
  it('wraps plain terms', () => {
    expect(toIlikePattern('vidange')).toBe('%vidange%');
  });

  it('escapes LIKE wildcards and the escape char', () => {
    expect(toIlikePattern('50%_a\\b')).toBe('%50\\%\\_a\\\\b%');
  });
});

describe('quoteFilterValue', () => {
  it('quotes and escapes double quotes and backslashes', () => {
    expect(quoteFilterValue('a,b)"c\\d')).toBe('"a,b)\\"c\\\\d"');
  });
});
