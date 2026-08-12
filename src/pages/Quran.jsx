import { useEffect, useRef, useState } from 'react'
import {
  ArrowClockwise,
  DownloadSimple,
  Pause,
  Play,
  Stop,
  VideoCamera,
} from '@phosphor-icons/react'
import { RECITERS, FONT_PAIRS, ayahUrl, fetchSurahs, fetchSurahTexts } from '../lib/quran'
import { renderAyahVideo } from '../lib/quranVideo'
import { loadKaraoke, ayahWords, activeWord, effectiveGloss } from '../lib/karaoke'
import AppHeader from '../components/AppHeader'
import LoadingState from '../components/LoadingState'

export default function Quran() {
  const [surahs, setSurahs] = useState(null)
  const [reciter, setReciter] = useState(RECITERS[0].id)
  const [surahNumber, setSurahNumber] = useState(23)
  const [startAyah, setStartAyah] = useState(1)
  const [endAyah, setEndAyah] = useState(3)

  const [playing, setPlaying] = useState(false)
  const [currentAyah, setCurrentAyah] = useState(null)
  const [playIndex, setPlayIndex] = useState(0)

  const [nowWords, setNowWords] = useState(null)
  const [activeWordIndex, setActiveWordIndex] = useState(-1)

  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [downloadName, setDownloadName] = useState('')

  const [video, setVideo] = useState('idle')
  const [videoName, setVideoName] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')

  const [fontPairId, setFontPairId] = useState(
    () => localStorage.getItem('salafic-font-pair') || FONT_PAIRS[0].id,
  )
  const fontPair = FONT_PAIRS.find((p) => p.id === fontPairId) || FONT_PAIRS[0]

  const audioRef = useRef(null)
  const playQueueRef = useRef([])
  const karaokeRef = useRef(null)

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const nowAyahRef = useRef(0)
  const lastActiveRef = useRef(-1)

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

  async function loadNowWords(ayahNumber) {
    try {
      if (!karaokeRef.current) {
        karaokeRef.current = await loadKaraoke(reciter).catch(() => null)
      }
      const karaoke = karaokeRef.current
      if (!karaoke) {
        setNowWords(null)
        return
      }
      const texts = await fetchSurahTexts(surahNumber)
      const ayah = texts.ayahs[ayahNumber - 1]
      if (!ayah) {
        setNowWords(null)
        return
      }
      const words = ayahWords(
        karaoke.timings,
        karaoke.ml,
        surahNumber,
        ayah.number,
        ayah.arabic,
      )
      setNowWords(
        words ? { words, basmala: ayah.basmala, translation: ayah.translationMl || ayah.translation || '' } : null,
      )
    } catch {
      setNowWords(null)
    }
  }

  function playRange() {
    playQueueRef.current = ayahList()
    setPlayIndex(0)
    setCurrentAyah(playQueueRef.current[0])
    lastActiveRef.current = -1
    setActiveWordIndex(-1)
    loadNowWords(playQueueRef.current[0])
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
      lastActiveRef.current = -1
      setActiveWordIndex(-1)
      loadNowWords(playQueueRef.current[next])
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
      setNowWords(null)
    }
  }

  function handleTimeUpdate() {
    if (currentAyah === null || !nowWords || !audioRef.current) return
    const segs = nowWords.words.segs
    if (!segs) return
    const elapsed = audioRef.current.currentTime * 1000
    const found = activeWord(segs, elapsed)
    if (found >= 0) lastActiveRef.current = found
    if (lastActiveRef.current !== activeWordIndex) {
      setActiveWordIndex(lastActiveRef.current)
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
    setNowWords(null)
    setActiveWordIndex(-1)
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

  async function downloadVideo() {
    setVideoName('')
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old)
      return ''
    })
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC || !HTMLCanvasElement.prototype.captureStream || typeof MediaRecorder === 'undefined') {
      window.alert(
        'Video download is not supported on this browser yet — iPhone/iPad Safari cannot record video. It works in Chrome, and in Safari on a Mac. MP3 works everywhere.',
      )
      return
    }
    if (playing || currentAyah !== null) stopPlayback()
    const audio = new AC()
    audio.resume().catch(() => {})
    setVideo('fetch')
    try {
      const texts = await fetchSurahTexts(surahNumber)
      const list = ayahList()
      const ayahs = list.map((n) => texts.ayahs[n - 1]).filter(Boolean)
      if (ayahs.length !== list.length) throw new Error('Could not fetch ayah text')
      if (!window.confirm(`Record a video of ${list.length} ayah${list.length === 1 ? '' : 's'} (${texts.englishName}, ${reciter})?`)) {
        return
      }
      setVideo('render')
      await Promise.all(
        ['400', '500', '600', '700'].flatMap((w) => [
          document.fonts.load(`${w} 76px ${fontPair.ar}`),
          document.fonts.load(`${w} 40px ${fontPair.ml}`),
        ]),
      ).catch(() => {})
      const { blob, ext } = await renderAyahVideo({
        surahNumber,
        surahLabel: texts.englishName.toUpperCase(),
        ayahs,
        reciter,
        audio,
        fonts: { ar: fontPair.ar, ml: fontPair.ml },
        onProgress: ({ phase, done }) => setProgress({ done, total: phase === 'render' ? 1 : ayahs.length }),
      })
      const name = `${(texts.englishName || `Surah ${surahNumber}`).replace(/[^A-Za-z0-9-]+/g, '_')}_${clampedStart}-${clampedEnd}_${reciter}.${ext}`
      setVideoName(name)
      setPreviewUrl(URL.createObjectURL(blob))
    } catch (err) {
      setVideoName('')
      const msg =
        err?.message === 'too-long'
          ? 'This range is too long for a video (max ~15 minutes). Pick fewer ayahs or use the MP3 download.'
          : err?.message === 'no-support' || err?.message === 'no-mime'
            ? 'Video download is not supported on this browser yet — iPhone/iPad Safari cannot record video. It works in Chrome, and in Safari on a Mac. MP3 works everywhere.'
            : err?.message === 'audio-blocked'
              ? 'Your browser blocked the audio needed for recording. Unmute this tab and tap Download Video again — it must start from your tap, so do not switch away while the clips load.'
              : err?.message === 'recording-error'
                ? 'Recording failed. Please try again.'
                : `Video failed: ${err.message}`
      window.alert(msg)
    } finally {
      setVideo('idle')
    }
  }

  function saveVideo() {
    if (!previewUrl || !videoName) return
    const a = document.createElement('a')
    a.href = previewUrl
    a.download = videoName
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const busy = downloading || video !== 'idle'

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
            download the exact range as a single MP3 — or as a shareable video
            with the Arabic text and Malayalam translation.
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
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold tracking-wider text-ink-secondary uppercase">
                Fonts
              </span>
              {FONT_PAIRS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setFontPairId(p.id)
                    localStorage.setItem('salafic-font-pair', p.id)
                  }}
                  className={`inline-flex h-12 items-center gap-3 rounded-full border px-4 text-sm transition-colors duration-200 ${
                    fontPair.id === p.id
                      ? 'border-gold bg-gold/10 text-ink'
                      : 'border-line bg-surface text-ink-secondary hover:bg-surface-subtle'
                  }`}
                >
                  <span dir="rtl" className="text-lg leading-none" style={{ fontFamily: p.ar }}>
                    بسم الله
                  </span>
                  <span className="text-lg leading-none" style={{ fontFamily: p.ml }}>
                    ഖുർആൻ
                  </span>
                </button>
              ))}
            </div>
          ) : null}

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
              <button
                type="button"
                onClick={downloadVideo}
                disabled={busy}
                className="inline-flex h-12 items-center gap-2 rounded-full border border-gold/60 bg-surface px-6 font-display text-sm font-bold text-gold transition-transform duration-500 ease-out hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <VideoCamera className="h-4 w-4" weight="bold" />
                {video === 'fetch'
                  ? `Fetching ${progress.done}/${progress.total}…`
                  : video === 'render'
                    ? 'Recording…'
                    : 'Download Video'}
              </button>
            </div>
          ) : null}

          {downloading || video !== 'idle' ? (
            <div className="mt-6">
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-subtle">
                <div
                  className={`h-full rounded-full bg-gold transition-[width] duration-200 ${
                    video === 'render' ? 'animate-pulse' : ''
                  }`}
                  style={{
                    width:
                      video === 'render'
                        ? '100%'
                        : `${(progress.done / Math.max(1, progress.total)) * 100}%`,
                  }}
                />
              </div>
              {video === 'render' ? (
                <p className="mt-2 text-sm text-ink-secondary">
                  Recording video in real time — keep this tab visible. This takes as long as
                  the recitation itself.
                </p>
              ) : null}
            </div>
          ) : null}

          {downloadName ? (
            <p className="mt-5 text-sm text-ink-secondary">
              Downloaded{' '}
              <span className="font-medium text-ink">{downloadName}</span> — {range} ayah
              {range === 1 ? '' : 's'} ({surah?.englishName}, {reciter}).
            </p>
          ) : null}

          {videoName && previewUrl ? (
            <div className="mt-8">
              <p className="text-xs font-semibold tracking-wider text-gold uppercase">
                Video ready — preview it, then download
              </p>
              <div className="mx-auto mt-4 w-full max-w-sm">
                <video
                  src={previewUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="aspect-[9/16] w-full rounded-2xl border border-line bg-black"
                />
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={saveVideo}
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-gold px-6 font-display text-sm font-bold text-deep transition-transform duration-500 ease-out hover:scale-105"
                >
                  <DownloadSimple className="h-4 w-4" weight="bold" />
                  Download {videoName.replace(/\.[^.]+$/, '')} ({range} ayah
                  {range === 1 ? '' : 's'})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVideoName('')
                    setPreviewUrl((old) => {
                      if (old) URL.revokeObjectURL(old)
                      return ''
                    })
                  }}
                  className="inline-flex h-12 items-center gap-2 rounded-full border border-line bg-surface px-5 text-sm font-medium text-ink transition-colors duration-200 hover:bg-surface-subtle"
                >
                  <ArrowClockwise className="h-4 w-4" />
                  Record again
                </button>
              </div>
            </div>
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

          {playing && currentAyah !== null && nowWords ? (
            <div className="mt-6 rounded-2xl border border-line bg-surface p-5 text-center sm:p-7">
              <p className="text-xs font-semibold tracking-wider text-gold uppercase">
                Now playing · {surahNumber}:{currentAyah}
              </p>
              <div className="mt-4">
                {nowWords.basmala ? (
                  <p
                    dir="rtl"
                    style={{ fontFamily: fontPair.ar }}
                    className="mb-3 font-arabic text-lg text-gold sm:text-xl"
                  >
                    بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                  </p>
                ) : null}
                <p
                  dir="rtl"
                  style={{ fontFamily: fontPair.ar }}
                  className="font-arabic text-2xl leading-[2.2] text-ink sm:text-3xl sm:leading-[2.2]"
                >
                  {nowWords.words.ar.map((word, i) => {
                    const seg = nowWords.words.segs[activeWordIndex]
                    const active = seg && i >= seg[0] && i < seg[1]
                    return (
                      <span
                        key={i}
                        className={`inline-block transition-colors duration-200 ${
                          active ? 'text-gold' : ''
                        }`}
                      >
                        {word}
                        {i < nowWords.words.ar.length - 1 ? '\u00A0' : ''}
                      </span>
                    )
                  })}
                </p>
                <p
                  style={{ fontFamily: fontPair.ml }}
                  className="mt-4 font-malayalam text-xl leading-relaxed text-ink sm:text-2xl"
                >
                  {nowWords.translation}
                </p>
                {(() => {
                  const glossIndex = effectiveGloss(nowWords.words.ml, activeWordIndex)
                  if (glossIndex < 0 || !nowWords.words.ml[glossIndex]) return null
                  const gloss = nowWords.words.ml[glossIndex].replace(/\r\n/g, ' ').trim()
                  return gloss && gloss !== '*' ? (
                    <p
                      style={{ fontFamily: fontPair.ml }}
                      className="mt-3 inline-block rounded-full border border-gold/60 bg-gold/10 px-5 py-1.5 font-malayalam text-lg font-semibold text-gold sm:text-xl"
                    >
                      {gloss}
                    </p>
                  ) : null
                })()}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <audio
        ref={audioRef}
        className="hidden"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={handleEnded}
        onTimeUpdate={handleTimeUpdate}
      />
    </main>
  )
}
