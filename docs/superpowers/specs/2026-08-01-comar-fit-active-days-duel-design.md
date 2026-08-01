# COMAR-FIT — Duelo por días activos

## Objetivo

Sustituir el scoring calculado por Cloud Functions por una comparación semanal de cumplimiento basada en días activos. La aplicación debe funcionar en el plan gratuito Spark de Firebase y confirmar cada entrenamiento inmediatamente, sin estados de “Calculando puntos”.

## Regla del duelo

- Un día activo es una fecha local de `America/Mexico_City` en la que el usuario registró al menos un entrenamiento válido dentro de la semana vigente del duelo.
- Varios entrenamientos del mismo usuario en el mismo día cuentan como un solo día activo.
- El progreso semanal de cada participante es `días activos / 7` y se representa como porcentaje en los anillos existentes.
- La comparación muestra quién lleva más días activos. Si ambos tienen la misma cantidad, muestra “Van iguales”.
- La racha es la cantidad de días consecutivos con al menos un entrenamiento, terminando hoy o ayer. Registrar varias sesiones en una fecha no incrementa la racha más de una vez.
- Los entrenamientos de semanas anteriores permanecen en el historial, pero no afectan el duelo vigente.

## Arquitectura y datos

### Escritura

El cliente crea el documento de entrenamiento en `duels/{duelId}/workouts/{workoutId}` con:

- `userId`
- `duelId`
- `exercises`
- `performedAt`
- `createdAt`
- `updatedAt`
- `revision`

No se escriben ni esperan `status`, `sessionScore`, métricas normalizadas, calorías del servidor o `scoredAt`. La confirmación depende exclusivamente de que la escritura de Firestore termine correctamente.

### Lectura y cálculo

Los listeners existentes de entrenamientos obtienen las sesiones permitidas del duelo. Una utilidad pura deriva por participante:

- claves de fecha únicas de la semana;
- cantidad de días activos;
- porcentaje de cumplimiento;
- racha actual;
- estado comparativo del duelo.

El cálculo usa la zona `America/Mexico_City` y las fechas del duelo. No crea documentos agregados ni depende de `duels/{duelId}/weeks/*`.

### Seguridad

Las reglas de Firestore continúan limitando acceso a participantes y propietarios. Se ajustan para:

- permitir la forma de documento que crea el cliente;
- permitir que ambos participantes lean entrenamientos del duelo para calcular la comparación;
- impedir que un participante modifique entrenamientos del otro;
- conservar la ventana de edición de diez minutos calculándola desde `createdAt`, sin requerir un campo escrito por Cloud Functions;
- mantener bloqueadas las escrituras a agregados semanales heredados.

Cloud Functions deja de ser parte del despliegue de producción. El código histórico puede conservarse en el repositorio, pero ninguna pantalla ni flujo debe depender de él.

## Experiencia de usuario

### Subir entrenamiento

Al guardar correctamente:

- muestra “Entrenamiento guardado ✓”;
- no muestra “Calculando puntos”;
- navega al historial después de la confirmación breve;
- ante un error de Firestore mantiene el formulario y muestra un mensaje recuperable.

El mismo comportamiento se aplica al editar: “Entrenamiento actualizado ✓”.

### Historial

Cada tarjeta muestra “Entrenamiento completado” junto con ejercicios, fecha y duración disponible. Se eliminan puntos y estados de scoring. Editar y eliminar respetan la ventana de diez minutos.

### Dashboard y Duelo

- El VS conserva nombres y avatares.
- Cada anillo muestra `N/7 días` y su porcentaje es `N ÷ 7 × 100`.
- Las insignias conservan la racha de cada participante.
- Se muestra “Vas adelante”, “Tu rival va adelante” o “Van iguales”, desde la perspectiva del usuario actual.
- La actividad reciente continúa mostrando entrenamientos reales.

### Perfil

“Puntuación semanal” se sustituye por “Días activos”, con el valor `N de 7`. Se conservan entrenamientos, minutos acumulados y racha.

## Manejo de estados y compatibilidad

- Mientras cargan los listeners se conserva el estado de carga actual.
- Si no existe duelo activo, se conserva el flujo para conectar pareja.
- Los documentos antiguos con campos de scoring se pueden leer, pero esos campos se ignoran.
- Si falta una fecha válida, el entrenamiento aparece en historial cuando sea posible, pero no suma un día activo.
- Las consultas y cálculos no dependen de que Cloud Functions esté desplegado.

## Pruebas

### Unitarias

- Dos entrenamientos el mismo día producen un día activo.
- Entrenamientos en días distintos producen varios días activos.
- Se excluyen sesiones fuera de la semana del duelo.
- El cálculo respeta `America/Mexico_City` cerca de medianoche.
- La racha maneja hoy, ayer, huecos y fechas duplicadas.
- La comparación cubre ventaja local, ventaja rival y empate.

### Componentes e integración

- Dashboard renderiza `N/7 días` sin puntos.
- Historial muestra “Entrenamiento completado” sin estados pendientes.
- Subir y editar confirman inmediatamente tras resolver la escritura.
- Perfil muestra días activos en lugar de puntuación.
- Reglas permiten a ambos participantes leer sesiones del duelo, pero solo al propietario escribir o eliminar las suyas.

### Verificación de despliegue

- Suite completa y build de Vite terminan sin errores.
- Reglas se validan con Emulator Suite antes de publicarse.
- En producción: dos usuarios se registran, forman duelo, uno guarda una sesión y ambos ven `1/7 días` mediante listeners.

## Fuera de alcance

- Puntos, calorías competitivas o normalización por género.
- Clasificaciones globales.
- Recompensas por cantidad de sesiones en un mismo día.
- Cloud Functions y cambio al plan Blaze.

