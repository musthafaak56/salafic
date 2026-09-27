import { useEffect, useRef, useState } from 'react'
import { record } from '../lib/platform'
import { calculateSchedule, localDate } from '../lib/centerPrayer'
import { PrayerBoard } from './CenterPublicParts'
import { Input, Message } from './PlatformUI'
import Button from './Button'

export default function PrayerPoster({ center }) {
  const dialog = useRef(null),
    artwork = useRef(null),
    exportUrl = useRef(null)
  useEffect(
    () => () => {
      if (exportUrl.current) URL.revokeObjectURL(exportUrl.current)
    },
    [],
  )
  const [open, setOpen] = useState(false),
    [date, setDate] = useState(() => localDate(center.timezone)),
    [state, setState] = useState({}),
    [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!open) return
    const element = dialog.current
    element.showModal()
    return () => element.close()
  }, [open])
  useEffect(() => {
    if (!open) return
    let active = true
    setState({ loading: true })
    record(center.id, 'prayerTimes', date)
      .then((manual) => {
        if (active)
          setState({ schedule: calculateSchedule(center, date, manual) })
      })
      .catch(() => {
        if (active)
          setState({
            error:
              'The published schedule could not be loaded. Please try again.',
          })
      })
    return () => {
      active = false
    }
  }, [open, date, center])
  async function download() {
    setBusy(true)
    try {
      const { toBlob } = await import('html-to-image')
      const blob = await toBlob(artwork.current, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        skipFonts: true,
      })
      if (!blob) throw new Error('Image unavailable')
      const url = URL.createObjectURL(blob),
        link = document.createElement('a')
      if (exportUrl.current) URL.revokeObjectURL(exportUrl.current)
      exportUrl.current = url
      link.href = url
      link.download = `${center.slug}-prayers-${date}.png`
      document.body.appendChild(link)
      link.click()
      link.remove()
      setState((previous) => ({ ...previous, downloadUrl: url }))
    } catch {
      setState((previous) => ({
        ...previous,
        error: 'The poster could not be downloaded. Please try again.',
      }))
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Create prayer poster
      </Button>
      <dialog
        ref={dialog}
        className="prayer-poster-dialog"
        onClose={() => setOpen(false)}
        aria-label="Prayer poster"
      >
        <div className="platform-row">
          <Input
            label="Poster date"
            type="date"
            value={date}
            disabled={busy}
            onChange={setDate}
          />
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
        {state.loading && <p role="status">Loading published timetable…</p>}
        {state.error && <Message error>{state.error}</Message>}
        {state.schedule && (
          <>
            <div ref={artwork} className="prayer-poster-artwork">
              <p className="eyebrow">
                {center.city} · {center.countryCode}
              </p>
              <h1>{center.displayName}</h1>
              <PrayerBoard
                center={center}
                schedules={[state.schedule]}
                staticDisplay
              />
              <p>{center.address}</p>
              <p>Salafic · {center.timezone}</p>
            </div>
            <Button loading={busy} onClick={download}>
              Download PNG
            </Button>
            {state.downloadUrl && (
              <p role="status">
                Poster ready.{' '}
                <a
                  className="text-primary underline"
                  href={state.downloadUrl}
                  download={`${center.slug}-prayers-${date}.png`}
                >
                  Save prayer poster
                </a>
              </p>
            )}
          </>
        )}
      </dialog>
    </>
  )
}
