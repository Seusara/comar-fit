import { describe, expect, it } from 'vitest';
import { ROUTINE_CATALOG, findExerciseReference } from './catalog';

describe('exercise form references', () => {
  it('has a video/tips reference for every exercise in the catalog', () => {
    const missing = ROUTINE_CATALOG
      .filter((exercise) => !findExerciseReference(exercise.name))
      .map((exercise) => exercise.name);
    expect(missing).toEqual([]);
  });

  it('gives every reference a real video URL and at least one tip', () => {
    for (const exercise of ROUTINE_CATALOG) {
      const reference = findExerciseReference(exercise.name);
      expect(reference.formReferenceUrl).toMatch(/^https:\/\/www\.youtube\.com\/embed\//);
      expect(reference.tips.length).toBeGreaterThan(0);
    }
  });
});
