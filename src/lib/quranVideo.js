import { ayahUrl } from './quran'
import { FONT_PAIRS } from './quran'
import { loadKaraoke, ayahWords, activeWord, effectiveGloss } from './karaoke'

const W = 1080
const H = 1920
const NAVY = '#011F3B'
const CREAM = '#F7F4EF'
const GOLD = '#C2933C'
const PAD = 0.8
const TAIL = 0.4
const MAX_SECONDS = 15 * 60

const DEFAULT_FONTS = FONT_PAIRS[0]

function pickMime() {
  const mimes = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1.64001E,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ]
  return mimes.find((m) => MediaRecorder.isTypeSupported(m)) || ''
}

function wrapLines(ctx, text, maxWidth) {
  const words = text.split(/\s+/)
  const lines = []
  let cur = ''
  for (const word of words) {
    const probe = cur ? `${cur} ${word}` : word
    if (ctx.measureText(probe).width <= maxWidth || !cur) cur = probe
    else {
      lines.push(cur)
      cur = word
    }
  }
  if (cur) lines.push(cur)
  return lines
}

function fitArabic(ctx, text, maxWidth, maxLines, fontFamily) {
  for (const size of [76, 66, 56, 48]) {
    ctx.font = `600 ${size}px ${fontFamily}`
    const lines = wrapLines(ctx, text, maxWidth)
    if (lines.length <= maxLines) return { lines, size, leading: Math.round(size * 1.8) }
  }
  ctx.font = `600 48px ${fontFamily}`
  return { lines: wrapLines(ctx, text, maxWidth), size: 48, leading: 86 }
}

// Lays out Arabic words into wrapped lines, tracking each word's width and
// original index so the recited word can be highlighted individually.
function fitArabicWords(ctx, words, maxWidth, maxLines, fontFamily) {
  for (const size of [76, 66, 56, 48]) {
    ctx.font = `600 ${size}px ${fontFamily}`
    const lines = wrapWordLines(ctx, words, maxWidth)
    if (lines.length <= maxLines) return { lines, size, leading: Math.round(size * 1.8) }
  }
  ctx.font = `600 48px ${fontFamily}`
  return { lines: wrapWordLines(ctx, words, maxWidth), size: 48, leading: 86 }
}

// Wraps an array of words (or word-units with a .text + .w width) into lines,
// preserving the original index of each unit for highlight tracking.
function wrapWordLines(ctx, units, maxWidth) {
  const spaceW = ctx.measureText(' ').width
  const lines = []
  let cur = []
  let curW = 0
  for (const unit of units) {
    const w = typeof unit.w === 'number' ? unit.w : ctx.measureText(unit.text).width
    if (cur.length && curW + spaceW + w > maxWidth) {
      lines.push(cur)
      cur = []
      curW = 0
    }
    cur.push({ text: unit.text, i: unit.i, w })
    curW = curW === 0 ? w : curW + spaceW + w
  }
  if (cur.length) lines.push(cur)
  return lines
}

// Draws one line of Arabic right-to-left: the last word sits at the right
// edge, matching how the whole line would be rendered. Words in [w0, w1)
// (the active recitation segment) are drawn in gold.
function drawArabicLine(ctx, line, cx, y, w0, w1) {
  const spaceW = ctx.measureText(' ').width
  const totalW = line.reduce((s, u) => s + u.w, 0) + spaceW * (line.length - 1)
  ctx.textAlign = 'left'
  let x = cx + totalW / 2
  for (const unit of line) {
    x -= unit.w
    const active = unit.i >= w0 && unit.i < w1
    ctx.fillStyle = active ? GOLD : CREAM
    ctx.fillText(unit.text, x, y)
    x -= spaceW
  }
  ctx.textAlign = 'center'
}

// Draws one line of Malayalam glosses left-to-right; the active gloss is gold.
function drawGlossLine(ctx, line, cx, y, activeIndex) {
  const spaceW = ctx.measureText(' ').width
  const totalW = line.reduce((s, u) => s + u.w, 0) + spaceW * (line.length - 1)
  ctx.textAlign = 'left'
  let x = cx - totalW / 2
  for (const unit of line) {
    ctx.fillStyle = unit.i === activeIndex ? GOLD : 'rgba(247, 244, 239, 0.92)'
    ctx.fillText(unit.text, x, y)
    x += unit.w + spaceW
  }
  ctx.textAlign = 'center'
}

function ornament(ctx, cx, y, spread) {
  ctx.strokeStyle = 'rgba(194, 147, 60, 0.55)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(cx - spread, y)
  ctx.lineTo(cx - 30, y)
  ctx.moveTo(cx + 30, y)
  ctx.lineTo(cx + spread, y)
  ctx.stroke()
  ctx.fillStyle = GOLD
  ctx.beginPath()
  ctx.moveTo(cx, y - 7)
  ctx.lineTo(cx + 7, y)
  ctx.lineTo(cx, y + 7)
  ctx.lineTo(cx - 7, y)
  ctx.closePath()
  ctx.fill()
}

function drawSlide(ctx, { surahLabel, surahNumber, ayah, index, total, words, active, fonts }) {
  const f = fonts || DEFAULT_FONTS
  ctx.fillStyle = NAVY
  ctx.fillRect(0, 0, W, H)

  ornament(ctx, W / 2, 168, 210)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  try {
    ctx.letterSpacing = '5px'
  } catch {}

  ctx.font = '700 30px "Cabinet Grotesk"'
  ctx.fillStyle = 'rgba(194, 147, 60, 0.95)'
  ctx.fillText(`${surahLabel} · ${surahNumber}:${ayah.number}`, W / 2, 250)

  ctx.font = '500 22px "Satoshi"'
  ctx.fillStyle = 'rgba(247, 244, 239, 0.5)'
  ctx.fillText(`${index + 1} / ${total}`, W / 2, 296)

  ctx.letterSpacing = '0px'

  const showBasmala = index === 0 && ayah.basmala
  if (showBasmala) {
    ctx.font = `600 44px ${f.ar}`
    ctx.fillStyle = 'rgba(194, 147, 60, 0.92)'
    ctx.fillText('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', W / 2, 574)
  }

  const activeIdx = typeof active === 'number' && active >= 0 ? active : -1
  const activeSeg = activeIdx >= 0 ? words?.segs?.[activeIdx] : null
  const w0 = activeSeg ? activeSeg[0] : -1
  const w1 = activeSeg ? activeSeg[1] : -1

  const hasWords = words && words.ar.length > 0
  let arabicTop = showBasmala ? 712 : 640
  let arabicLines
  let arabicLeading
  if (hasWords) {
    const fit = fitArabicWords(ctx, words.ar.map((text, i) => ({ text, i })), 900, 4, f.ar)
    arabicLines = fit.lines
    arabicLeading = fit.leading
    ctx.font = `600 ${fit.size}px ${f.ar}`
    arabicLines.forEach((line, i) => {
      drawArabicLine(ctx, line, W / 2, arabicTop + i * arabicLeading, w0, w1)
    })
  } else {
    const fit = fitArabic(ctx, ayah.arabic, 900, 4, f.ar)
    arabicLines = fit.lines
    arabicLeading = fit.leading
    ctx.font = `600 ${fit.size}px ${f.ar}`
    ctx.fillStyle = CREAM
    fit.lines.forEach((line, i) => {
      ctx.fillText(line, W / 2, arabicTop + i * fit.leading)
    })
  }
  const arabicBottom = arabicTop + (arabicLines.length - 1) * arabicLeading

  ctx.strokeStyle = 'rgba(194, 147, 60, 0.4)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(W / 2 - 60, arabicBottom + 84)
  ctx.lineTo(W / 2 + 60, arabicBottom + 84)
  ctx.stroke()

  ctx.font = `500 40px ${f.ml}`
  const translationTop = arabicBottom + 168
  if (hasWords && words.ml.length > 0) {
    const glossUnits = words.ml
      .map((text, i) => ({ text: text.replace(/\r\n/g, ' ').trim(), i }))
      .filter((u) => u.text && u.text !== '*')
    const glossActive = effectiveGloss(words.ml, activeIdx)
    const glossLines = wrapWordLines(ctx, glossUnits, 800)
    glossLines.forEach((line, i) => {
      drawGlossLine(ctx, line, W / 2, translationTop + i * 62, glossActive)
    })
  } else {
    ctx.fillStyle = 'rgba(247, 244, 239, 0.92)'
    const translation = wrapLines(ctx, ayah.translationMl || ayah.translation, 800)
    translation.forEach((line, i) => {
      ctx.fillText(line, W / 2, translationTop + i * 62)
    })
  }

  ornament(ctx, W / 2, 1640, 210)

  ctx.font = '500 19px "Satoshi"'
  try {
    ctx.letterSpacing = '6px'
  } catch {}
  ctx.fillStyle = 'rgba(194, 147, 60, 0.8)'
  ctx.fillText('SALAFI CENTER CHERUKUNNU', W / 2, 1706)
}

async function ensureAudioRunning(audio) {
  if (audio.state === 'running') return
  if (audio.state === 'closed') throw new Error('audio-blocked')
  try {
    await Promise.race([
      audio.resume(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('audio-blocked')), 4000)
      ),
    ])
  } catch {
    throw new Error('audio-blocked')
  }
  if (audio.state !== 'running') throw new Error('audio-blocked')
}

// Records a real-time slideshow of the selected ayahs (Arabic + translation)
// over their recited audio. Returns a playable WebM/MP4 blob.
export async function renderAyahVideo({ surahNumber, surahLabel, ayahs, reciter, onProgress, audio, fonts }) {
  if (typeof MediaRecorder === 'undefined' || !HTMLCanvasElement.prototype.captureStream) {
    throw new Error('no-support')
  }
  const mime = pickMime()
  if (!mime) throw new Error('no-mime')
  if (!audio) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) throw new Error('no-support')
    audio = new AC()
  }
  await ensureAudioRunning(audio)

  onProgress?.({ phase: 'fetch', done: 0, total: ayahs.length })
  const karaokeP = loadKaraoke(reciter).catch(() => null)
  const raw = []
  for (let i = 0; i < ayahs.length; i++) {
    const res = await fetch(ayahUrl(reciter, surahNumber, ayahs[i].number))
    if (!res.ok) throw new Error(`Could not fetch ayah ${ayahs[i].number}`)
    raw.push(await res.arrayBuffer())
    onProgress?.({ phase: 'fetch', done: i + 1, total: ayahs.length })
  }

  try {
    const [karaoke, decoded] = await Promise.all([
      karaokeP,
      (async () => {
        const decoded = []
        for (const data of raw) {
          const buf = await new Promise((resolve, reject) => {
            audio.decodeAudioData(data.slice(0), resolve, reject)
          })
          decoded.push(buf)
        }
        return decoded
      })(),
    ])

    const seconds =
      decoded.reduce((sum, b) => sum + b.duration, 0) + PAD * (decoded.length - 1) + TAIL
    if (seconds > MAX_SECONDS) throw new Error('too-long')

    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')

    const dest = audio.createMediaStreamDestination()
    const master = audio.createGain()
    master.connect(dest)
    master.connect(audio.destination)

    const total = ayahs.length
    const slides = []
    let t = audio.currentTime + 0.3
    for (let i = 0; i < decoded.length; i++) {
      const ayah = ayahs[i]
      slides.push({
        start: t,
        ayah,
        words: karaoke
          ? ayahWords(karaoke.timings, karaoke.ml, surahNumber, ayah.number, ayah.arabic)
          : null,
      })
      const src = audio.createBufferSource()
      src.buffer = decoded[i]
      src.connect(master)
      src.start(t)
      t += decoded[i].duration + PAD
    }
    const totalDur = t - audio.currentTime + TAIL

    const stream = canvas.captureStream(30)
    stream.addTrack(dest.stream.getAudioTracks()[0])

    const recorder = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: 8_000_000,
    })
    const chunks = []
    recorder.ondataavailable = (e) => {
      if (e.data?.size) chunks.push(e.data)
    }
    const stopped = new Promise((resolve, reject) => {
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        resolve(new Blob(chunks, { type: mime }))
      }
      recorder.onerror = () => reject(new Error('recording-error'))
    })

    const t0 = audio.currentTime
    recorder.start(250)
    await new Promise((resolve, reject) => {
      let raf = 0
      let lastElapsed = -1
      let stalledFrames = 0
      let curSlide = null
      let lastActive = -1
      function frame() {
        const elapsed = audio.currentTime - t0
        stalledFrames = elapsed === lastElapsed ? stalledFrames + 1 : 0
        lastElapsed = elapsed
        if (stalledFrames > 150 && elapsed < totalDur - 1) {
          cancelAnimationFrame(raf)
          try {
            recorder.stop()
          } catch {}
          reject(new Error('audio-blocked'))
          return
        }
        if (elapsed >= totalDur) {
          cancelAnimationFrame(raf)
          try {
            recorder.stop()
          } catch {}
          resolve()
          return
        }
        let slide = slides[0]
        for (const s of slides) {
          if (s.start - t0 <= elapsed) slide = s
        }
        if (slide !== curSlide) {
          curSlide = slide
          lastActive = -1
        }
        if (slide.words) {
          const ayahElapsed = (elapsed - (slide.start - t0)) * 1000
          const found = activeWord(slide.words.segs, ayahElapsed)
          if (found >= 0) lastActive = found
        } else {
          lastActive = -1
        }
        drawSlide(ctx, {
          surahLabel,
          surahNumber,
          ayah: slide.ayah,
          index: slides.indexOf(slide),
          total,
          words: slide.words,
          active: lastActive,
          fonts,
        })
        onProgress?.({ phase: 'render', done: Math.min(1, elapsed / totalDur) })
        raf = requestAnimationFrame(frame)
      }
      frame()
    })
    const blob = await stopped
    return { blob, ext: mime.startsWith('video/mp4') ? 'mp4' : 'webm' }
  } finally {
    setTimeout(() => audio.close(), 500)
  }
}