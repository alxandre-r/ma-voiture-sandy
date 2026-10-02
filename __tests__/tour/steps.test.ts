import { describe, expect, it } from 'vitest';

import { routePath } from '@/lib/demo/tour/reducer';
import { TOUR_CHAPTERS, TOUR_ROUTE_LABELS, TOUR_STEPS } from '@/lib/demo/tour/steps';

const words = (text: string) => text.match(/[\p{L}\p{N}][\p{L}\p{N}'’+]*/gu) ?? [];
const sentences = (text: string) => (text.match(/[.!?…](?=\s|$)/g) ?? []).length;

describe('tour scenario (spec §8)', () => {
  it('has 19 steps in 7 chapters, in the order of the spec', () => {
    expect(TOUR_CHAPTERS).toHaveLength(7);
    expect(TOUR_STEPS.map((step) => [step.route, step.target])).toEqual([
      ['/dashboard', 'dashboard-stats'],
      ['/dashboard', 'dashboard-insights'],
      ['/dashboard', 'dashboard-vehicles'],
      ['/dashboard', 'header-filters'],
      ['/dashboard', 'expense-button'],
      ['/statistics', 'stats-overview'],
      ['/statistics', 'stats-monthly'],
      ['/statistics', 'stats-carbon'],
      ['/statistics', 'stats-comparison'],
      ['/expenses', 'expenses-filters'],
      ['/expenses', 'expenses-list'],
      ['/expenses', 'expenses-csv'],
      ['/maintenance', 'maintenance-suggestions'],
      ['/reminders', 'reminders-list'],
      ['/insurance', 'insurance-overview'],
      ['/garage?vehicleId=101', 'vehicle-health'],
      ['/family', 'family-vehicles'],
      ['/family', 'global-search'],
      ['/settings', 'settings-panel'],
    ]);
  });

  it('uses unique step ids', () => {
    const ids = TOUR_STEPS.map((step) => step.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps every chapter contiguous and in chapter order', () => {
    const chapterOrder = TOUR_CHAPTERS.map((chapter) => chapter.id);
    const sequence = TOUR_STEPS.map((step) => step.chapter).filter(
      (chapter, index, all) => index === 0 || all[index - 1] !== chapter,
    );
    expect(sequence).toEqual(chapterOrder);
  });

  it('has a page label for every route (shown while navigating)', () => {
    for (const step of TOUR_STEPS) {
      expect(TOUR_ROUTE_LABELS[routePath(step.route)], step.id).toBeTruthy();
    }
  });

  it('keeps titles to 6 words and bodies to 1–2 sentences', () => {
    for (const step of TOUR_STEPS) {
      expect(words(step.title).length, step.title).toBeLessThanOrEqual(6);
      expect(sentences(step.body), step.body).toBeGreaterThanOrEqual(1);
      expect(sentences(step.body), step.body).toBeLessThanOrEqual(2);
    }
  });

  it('lets the visitor play with the filters and scripts the two menus', () => {
    const byId = Object.fromEntries(TOUR_STEPS.map((step) => [step.id, step]));
    expect(byId['header-filters'].interactive).toBe(true);
    expect(byId['expense-button'].onEnter).toEqual({ type: 'click', target: 'expense-button' });
    expect(byId['expense-button'].onExit).toEqual({ type: 'click-outside' });
    expect(byId['settings-panel'].onEnter).toEqual({
      type: 'click',
      target: 'settings-preferences',
    });
  });
});
