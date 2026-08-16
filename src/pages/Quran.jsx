import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowClockwise,
  DownloadSimple,
  Pause,
  Play,
  Repeat,
  Stop,
  VideoCamera,
  WhatsappLogo,
} from '@phosphor-icons/react'
import {
  RECITERS,
  FONT_PAIRS,
  ayahUrl,
  surahAudioUrl,
  surahMode,
  fetchSurahs,
  fetchSurahTexts,
} from '../lib/quran'
import { renderAyahVideo, renderAyahVideoOffline, hasOfflineSupport } from '../lib/quranVideo'
import { loadKaraoke, ayahWords, activeWord } from '../lib/karaoke'
import { fitArabicWords, activeLineOf, lineGlosses } from '../lib/wordWrap'
import AppHeader from '../components/AppHeader'
import LoadingState from '../components/LoadingState'

export default function Quran() {
  const [surahs, setSurahs] = useState(null)
  const [reciter, setReciter] = useState(
    () => RECITERS.find((r) => r.id === 'Dukhain')?.id ?? RECITERS[0].id,
  )
  const [surahNumber, setSurahNumber] = useState(23)
  const [startAyah, setStartAyah] = useState(1)
  const [endAyah, setEndAyah] = useState(3)

  const [playing, setPlaying] = useState(false)
  const [repeatAyah, setRepeatAyah] = useState(false)
  const [currentAyah, setCurrentAyah] = useState(null)
  const [playIndex, setPlayIndex] = useState(0)

  const [nowWords, setNowWords] = useState(null)
  const [activeWordIndex, setActiveWordIndex] = useState(-1)

  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [downloadName, setDownloadName] = useState('')

  const [video, setVideo] = useState('idle')
  const [renderMode, setRenderMode] = useState(null)
  const [videoName, setVideoName] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')

  const [fontPairId, setFontPairId] = useState(
    () => localStorage.getItem('salafic-font-pair') || FONT_PAIRS[0].id,
  )
  const fontPair = FONT_PAIRS.find((p) => p.id === fontPairId) || FONT_PAIRS[0]

  // Shared canvas for measuring Arabic words with the exact same font ladder
  // as the video renderer, so the line revealed on the page is the same line
  // revealed in the video at the same moment.
  const measureCtxRef = useRef(null)
  if (!measureCtxRef.current && typeof document !== 'undefined') {
    measureCtxRef.current = document.createElement('canvas').getContext('2d')
  }

  const arabicWrap = useMemo(() => {
    const words = nowWords?.words
    if (!words?.ar?.length || !measureCtxRef.current) return null
    return fitArabicWords(
      measureCtxRef.current,
      words.ar.map((text, i) => ({ text, i })),
      fontPair.ar,
    )
  }, [nowWords, fontPair])

  const activeSeg =
    nowWords && activeWordIndex >= 0 ? nowWords.words.segs[activeWordIndex] : null
  const lineIndex = arabicWrap ? activeLineOf(arabicWrap.lines, activeSeg) : -1

  // The complete Malayalam meaning of the ayah, shown in full under the line.
  const mlFull = useMemo(
    () => (nowWords?.translation || '').replace(/\r\n/g, ' ').trim(),
    [nowWords],
  )

  // Word-by-word Malayalam glosses of each line, shown under the sentence.
  const glossRow = useMemo(() => {
    if (!arabicWrap || !nowWords?.words?.ml?.length) return []
    return arabicWrap.lines.map((line) =>
      lineGlosses(line, nowWords.words.segs, nowWords.words.ml),
    )
  }, [arabicWrap, nowWords])

  const audioRef = useRef(null)
  const playQueueRef = useRef([])
  const karaokeRef = useRef(null)
  const advancingRef = useRef(false)
  const nowWordRef = useRef(null)

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

  // Safari kills and reloads the tab when the video render runs out of memory
  // (mainly iOS). The renderer checkpoints its progress to sessionStorage, so
  // after such a crash-reload we can tell the user what happened and that the
  // MP3 download still works.
  useEffect(() => {
    let step = null
    try {
      step = sessionStorage.getItem('__salaficRenderStep')
    } catch {}
    if (step) {
      try {
        sessionStorage.removeItem('__salaficRenderStep')
      } catch {}
      window.alert(
        'The video render was cut off by the browser (Safari closed the page at step: ' +
          `${step}). Try a shorter ayah range, or use the MP3 download.`,
      )
    }
  }, [])

  const surah = surahs?.find((s) => s.number === surahNumber)
  const ayahCount = surah?.numberOfAyahs ?? 0
  const clampedStart = Math.max(1, Math.min(Number(startAyah) || 1, ayahCount || 1))
  const clampedEnd = Math.max(
    clampedStart,
    Math.min(Number(endAyah) || 1, ayahCount || 1),
  )
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
        nowWordRef.current = null
        return
      }
      const texts = await fetchSurahTexts(surahNumber)
      const ayah = texts.ayahs[ayahNumber - 1]
      if (!ayah) {
        setNowWords(null)
        nowWordRef.current = null
        return
      }
      const words = ayahWords(
        karaoke.timings,
        karaoke.ml,
        surahNumber,
        ayah.number,
        ayah.arabic,
      )
      const bundle = words
        ? { words, basmala: ayah.basmala, translation: ayah.translationMl || ayah.translation || '' }
        : null
      nowWordRef.current = bundle
      setNowWords(bundle)
    } catch {
      setNowWords(null)
      nowWordRef.current = null
    }
  }

  // Waits until the element has duration metadata (needed before seeking).
  function waitForMetadata(el) {
    if (el.readyState >= 1) return Promise.resolve()
    return new Promise((resolve) => {
      const done = () => {
        el.removeEventListener('loadedmetadata', done)
        resolve()
      }
      el.addEventListener('loadedmetadata', done)
    })
  }

  // Positions the audio element at the start of an ayah inside the surah file
  // (surah mode) using the ayah window from the timing data.
  function seekToWordStart(el, bundle) {
    const start = bundle?.words?.startMs
    if (typeof start !== 'number') return
    try {
      el.currentTime = start / 1000
    } catch {}
  }

  async function playRange() {
    playQueueRef.current = ayahList()
    setPlayIndex(0)
    setCurrentAyah(playQueueRef.current[0])
    lastActiveRef.current = -1
    setActiveWordIndex(-1)
    const el = audioRef.current
    if (!el) return
    await loadNowWords(playQueueRef.current[0])
    if (surahMode(reciter)) {
      // Whole-surah audio: point the element at the surah file once; each
      // ayah plays from its window inside it.
      const surahUrl = surahAudioUrl(reciter, surahNumber)
      if (el.getAttribute('data-src') !== surahUrl) {
        el.src = surahUrl
        el.setAttribute('data-src', surahUrl)
      }
      try {
        await waitForMetadata(el)
        seekToWordStart(el, nowWordRef.current)
      } catch {}
      el.play().catch(() => {
        setPlaying(false)
      })
    } else {
      const url = ayahUrl(reciter, surahNumber, playQueueRef.current[0])
      el.src = url
      el.play().catch(() => {
        setPlaying(false)
      })
    }
  }

  async function handleEnded() {
    if (advancingRef.current) return
    advancingRef.current = true
    try {
      if (repeatAyah) {
        // Repeat the current ayah: re-seek to its start and play again.
        const el = audioRef.current
        if (el) {
          lastActiveRef.current = -1
          setActiveWordIndex(-1)
          if (surahMode(reciter)) {
            seekToWordStart(el, nowWordRef.current)
          } else {
            el.currentTime = 0
          }
          el.play().catch(() => {
            setPlaying(false)
          })
        }
        return
      }
      const next = playIndex + 1
      if (next < playQueueRef.current.length) {
        setPlayIndex(next)
        setCurrentAyah(playQueueRef.current[next])
        lastActiveRef.current = -1
        setActiveWordIndex(-1)
        if (surahMode(reciter)) {
          // Keep the same surah file open; hold at the window end while the
          // next ayah's words load, then move to its window.
          audioRef.current?.pause()
          await loadNowWords(playQueueRef.current[next])
          if (audioRef.current) {
            seekToWordStart(audioRef.current, nowWordRef.current)
            audioRef.current.play().catch(() => {
              setPlaying(false)
            })
          }
        } else {
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
        }
      } else {
        audioRef.current?.pause()
        setPlaying(false)
        setCurrentAyah(null)
        setNowWords(null)
        nowWordRef.current = null
      }
    } finally {
      advancingRef.current = false
    }
  }

  function handleTimeUpdate() {
    if (currentAyah === null || !audioRef.current) return
    const bundle = nowWordRef.current
    const segs = bundle?.words?.segs
    if (!segs) return
    // In surah mode the element's clock is the whole surah; the elapsed time
    // within the ayah is offset by its window start. The audio also advances
    // past the ayah window on its own (continuous file), so advance to the
    // next ayah once the window's end is reached.
    const start = bundle.words.startMs
    const end = bundle.words.endMs
    const t = audioRef.current.currentTime * 1000
    if (typeof start === 'number' && typeof end === 'number') {
      if (t >= end - 40 && !advancingRef.current) {
        // handleEnded sets advancingRef while it loads the next ayah's words.
        requestAnimationFrame(() => handleEnded())
        return
      }
      const elapsed = t - start
      const found = activeWord(segs, elapsed)
      if (found >= 0) lastActiveRef.current = found
    } else {
      const elapsed = t
      const found = activeWord(segs, elapsed)
      if (found >= 0) lastActiveRef.current = found
    }
    if (lastActiveRef.current !== activeWordIndex) {
      setActiveWordIndex(lastActiveRef.current)
    }
  }

  function stopPlayback() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.removeAttribute('src')
      audioRef.current.removeAttribute('data-src')
      audioRef.current.load()
    }
    setPlaying(false)
    setCurrentAyah(null)
    setPlayIndex(0)
    setNowWords(null)
    nowWordRef.current = null
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
    try {
      if (surahMode(reciter)) {
        // Whole-surah audio: fetch the single MP3 directly.
        const res = await fetch(surahAudioUrl(reciter, surahNumber))
        if (!res.ok) throw new Error(`Could not fetch surah ${surahNumber}`)
        const blob = await res.blob()
        setProgress({ done: 1, total: 1 })
        const name = `${(surah?.englishName || `Surah ${surahNumber}`).replace(/[^A-Za-z0-9-]+/g, '_')}_${reciter}.mp3`
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = name
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(url), 10000)
        setDownloadName(name)
        return
      }
      setProgress({ done: 0, total: list.length })
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
    if (!AC) {
      window.alert(
        'Video download is not supported on this browser yet — it needs a newer browser. MP3 works everywhere.',
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
      const canRecord =
        typeof MediaRecorder !== 'undefined' && HTMLCanvasElement.prototype.captureStream
      const offline = hasOfflineSupport()
      if (!offline && !canRecord) {
        window.alert(
          'Video download is not supported on this browser yet — it needs a newer browser. It works in Chrome, Safari (macOS and iOS 16.4+), and Firefox 130+. MP3 works everywhere.',
        )
        return
      }
      if (!window.confirm(`Render a video of ${list.length} ayah${list.length === 1 ? '' : 's'} (${texts.englishName}, ${reciter})?`)) {
        return
      }
      setRenderMode(offline ? 'offline' : 'record')
      setVideo('render')
      await Promise.all(
        ['400', '500', '600', '700'].flatMap((w) => [
          document.fonts.load(`${w} 76px ${fontPair.ar}`),
          document.fonts.load(`${w} 40px ${fontPair.ml}`),
        ]),
      ).catch(() => {})
      const args = {
        surahNumber,
        surahLabel: texts.englishName.toUpperCase(),
        ayahs,
        reciter,
        reciterLabel: RECITERS.find((r) => r.id === reciter)?.label,
        audio,
        fonts: { ar: fontPair.ar, ml: fontPair.ml },
        onProgress: ({ done, total }) => setProgress({ done, total }),
      }
      const { blob, ext } = offline
        ? await renderAyahVideoOffline(args).catch(async (err) => {
            if ((err?.message === 'no-codec' || err?.message === 'encode-error') && canRecord) {
              setRenderMode('record')
              return renderAyahVideo(args)
            }
            throw err
          })
        : await renderAyahVideo(args)
      const name = `${(texts.englishName || `Surah ${surahNumber}`).replace(/[^A-Za-z0-9-]+/g, '_')}_${clampedStart}-${clampedEnd}_${reciter}.${ext}`
      setVideoName(name)
      setPreviewUrl(URL.createObjectURL(blob))
    } catch (err) {
      setVideoName('')
      const msg =
        err?.message === 'too-long'
          ? 'This range is too long for a video (max ~15 minutes). Pick fewer ayahs or use the MP3 download.'
          : err?.message === 'no-support' || err?.message === 'no-mime'
            ? 'Video download is not supported on this browser yet — it needs a newer browser. It works in Chrome, Safari (macOS and iOS 16.4+), and Firefox 130+. MP3 works everywhere.'
            : err?.message === 'no-codec'
              ? 'This browser cannot encode video for download. Try the latest Chrome or Safari, or use the MP3 download.'
              : err?.message === 'audio-blocked'
                ? 'Your browser blocked the audio needed for recording. Unmute this tab and tap Download Video again — it must start from your tap, so do not switch away while the clips load.'
                : err?.message === 'recording-error' || err?.message === 'encode-error'
                  ? 'Video creation failed. Please try again.'
                  : `Video failed: ${err.message}`
      window.alert(msg)
    } finally {
      setVideo('idle')
      setRenderMode(null)
      try {
        await audio.close()
      } catch {}
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
                  onChange={(e) =>
                    setStartAyah(e.target.value === '' ? '' : Number(e.target.value))
                  }
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
                  onChange={(e) =>
                    setEndAyah(e.target.value === '' ? '' : Number(e.target.value))
                  }
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
                  onClick={() => setRepeatAyah((r) => !r)}
                  disabled={busy}
                  aria-pressed={repeatAyah}
                  title="Repeat the current ayah"
                  className={`inline-flex h-12 items-center gap-2 rounded-full border px-5 text-sm font-medium transition-colors duration-200 ${
                    repeatAyah
                      ? 'border-gold bg-gold text-deep'
                      : 'border-line bg-surface text-ink hover:bg-surface-subtle'
                  }`}
                >
                  <Repeat className="h-4 w-4" weight={repeatAyah ? 'fill' : 'regular'} />
                  Repeat
                </button>
              ) : null}
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
                    ? renderMode === 'record'
                      ? 'Recording…'
                      : 'Rendering…'
                    : 'Download Video'}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `${surah ? `${surah.englishName} (${surahNumber})` : `Surah ${surahNumber}`} — Ayahs ${clampedStart}–${clampedEnd} · ${
                    RECITERS.find((r) => r.id === reciter)?.label ?? 'Quran audio'
                  }\nListen here: https://salafic.web.app/quran`,
                )}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-line bg-surface px-6 font-display text-sm font-bold text-ink transition-transform duration-500 ease-out hover:scale-105"
              >
                <WhatsappLogo className="h-4 w-4" weight="fill" />
                Share
              </a>
            </div>
          ) : null}

          {downloading || video !== 'idle' ? (
            <div className="mt-6">
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-subtle">
                <div
                  className={`h-full rounded-full bg-gold transition-[width] duration-200 ${
                    renderMode === 'record' ? 'animate-pulse' : ''
                  }`}
                  style={{
                    width:
                      renderMode === 'record'
                        ? '100%'
                        : `${(progress.done / Math.max(1, progress.total)) * 100}%`,
                  }}
                />
              </div>
              {video === 'render' ? (
                renderMode === 'record' ? (
                  <p className="mt-2 text-sm text-ink-secondary">
                    Recording video in real time — keep this tab visible. This takes as long as
                    the recitation itself.
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-ink-secondary">
                    Rendering video — you can switch away; it encodes faster than real time.
                  </p>
                )
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
                {arabicWrap ? (
                  <div
                    dir="rtl"
                    style={{ fontFamily: fontPair.ar, fontSize: arabicWrap.size, lineHeight: `${arabicWrap.leading}px` }}
                    className="font-arabic text-ink"
                  >
                    <div
                      className={`transition-opacity duration-300 ${
                        activeSeg ? '' : 'opacity-40'
                      }`}
                    >
                      {arabicWrap.lines[lineIndex].map((unit) => (
                        <span
                          key={unit.i}
                          className={`inline-block transition-colors duration-200 ${
                            activeSeg && unit.i >= activeSeg[0] && unit.i < activeSeg[1]
                              ? 'text-gold'
                              : ''
                          }`}
                        >
                          {unit.text}
                          {unit !== arabicWrap.lines[lineIndex][arabicWrap.lines[lineIndex].length - 1]
                            ? '\u00A0'
                            : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {mlFull ? (
                  <p
                    dir="ltr"
                    style={{ fontFamily: fontPair.ml, fontSize: arabicWrap ? Math.round(arabicWrap.size * 1.2) : undefined, marginTop: arabicWrap ? `${Math.round(arabicWrap.size * 1.1)}px` : undefined }}
                    className="font-malayalam leading-relaxed font-medium text-ink transition-colors duration-300"
                  >
                    {mlFull}
                  </p>
                ) : null}
                {(() => {
                  const activeGloss =
                    activeSeg && glossRow[lineIndex]?.find((g) => g.segIndex === activeWordIndex)
                  if (!activeGloss) return null
                  const fs = arabicWrap ? Math.max(13, Math.round(arabicWrap.size * 1.2 * 0.72)) : 14
                  return (
                    <span
                      dir="ltr"
                      style={{
                        fontFamily: fontPair.ml,
                        fontSize: fs,
                        marginTop: '14px',
                        padding: `${Math.round(fs * 0.42)}px ${Math.round(fs * 0.9)}px`,
                        borderRadius: '999px',
                        borderWidth: '1.5px',
                        borderStyle: 'solid',
                        borderColor: 'var(--color-gold)',
                        backgroundColor: 'var(--color-gold)',
                        color: 'var(--color-ink)',
                        fontWeight: 500,
                        display: 'inline-block',
                      }}
                    >
                      {activeGloss.text}
                    </span>
                  )
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
