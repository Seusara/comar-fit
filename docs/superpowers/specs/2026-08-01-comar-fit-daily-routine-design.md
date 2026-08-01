# COMAR-FIT — Diseño de Rutina Diaria Personalizada

## Objetivo

Convertir la navegación **Rutina** en una pantalla funcional que genere una sesión diaria personalizada para cada usuario. La rutina debe considerar nivel, objetivo, equipo disponible y duración preferida, permanecer estable durante el día y poder convertirse en un entrenamiento compatible con el scoring existente.

## Alcance

- Nueva ruta protegida `/rutina`.
- Motor determinista de selección y composición de ejercicios.
- Catálogo local de ejercicios con metadatos de objetivo, nivel, equipo, patrón y duración estimada.
- Pantalla con calentamiento, bloque principal y recuperación.
- Progreso local de la sesión y acciones para completar o registrar la rutina.
- Transferencia de la rutina al formulario existente `/subir-prueba`.
- Navegación inferior actualizada para abrir `/rutina`.

No se incluyen generación mediante IA, panel administrativo de plantillas, recomendaciones médicas ni cambios al algoritmo de scoring.

## Personalización

La selección usa, en este orden:

1. `experienceLevel` para ajustar dificultad y volumen.
2. `objective` para priorizar fuerza, resistencia, movilidad o condición general.
3. `equipment` para excluir movimientos que requieran material no disponible.
4. `preferredWorkoutMinutes` para aproximar la duración total.
5. Historial reciente para evitar repetir exactamente la misma combinación en días consecutivos cuando exista información suficiente.

El género no excluye ejercicios. Continúa siendo un dato de scoring; la rutina se adapta por capacidad, preferencias y objetivo. El motor nunca prescribe cargas máximas ni recomendaciones clínicas.

## Estabilidad diaria

La rutina se genera con una semilla formada por `uid + fecha local del duelo + versión del catálogo`. Para el mismo usuario y día, el resultado es idéntico aunque recargue la página. Al cambiar el día cambia la semilla y puede cambiar la selección.

La fecha usa la zona del duelo cuando esté disponible y `America/Mexico_City` como respaldo.

## Catálogo y motor

Cada ejercicio contiene:

- Identificador estable y nombre visible.
- Fase: calentamiento, principal o recuperación.
- Objetivos compatibles.
- Nivel mínimo.
- Equipo requerido o `bodyweight`.
- Series, repeticiones o minutos base.
- Descanso recomendado.
- Duración estimada.

El motor filtra por equipo y nivel, puntúa coincidencias con el objetivo y compone las tres fases. Ajusta el volumen sin exceder de forma significativa la duración preferida. Si el perfil está incompleto o no hay suficientes coincidencias, usa una rutina segura de principiante basada en peso corporal.

## Pantalla `/rutina`

La pantalla muestra:

- Encabezado “Rutina de hoy” y fecha.
- Resumen de personalización: objetivo, nivel, duración y equipo.
- Indicador de progreso por ejercicios completados.
- Secciones de calentamiento, bloque principal y recuperación.
- Tarjetas con nombre, series/repeticiones o minutos y descanso.
- Control accesible para marcar cada ejercicio como completado.
- Acción “Registrar como entrenamiento”, habilitada cuando haya al menos un ejercicio completado.
- Acción secundaria para abrir el registro manual sin precarga.

El progreso se conserva en `localStorage` con una clave por usuario y fecha. No afecta puntos hasta que el usuario registra el entrenamiento.

## Transferencia al entrenamiento

“Registrar como entrenamiento” navega a `/subir-prueba` con un payload de navegación que contiene únicamente los ejercicios completados. `SubirPrueba` valida y convierte ese payload a su modelo editable; el usuario puede ajustar series, repeticiones o minutos antes de guardar.

El guardado sigue usando el flujo actual: Firestore crea el workout y Cloud Functions calcula puntos. La rutina nunca escribe scores directamente.

## Estados y errores

- Mientras carga el perfil: indicador de carga dentro de `Layout`.
- Perfil no disponible: mensaje recuperable con opción de ir a Perfil.
- Perfil incompleto: rutina de respaldo y aviso con enlace a Perfil.
- Catálogo sin coincidencias: rutina segura de peso corporal.
- Payload de navegación inválido: `SubirPrueba` conserva su formulario vacío normal.
- Error al registrar: se mantiene la rutina y el progreso para reintentar.

## Accesibilidad y estilo

- Reutiliza los tokens Kinetic Glow y componentes `Layout`, `Card`, `Button` y `ProgressRing`.
- Controles con área mínima de 44 px, foco visible y estado accesible.
- El progreso no depende solo del color.
- Diseño móvil primero, con contenido máximo coherente con las otras pantallas.

## Pruebas

### Motor

- Resultado estable para el mismo usuario y fecha.
- Variación predecible al cambiar usuario o fecha.
- Exclusión de equipo no disponible.
- Adaptación de volumen por nivel y duración.
- Respaldo seguro para perfiles incompletos.

### Pantalla

- Render de las tres fases y resumen del perfil.
- Progreso al completar ejercicios.
- Persistencia y restauración del progreso diario.
- Registro habilitado solo con ejercicios completados.
- Navegación con payload correcto.
- Estados de carga, perfil ausente y perfil incompleto.

### Integración

- `/rutina` requiere autenticación.
- El botón inferior Rutina apunta a `/rutina` y refleja estado activo.
- `SubirPrueba` acepta una rutina válida y descarta payloads inválidos.
- El registro continúa delegando el scoring al backend existente.

## Criterios de aceptación

1. Aaron y Alexandra pueden obtener rutinas distintas a partir de sus perfiles.
2. Una recarga durante el mismo día no cambia la rutina.
3. Ningún ejercicio requiere equipo que el usuario no haya declarado.
4. El usuario puede completar parcialmente la sesión y registrar solo lo realizado.
5. La rutina registrada aparece en historial y se puntúa mediante el flujo existente.
6. Rutina deja de ser un alias de Subir Prueba y funciona como pantalla independiente.
