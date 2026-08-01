# COMAR-FIT Phase 2.Mín — Especificación de diseño

**Fecha:** 2026-07-31  
**Alcance:** ciclo mínimo de entrenamiento, scoring y actualización en tiempo real  
**Usuarios iniciales:** Aaron y Alexandra

## Objetivo

Phase 2.Mín completa el primer ciclo funcional de COMAR-FIT: una persona registra un entrenamiento, el servidor calcula métricas y puntuación, ambos participantes ven el resultado actualizado y el propietario puede consultar su historial. El resultado debe ser seguro contra manipulación desde el cliente, comprobable con emuladores y coherente con la identidad Kinetic Glow existente.

## Alcance

Incluye:

- Dashboard con día del duelo, marcador VS, rachas, cuenta regresiva, actividad reciente y CTA.
- Registro manual de uno o más ejercicios con sets, reps y duración.
- Historial propio con filtros de semana y total.
- Edición o eliminación por el propietario durante 10 minutos.
- Estimación visual de calorías en el formulario y cálculo definitivo en servidor.
- Scoring y rachas recalculados por Cloud Functions.
- Listeners Firestore para marcador, actividad e historial.
- Reglas de seguridad y pruebas unitarias, de integración y E2E con emuladores.

No incluye rutinas sugeridas, estadísticas avanzadas, calendario completo, edición de perfil, premios, notificaciones, carga de evidencia multimedia, Service Worker ni creación manual de nuevos retos.

## Decisión arquitectónica

Se adopta un modelo híbrido server-authoritative. React controla la experiencia y solo envía datos crudos validados. Cloud Functions vuelve a validar, deriva todas las métricas y recompone el agregado semanal. El cliente nunca puede escribir score, calorías definitivas, totales ni rachas.

Recalcular la semana completa ante cada cambio es preferible para este MVP: evita dobles incrementos ante reintentos, eventos duplicados o entregas fuera de orden. El volumen de dos participantes durante siete días hace que el costo sea pequeño. Una estrategia de ledger incremental queda fuera de alcance hasta que exista volumen que la justifique.

## Modelo de datos

### `duels/{duelId}`

Conserva el duelo existente y añade configuración estable:

```js
{
  duelId,
  userA_uid,
  userB_uid,
  status: 'active',
  weekStartDate,
  weekEndDate,
  timezone: 'America/Mexico_City',
  scoringVersion: 1,
  scoringSnapshot: {
    users: {
      [uid]: { gender, weightKg }
    },
    metricsWeight: {
      minutes: 0.25,
      exercises: 0.25,
      reps: 0.25,
      calories: 0.25
    }
  }
}
```

El snapshot impide que cambiar peso o género durante la semana altere retroactivamente el marcador.

### `duels/{duelId}/workouts/{workoutId}`

```js
{
  ownerUid,
  performedAt,
  exercises: [
    { exerciseId, name, sets, reps, durationMinutes }
  ],
  createdAt,
  updatedAt,
  editableUntil,
  revision,
  status: 'pending' | 'scored' | 'error',

  // Solo servidor
  totalMinutes,
  totalReps,
  exerciseCount,
  estimatedCalories,
  sessionScore,
  scoredAt
}
```

Límites iniciales: 1–20 ejercicios, sets 1–20, reps 1–500 por set y duración total 1–300 minutos. `createdAt` usa tiempo de servidor; `editableUntil` equivale a diez minutos después. `ownerUid`, duelo y campos calculados son inmutables para el cliente.

### `duels/{duelId}/weeks/{weekId}`

`weekId` usa la fecha local del lunes (`YYYY-MM-DD`) en `America/Mexico_City`, evitando ambigüedad de números ISO entre años.

```js
{
  weekStartAt,
  weekEndAt,
  scores: {
    [uid]: {
      score,
      minuteScore,
      exerciseScore,
      repScore,
      calorieScore
    }
  },
  streaks: { [uid]: days },
  lastWorkoutDay: { [uid]: 'YYYY-MM-DD' },
  recentActivity,
  updatedAt
}
```

Solo Admin SDK puede escribir este documento. Los dos participantes pueden leerlo.

## Scoring

Para cada usuario se suman los workouts válidos de la semana y se normaliza cada métrica a 0–100 con `min(actual / threshold * 100, 100)`.

| Métrica | Umbral M | Umbral F | Peso |
|---|---:|---:|---:|
| Minutos | 60 | 50 | 0.25 |
| Ejercicios distintos | 8 | 8 | 0.25 |
| Reps | 200 | 150 | 0.25 |
| Calorías | 400 | 300 | 0.25 |

El score semanal es la suma ponderada, redondeada al entero más próximo para presentación. Las reglas quedan versionadas para que futuros cambios no alteren semanas históricas.

Las calorías por ejercicio usan `MET × weightKg × durationHours`. La tabla inicial incluye Flexiones 6.0, Sentadillas 5.5, Abdominales 3.8, Burpees 8.0, Mountain Climbers 7.5, Fondos 6.5, Pistol Squats 7.0, Lagartijas con palmada 7.0, Sentadillas búlgaras 6.0, Planchas 3.8 y Planchas laterales 4.5.

La racha se deriva de fechas locales únicas con al menos un workout válido. Registrar varias sesiones el mismo día no la incrementa varias veces. Se conserva a través de semanas; no depende únicamente del agregado semanal actual.

## Cloud Function

Un trigger `onDocumentWritten('duels/{duelId}/workouts/{workoutId}')` cubre create, update y delete:

1. Verifica el duelo, propietario, estructura, límites y ventana temporal aplicable.
2. Deriva métricas del workout creado o editado y actualiza su estado mediante Admin SDK.
3. Consulta los workouts válidos de la semana para ambos participantes.
4. Recalcula score y rachas de forma determinista.
5. Escribe `weeks/{weekId}` y marca el workout como `scored`.

La función debe ignorar escrituras que solo cambien campos calculados para no crear un bucle. Ante fallo persistente marca `status: 'error'` y registra información diagnóstica sin exponerla en la interfaz.

## Seguridad

- Solo participantes autenticados leen el duelo, sus workouts y el agregado semanal.
- Solo el propietario crea workouts y modifica o elimina los suyos antes de `editableUntil`.
- Las reglas aplican allow-list de campos, tipos, rangos y longitud del arreglo.
- Ningún cliente escribe campos derivados o documentos semanales.
- Los participantes no pueden cambiar miembros, fechas, estado, reglas ni snapshot del duelo.
- Los perfiles públicos necesarios para nombre/avatar se separan de email, peso y género.
- Los datos sensibles usados por scoring no son legibles por cualquier usuario autenticado.

## Cliente React

### Componentes

- `Layout`, `Header` y `BottomNav`: estructura común y navegación.
- `Button`, `Card`, `Input` y `Select`: primitivas accesibles.
- `ProgressRing`, `StreakBadge` y `VSDisplay`: marcador y competencia.
- `CountdownTimer`: tiempo restante del día en zona del duelo.
- `ExerciseEditor`: añade, valida y elimina ejercicios del formulario.
- `WorkoutList` y `WorkoutCard`: historial, estados y acciones temporales.
- `Toast`: confirmaciones y fallos accionables.

### Hooks y servicios

- `useActiveDuel`: resuelve el duelo y participantes actuales.
- `useWorkouts`: listener del historial del usuario.
- `useDuelScore`: listener de `weeks/{weekId}`.
- `useCalorieEstimate`: previsualización no autoritativa.
- El módulo Firestore encapsula crear, editar y eliminar workouts; las páginas no construyen escrituras directamente.

### Dashboard

Muestra `Día X de 7`, participantes, score, rachas, cuenta regresiva, actividad reciente y `Subir entrenamiento`. El estado vacío explica cómo iniciar; el estado sin agregado muestra score cero. El listener actualiza la pantalla sin recarga.

### Subir Prueba

Permite apilar ejercicios del catálogo. La estimación de calorías se etiqueta como aproximada. Al guardar, evita doble envío y navega al Dashboard solo después de crear el documento. El toast de puntos espera a que el listener observe `status: 'scored'`; nunca inventa el resultado localmente.

### Revisar Prueba

Es el historial propio, no un flujo de aprobación de pareja. Incluye `Esta semana` y `Todas`, orden descendente, estados pending/scored/error y acciones visibles solo mientras permanezcan habilitadas. Editar reutiliza el formulario. Eliminar exige confirmación y provoca recálculo.

## Dirección visual

Se conserva Kinetic Glow de los archivos Stitch: fondo grafito `#131313`, superficies `#1c1b1b`–`#353534`, cian `#00dbe9`, violeta `#ad00fe`, Montserrat para titulares/datos e Inter para texto. El gradiente cian-violeta se reserva para la acción principal y el marcador VS actúa como firma visual. Glass cards, movimiento y brillos se usan con moderación; se respeta `prefers-reduced-motion`, foco visible y contraste WCAG AA.

`logofit.png` es el activo local del encabezado. La interfaz es mobile-first desde 320 px y escala a un contenedor centrado en escritorio.

## Errores y estados

- Formulario inválido: mensaje junto al campo y acción deshabilitada.
- Escritura fallida: conserva los datos y ofrece reintentar.
- Scoring pendiente: muestra `Calculando puntos…`.
- Scoring fallido: muestra `No pudimos calcular los puntos` y conserva la sesión para recuperación.
- Listener desconectado: Firebase reintenta y la interfaz indica `Reconectando…`.
- Sesión expirada: redirige a Login.
- Sin historial: invita a registrar el primer entrenamiento.
- Fuera de ventana: oculta acciones y explica que el resultado ya quedó cerrado.

## Pruebas

Unitarias:

- Fórmula MET, redondeo y catálogo.
- Normalización, clamp, pesos y umbrales M/F.
- Fechas locales, cambio de día y rachas consecutivas.
- Componentes de score, formulario e historial.

Reglas con Firestore Emulator:

- anónimo, no miembro, pareja y propietario;
- campos extra, tipos, rangos y arrays inválidos;
- spoofing de owner, score, calorías o timestamps;
- edición a 9:59 y rechazo a 10:00;
- escrituras de score y toma de control del duelo/perfil.

Integración con emuladores:

- create → métricas → agregado;
- update/delete → recálculo;
- reintentos, eventos duplicados y concurrencia de ambos usuarios;
- fallo recuperable y estado de error.

E2E usa dos sesiones: Aaron registra y Alexandra observa el cambio; después se repite en sentido contrario. La latencia inferior a un segundo es un objetivo de medición local, no una garantía de red.

## Criterios de aceptación

- Ambos usuarios pueden registrar workouts válidos sin escribir campos derivados.
- El servidor produce resultados reproducibles y resistentes a reintentos.
- Crear, editar o eliminar dentro de diez minutos actualiza ambos dashboards.
- Una acción fuera de la ventana es rechazada tanto por UI como por reglas.
- Historial, score y rachas cambian mediante listeners sin recargar.
- Los ejemplos de MET y scoring coinciden con los tests.
- No es posible alterar participantes, configuración o resultados desde el cliente.
- Las tres pantallas respetan las referencias Kinetic Glow, accesibilidad y mobile-first.
- Suite unitaria, reglas, integración y E2E pasa con emuladores.

## Despliegue

Firebase Emulator Suite cubre Auth, Firestore y Functions durante desarrollo. La configuración de producción se realiza después de validar el flujo completo. Frontend y Functions se despliegan por separado; los índices necesarios se versionan en `firestore.indexes.json`. No se afirma soporte offline/PWA hasta una fase que lo implemente y pruebe explícitamente.
