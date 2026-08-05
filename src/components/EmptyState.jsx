export default function EmptyState({ title, description, action, className = '' }) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg border border-dashed border-line bg-canvas px-6 py-10 text-center ${className}`}
    >
      <p className="text-sm font-medium text-ink">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-ink-secondary">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
