# COMAR-FIT Phase 2.Mín Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar el ciclo completo de registrar un workout, calcular score/racha en servidor y actualizar Dashboard e historial en tiempo real.

**Architecture:** React escribe solo datos crudos en la subcolección del duelo. Un trigger idempotente deriva métricas y recompone el agregado semanal; Firestore Rules protege campos calculados y la ventana de edición. Las páginas consumen listeners encapsulados y un shell Kinetic Glow común.

**Tech Stack:** React 18, React Router 6, Firebase 10, Cloud Functions v2, Firestore/Auth/Functions Emulator, Vitest 2, Testing Library y Tailwind CSS 3.

## Global Constraints

- Zona: `America/Mexico_City`; semana semiabierta `[lunes 00:00, lunes siguiente 00:00)`.
- `performedAt` y `createdAt` usan tiempo de servidor y no son editables.
- Edición/eliminación: 10 minutos exactos desde `createdAt`.
- Cliente jamás escribe totales, calorías definitivas, status, score, streak o `scoredAt`.
- Score v1: minutos M/F 60/50, ejercicios distintos 8/8, reps 200/150, calorías 400/300; peso 0.25, clamp 0–100; decimales internos y `Math.round` solo al final.
- Racha: días locales únicos consecutivos; termina hoy si entrenó hoy o ayer si todavía no entrenó hoy.
- 1–20 ejercicios; sets 1–20; reps 1–500; duración total 1–300 min.
- Kinetic Glow y mobile-first desde 320 px. Sin multimedia, notificaciones, PWA, aprobación de pareja ni estadísticas avanzadas.
- TDD y un commit enfocado por tarea.

## File Map

- `functions/src/scoring.js`: MET, métricas, normalización, semana y racha.
- `functions/src/recalculateDuelWeek.js`: recomposición determinista.
- `functions/index.js`: trigger v2 y guarda de recursión.
- `firestore.rules`: perfiles, duelos, workouts y weeks.
- `src/firebase/firestore.js`: API de datos/listeners.
- `src/hooks/`: estado reactivo.
- `src/components/`: sistema Kinetic Glow.
- `src/pages/`: Dashboard, SubirPrueba y RevisarPrueba.

### Task 1: Dominio puro de scoring y tiempo

**Files:** Create `app/functions/package.json`, `app/functions/src/scoring.js`, `app/functions/test/scoring.test.js`; modify `app/firebase.json`.

**Produces:** `deriveWorkoutMetrics(exercises, weightKg)`, `calculateWeeklyScore(metrics, gender)`, `getWeekWindow(date, timezone)`, `calculateStreak(days, today)`.

- [ ] Escribir pruebas fallidas: flexiones 30 min × 80 kg = 240 cal; score del ejemplo completo = 69; clamp 100; ejercicios distintos; lunes/domingo, medianoche México y cambio de año; deduplicación y corte de racha.
- [ ] Run: `cd app/functions && npm test -- scoring.test.js`. Expected: FAIL por módulo inexistente.
- [ ] Crear paquete Node 20 con `firebase-admin`, `firebase-functions`, `luxon` y Vitest; añadir Functions Emulator en puerto 5001.
- [ ] Implementar MET como suma por ejercicio, reps como `sets * reps`, duración sumada y ejercicios por `Set(exerciseId)`.
- [ ] Implementar semana con Luxon y score:

```js
export const normalize = (value, threshold) => Math.min(Math.max(value / threshold * 100, 0), 100);
export function finalScore(parts) {
  return Math.round(Object.values(parts).reduce((sum, value) => sum + value * 0.25, 0));
}
```

- [ ] Run: `cd app/functions && npm test`. Expected: PASS.
- [ ] Commit: `git commit -m "feat: add deterministic scoring domain"`.

### Task 2: Endurecer perfiles y duelos

**Files:** Modify `app/firestore.rules`, `app/src/firebase/firestore.js`, `app/src/firebase/firestore.test.js`, `app/tests/firestore.rules.test.js`.

**Produces:** `publicProfiles/{uid}` y duelos con `timezone`, `scoringVersion`, `scoringSnapshot`; preserva las APIs actuales.

- [ ] Escribir reglas-test fallidas: otro autenticado no lee perfil privado; propietario no cambia uid/email/gender/weight; participante no sustituye miembros, status, timezone, reglas o snapshot.
- [ ] Run: `npm test -- tests/firestore.rules.test.js`. Expected: FAIL demostrando las brechas actuales.
- [ ] Cambiar registro para escribir perfil privado y `{displayName, avatarUrl}` público.
- [ ] Cambiar `createDuel` para leer ambos perfiles y fijar snapshot `{gender, weightKg}`; migrar compatibilidad de `weight` a `weightKg` en el snapshot sin renombrar aún el perfil existente.
- [ ] Aplicar allow-lists y `diff().affectedKeys()`; negar updates de duelo desde cliente tras bootstrap y añadir default deny recursivo.
- [ ] Run: `npm test -- src/firebase/firestore.test.js tests/firestore.rules.test.js`. Expected: PASS sin romper Fase 1.
- [ ] Commit: `git commit -m "fix: protect duel scoring inputs"`.

### Task 3: Modelo y reglas de workouts

**Files:** Modify `app/firestore.rules`, `app/firestore.indexes.json`, `app/tests/firestore.rules.test.js`.

**Produces:** reglas para `duels/{duelId}/workouts/{workoutId}` y `duels/{duelId}/weeks/{weekId}`.

- [ ] Añadir matriz fallida para anónimo/no miembro/pareja/owner; arrays 0/21; sets 0/21; reps 0/501; duración 0/301; campos extra/derivados; spoof owner/time; update 9:59/10:00; delete; write de week.
- [ ] Run: `npm test -- tests/firestore.rules.test.js`. Expected: FAIL por matches inexistentes.
- [ ] Crear permite solo `ownerUid`, `exercises`, `performedAt`, `createdAt`, `updatedAt`, `revision`; exige `ownerUid == auth.uid`, participante, duelo activo y `performedAt == createdAt == updatedAt == request.time`.
- [ ] El trigger añade `editableUntil`, `status` y derivados. Update/delete requieren owner y `request.time < editableUntil`; owner/performedAt/createdAt y derivados permanecen inmutables para cliente.
- [ ] Weeks: lectura solo de participantes, escritura siempre falsa. Añadir índice `ownerUid ASC, performedAt DESC`.
- [ ] Run: `npm test -- tests/firestore.rules.test.js`. Expected: PASS.
- [ ] Commit: `git commit -m "feat: secure workout and weekly score data"`.

### Task 4: Trigger idempotente y recomposición

**Files:** Create `app/functions/index.js`, `app/functions/src/recalculateDuelWeek.js`, `app/functions/test/recalculateDuelWeek.test.js`.

**Produces:** `calculateScore = onDocumentWritten(...)` y `recalculateDuelWeek({db, duelId, before, after})`.

- [ ] Escribir integración fallida para create→scored→week, update/delete, mismo evento dos veces, self-write sin loop, dos usuarios simultáneos y payload inválido→error.
- [ ] Run: `cd app/functions && npm test -- recalculateDuelWeek.test.js`. Expected: FAIL.
- [ ] Releer el documento actual; no confiar en el payload del evento. Retornar si antes/después difieren solo en campos derivados.
- [ ] En create/update validar de nuevo, calcular y escribir `editableUntil = createdAt + 600s`, métricas, `sessionScore`, `status:'scored'` y `scoredAt`.
- [ ] Consultar workouts válidos, agrupar por owner, recomponer score y racha global y escribir `weeks/{weekId}` en transacción. Delete recalcula sin intentar marcar el documento eliminado.
- [ ] Capturar error sin generar ciclo: marcar `error` solo si el documento todavía existe y el cambio raw lo originó.
- [ ] Run: `firebase emulators:exec --only firestore,functions "cd functions && npm test"`. Expected: PASS.
- [ ] Commit: `git commit -m "feat: recalculate duel score on workout changes"`.

### Task 5: API cliente y hooks

**Files:** Create `app/src/domain/exercises.js`, `app/src/hooks/useActiveDuel.js`, `useWorkouts.js`, `useDuelScore.js`, `useCalorieEstimate.js`, `hooks.test.jsx`; modify `app/src/firebase/firestore.js`.

**Produces:** `createWorkout`, `updateWorkout`, `deleteWorkout`, `subscribeToWorkouts`, `subscribeToDuelWeek`; hooks devuelven `{data, loading, error}`.

- [ ] Escribir pruebas fallidas: payload sin derivados, `serverTimestamp` para tiempos, orden descendente, propagación de error y unsubscribe al desmontar.
- [ ] Run: `npm test -- src/hooks/hooks.test.jsx`. Expected: FAIL.
- [ ] Implementar API Firestore encapsulada; ninguna página construye writes o listeners.
- [ ] Implementar hooks con cleanup. `useCalorieEstimate` usa catálogo estático y nunca añade su resultado al write.
- [ ] Run: `npm test -- src/hooks/hooks.test.jsx src/firebase/firestore.test.js`. Expected: PASS.
- [ ] Commit: `git commit -m "feat: add realtime workout data layer"`.

### Task 6: Sistema visual y Dashboard

**Files:** Create `app/src/components/{Button,Card,Input,Select,Layout,ProgressRing,StreakBadge,VSDisplay,CountdownTimer,Toast}.jsx`, `components.test.jsx`; modify `app/src/index.css`, `app/src/pages/Dashboard.jsx`; create `Dashboard.test.jsx`.

**Produces:** shell común y Dashboard en `/dashboard`.

- [ ] Escribir tests fallidos de label/input, disabled, `aria-valuenow`, `aria-current`, Toast `role=status`, loading/vacío/error, ambos scores, rachas, actividad y CTA.
- [ ] Run: `npm test -- src/components/components.test.jsx src/pages/Dashboard.test.jsx`. Expected: FAIL.
- [ ] Implementar componentes desde Stitch usando `logofit.png`, sin imágenes remotas; targets 44px, foco visible y `prefers-reduced-motion`.
- [ ] Implementar Dashboard con hooks; el countdown limpia su intervalo y usa zona/límites del duelo.
- [ ] Run: `npm test -- src/components/components.test.jsx src/pages/Dashboard.test.jsx && npm run build`. Expected: PASS.
- [ ] Commit: `git commit -m "feat: build kinetic glow duel dashboard"`.

### Task 7: Registro e historial

**Files:** Create `app/src/components/ExerciseEditor.jsx`, `WorkoutCard.jsx`; create `app/src/pages/SubirPrueba.jsx`, `SubirPrueba.test.jsx`, `RevisarPrueba.jsx`, `RevisarPrueba.test.jsx`; modify `app/src/App.jsx`.

**Produces:** `/subir-prueba`, `/revisar-prueba`, `/workouts/:workoutId/edit`.

- [ ] Escribir tests fallidos de múltiples ejercicios, rangos, duración total, doble submit, error que conserva formulario, estimación etiquetada, estados pending/scored/error, filtros, orden, ventana de edición y confirmación de delete.
- [ ] Run: `npm test -- src/pages/SubirPrueba.test.jsx src/pages/RevisarPrueba.test.jsx`. Expected: FAIL.
- [ ] Implementar rutas protegidas y formulario. El toast de puntos aparece solo al observar `status === 'scored'`; un timeout visual permite volver al Dashboard indicando que el cálculo continúa.
- [ ] Implementar historial propio. UI calcula disponibilidad desde `editableUntil`, pero Rules son autoridad; delete conserva la tarjeta hasta confirmación.
- [ ] Run: `npm test -- src/pages/SubirPrueba.test.jsx src/pages/RevisarPrueba.test.jsx && npm run build`. Expected: PASS.
- [ ] Commit: `git commit -m "feat: add workout registration and history"`.

### Task 8: Flujo completo con dos sesiones

**Files:** Create `app/src/test/phase2Flow.test.jsx`, `app/tests/phase2.e2e.test.js`; modify `app/package.json`, `app/firebase.json`.

**Produces:** `npm run test:phase2`.

- [ ] Escribir integración UI Dashboard→Subir→scored→Dashboard→Historial.
- [ ] Escribir E2E con dos contextos Auth: Aaron registra y Alexandra observa; repetir al revés; editar 9:59, rechazar 10:00, borrar dentro de ventana y verificar recomposición.
- [ ] Añadir script: `firebase emulators:exec --only auth,firestore,functions "vitest run && cd functions && npm test"`.
- [ ] Run: `npm run test:phase2`. Expected: PASS sin red externa ni dependencia de orden.
- [ ] Revisar visualmente 320, 390 y 1280 px: teclado, reduced motion, vacío/error/pending y overflow; añadir test por cada defecto corregido.
- [ ] Run final: `npm test && npm run build && npm run test:phase2`. Expected: exit 0.
- [ ] Commit: `git commit -m "test: verify phase 2 duel flow end to end"`.

## Coordination Contract

- Un trabajador posee una tarea; no hay edición paralela de los mismos archivos.
- Backend ejecuta Tasks 1–4. Frontend puede preparar Task 6 en paralelo tras congelar interfaces; Tasks 5 y 7 esperan contratos backend.
- Claude Code puede tomar Tasks 6–7 y Codex Tasks 1–5/8, o al revés, pero ambos trabajan en ramas/worktrees separados.
- Cada tarea termina en commit y revisión del spec. La integración ocurre en feature branch; `master` solo recibe suite completa y revisión cruzada.
