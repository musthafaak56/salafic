export default function LoadingState({ rows = 3, label = 'Loading…' }) {
  return (
    <div className="space-y-3" role="status" aria-label={label}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-10 animate-pulse rounded-lg bg-surface-subtle"
          aria-hidden="true"
        />
      ))}
      <span className="sr-only">{label}</span>
    </div>
  )
}
