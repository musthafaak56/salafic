import { useEffect, useState } from 'react'
import { records } from '../lib/platform'
import { FinanceReport } from './CenterPublicParts'
import { Message } from './PlatformUI'

export default function FinanceHistory({ center }) {
  const [state, setState] = useState({ loading: true, items: [] })
  useEffect(() => {
    let active = true
    records(center.id, 'publicFinance', 50)
      .then((items) => {
        if (active) setState({ items: items.filter((r) => r.id !== 'current') })
      })
      .catch(() => {
        if (active)
          setState({
            items: [],
            error: 'Previous reports could not be loaded.',
          })
      })
    return () => {
      active = false
    }
  }, [center.id])
  return (
    <section className="platform-section">
      <h2>Published report history</h2>
      <p className="platform-hint">
        Each report is a snapshot of all recorded activity at publication.
        Reports are not added together.
      </p>
      {state.loading && <p role="status">Loading reports…</p>}
      {state.error && <Message error>{state.error}</Message>}
      {state.items.map((r) => (
        <details key={r.id} className="revision-history">
          <summary>
            {new Date(r.updatedAt).toLocaleString(center.locale, {
              timeZone: center.timezone,
            })}{' '}
            · Version {r.version}
          </summary>
          <FinanceReport center={center} report={r} />
        </details>
      ))}
      {!state.loading && !state.error && !state.items.length && (
        <p>No earlier reports have been published.</p>
      )}
    </section>
  )
}
