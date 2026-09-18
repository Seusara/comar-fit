import { describe, expect, it } from 'vitest';
import { getAssetUrl } from '@bryllim/workout-guide';
import { ROUTINE_CATALOG, findExerciseReference } from './catalog';

describe('exercise form references', () => {
  it('has a reference for every exercise in the catalog', () => {
    const missing = ROUTINE_CATALOG
      .filter((exercise) => !findExerciseReference(exercise.name))
      .map((exercise) => exercise.name);
    expect(missing).toEqual([]);
  });

  it('gives every reference at least one tip', () => {
    for (const exercise of ROUTINE_CATALOG) {
      const reference = findExerciseReference(exercise.name);
      expect(reference.tips.length).toBeGreaterThan(0);
    }
  });

  it('resolves a real sprite asset for every sprite-backed reference', () => {
    for (const exercise of ROUTINE_CATALOG) {
      const reference = findExerciseReference(exercise.name);
      if (reference.formReferenceType !== 'sprite') continue;
      expect(getAssetUrl(reference.spriteSlug, 1)).toMatch(/^https:\/\/cdn\.jsdelivr\.net\//);
    }
  });

  it('gives every youtube reference a real embed URL', () => {
    for (const exercise of ROUTINE_CATALOG) {
      const reference = findExerciseReference(exercise.name);
      if (!reference.formReferenceType?.startsWith('youtube')) continue;
      expect(reference.formReferenceUrl).toMatch(/^https:\/\/www\.youtube\.com\/embed\//);
    }
  });

  it('leaves the no-visual-cue exercise as tips-only, with no dangling URL', () => {
    const reference = findExerciseReference('Respiración controlada');
    expect(reference.formReferenceType).toBe('text_tips');
    expect(reference.formReferenceUrl).toBeUndefined();
  });
});
