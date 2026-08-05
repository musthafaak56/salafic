const TONES = {
  default: 'bg-surface-subtle text-ink-secondary',
  primary: 'bg-primary-soft text-primary',
  positive: 'bg-positive/10 text-positive',
  negative: 'bg-negative/10 text-negative',
}

export default function StatusBadge({ children, tone = 'default', className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
