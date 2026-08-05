export default function Stat({ label, value, tone = 'default', sub }) {
  const toneClass = {
    default: 'text-ink',
    positive: 'text-positive',
    negative: 'text-negative',
  }[tone]
  return (
    <div>
      <p className="text-sm text-ink-secondary">{label}</p>
      <p className={`mt-1 text-3xl font-semibold tabular-nums tracking-tight ${toneClass}`}>
        {value}
      </p>
      {sub ? <p className="mt-1 text-xs text-ink-secondary">{sub}</p> : null}
    </div>
  )
}
