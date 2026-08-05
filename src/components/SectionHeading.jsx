export default function SectionHeading({ title, subtitle, action, className = '' }) {
  return (
    <div className={`flex items-start justify-between gap-4 mb-6 ${className}`}>
      <div>
        <h2 className="text-xl font-semibold text-ink">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-ink-secondary">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
