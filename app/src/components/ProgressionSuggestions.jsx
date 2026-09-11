import React from 'react';

/**
 * Banner that shows at the start of a new week when the progression engine
 * has generated adjustment suggestions based on last week's difficulty ratings.
 *
 * Props:
 *   suggestion  — object from getPendingSuggestion (null = nothing to show)
 *   onAccept    — async () => void  called when user taps "Aceptar"
 *   onDismiss   — async () => void  called when user taps "Mantener igual"
 *   pending     — bool  disables buttons while a request is in flight
 */
function ProgressionSuggestions({ suggestion, onAccept, onDismiss, pending = false }) {
  if (!suggestion) return null;

  // Flatten all day suggestions into a single list for display.
  const allSuggestions = Object.values(suggestion.days ?? {})
    .flat()
    .filter((s) => s.action !== 'maintain');

  // If everything is "maintain" there's nothing meaningful to show.
  if (allSuggestions.length === 0) return null;

  const increaseCount = allSuggestions.filter((s) => s.action === 'increase').length;
  const reduceCount = allSuggestions.filter((s) => s.action === 'reduce').length;

  const headline =
    increaseCount > 0 && reduceCount === 0
      ? '¡Tu progreso está mejorando!'
      : reduceCount > 0 && increaseCount === 0
        ? 'Ajustemos la carga esta semana'
        : 'Ajustes para esta semana';

  return (
    <section
      aria-labelledby="progression-heading"
      className="rounded-2xl border border-primary-fixed-dim/40 bg-surface-container-high p-5 space-y-4"
    >
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined text-2xl text-primary-fixed-dim" aria-hidden="true">
          trending_up
        </span>
        <div className="min-w-0">
          <h2 id="progression-heading" className="text-base font-bold text-on-surface">
            {headline}
          </h2>
          <p className="mt-0.5 text-sm text-on-surface-variant">
            Basado en tus ratings de la semana pasada
          </p>
        </div>
      </div>

      <ul className="space-y-2" aria-label="Ajustes sugeridos">
        {allSuggestions.map((s, i) => (
          <li
            key={`${s.exerciseId}-${i}`}
            className="flex items-start gap-2 text-sm text-on-surface-variant"
          >
            <span
              className={`mt-0.5 shrink-0 font-bold ${s.action === 'increase' ? 'text-primary-fixed-dim' : 'text-error'}`}
              aria-hidden="true"
            >
              {s.action === 'increase' ? '↑' : '↓'}
            </span>
            <span>
              <span className="font-medium text-on-surface">{s.exerciseId}</span>
              {' — '}
              {s.reason}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={onAccept}
          className="flex-1 rounded-xl bg-primary-fixed-dim py-2.5 text-sm font-bold text-on-primary tap-scale disabled:opacity-50"
        >
          Aceptar
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onDismiss}
          className="flex-1 rounded-xl border border-outline-variant/30 py-2.5 text-sm font-bold text-on-surface tap-scale disabled:opacity-50"
        >
          Mantener igual
        </button>
      </div>
    </section>
  );
}

export default ProgressionSuggestions;
