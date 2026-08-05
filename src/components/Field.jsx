export default function Field({
  label,
  htmlFor,
  hint,
  error,
  className = '',
  children,
}) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-sm font-medium text-ink"
      >
        {label}
      </label>
      {children}
      {hint && !error ? (
        <p className="mt-1.5 text-xs text-ink-secondary">{hint}</p>
      ) : null}
      {error ? (
        <p className="mt-1.5 text-xs text-negative" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export const inputClass =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-secondary/60 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
