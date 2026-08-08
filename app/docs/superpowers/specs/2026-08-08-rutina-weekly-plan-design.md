# Rutina sincronizada con el plan semanal

## Decisión

`Rutina` deja de generar una sesión diaria independiente. El plan en
`duels/{duelId}/plans/{userId}/weeks/{weekId}` es la fuente de verdad de los
ejercicios y nunca se modifica desde la pantalla.

## Comportamiento

- En días `workout`, se muestran exactamente los ejercicios del día y su
  dosificación. Los checks leen y escriben el mismo documento
  `workoutProgress` que Inicio.
- En días `rest`, se muestra Descanso sin ejercicios opcionales.
- En días `run`, se muestra Carrera y se usa la misma `runSession` que Inicio.
- Ver técnica, el temporizador entre ejercicios y el registro del entrenamiento
  se conservan cuando hay ejercicios compatibles.
- `localStorage` deja de almacenar progreso o historial para días del plan.
- Los errores dejan el plan intacto y ofrecen reintento.

## Consistencia

Rutina se suscribe a `workoutProgress`, por lo que recoge cambios externos sin
crear una segunda copia. Las mutaciones se hacen por las transacciones existentes
y solo afectan al progreso o a la sesión de carrera.

## Fuera de alcance

GPS, edición del plan semanal y rutinas opcionales en días de descanso/carrera.
