/**
 * @file lib/utils/postgrestFilter.ts
 * @fileoverview Escaping helpers for user input placed in PostgREST filters.
 */

/** `%term%` with LIKE wildcards (`%`, `_`) and the escape char (`\`) neutralised */
export function toIlikePattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, '\\$&')}%`;
}

/**
 * Double-quote a value for PostgREST's `.or()` / logic-tree grammar so that `,` `(` `)` `.`
 * in user input stay literal instead of adding filters.
 */
export function quoteFilterValue(value: string): string {
  return `"${value.replace(/[\\"]/g, '\\$&')}"`;
}
