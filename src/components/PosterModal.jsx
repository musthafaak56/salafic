import { useEffect, useMemo, useRef, useState } from 'react'
import { toBlob, toCanvas } from 'html-to-image'
import { jsPDF } from 'jspdf'
import { X, ImageSquare, FilePdf } from '@phosphor-icons/react'
import { formatTime } from '../lib/utils'

const POSTER_W = 794
const POSTER_H = 1123
const TITLE_MAX_W = 560

const NAVY = '#011F3B'
const CREAM = '#F7F4EF'
const GOLD = '#9B6D0E'
const GOLD_BRIGHT = '#C2933C'

const CABINET = "'Cabinet Grotesk', sans-serif"
const SATOSHI = "'Satoshi', sans-serif"
const ML_SERIF = "'Noto Serif Malayalam', serif"
const ML_SANS = "'Noto Sans Malayalam', sans-serif"

const BRAND = {
  en: { top1: 'SALAFI CENTER', top2: 'CHERUKUNNU', bottom1: 'SALAFI CENTER', bottom2: 'CHERUKUNNU' },
  ml: { top1: 'സലഫി സെന്റർ', top2: 'ചെറുകുന്ന്', bottom1: 'സലഫി സെന്റർ', bottom2: 'ചെറുകുന്ന്' },
}

function slugify(text) {
  return (
    (text || 'event')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'event'
  )
}

function eventDateParts(eventAt) {
  const d = new Date(eventAt)
  if (Number.isNaN(d.getTime())) return null
  return {
    date: d,
    weekdayLong: d.toLocaleDateString('en-IN', { weekday: 'long' }),
    weekdayMl: d.toLocaleDateString('ml-IN', { weekday: 'short' }),
    monthLong: d.toLocaleDateString('en-IN', { month: 'long' }),
    monthMl: d.toLocaleDateString('ml-IN', { month: 'long' }),
    day: d.getDate(),
    year: d.getFullYear(),
  }
}

// Splits the event title into display lines that fit TITLE_MAX_W at the
// largest possible size, using the real font metrics for the current
// language. Falls back to 3 lines when the title is too long for two.
function fitTitleLines(title, isMl) {
  const words = title.trim().replace(/\s+/g, ' ').split(' ')
  if (!words.length) return { size: 96, lines: [] }
  const font = isMl ? ML_SERIF : CABINET
  const probe = (size) => {
    const ctx = document.createElement('canvas').getContext('2d')
    ctx.font = `700 ${size}px ${font}`
    return (text) => ctx.measureText(text).width
  }
  const fmt = (w) => (isMl ? w : w.toUpperCase())
  const line = (ws) => ws.map(fmt).join(' ')
  const maxSize = isMl ? 84 : 96
  const minSize = isMl ? 44 : 40
  for (let size = maxSize; size >= minSize; size -= 4) {
    const m = probe(size)
    if (words.length === 1) {
      if (m(fmt(words[0])) <= TITLE_MAX_W) return { size, lines: [fmt(words[0])] }
      continue
    }
    let best = null
    for (let i = 1; i < words.length; i++) {
      const l1 = line(words.slice(0, i))
      const l2 = line(words.slice(i))
      if (m(l1) <= TITLE_MAX_W && m(l2) <= TITLE_MAX_W) {
        const d = Math.abs(m(l1) - m(l2))
        if (!best || d < best.d) best = { d, lines: [l1, l2] }
      }
    }
    if (best) return { size, lines: best.lines }
  }
  const m = probe(minSize)
  let best = null
  for (let i = 1; i < words.length - 1; i++) {
    for (let j = i + 1; j < words.length; j++) {
      const l1 = line(words.slice(0, i))
      const l2 = line(words.slice(i, j))
      const l3 = line(words.slice(j))
      if (m(l1) <= TITLE_MAX_W && m(l2) <= TITLE_MAX_W && m(l3) <= TITLE_MAX_W) {
        const d = Math.abs(m(l1) - m(l2)) + Math.abs(m(l2) - m(l3))
        if (!best || d < best.d) best = { lines: [l1, l2, l3] }
      }
    }
  }
  if (best) return { size: minSize, lines: best.lines }
  return { size: 28, lines: [line(words)] }
}

// Vertical gold ogee-arch column on the right — echoes the golden
// architecture that fills the right side of the reference poster photo.
function ArchColumn() {
  return (
    <svg
      className="absolute top-[110px] right-[30px]"
      width="84"
      height="760"
      viewBox="0 0 84 760"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M42 6c-20 16-33 44-33 75v220h66V81c0-31-13-59-33-75Z"
        stroke={GOLD_BRIGHT}
        strokeOpacity="0.55"
        strokeWidth="1.5"
      />
      <path
        d="M42 24c-13 11-22 29-22 49v154h44V73c0-20-9-38-22-49Z"
        stroke={GOLD_BRIGHT}
        strokeOpacity="0.32"
        strokeWidth="1"
      />
      <path
        d="M42 44c-8 7-13 18-13 31v92h26V75c0-13-5-24-13-31Z"
        stroke={GOLD_BRIGHT}
        strokeOpacity="0.16"
        strokeWidth="1"
      />
      <path
        d="M42 520v140"
        stroke={GOLD_BRIGHT}
        strokeOpacity="0.24"
        strokeWidth="1"
      />
    </svg>
  )
}

// Small gold corner accent inside the navy footer band.
function BandMark() {
  return (
    <svg
      className="absolute right-[30px] bottom-[26px]"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path d="M8 0l3 8-3 8-3-8z" fill={GOLD} />
    </svg>
  )
}

// Delivers a blob as a real file. Mobile browsers can't save files with a
// proper name via anchor clicks, so we use the native share sheet there
// (iOS/Android); desktop gets a blob-anchored download.
async function deliverFile(blob, filename) {
  const isMobile = /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent)
  let shared = false
  if (isMobile && navigator.canShare && navigator.share) {
    try {
      const file = new File([blob], filename, { type: blob.type })
      if (navigator.canShare({ files: [file] })) {
        await Promise.race([
          navigator.share({ files: [file], title: filename }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('share-timeout')), 3000)),
        ])
        shared = true
      }
    } catch {
      // User dismissed the share sheet or timing fell back — continue
      // to a regular download.
    }
  }
  if (shared) return
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

// Scales the fixed-size poster down to fit the preview area without
// touching the captured node (capture always happens at full size).
function useFitScale(containerRef, baseWidth) {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setScale(Math.min(1, el.clientWidth / baseWidth))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [baseWidth, containerRef])
  return scale
}

export default function PosterModal({ event, onClose }) {
  const posterRef = useRef(null)
  const previewRef = useRef(null)
  const scale = useFitScale(previewRef, POSTER_W)
  const [lang, setLang] = useState('en')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const isMl = lang === 'ml'
  const parts = eventDateParts(event.eventAt)
  const title = (isMl && event.titleMl ? event.titleMl : event.title) || event.title || ''
  const fit = useMemo(() => fitTitleLines(title, isMl), [title, isMl])
  const brand = BRAND[lang]
  const timeLine = formatTime(event.eventAt)
  const hasTime = timeLine !== '—'

  const isSameDay =
    parts && parts.date.toDateString() === new Date().toDateString()

  const chipText = parts
    ? isMl
      ? isSameDay
        ? 'ഇന്ന്'
        : parts.weekdayMl
      : isSameDay
        ? 'TO DAY'
        : parts.weekdayLong.toUpperCase()
    : ''

  const dateLine = parts
    ? isMl
      ? `${parts.monthMl} ${parts.day}, ${parts.year}`
      : `${parts.day} ${parts.monthLong.toUpperCase()} ${parts.year}`
    : ''

  async function capture(kind) {
    const node = posterRef.current
    if (!node) return
    setBusy(kind)
    setError('')
    try {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 30000)
      )
      await Promise.race([timeout, runCapture(kind, node)])
    } catch (err) {
      setError(
        err?.message === 'timeout'
          ? 'Poster generation took too long. Please try again.'
          : 'Could not generate the poster. Please try again.'
      )
    } finally {
      setBusy('')
    }
  }

  async function runCapture(kind, node) {
    await document.fonts.ready
    let fontEmbedCSS = ''
    try {
      fontEmbedCSS = await fetch(
        'https://fonts.googleapis.com/css2?family=Noto+Serif+Malayalam:wght@500;600;700&family=Noto+Sans+Malayalam:wght@400;600&display=swap'
      ).then((r) => r.text())
    } catch {}
    const opts = { pixelRatio: 2, cacheBust: true, fontEmbedCSS }
    const slug = slugify(event.title)
    const filename = `poster-${slug}-${lang}.${kind === 'png' ? 'png' : 'pdf'}`
    if (kind === 'png') {
      const blob = await toBlob(node, { ...opts, type: 'image/png' })
      await deliverFile(blob, filename)
    } else {
      const canvas = await toCanvas(node, opts)
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
      const w = canvas.width
      const h = canvas.height
      const pageW = pdf.internal.pageSize.getWidth()
      pdf.addImage(
        canvas.toDataURL('image/jpeg', 0.93),
        'JPEG',
        0,
        0,
        pageW,
        (pageW * h) / w
      )
      await deliverFile(pdf.output('blob'), filename)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Event poster"
      onClick={() => onClose?.()}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-4xl flex-col gap-4 overflow-hidden rounded-2xl border border-line bg-canvas p-4 shadow-2xl sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-line bg-surface p-1">
            {['en', 'ml'].map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                aria-pressed={lang === code}
                className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  lang === code
                    ? 'bg-primary text-white'
                    : 'text-ink-secondary hover:text-ink'
                }`}
              >
                {code === 'en' ? 'English' : 'മലയാളം'}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => capture('png')}
              disabled={Boolean(busy)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ImageSquare className="h-4 w-4" />
              {busy === 'png' ? 'Rendering…' : 'Download PNG'}
            </button>
            <button
              type="button"
              onClick={() => capture('pdf')}
              disabled={Boolean(busy)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FilePdf className="h-4 w-4" />
              {busy === 'pdf' ? 'Rendering…' : 'Download PDF'}
            </button>
            <button
              type="button"
              onClick={() => onClose?.()}
              aria-label="Close poster preview"
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-line bg-surface text-ink transition-colors hover:bg-surface-subtle"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {error ? (
          <p
            className="rounded-lg border border-negative/30 bg-negative/10 p-3 text-sm text-negative"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div
          ref={previewRef}
          className="flex-1 overflow-auto rounded-xl border border-line bg-deep/40 p-2"
        >
          <div
            className="mx-auto"
            style={{ width: POSTER_W * scale, height: POSTER_H * scale }}
          >
            <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
              <div
                ref={posterRef}
                className="relative overflow-hidden"
                style={{
                  width: POSTER_W,
                  height: POSTER_H,
                  background: CREAM,
                  color: NAVY,
                  fontFamily: SATOSHI,
                }}
              >
                <ArchColumn />

                <div className="relative flex h-full flex-col">
                  <div className="flex flex-col items-center px-12 pt-[86px]">
                    <p
                      className="text-[13px] font-semibold tracking-[0.42em] text-[#011F3B]"
                      style={{ fontFamily: isMl ? ML_SANS : CABINET }}
                    >
                      {brand.top1}
                    </p>
                    <p
                      className="mt-2 text-[42px] font-bold tracking-[0.08em] leading-none text-[#011F3B]"
                      style={{ fontFamily: isMl ? ML_SANS : CABINET }}
                    >
                      {brand.top2}
                    </p>
                  </div>

                  <div className="flex flex-1 flex-col items-center justify-center px-12 text-center">
                    <div>
                      {fit.lines.map((line, i) => (
                        <p
                          key={i}
                          className="font-bold text-[#011F3B]"
                          style={{
                            fontFamily: isMl ? ML_SERIF : CABINET,
                            fontSize: fit.size,
                            lineHeight: isMl ? 1.18 : 1.04,
                          }}
                        >
                          {line}
                        </p>
                      ))}
                    </div>

                    {chipText ? (
                      <div className="mt-10 bg-[#011F3B] px-8 py-3.5">
                        <p
                          className="text-[26px] font-bold tracking-[0.08em] leading-none text-[#F7F4EF]"
                          style={{ fontFamily: isMl ? ML_SANS : CABINET }}
                        >
                          {chipText}
                        </p>
                      </div>
                    ) : null}

                    {dateLine ? (
                      <p
                        className="mt-9 text-[22px] font-semibold tracking-[0.14em] text-[#011F3B]"
                        style={{ fontFamily: isMl ? ML_SANS : undefined }}
                      >
                        {dateLine}
                      </p>
                    ) : null}

                    {hasTime ? (
                      <p className="mt-4 text-[30px] font-bold tracking-tight text-[#011F3B]">
                        {timeLine}
                      </p>
                    ) : null}

                    {event.location ? (
                      <p
                        className="mt-9 max-w-[500px] text-[18px] leading-[1.45] text-[#011F3B]/80"
                        style={{ fontFamily: isMl ? ML_SANS : undefined }}
                      >
                        {event.location}
                      </p>
                    ) : null}
                  </div>

                  <div className="relative h-[118px] shrink-0 bg-[#011F3B]">
                    <BandMark />
                    <div className="flex h-full flex-col items-center justify-center">
                      <p
                        className="text-[15px] font-semibold tracking-[0.38em] text-[#9B6D0E]"
                        style={{ fontFamily: isMl ? ML_SANS : CABINET }}
                      >
                        {brand.bottom1}
                      </p>
                      <p
                        className="mt-1.5 text-[24px] font-bold tracking-[0.05em] leading-none text-[#9B6D0E]"
                        style={{ fontFamily: isMl ? ML_SANS : CABINET }}
                      >
                        {brand.bottom2}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}