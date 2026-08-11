export function workoutMinutes(workout) {
  const storedTotal = Number(workout?.totalMinutes);
  if (Number.isFinite(storedTotal) && storedTotal > 0) return storedTotal;
  if (!Array.isArray(workout?.exercises)) return 0;
  return workout.exercises.reduce((sum, exercise) => {
    const duration = Number(exercise?.durationMinutes ?? exercise?.duration);
    return sum + (Number.isFinite(duration) && duration > 0 ? duration : 0);
  }, 0);
}

export function summarizeWorkouts(workouts = []) {
  return workouts.reduce((summary, workout) => ({
    workouts: summary.workouts + 1,
    minutes: summary.minutes + workoutMinutes(workout),
    exercises: summary.exercises + (Array.isArray(workout?.exercises) ? workout.exercises.length : 0),
  }), { workouts: 0, minutes: 0, exercises: 0 });
}
