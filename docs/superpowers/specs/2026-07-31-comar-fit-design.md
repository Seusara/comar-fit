# Comar-Fit - Design Specification

**Date:** 2026-07-31  
**Project:** Comar-Fit (Fitness Duel App)  
**Users:** Comar & Alexandra  
**Version:** 1.0

---

## Overview

Comar-Fit es una aplicación web progresiva (PWA) de fitness competitivo para dos usuarios que permite rastrear entrenamientos, competir semanalmente con un sistema de puntuación normalizado por género, y visualizar el progreso en tiempo real.

El app es accesible desde Safari en móvil, instalabler como PWA, y totalmente funcional offline (con sincronización cuando hay conexión).

---

## Architecture

### Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 + Vite |
| **UI Framework** | Tailwind CSS (existente) |
| **State Management** | React Context + Firestore listener |
| **Backend** | Node.js + Express.js |
| **Database** | Firebase Firestore (realtime) |
| **Authentication** | Firebase Authentication |
| **Hosting** | Vercel (frontend) + Render.com (backend) |
| **Design System** | Kinetic Glow (existente) |

### Data Flow

```
User Input (Mobile)
    ↓
React Component → Firestore Update
    ↓
Firestore Listener (Cloud Function)
    ↓
Score Recalculation + Streak Logic
    ↓
Real-time UI Update (both users)
```

---

## Authentication & User Management

### Registration Flow

1. Nuevo usuario ingresa:
   - Email, Contraseña
   - Nombre completo
   - Género (M/F)
   - Edad, Peso (kg), Altura (cm)
   - Nivel de experiencia (Principiante / Intermedio / Avanzado)

2. Sistema crea documento en Firestore: `users/{uid}`
3. Vinculación manual: Comar y Alexandra ingresan el email del otro en una pantalla de "Conectar compañero"
4. Se crea documento `duels/{duelId}` que vincula ambas cuentas

### Session Management

- Autenticación con Firebase: token persiste en el dispositivo
- Token refrescado automáticamente
- Logout: limpia token local

---

## Data Models

### User Document
```json
{
  "uid": "string",
  "email": "string",
  "displayName": "string",
  "gender": "M | F",
  "age": "number",
  "weight": "number (kg)",
  "height": "number (cm)",
  "experienceLevel": "Beginner | Intermediate | Advanced",
  "avatarUrl": "string (opcional)",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### Duel Document
```json
{
  "duelId": "string",
  "userA_uid": "string (Comar)",
  "userB_uid": "string (Alexandra)",
  "weekStartDate": "date (Monday)",
  "weekEndDate": "date (Sunday)",
  "status": "active | completed | archived",
  "rules": {
    "normalizeByGender": true,
    "metricsWeight": {
      "minutes": 0.25,
      "exercises": 0.25,
      "reps": 0.25,
      "calories": 0.25
    }
  },
  "createdAt": "timestamp"
}
```

### Workout Document
```json
{
  "workoutId": "string",
  "duelId": "string",
  "userId": "string",
  "date": "date",
  "exercises": [
    {
      "name": "string (ej: Flexiones, Sentadillas)",
      "sets": "number",
      "reps": "number",
      "duration": "number (minutes - por ejercicio)",
      "difficulty": "bodyweight | weighted_chair | weighted_backpack (opcional)",
      "caloriesBurned": "number (opcional)"
    }
  ],
  "totalMinutes": "number",
  "totalReps": "number (sum of all reps × sets)",
  "totalCalories": "number",
  "exerciseCount": "number",
  "source": "manual",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### Duel Score Document
```json
{
  "scoreId": "string",
  "duelId": "string",
  "week": "number",
  "userA_score": "number (0-100)",
  "userB_score": "number (0-100)",
  "winner": "userA | userB | tie",
  "userA_streak": "number (días consecutivos entrenando)",
  "userB_streak": "number (días consecutivos entrenando)",
  "updatedAt": "timestamp"
}
```

---

## Feature Specifications

### 1. Authentication & Registration

**Entrada:** Email, contraseña, datos personales  
**Salida:** Usuario autenticado, documento creado en Firestore  
**Error handling:** Email duplicado, campos inválidos, conexión fallida

### 2. Workout Tracking (Manual)

- Usuario ingresa: Ejercicio, sets, reps, duración
- Validación: sets/reps > 0, duración > 0

**Salida:** Documento `workout` creado/actualizado en Firestore

**Nota:** Apple HealthKit queda fuera del v1 — una PWA web no puede acceder a HealthKit sin una app nativa companion. Ver "Future Enhancements".

### 3. Score Calculation (Normalizado por Género, Calistenia)

Dado que es calistenia (sin equipos), las métricas se adaptan:

**Minutos entrenados:**
- Hombre: 60 min/día = 100 puntos
- Mujer: 50 min/día = 100 puntos

**Ejercicios completados:**
- Ambos: 8+ ejercicios = 100 puntos

**Volumen total de reps (reps × sets):**
- Hombre: 200+ reps = 100 puntos
- Mujer: 150+ reps = 100 puntos

**Calorías quemadas (estimadas):**
- Hombre: 400+ cal = 100 puntos
- Mujer: 300+ cal = 100 puntos

**Score final = (minutos × 0.25) + (ejercicios × 0.25) + (reps × 0.25) + (calorías × 0.25)**

**Ejercicios caseros sugeridos:**
- Flexiones (push-ups)
- Sentadillas (squats)
- Abdominales (crunches, planks)
- Burpees
- Mountain climbers
- Fondos (dips)
- Sentadillas con pistol (pistol squats)
- Lagartijas con palmadas
- Sentadillas búlgaras (con silla)
- Planchas laterales (side planks)

**Actualización:** Cloud Function se ejecuta cuando se crea/actualiza un workout

### 4. Streak & Inactivity

**Streak:** Contador diario de "días consecutivos entrenando"
- Se incrementa si hay 1+ workout ese día
- Se resetea a 0 si un día no hay workout
- Visible en dashboard

**Penalización de inactividad:**
- Si no entrena un día: score 0 para ese día
- Visualización: "Día sin entrenamiento" en calendario

### 5. Real-time Updates

Firestore listeners en React escuchan cambios en:
- `workouts/{workoutId}` → Dashboard se actualiza
- `duelScores/{scoreId}` → Estadísticas se actualizan

Latency: <1 segundo en condiciones normales

### 6. Weekly Duel Structure

**Inicio:** Lunes 00:00 UTC  
**Fin:** Domingo 23:59 UTC  
**Auto-creation:** Nueva duel se crea automáticamente cada lunes (Cloud Function)

**Resultado:**
- Se calcula el score final
- Se determina ganador
- Se archiva automáticamente

---

## UI/UX Screens

### Screen 1: Dashboard Inicio
- Mostrar: Día actual (ej: "Día 3 de 7"), VS actual (Comar vs Alexandra)
- Progreso semanal: Score parcial de cada uno
- Streak: Días consecutivos (con fuego 🔥)
- Próxima misión: Sugerencia de rutina del día
- Countdown: Tiempo restante del día
- CTA principal: "Comenzar rutina"

### Screen 2: Rutina del Día
- Mostrar: Plan de ejercicio sugerido para hoy
- Detalles: Duración estimada, cantidad de ejercicios, intensidad
- CTA: "Comenzar" (inicia timer)
- Durante sesión: Timer activo, checkbox por ejercicio

### Screen 3: Subir Prueba
- Entrada manual:
  - Seleccionar ejercicio (dropdown: Flexiones, Sentadillas, Abdominales, Burpees, etc.)
  - Sets (número)
  - Reps (número)
  - Duración (minutos)
  - Dificultad (Peso corporal / Con silla / Con mochila)
- Validación: Sets > 0, Reps > 0, Duración > 0
- CTA: "Guardar entrenamiento"
- Confirmación: Toast con resumen (ej: "Flexiones 3×15 guardadas - 45 reps totales")

### Screen 4: Revisar Prueba
- Historial de entrenamientos del usuario actual
- Por cada workout: Fecha, ejercicios, minutos, reps totales
- Acciones: Editar, eliminar
- Filtros: Por semana, por tipo de ejercicio

### Screen 5: Premios y Reglas
- Explicación: Cómo funciona el sistema de puntos
- Tabla: Puntuación por género y métrica
- Ejemplo: "Si entrenas 60 min hoy, ganas 25 puntos en 'minutos'"
- Regla: Quien no entrena un día → 0 puntos ese día

### Screen 6: Estadísticas Duelo
- Gráfico: Progreso semanal de ambos (línea)
- Comparación: Minutos, ejercicios, reps totales, calorías (side-by-side)
- Score acumulado: Comar 340 pts vs Alexandra 285 pts
- Ejercicios más populares: "Ambos favoritos: Flexiones (45 reps)"
- Histórico: Últimas 4 semanas (si existen)

### Screen 7: Calendario Semanal
- Vista: 7 días (Mon-Sun)
- Cada día muestra: Avatar completado ✓ o faltante ✗
- Color: Verde (completado), Gris (pendiente), Rojo (no hizo)
- Al tocar un día: Ver detalles del entrenamiento

### Screen 8: Perfil de Usuario
- Mostrar: Nombre, foto, género, edad, peso, altura
- Editable: Peso, foto, nombre
- Acciones: Logout, Cambiar contraseña
- Dato: Streak actual, puntos totales

### Screen 9: Crear Reto
- Iniciar duel manual (en caso de reset)
- Personalización: Fechas, reglas (opcional)
- CTA: "Iniciar nueva semana"

---

## Real-time Behavior

### Scenario 1: Comar entrena, Alexandra ve en vivo
1. Comar: "Subir Prueba" → ingresa "Flexiones 3×15, Sentadillas 3×20, Abdominales 3×25" (35 min)
2. Sistema calcula: 45 + 60 + 75 = 180 reps totales
3. Firestore actualiza `workouts` con totalReps: 180
4. Cloud Function recalcula score de Comar
5. Alexandra (en Dashboard): Ve "Comar hizo 180 reps" actualizado en <1s

### Scenario 2: Fin de semana
1. Domingo 23:59 → Cloud Function ejecuta
2. Calcula winner, archiva duel
3. Crea nueva duel para la próxima semana
4. Ambos ven notificación: "Nueva semana iniciada"

---

## Error Handling

| Error | Handling |
|-------|----------|
| Conexión perdida | Cache local, sincronizar cuando vuelva conexión |
| Auth fallida | Mostrar modal, sugerir re-login |
| Workout inválido | Validación inline, mostrar error |
| Cloud Function falla | Retry automático (Firestore) |

---

## Performance & Accessibility

- **PWA offline:** Service Worker cachea HTML, CSS, JS
- **Bundle size:** <100KB (gzipped)
- **Lighthouse scores:** Aiming for >90 en Performance, Accessibility
- **Mobile-first:** Diseño responsive (funciona en 320px+)
- **Contrast:** WCAG AA compliant (Kinetic Glow tiene colores vibrantes)

---

## Deployment

### Frontend (Vercel)
```bash
npm run build → Auto-deploy en push a main
```

### Backend (Render.com)
```bash
Node.js + Express, variables env con Firebase keys
Auto-redeploy en push
```

### Database (Firebase)
- Firestore Standard Plan (gratuito hasta 1GB)
- Realtime listener listeners activos
- Índices automáticos

---

## Timeline & Phases

**Phase 1 (Week 1-2):** Setup, Auth, Data Models  
**Phase 2 (Week 3-4):** Screens 1-9 (UI basic)  
**Phase 3 (Week 5-6):** Workout tracking + Score logic  
**Phase 4 (Week 7):** Real-time updates  
**Phase 5 (Week 8):** Testing, PWA, Deploy  

---

## Success Criteria

- ✅ Ambos usuarios pueden registrarse e iniciar sesión
- ✅ Registrar entrenamientos manualmente
- ✅ Ver progreso del otro en tiempo real (<1s delay)
- ✅ Score se calcula correctamente (normalizado por género)
- ✅ Instalable en Safari como PWA
- ✅ Funciona offline, sincroniza cuando hay conexión
- ✅ Duel semanal con ganador automático

---

## Future Enhancements (Out of Scope v1)

- Apple HealthKit integration (requiere app nativa companion o un bridge tipo Shortcuts — no accesible desde una PWA web)
- Strava integration
- Notifications push
- Dark mode toggle (Kinetic Glow es dark by default)
- Social sharing
- Duel history y estadísticas históricas
- Custom routines builder (programas semanales personalizados)
- Video tutorials de ejercicios (con progresión calistenia)
- Tracking de progresión (ej: "Pasaste de 10 a 20 flexiones")
- Desafíos semanales temáticos (ej: "Reto Abdominales: 500 reps totales")
- Badge system (ej: "100 flexiones en un día", "Semana perfecta")
