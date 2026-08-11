export default function PageSkeleton({ label = 'Cargando...', cards = 3 }) {
  return (
    <div role="status" aria-live="polite" className="mx-auto w-full max-w-5xl space-y-5 p-4 sm:p-8">
      <span className="sr-only">{label}</span>
      <div className="h-8 w-48 rounded-lg bg-surface-variant motion-safe:animate-pulse" />
      <div className="h-4 w-32 rounded bg-surface-variant motion-safe:animate-pulse" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: cards }, (_, index) => (
          <div key={index} className="h-36 rounded-2xl border border-outline bg-surface p-5">
            <div className="h-5 w-2/3 rounded bg-surface-variant motion-safe:animate-pulse" />
            <div className="mt-4 h-3 w-full rounded bg-surface-variant motion-safe:animate-pulse" />
            <div className="mt-2 h-3 w-4/5 rounded bg-surface-variant motion-safe:animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
