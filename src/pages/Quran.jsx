import { useEffect, useRef, useState } from 'react'
import {
  ArrowClockwise,
  DownloadSimple,
  Pause,
  Play,
  Stop,
} from '@phosphor-icons/react'
import { RECITERS, ayahUrl, fetchSurahs } from '../lib/quran'
import AppHeader from '../components/AppHeader'
import LoadingState from '../components/LoadingState'

export default function Quran() {
  const [surahs, setSurahs] = useState(null)
  const [reciter, setReciter] = useState(RECITERS[0].id)
  const [surahNumber, setSurahNumber] = useState(2)
  const [startAyah, setStartAyah] = useState(1)
  const [endAyah, setEndAyah] = useState(3)

  const [playing, setPlaying] = useState(false)
  const [currentAyah, setCurrentAyah] = useState(null)
  const [playIndex, setPlayIndex] = useState(0)

  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [downloadName, setDownloadName] = useState('')

  const audioRef = useRef(null)
  const playQueueRef = useRef([])

  useEffect(() => {
    fetchSurahs().then(setSurahs)
  }, [])

  const surah = surahs?.find((s) => s.number === surahNumber)
  const ayahCount = surah?.numberOfAyahs ?? 0
  const clampedStart = Math.max(1, Math.min(startAyah, ayahCount || 1))
  const clampedEnd = Math.max(clampedStart, Math.min(endAyah, ayahCount || 1))
  const range = clampedEnd - clampedStart + 1

  function ayahList() {
    return Array.from({ length: range }, (_, i) => clampedStart + i)
  }

  function playRange() {
    playQueueRef.current = ayahList()
    setPlayIndex(0)
    setCurrentAyah(playQueueRef.current[0])
    const url = ayahUrl(reciter, surahNumber, playQueueRef.current[0])
    if (audioRef.current) {
      audioRef.current.src = url
      audioRef.current.play().catch(() => {
        setPlaying(false)
      })
    }
  }

  function handleEnded() {
    const next = playIndex + 1
    if (next < playQueueRef.current.length) {
      setPlayIndex(next)
      setCurrentAyah(playQueueRef.current[next])
      if (audioRef.current) {
        audioRef.current.src = ayahUrl(
          reciter,
          surahNumber,
          playQueueRef.current[next],
        )
        audioRef.current.play().catch(() => {
          setPlaying(false)
        })
      }
    } else {
      setPlaying(false)
      setCurrentAyah(null)
    }
  }

  function stopPlayback() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.removeAttribute('src')
      audioRef.current.load()
    }
    setPlaying(false)
    setCurrentAyah(null)
    setPlayIndex(0)
    playQueueRef.current = []
  }

  function togglePlay() {
    if (playing) {
      audioRef.current?.pause()
      setPlaying(false)
    } else if (currentAyah !== null) {
      audioRef.current?.play().catch(() => {})
    } else {
      playRange()
    }
  }

  async function downloadRange() {
    const list = ayahList()
    setDownloading(true)
    setProgress({ done: 0, total: list.length })
    try {
      const parts = []
      for (let i = 0; i < list.length; i++) {
        const res = await fetch(ayahUrl(reciter, surahNumber, list[i]))
        if (!res.ok) throw new Error(`Could not fetch ayah ${list[i]}`)
        parts.push(await res.arrayBuffer())
        setProgress({ done: i + 1, total: list.length })
      }
      const blob = new Blob(parts, { type: 'audio/mpeg' })
      const name = `${(surah?.englishName || `Surah ${surahNumber}`).replace(/[^A-Za-z0-9-]+/g, '_')}_${clampedStart}-${clampedEnd}_${reciter}.mp3`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10000)
      setDownloadName(name)
    } catch (err) {
      setDownloadName('')
      window.alert(`Download failed: ${err.message}`)
    } finally {
      setDownloading(false)
    }
  }

  const busy = downloading

  return (
    <main className="w-full max-w-full overflow-x-hidden bg-canvas text-ink">
      <AppHeader />

      <section className="relative overflow-hidden pt-28 sm:pt-32">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
          <p className="font-display text-xs font-semibold tracking-[0.3em] text-gold uppercase">
            The recited word
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            Listen, or take it with you.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-secondary">
            Choose a reciter, a surah, and an ayah range. Play it here, or
            download the exact range as a single MP3 file.
          </p>

          {!surahs ? (
            <div className="mt-10">
              <LoadingState rows={2} />
            </div>
          ) : (
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block">
                <span className="text-xs font-semibold tracking-wider text-ink-secondary uppercase">
                  Reciter
                </span>
                <select
                  value={reciter}
                  onChange={(e) => setReciter(e.target.value)}
                  className="mt-2 h-12 w-full cursor-pointer rounded-xl border border-line bg-surface px-3 text-sm text-ink focus:outline-2 focus:outline-primary"
                >
                  {RECITERS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-semibold tracking-wider text-ink-secondary uppercase">
                  Surah
                </span>
                <select
                  value={surahNumber}
                  onChange={(e) => {
                    const n = Number(e.target.value)
                    setSurahNumber(n)
                    setStartAyah(1)
                    setEndAyah(
                      Math.min(3, surahs?.find((s) => s.number === n)?.numberOfAyahs ?? 3),
                    )
                    stopPlayback()
                  }}
                  className="mt-2 h-12 w-full cursor-pointer rounded-xl border border-line bg-surface px-3 text-sm text-ink focus:outline-2 focus:outline-primary"
                >
                  {surahs.map((s) => (
                    <option key={s.number} value={s.number}>
                      {s.number}. {s.englishName}
                      {s.arabicName ? ` (${s.arabicName})` : ''} · {s.numberOfAyahs}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-semibold tracking-wider text-ink-secondary uppercase">
                  From ayah
                </span>
                <input
                  type="number"
                  min={1}
                  max={ayahCount || 1}
                  value={startAyah}
                  onChange={(e) => setStartAyah(Number(e.target.value))}
                  className="mt-2 h-12 w-full rounded-xl border border-line bg-surface px-3 text-sm tabular-nums text-ink focus:outline-2 focus:outline-primary"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold tracking-wider text-ink-secondary uppercase">
                  To ayah
                </span>
                <input
                  type="number"
                  min={clampedStart}
                  max={ayahCount || 1}
                  value={endAyah}
                  onChange={(e) => setEndAyah(Number(e.target.value))}
                  className="mt-2 h-12 w-full rounded-xl border border-line bg-surface px-3 text-sm tabular-nums text-ink focus:outline-2 focus:outline-primary"
                />
              </label>
            </div>
          )}

          {surahs ? (
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                disabled={busy}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 font-display text-sm font-bold text-canvas transition-transform duration-500 ease-out hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {playing ? (
                  <Pause className="h-4 w-4" weight="fill" />
                ) : (
                  <Play className="h-4 w-4" weight="fill" />
                )}
                {playing ? 'Pause' : currentAyah !== null ? 'Resume' : 'Play range'}
              </button>
              {playing || currentAyah !== null ? (
                <button
                  type="button"
                  onClick={stopPlayback}
                  disabled={busy}
                  className="inline-flex h-12 items-center gap-2 rounded-full border border-line bg-surface px-5 text-sm font-medium text-ink transition-colors duration-200 hover:bg-surface-subtle"
                >
                  <Stop className="h-4 w-4" weight="fill" />
                  Stop
                </button>
              ) : null}
              <button
                type="button"
                onClick={downloadRange}
                disabled={busy}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-gold px-6 font-display text-sm font-bold text-deep transition-transform duration-500 ease-out hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <DownloadSimple className="h-4 w-4" weight="bold" />
                {downloading
                  ? `Fetching ${progress.done}/${progress.total}…`
                  : 'Download MP3'}
              </button>
            </div>
          ) : null}

          {downloading ? (
            <div className="mt-6">
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-subtle">
                <div
                  className="h-full rounded-full bg-gold transition-[width] duration-200"
                  style={{ width: `${(progress.done / progress.total) * 100}%` }}
                />
              </div>
            </div>
          ) : null}

          {downloadName ? (
            <p className="mt-5 text-sm text-ink-secondary">
              Downloaded{' '}
              <span className="font-medium text-ink">{downloadName}</span> — {range}{' '}
              ayah{range === 1 ? '' : 's'} ({surah?.englishName}, {reciter}).
            </p>
          ) : null}

          {playing && currentAyah !== null ? (
            <p className="mt-5 text-sm text-ink-secondary">
              Playing ayah {currentAyah} of {clampedEnd}
              {surah ? ` — ${surah.englishName}` : ''}{' '}
              <button
                type="button"
                onClick={() => {
                  setPlaying(false)
                  stopPlayback()
                }}
                className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-ink underline underline-offset-2"
              >
                <ArrowClockwise className="h-3.5 w-3.5" />
                Reset
              </button>
            </p>
          ) : null}
        </div>
      </section>

      <audio
        ref={audioRef}
        className="hidden"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={handleEnded}
      />
    </main>
  )
}
