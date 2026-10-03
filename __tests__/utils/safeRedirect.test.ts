import { describe, expect, it } from 'vitest';
import { getSafeRedirect } from '@/lib/utils/safeRedirect';

describe('getSafeRedirect', () => {
  it('keeps same-origin relative paths with query and hash', () => {
    expect(getSafeRedirect('/family/join?token=abc')).toBe('/family/join?token=abc');
    expect(getSafeRedirect('/garage#top')).toBe('/garage#top');
  });

  it('falls back when empty', () => {
    expect(getSafeRedirect(null)).toBe('/dashboard');
    expect(getSafeRedirect('')).toBe('/dashboard');
    expect(getSafeRedirect(undefined, '/x')).toBe('/x');
  });

  it.each([
    'javascript:alert(1)',
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    '/\t/evil.example',
    'evil.example',
    'data:text/html,hi',
  ])('rejects %s', (raw) => {
    expect(getSafeRedirect(raw)).toBe('/dashboard');
  });
});
