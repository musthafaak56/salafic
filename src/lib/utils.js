export function formatDate(value) {
  if (!value) return '—'
  if (value && typeof value.toDate === 'function') return value.toDate().toLocaleDateString()
  if (value instanceof Date) return value.toLocaleDateString()
  return new Date(value).toLocaleDateString()
}

export function formatCurrency(amount) {
  const n = Number(amount) || 0
  return n.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  })
}

export function todayISODate() {
  return new Date().toISOString().slice(0, 10)
}