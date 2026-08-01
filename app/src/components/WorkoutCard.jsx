import { useState } from 'react';
import Card from './Card';
import Button from './Button';

/**
 * Normalizes the possible shapes `performedAt`/`editableUntil` may arrive in:
 * a JS Date, a Firestore Timestamp (has `.toDate()`), or a raw number/string.
 * This component only presents data — it never talks to Firestore directly —
 * so it has to be tolerant of whatever the caller's listener hands it.
 */
function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value === 'number' || typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function formatDateTime(date) {
  if (!date) return 'Fecha desconocida';
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatExerciseLine(exercise) {
  const parts = [];
  if (Number.isFinite(exercise?.sets) && Number.isFinite(exercise?.reps)) {
    parts.push(`${exercise.sets}×${exercise.reps}`);
  }
  if (Number.isFinite(exercise?.durationMinutes)) {
    parts.push(`${exercise.durationMinutes} min`);
  }
  return parts.join(' · ');
}

function StatusIndicator() {
  return (
    <span className="flex items-center gap-1 text-xs font-label-md shrink-0 text-primary-fixed-dim" role="status">
      <span className="material-symbols-outlined text-base" aria-hidden="true">
        check_circle
      </span>
      Entrenamiento completado
    </span>
  );
}

/**
 * Displays one workout in the owner's history. Presentation + local
 * confirm-state only: `onEdit`/`onDelete` are handed the raw workout so the
 * caller decides what navigating to edit or deleting actually does (this
 * component never calls Firestore or the router itself).
 */
function WorkoutCard({ workout, editableUntil, onEdit, onDelete }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!workout) return null;

  const performedAt = toDate(workout.performedAt);
  const createdAt = toDate(workout.createdAt);
  const editableUntilDate = toDate(editableUntil ?? workout.editableUntil)
    ?? (createdAt ? new Date(createdAt.getTime() + 10 * 60 * 1000) : null);
  const isEditable = editableUntilDate ? Date.now() < editableUntilDate.getTime() : false;
  const exercises = Array.isArray(workout.exercises) ? workout.exercises : [];

  function handleConfirmDelete() {
    setConfirmingDelete(false);
    onDelete?.(workout);
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-label-md text-on-surface text-sm">{formatDateTime(performedAt)}</p>
        <StatusIndicator />
      </div>

      {exercises.length === 0 ? (
        <p className="text-on-surface-variant text-sm">Sin ejercicios registrados.</p>
      ) : (
        <ul className="space-y-2">
          {exercises.map((exercise, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <li key={`${exercise?.exerciseId || exercise?.name || 'ejercicio'}-${index}`} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-on-surface">{exercise?.name || 'Ejercicio'}</span>
              <span className="text-on-surface-variant">{formatExerciseLine(exercise)}</span>
            </li>
          ))}
        </ul>
      )}

      {isEditable && (
        <div className="pt-3 border-t border-outline-variant/10">
          {!confirmingDelete ? (
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => onEdit?.(workout)}>
                Editar
              </Button>
              <Button variant="secondary" className="flex-1" onClick={() => setConfirmingDelete(true)}>
                Eliminar
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p role="alert" className="text-error text-sm">
                ¿Eliminar este entrenamiento? Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setConfirmingDelete(false)}>
                  Cancelar
                </Button>
                <Button variant="primary" className="flex-1" onClick={handleConfirmDelete}>
                  Confirmar
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default WorkoutCard;
