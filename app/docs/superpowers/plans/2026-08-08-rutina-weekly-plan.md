# Plan de implementación

1. Cubrir con pruebas workout, descanso, carrera, sincronización y ausencia de
   progreso en `localStorage`.
2. Sustituir `generateDailyRoutine` por carga del plan semanal usando el contexto
   horario del duelo.
3. Reutilizar `workoutProgress` y `runSessions`; suscribirse al progreso del día.
4. Adaptar técnica, descanso y registro al esquema de ejercicios del plan.
5. Ejecutar pruebas y build; revisar diff; publicar `main` y verificar Vercel.
