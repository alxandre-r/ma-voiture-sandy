// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { TOUR_STEPS } from '@/lib/demo/tour/steps';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return name.endsWith('.tsx') ? [path] : [];
  });
}

const SOURCES = ['app', 'components'].flatMap(sourceFiles).map((file) => ({
  file,
  text: readFileSync(file, 'utf8'),
}));

/** data-tour="id", or data-tour={… 'id' …} for a conditional anchor */
function filesAnchoring(id: string): string[] {
  const pattern = new RegExp(`data-tour=(?:"${id}"|\{[^}]*'${id}'[^}]*\})`);
  return SOURCES.filter(({ text }) => pattern.test(text)).map(({ file }) => file);
}

/** Whole opening tags (from '<' to the closing '>' outside braces) carrying a data-tour attribute */
function anchoredOpeningTags(text: string): string[] {
  const tags: string[] = [];
  let from = text.indexOf('data-tour=');
  while (from !== -1) {
    const start = text.lastIndexOf('<', from);
    let depth = 0;
    let end = from;
    for (; end < text.length; end++) {
      const char = text[end];
      if (char === '{') depth++;
      else if (char === '}') depth--;
      else if (char === '>' && depth === 0 && text[end - 1] !== '=') break;
    }
    tags.push(text.slice(start, end + 1));
    from = text.indexOf('data-tour=', from + 1);
  }
  return tags;
}

const ANCHOR_IDS = [
  ...new Set(
    TOUR_STEPS.flatMap((step) => [
      step.target,
      step.onEnter?.type === 'click' ? step.onEnter.target : undefined,
      step.onExit?.type === 'click' ? step.onExit.target : undefined,
    ]).filter((id): id is string => Boolean(id)),
  ),
];

describe('tour anchors (spec §9)', () => {
  it.each(ANCHOR_IDS)('data-tour="%s" exists in the source', (id) => {
    expect(filesAnchoring(id)).not.toEqual([]);
  });

  it('never puts an anchor on a display: contents wrapper (no measurable box)', () => {
    for (const { file, text } of SOURCES) {
      for (const tag of anchoredOpeningTags(text)) {
        expect(tag, file).not.toMatch(/\bcontents\b/);
      }
    }
  });
});
