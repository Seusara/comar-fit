import { useEffect, useMemo, useState } from 'react';
import Button from './Button';
import Card from './Card';
import ProgressRing from './ProgressRing';

function formatClock(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

function readSession(key) {
  try { return JSON.parse(localStorage.getItem(key)) ?? {}; } catch { return {}; }
}

export default function GuidedWorkout({ sessionId, exercises, progressById, onCompleteExercise, onFinish, onClose }) {
  const storageKey = `comar-fit:guided:${sessionId}`;
  const restored = useMemo(() => readSession(storageKey), [storageKey]);
  const firstPending = Math.max(0, exercises.findIndex((item) => !progressById.get(item.id)?.completed));
  const [index, setIndex] = useState(() => Math.min(restored.index ?? firstPending, exercises.length - 1));
  const [elapsedSeconds, setElapsedSeconds] = useState(() => restored.elapsedSeconds ?? 0);
  const [running, setRunning] = useState(() => restored.running ?? true);
  const [completedSets, setCompletedSets] = useState(() => restored.completedSets ?? {});
  const [pending, setPending] = useState(false);
  const exercise = exercises[index];
  const targetSets = Math.max(1, Number(exercise?.sets) || 1);
  const currentSets = Math.min(completedSets[exercise?.id] ?? 0, targetSets);

  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(() => setElapsedSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [running]);

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify({ index, elapsedSeconds, running, completedSets })); } catch { /* session remains active */ }
  }, [completedSets, elapsedSeconds, index, running, storageKey]);

  if (!exercise) return null;

  async function completeSet() {
    if (pending) return;
    const nextSets = Math.min(currentSets + 1, targetSets);
    setCompletedSets((value) => ({ ...value, [exercise.id]: nextSets }));
    if (nextSets < targetSets) return;
    setPending(true);
    try {
      await onCompleteExercise(exercise.id);
      if (index < exercises.length - 1) setIndex(index + 1);
    } finally { setPending(false); }
  }

  function finish() {
    setRunning(false);
    try { localStorage.removeItem(storageKey); } catch { /* no-op */ }
    onFinish(elapsedSeconds);
  }

  const overall = Math.round(((index + currentSets / targetSets) / exercises.length) * 100);
  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-background p-4 sm:p-8" role="dialog" aria-modal="true" aria-label="Entrenamiento guiado">
      <div className="mx-auto max-w-xl space-y-5">
        <header className="flex items-center justify-between gap-4">
          <Button variant="secondary" onClick={onClose}>Salir</Button>
          <div className="text-center">
            <p className="text-xs uppercase tracking-widest text-on-surface-variant">Tiempo activo</p>
            <p className="font-headline-lg text-2xl tabular-nums">{formatClock(elapsedSeconds)}</p>
          </div>
          <Button variant="secondary" onClick={() => setRunning((value) => !value)}>{running ? 'Pausar' : 'Continuar'}</Button>
        </header>
        <Card className="text-center space-y-5">
          <div className="mx-auto w-fit"><ProgressRing percentage={overall} size={104} label="Progreso guiado" /></div>
          <div>
            <p className="text-xs uppercase tracking-widest text-primary-fixed-dim">Ejercicio {index + 1} de {exercises.length}</p>
            <h2 className="mt-2 font-headline-lg text-2xl">{exercise.name}</h2>
            <p className="mt-2 text-on-surface-variant">{exercise.reps ? `${exercise.reps} repeticiones` : `${exercise.durationSeconds ?? 30} segundos`} por serie</p>
          </div>
          <div className="rounded-2xl bg-surface-container-low p-4">
            <p className="text-sm text-on-surface-variant">Series completadas</p>
            <p className="mt-1 text-3xl font-bold">{currentSets} / {targetSets}</p>
          </div>
          <Button className="w-full" disabled={pending} onClick={completeSet}>
            {currentSets + 1 >= targetSets ? 'Completar ejercicio' : 'Completar serie'}
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" disabled={index === 0} onClick={() => setIndex((value) => value - 1)}>Anterior</Button>
            <Button variant="secondary" disabled={index === exercises.length - 1} onClick={() => setIndex((value) => value + 1)}>Siguiente</Button>
          </div>
        </Card>
        <Button className="w-full" variant="secondary" onClick={finish}>Finalizar y registrar</Button>
      </div>
    </div>
  );
}
