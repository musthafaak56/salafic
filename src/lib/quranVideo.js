import { ayahUrl, surahAudioUrl, surahMode } from './quran'
import { FONT_PAIRS } from './quran'
import { loadKaraoke, ayahWords, activeWord } from './karaoke'
import { wrapWords, activeLineOf, sentenceSplits, lineGlosses, fitArabicWords, TEXT_SIZES } from './wordWrap'
import {
  Output,
  Mp4OutputFormat,
  BufferTarget,
  EncodedVideoPacketSource,
  EncodedAudioPacketSource,
  EncodedPacket,
} from 'mediabunny'

const W = 720
const H = 1280
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

// Shared size ladder for both scripts so the Arabic line and the Malayalam
// sentence render at the same visual size (TEXT_SIZES imported from wordWrap).

function fitArabic(ctx, text, maxWidth, maxLines, fontFamily) {
  for (const size of TEXT_SIZES) {
    ctx.font = `600 ${size}px ${fontFamily}`
    const lines = wrapLines(ctx, text, maxWidth)
    if (lines.length <= maxLines) return { lines, size, leading: Math.round(size * 1.8) }
  }
  ctx.font = `600 22px ${fontFamily}`
  return { lines: wrapLines(ctx, text, maxWidth), size: 22, leading: 40 }
}

// Draws one line of Arabic right-to-left: the last word sits at the right
// edge, matching how the whole line would be rendered. Words in [w0, w1)
// (the active recitation segment) are drawn in gold; the whole line can be
// dimmed so the currently recited line stands out inside the sentence.
function drawArabicLine(ctx, line, cx, y, w0, w1, dim) {
  const spaceW = ctx.measureText(' ').width
  const totalW = line.reduce((s, u) => s + u.w, 0) + spaceW * (line.length - 1)
  ctx.textAlign = 'left'
  let x = cx + totalW / 2
  for (const unit of line) {
    x -= unit.w
    const active = unit.i >= w0 && unit.i < w1
    ctx.fillStyle = active ? GOLD : dim ? 'rgba(247, 244, 239, 0.38)' : CREAM
    ctx.fillText(unit.text, x, y)
    x -= spaceW
  }
  ctx.textAlign = 'center'
}

// Fits the Malayalam sentence into as many lines as fit the available vertical
// space, picking the largest size whose wrapped line count stays within the
// line budget and its total height within availableHeight.
function fitMl(ctx, text, maxWidth, maxLines, availableHeight, fontFamily) {
  let best = null
  for (const size of TEXT_SIZES) {
    ctx.font = `500 ${size}px ${fontFamily}`
    const lines = wrapLines(ctx, text, maxWidth)
    const leading = Math.round(size * 1.55)
    if (lines.length <= maxLines && lines.length * leading <= availableHeight) {
      best = { lines, size, leading }
      break
    }
  }
  if (best) return best
  const size = 22
  ctx.font = `500 ${size}px ${fontFamily}`
  return { lines: wrapLines(ctx, text, maxWidth), size, leading: Math.round(size * 1.55) }
}

// Draws text with its ink (glyph) bounding box centered on cx instead of its
// advance width. Complex-script fonts (Malayalam pre-base vowel signs,
// chillu/ZWJ clusters) can paint beyond the measured advance, which makes
// advance-based centering land visually off-center in some browsers.
// Bounds are measured with textAlign 'left' so the metric's reference point
// (the alignment point) coincides with the origin in every engine.
function drawCentered(ctx, text, cx, y) {
  const prev = ctx.textAlign
  ctx.textAlign = 'left'
  const m = ctx.measureText(text)
  const left = typeof m.actualBoundingBoxLeft === 'number' ? m.actualBoundingBoxLeft : -m.width / 2
  const right = typeof m.actualBoundingBoxRight === 'number' ? m.actualBoundingBoxRight : m.width / 2
  const shift = (right - left) / 2
  ctx.fillText(text, cx - shift, y)
  ctx.textAlign = prev
}

// Wraps the Arabic words of an ayah at one fixed size, so every ayah in a
// video shares the same font size (the smallest size any ayah fits at).
function wrapArabicAt(ctx, units, size, maxWidth, fontFamily) {
  ctx.font = `600 ${size}px ${fontFamily}`
  return wrapWords(ctx, units, maxWidth)
}

// Precomputes the constant per-video layout: every ayah's Arabic lines wrap
// at the same size (the minimum across the range), and the sentence + gloss
// sizes are derived from it so nothing varies between ayahs.
function buildLayouts(slides, fontFamily) {
  const scratch = document.createElement('canvas').getContext('2d')
  const width = 900 * (H / 1920)
  const fits = slides.map((s) => {
    const units = s.words?.ar?.map((text, i) => ({ text, i }))
    return units && units.length ? fitArabicWords(scratch, units, fontFamily, width) : null
  })
  const constSize = Math.min(...fits.filter(Boolean).map((fit) => fit.size))
  return slides.map((s) => {
    const units = s.words?.ar?.map((text, i) => ({ text, i }))
    if (!units || !units.length) return null
    return { lines: wrapArabicAt(scratch, units, constSize, width, fontFamily), size: constSize, leading: Math.round(constSize * 1.8) }
  })
}

// Draws one Malayalam sentence fragment below its Arabic line as plain white
// text at the video-wide constant size; the fragment of the recited line is
// white, the rest dimmed. It never shrinks to fit - the sentence wraps to as
// many centered rows as it needs.
function drawMlFragment(ctx, text, cx, top, width, S, fontFamily, dim, size) {
  const px = Math.max(20, Math.round(size)) * S
  ctx.font = `500 ${Math.round(px)}px ${fontFamily}`
  const lines = wrapLines(ctx, text, width)
  const leading = Math.round(px * 1.5)
  ctx.fillStyle = dim ? 'rgba(247, 244, 239, 0.38)' : CREAM
  lines.forEach((line, li) => {
    drawCentered(ctx, line, cx, top + li * leading)
  })
  return top + (lines.length - 1) * leading + Math.round(px * 0.4)
}

// Draws the word-by-word Malayalam glosses of one line as gold pill chips under
// the sentence, in the style of the original word-gloss chip; the gloss of the
// segment being recited fills solid gold so the karaoke sync stays visible.
function drawGlossRow(ctx, glosses, cx, top, width, size, fontFamily, activeSegIndex, S, waiting) {
  if (!glosses.length) return
  const fs = Math.round(size * S)
  ctx.font = `600 ${fs}px ${fontFamily}`
  const gap = Math.round(10 * S)
  const padX = Math.round(fs * 0.9)
  const h = Math.round(fs * 2.0)
  const tokens = glosses.map((g) => ({ g, w: ctx.measureText(g.text).width }))
  const rows = []
  let cur = []
  let curW = 0
  for (const t of tokens) {
    const add = t.w + padX * 2 + (cur.length ? gap : 0)
    if (cur.length && curW + add > width) {
      rows.push(cur)
      cur = [t]
      curW = t.w
    } else {
      cur.push(t)
      curW += add
    }
  }
  if (cur.length) rows.push(cur)
  const leading = Math.round(h * 1.18)
  rows.slice(0, 2).forEach((row, ri) => {
    const totalW = row.reduce((s, t) => s + t.w + padX * 2, 0) + gap * (row.length - 1)
    let x = cx - totalW / 2
    const y = top + ri * leading
    for (const t of row) {
      const active = !waiting && t.g.segIndex === activeSegIndex
      const bw = t.w + padX * 2
      ctx.beginPath()
      if (ctx.roundRect) ctx.roundRect(x, y, bw, h, h / 2)
      else ctx.rect(x, y, bw, h)
      ctx.fillStyle = active ? GOLD : 'rgba(194, 147, 60, 0.10)'
      ctx.fill()
      ctx.strokeStyle = active ? GOLD : 'rgba(194, 147, 60, 0.55)'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = active ? NAVY : GOLD
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(t.g.text, x + bw / 2, y + h / 2)
      ctx.textBaseline = 'alphabetic'
      x += bw + gap
    }
  })
}

// Audio progress bar above the footer: plain gold fill up to the playhead,
// with a tick + ayah number at the start of every ayah window so the viewer
// can see where each ayah splits inside the video's timeline.
function drawAudioProgress(ctx, progress, S) {
  if (!progress) return
  const w = 900 * S
  const x0 = W / 2 - w / 2
  const y = 1572 * S
  const barH = 6 * S
  const frac = Math.max(0, Math.min(1, progress.fraction))
  ctx.fillStyle = 'rgba(247, 244, 239, 0.16)'
  ctx.beginPath()
  if (ctx.roundRect) ctx.roundRect(x0, y - barH / 2, w, barH, barH / 2)
  else ctx.rect(x0, y - barH / 2, w, barH)
  ctx.fill()
  if (frac > 0) {
    ctx.fillStyle = GOLD
    ctx.beginPath()
    if (ctx.roundRect) ctx.roundRect(x0, y - barH / 2, Math.max(barH, w * frac), barH, barH / 2)
    else ctx.rect(x0, y - barH / 2, w * frac, barH)
    ctx.fill()
  }
  for (const split of progress.splits || []) {
    const x = x0 + w * split.at
    if (x <= x0 + 2 || x >= x0 + w - 2) continue
    ctx.strokeStyle = 'rgba(247, 244, 239, 0.75)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(x, y - 14 * S)
    ctx.lineTo(x, y + 14 * S)
    ctx.stroke()
    ctx.fillStyle = 'rgba(247, 244, 239, 0.75)'
    ctx.font = `500 ${Math.round(14 * S)}px "Satoshi"`
    ctx.textAlign = 'center'
    ctx.fillText(String(split.label), x, y - 19 * S)
  }
  ctx.fillStyle = CREAM
  ctx.fillRect(x0 + w * frac - 1.5 * S, y - 14 * S, 3 * S, 28 * S)
  ctx.textAlign = 'center'
}

// Draws the waveform strip near the bottom of a frame; bars up to `fraction`
// of the timeline are gold, the rest muted, so the video itself shows
// playback progress that looks like the audio it carries.
function drawWaveform(ctx, peaks, fraction, S) {
  const barW = Math.max(2, Math.round(5 * S))
  const gap = Math.max(2, Math.round(3 * S))
  const totalW = peaks.length * (barW + gap) - gap
  const x0 = Math.round((W - totalW) / 2)
  const centerY = Math.round(1852 * S)
  const maxH = Math.round(52 * S)
  const minH = Math.round(8 * S)
  for (let i = 0; i < peaks.length; i++) {
    const h = Math.max(minH, Math.round(peaks[i] * maxH))
    const played = i / peaks.length <= fraction
    ctx.fillStyle = played ? GOLD : 'rgba(247, 244, 239, 0.32)'
    ctx.fillRect(x0 + i * (barW + gap), centerY - h / 2, barW, h)
  }
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

function drawSlide(ctx, { surahLabel, surahNumber, ayah, index, total, words, active, fit, fonts, reciterLabel, progress, waveform }) {
  const f = fonts || DEFAULT_FONTS
  const S = H / 1920
  ctx.fillStyle = NAVY
  ctx.fillRect(0, 0, W, H)

  ornament(ctx, W / 2, 168 * S, 210 * S)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  try {
    ctx.letterSpacing = `${5 * S}px`
  } catch {}

  ctx.font = `700 ${Math.round(30 * S)}px "Cabinet Grotesk"`
  ctx.fillStyle = 'rgba(194, 147, 60, 0.95)'
  ctx.fillText(`${surahLabel} · ${surahNumber}:${ayah.number}`, W / 2, 250 * S)

  ctx.font = `500 ${Math.round(22 * S)}px "Satoshi"`
  ctx.fillStyle = 'rgba(247, 244, 239, 0.5)'
  ctx.fillText(`${index + 1} / ${total}`, W / 2, 296 * S)

  ctx.letterSpacing = '0px'

  const showBasmala = index === 0 && ayah.basmala
  if (showBasmala) {
    ctx.font = `600 ${Math.round(44 * S)}px ${f.ar}`
    ctx.fillStyle = 'rgba(194, 147, 60, 0.92)'
    ctx.fillText('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', W / 2, 574 * S)
  }

  const activeIdx = typeof active === 'number' && active >= 0 ? active : -1
  const activeSeg = activeIdx >= 0 ? words?.segs?.[activeIdx] : null
  const w0 = activeSeg ? activeSeg[0] : -1
  const w1 = activeSeg ? activeSeg[1] : -1

  const hasWords = words && words.ar.length > 0
  if (hasWords) {
    // Only the line being recited is shown at a time, centered in the block
    // so the view stays steady; inside it the recited word is gold (karaoke),
    // the rest of the Arabic full cream. Under the line: the real Malayalam
    // sentence in white at the video-wide constant size, with the word-by-word
    // glosses of that line beneath it.
    const lines = fit.lines
    ctx.font = `600 ${fit.size}px ${f.ar}`
    const arabicTop = (showBasmala ? 712 : 640) * S
    const lineIndex = activeLineOf(lines, activeSeg)
    const waiting = !activeSeg
    const fragments = sentenceSplits(
      lines,
      words.segs,
      words.ml,
      ayah.translationMl || ayah.translation || '',
    )
    const li = Math.min(lineIndex, lines.length - 1)
    const lineY = Math.round(arabicTop + ((lines.length - 1) * fit.leading) / 2)
    drawArabicLine(ctx, lines[li], W / 2, lineY, waiting ? -1 : w0, waiting ? -1 : w1, false)
    const fragTop = Math.round(lineY + Math.max(26 * S, fit.size * 1.5))
    const frag = fragments[li]
    const fragSize = Math.round(fit.size * 1.2)
    let fragBottom = fragTop
    if (frag) {
      fragBottom = drawMlFragment(ctx, frag, W / 2, fragTop, 900 * S, S, f.ml, false, fragSize)
    }
    const glosses = lineGlosses(lines[li], words.segs, words.ml)
    const activeGloss = !waiting ? glosses.find((g) => g.segIndex === activeIdx) : null
    if (activeGloss) {
      const glossSize = Math.max(13, Math.round(fragSize * 0.72))
      drawGlossRow(ctx, [activeGloss], W / 2 + 4 * S, Math.round(fragBottom + 12 * S), 820 * S, glossSize, f.ml, activeGloss.segIndex, S, false)
    }
  } else {
    const fallback = fitArabic(ctx, ayah.arabic, 900 * S, 4, f.ar)
    const arabicTop = (showBasmala ? 712 : 640) * S
    ctx.font = `600 ${fallback.size}px ${f.ar}`
    ctx.fillStyle = CREAM
    fallback.lines.forEach((line, i) => {
      ctx.fillText(line, W / 2, arabicTop + i * fallback.leading)
    })
    const arabicBottom = arabicTop + (fallback.lines.length - 1) * fallback.leading

    ctx.strokeStyle = 'rgba(194, 147, 60, 0.4)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(W / 2 - 60 * S, arabicBottom + 84 * S)
    ctx.lineTo(W / 2 + 60 * S, arabicBottom + 84 * S)
    ctx.stroke()

    const translationTop = arabicBottom + 168 * S
    const mlText = (ayah.translationMl || ayah.translation || '').replace(/\r\n/g, ' ').trim()
    const avail = 1640 * S - translationTop - 40 * S
    const mlFit = fitMl(ctx, mlText, 800 * S, 4, avail, f.ml)
    ctx.font = `500 ${mlFit.size}px ${f.ml}`
    ctx.fillStyle = 'rgba(247, 244, 239, 0.92)'
    mlFit.lines.forEach((line, i) => {
      drawCentered(ctx, line, W / 2, translationTop + i * mlFit.leading)
    })
  }

  drawAudioProgress(ctx, progress, S)

  ornament(ctx, W / 2, 1640 * S, 210 * S)

  ctx.font = `500 ${Math.round(19 * S)}px "Satoshi"`
  try {
    ctx.letterSpacing = `${6 * S}px`
  } catch {}
  ctx.fillStyle = 'rgba(194, 147, 60, 0.8)'
  ctx.fillText('SALAFI CENTER CHERUKUNNU', W / 2, 1706 * S)

  if (reciterLabel) {
    try {
      ctx.letterSpacing = `${3 * S}px`
    } catch {}
    ctx.font = `500 ${Math.round(17 * S)}px "Satoshi"`
    ctx.fillText(reciterLabel.toUpperCase(), W / 2, 1750 * S)
  }

  drawWaveform(ctx, waveform.peaks, waveform.fraction, S)
}

// Two-byte AudioSpecificConfig for AAC-LC (MPEG-4 object type 2). WebKit
// emits an invalid description (object type 0, 0 channels) in the encoder
// output metadata (https://bugs.webkit.org/show_bug.cgi?id=302253), which
// makes every player mute the audio track, so we always rebuild it from the
// sample rate and channel count we configured.
function makeAacAsc(sampleRate, channels) {
  const index =
    sampleRate >= 96000 ? 0 : sampleRate >= 88200 ? 1 : sampleRate >= 64000 ? 2
    : sampleRate >= 48000 ? 3 : sampleRate >= 44100 ? 4 : sampleRate >= 32000 ? 5
    : sampleRate >= 24000 ? 6 : sampleRate >= 22050 ? 7 : sampleRate >= 16000 ? 8
    : sampleRate >= 12000 ? 9 : sampleRate >= 11025 ? 10 : sampleRate >= 8000 ? 11 : 12
  return Uint8Array.of((2 << 3) | (index >> 1), ((index & 1) << 7) | (channels << 3))
}

// Returns a sanitised copy of the encoder output metadata for muxing, with
// the AAC description and audio parameters replaced by the known-good values.
function sanitizeAudioMeta(meta, sampleRate, channels) {
  if (!meta?.decoderConfig) return meta
  const dc = meta.decoderConfig
  const bad =
    !dc.description ||
    dc.description.byteLength < 2 ||
    (dc.description[0] >> 3) === 0 ||
    !dc.numberOfChannels ||
    !dc.sampleRate
  if (!bad) return meta
  const copy = { ...meta, decoderConfig: { ...dc, description: makeAacAsc(sampleRate, channels), sampleRate, numberOfChannels: channels } }
  return copy
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
export async function renderAyahVideo({ surahNumber, surahLabel, ayahs, reciter, reciterLabel, onProgress, audio, fonts }) {
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
  const surahAud = surahMode(reciter)
  let raw = []
  if (!surahAud) {
    for (let i = 0; i < ayahs.length; i++) {
      const res = await fetch(ayahUrl(reciter, surahNumber, ayahs[i].number))
      if (!res.ok) throw new Error(`Could not fetch ayah ${ayahs[i].number}`)
      raw.push(await res.arrayBuffer())
      onProgress?.({ phase: 'fetch', done: i + 1, total: ayahs.length })
    }
  }

  try {
    const karaoke = await karaokeP
    const total = ayahs.length
    const slides = []
    let play = null
    let surahBuf = null
    let perAyahBufs = null
    let t = audio.currentTime + 0.3

    const dest = audio.createMediaStreamDestination()
    const master = audio.createGain()
    master.connect(dest)
    master.connect(audio.destination)

    if (surahAud) {
      // Whole-surah audio: no decode; play each ayah window via an <audio> element.
      const windows = ayahs.map((ayah) => {
        const w = karaoke
          ? ayahWords(karaoke.timings, karaoke.ml, surahNumber, ayah.number, ayah.arabic)
          : null
        if (!w || typeof w.startMs !== 'number' || typeof w.endMs !== 'number') {
          throw new Error(`No timing window for ${surahNumber}:${ayah.number}`)
        }
        return { words: w, start: w.startMs / 1000, dur: (w.endMs - w.startMs) / 1000 }
      })
      const sum = windows.reduce((acc, w) => acc + w.dur, 0)
      if (sum + PAD * (total - 1) + TAIL > MAX_SECONDS) throw new Error('too-long')

      const el = new Audio()
      el.preload = 'auto'
      el.src = surahAudioUrl(reciter, surahNumber)
      await new Promise((resolve, reject) => {
        const ok = () => {
          el.removeEventListener('loadedmetadata', ok)
          resolve()
        }
        const fail = () => {
          el.removeEventListener('error', fail)
          reject(new Error(`Could not load surah ${surahNumber} audio`))
        }
        el.addEventListener('loadedmetadata', ok)
        el.addEventListener('error', fail)
      })
      audio.createMediaElementSource(el).connect(master)
      play = {
        seek(i) {
          el.currentTime = windows[i].start
        },
        start() {
          el.currentTime = windows[0].start
          el.play().catch(() => {})
        },
        stop() {
          el.pause()
        },
      }

      t = audio.currentTime + 0.3
      for (let i = 0; i < total; i++) {
        slides.push({ start: t, dur: windows[i].dur, ayah: ayahs[i], words: windows[i].words })
        t += windows[i].dur + PAD
      }

      // The <audio> element streams the file without exposing samples, so a
      // separate decode is needed for the real waveform peaks.
      const surahRes = await fetch(surahAudioUrl(reciter, surahNumber))
      if (!surahRes.ok) throw new Error(`Could not fetch surah ${surahNumber} audio`)
      surahBuf = await decodeBuffer(audio, await surahRes.arrayBuffer())
    } else {
      const [decoded] = await Promise.all([
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
      perAyahBufs = decoded

      const seconds =
        decoded.reduce((sum, b) => sum + b.duration, 0) + PAD * (decoded.length - 1) + TAIL
      if (seconds > MAX_SECONDS) throw new Error('too-long')

      t = audio.currentTime + 0.3
      for (let i = 0; i < total; i++) {
        const ayah = ayahs[i]
        slides.push({
          start: t,
          dur: decoded[i].duration,
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
    }
    const totalDur = t - audio.currentTime + TAIL

    const fitLayouts = buildLayouts(slides, fonts?.ar || DEFAULT_FONTS.ar)
    slides.forEach((s, i) => {
      s.fit = fitLayouts[i]
    })

    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')

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
    // Real waveform of the recording: one decoded window per ayah placed at
    // its timeline offset, then peak amplitudes over the whole duration.
    const waveWindows = slides.map((s, i) => ({
      buffer: surahBuf || perAyahBufs?.[i] || null,
      start: surahBuf ? windows[i].start : 0,
      dur: surahBuf ? windows[i].dur : perAyahBufs?.[i]?.duration || 0,
      audioAt: s.start - t0,
    }))
    const peaks = timelinePeaks(
      waveWindows.filter((w) => w.buffer),
      totalDur,
    )
    surahBuf = null
    perAyahBufs = null
    play?.start()
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
          play?.stop()
          try {
            recorder.stop()
          } catch {}
          reject(new Error('audio-blocked'))
          return
        }
        if (elapsed >= totalDur) {
          cancelAnimationFrame(raf)
          play?.stop()
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
          if (play) play.seek(slides.indexOf(slide))
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
          fit: slide.fit,
          fonts,
          reciterLabel,
          progress: {
            fraction: Math.min(1, elapsed / totalDur),
            splits: slides.map((s) => ({ at: (s.start - t0) / totalDur, label: s.ayah.number })),
          },
          waveform: { peaks, fraction: Math.min(1, elapsed / totalDur) },
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

const OFFLINE_FPS = 25
const VIDEO_BITRATE = 5_500_000
const AUDIO_BITRATE = 128_000
const VIDEO_CODECS = ['avc1.640028', 'avc1.4d401e', 'avc1.42e01e', 'avc1.42001f']
const LEAD_IN = 0.3

// Renders a slideshow offline; the steps below are checkpointed to
// sessionStorage, which survives the page reload Safari performs when the tab
// is killed (e.g. running out of memory on iOS). After a crash-reload the app
// can read the last completed step to tell the user exactly where it died.
const DEBUG_STEP_KEY = '__salaficRenderStep'
function debugStep(step, extra = '') {
  const line = `${Date.now() % 100000}:${step}${extra ? ' ' + extra : ''}`
  try {
    sessionStorage.setItem(DEBUG_STEP_KEY, line)
  } catch {}
  ;(window.__videoDebug = window.__videoDebug || []).push(line)
  console.debug('[salafic render]', line)
}

export function hasOfflineSupport() {
  return (
    typeof VideoEncoder === 'function' &&
    typeof AudioEncoder === 'function' &&
    typeof VideoFrame === 'function'
  )
}

async function pickVideoCodec(width, height) {
  for (const codec of VIDEO_CODECS) {
    try {
      const res = await VideoEncoder.isConfigSupported({
        codec,
        width,
        height,
        bitrate: VIDEO_BITRATE,
        framerate: OFFLINE_FPS,
      })
      if (res.supported) return codec
    } catch {}
  }
  return null
}

async function pickAudioCodec(sampleRate, channels) {
  try {
    const res = await AudioEncoder.isConfigSupported({
      codec: 'mp4a.40.2',
      sampleRate,
      numberOfChannels: channels,
      bitrate: AUDIO_BITRATE,
    })
    if (res.supported) return 'mp4a.40.2'
  } catch {}
  return null
}

function decodeBuffer(ctx, data) {
  return new Promise((resolve, reject) => {
    ctx.decodeAudioData(data.slice(0), resolve, reject)
  })
}

// Computes real peak amplitudes across the whole video timeline from the
// decoded audio windows (silence gaps between ayahs stay near zero), so the
// waveform drawn on each frame is the actual audio being recorded.
function timelinePeaks(windows, totalDur, barCount = 96) {
  const peaks = new Float32Array(barCount)
  if (!windows.length || totalDur <= 0) return peaks
  const sr = windows[0].buffer.sampleRate
  for (let b = 0; b < barCount; b++) {
    const t0 = (b / barCount) * totalDur
    const t1 = ((b + 1) / barCount) * totalDur
    let max = 0
    for (const w of windows) {
      const wa = w.audioAt
      const we = wa + w.dur
      if (we <= t0 || wa >= t1) continue
      const local0 = Math.max(0, t0 - wa)
      const local1 = Math.min(w.dur, t1 - wa)
      const data = w.buffer
      const channels = data.numberOfChannels
      const n = Math.floor((local1 - local0) * sr)
      const step = Math.max(1, Math.floor(n / 48))
      for (let s = 0; s < n; s += step) {
        const idx = Math.round(w.start * sr + local0 * sr + s)
        if (idx < 0 || idx >= data.length) continue
        let v = 0
        for (let c = 0; c < channels; c++) {
          const a = Math.abs(data.getChannelData(c)[idx])
          if (a > v) v = a
        }
        if (v > max) max = v
      }
    }
    peaks[b] = max
  }
  let top = 0
  for (const p of peaks) if (p > top) top = p
  if (top > 0) {
    for (let i = 0; i < barCount; i++) peaks[i] = Math.pow(peaks[i] / top, 0.55)
  }
  return peaks
}

// Renders the ayah slideshow offline with WebCodecs: each slide is drawn at a
// fixed frame rate, encoded to H.264, while the recitation is decoded, placed
// on a PCM timeline at the exact slide offsets (gaps become silence) and
// encoded to AAC, then both tracks are muxed into a fast-start MP4. Unlike the
// MediaRecorder path this needs no live audio, runs faster than real time and
// works in any browser with WebCodecs (Safari 16.4+, Chrome 94+, Firefox 130+).
export async function renderAyahVideoOffline({
  surahNumber,
  surahLabel,
  ayahs,
  reciter,
  reciterLabel,
  onProgress,
  audio,
  fonts,
}) {
  if (!hasOfflineSupport()) throw new Error('no-support')

  try {
    sessionStorage.removeItem(DEBUG_STEP_KEY)
  } catch {}
  window.__videoDebug = []
  debugStep('start', `${surahNumber} ${ayahs.length} ayahs ${reciter}`)

  onProgress?.({ phase: 'fetch', done: 0, total: ayahs.length })
  const karaokeP = loadKaraoke(reciter).catch(() => null)
  const surahAud = surahMode(reciter)

  if (!audio) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) throw new Error('no-support')
    audio = new AC()
    audio.resume().catch(() => {})
  }

  let surahData = null
  const raw = []
  if (surahAud) {
    const res = await fetch(surahAudioUrl(reciter, surahNumber))
    if (!res.ok) throw new Error(`Could not fetch surah ${surahNumber} audio`)
    surahData = await res.arrayBuffer()
    onProgress?.({ phase: 'fetch', done: 1, total: 1 })
  } else {
    for (let i = 0; i < ayahs.length; i++) {
      const res = await fetch(ayahUrl(reciter, surahNumber, ayahs[i].number))
      if (!res.ok) throw new Error(`Could not fetch ayah ${ayahs[i].number}`)
      raw.push(await res.arrayBuffer())
      onProgress?.({ phase: 'fetch', done: i + 1, total: ayahs.length })
    }
  }

  if (!audio) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) throw new Error('no-support')
    audio = new AC()
    audio.resume().catch(() => {})
  }

  const karaoke = await karaokeP
  const words = ayahs.map((ayah) =>
    karaoke ? ayahWords(karaoke.timings, karaoke.ml, surahNumber, ayah.number, ayah.arabic) : null,
  )
  debugStep('decoded-begin')

  let totalSampleRate = 0
  let totalChannels = 0
  let decoded
  if (surahAud) {
    const buf = await decodeBuffer(audio, surahData)
    surahData = null
    totalSampleRate = buf.sampleRate
    totalChannels = buf.numberOfChannels
    decoded = ayahs.map((ayah, i) => {
      const w = words[i]
      if (!w || typeof w.startMs !== 'number' || typeof w.endMs !== 'number') {
        throw new Error(`No timing window for ${surahNumber}:${ayah.number}`)
      }
      return { buffer: buf, start: w.startMs / 1000, dur: (w.endMs - w.startMs) / 1000, words: w }
    })
  } else {
    const bufs = []
    for (const data of raw) {
      const buf = await decodeBuffer(audio, data)
      totalSampleRate = buf.sampleRate
      totalChannels = buf.numberOfChannels
      bufs.push(buf)
    }
    raw.length = 0
    decoded = ayahs.map((ayah, i) => ({
      buffer: bufs[i],
      start: 0,
      dur: bufs[i].duration,
      words: words[i],
    }))
  }

  // Timeline mirrors the MediaRecorder path: each ayah's audio starts at its
  // window, its slide follows after the LEAD_IN lead, and PAD silence gaps sit
  // between windows.
  let t = 0
  for (const d of decoded) {
    d.audioAt = t
    d.slideAt = t + LEAD_IN
    t += d.dur + PAD
  }
  const totalDur = t - PAD + LEAD_IN + TAIL
  if (totalDur > MAX_SECONDS) throw new Error('too-long')

  const sampleRate = totalSampleRate
  const channels = totalChannels
  const totalSamples = Math.max(1, Math.ceil(totalDur * sampleRate))
  debugStep('decoded', `${Math.round(totalDur)}s ${channels}ch ${sampleRate}Hz ${decoded.length} wins`)
  // Windows are read straight from the decoded buffers while the audio is
  // encoded; the timeline is never materialised as a full second PCM copy.
  // The whole-surah decode can be hundreds of MB on iOS, so the buffers are
  // released the moment the audio track is done, before frames start encoding.
  const slides = decoded.map((d, i) => ({ slideAt: d.slideAt, dur: d.dur, words: d.words, index: i }))
  const fitLayouts = buildLayouts(slides, fonts?.ar || DEFAULT_FONTS.ar)
  slides.forEach((s, i) => {
    s.fit = fitLayouts[i]
  })

  const videoCodec = await pickVideoCodec(W, H)
  const audioCodec = await pickAudioCodec(sampleRate, channels)
  if (!videoCodec || !audioCodec) throw new Error('no-codec')
  debugStep('codecs', `${videoCodec} + ${audioCodec}`)

  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
    target: new BufferTarget(),
  })
  const videoSource = new EncodedVideoPacketSource('avc')
  output.addVideoTrack(videoSource, { frameRate: OFFLINE_FPS })
  const audioSource = new EncodedAudioPacketSource('aac')
  output.addAudioTrack(audioSource)
  await output.start()

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  let encError = null
  const pending = []
  const drain = async () => {
    if (pending.length) await Promise.allSettled(pending.splice(0))
  }

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => pending.push(videoSource.add(EncodedPacket.fromEncodedChunk(chunk), meta)),
    error: (e) => {
      encError = e
    },
  })
  videoEncoder.configure({
    codec: videoCodec,
    width: W,
    height: H,
    bitrate: VIDEO_BITRATE,
    framerate: OFFLINE_FPS,
    latencyMode: 'realtime',
    avc: { format: 'avc' },
  })

  const audioEncoder = new AudioEncoder({
    output: (chunk, meta) =>
      pending.push(audioSource.add(EncodedPacket.fromEncodedChunk(chunk), sanitizeAudioMeta(meta, sampleRate, channels))),
    error: (e) => {
      encError = e
    },
  })
  audioEncoder.configure({
    codec: audioCodec,
    sampleRate,
    numberOfChannels: channels,
    bitrate: AUDIO_BITRATE,
  })

  try {
    onProgress?.({ phase: 'render', done: 0, total: 1 })

    // Audio first: the encoded packets are tiny, and the decoded windows (the
    // largest remaining allocation) can be dropped before video frames start
    // accumulating in memory.
    const audioChunk = Math.max(1024, Math.round(sampleRate * 0.5))
    for (let pos = 0; pos < totalSamples; pos += audioChunk) {
      if (encError) throw new Error('encode-error')
      const n = Math.min(audioChunk, totalSamples - pos)
      const data = new Float32Array(n * channels)
      const sec = pos / sampleRate
      const d = decoded.find((w) => sec >= w.audioAt && sec < w.audioAt + w.dur)
      if (d) {
        const startOff = Math.round(d.start * sampleRate)
        const local = Math.round((sec - d.audioAt) * sampleRate) + startOff
        const winRemain = Math.round(d.dur * sampleRate) - (local - startOff)
        const avail = Math.max(0, Math.min(n, winRemain, d.buffer.length - local))
        for (let c = 0; c < channels; c++) {
          const src = d.buffer.getChannelData(c)
          for (let j = 0; j < avail; j++) data[j * channels + c] = src[local + j]
        }
      }
      const audioData = new AudioData({
        format: 'f32',
        sampleRate,
        numberOfFrames: n,
        numberOfChannels: channels,
        timestamp: Math.round((pos / sampleRate) * 1e6),
        data,
      })
      audioEncoder.encode(audioData)
      audioData.close()
      if (audioEncoder.encodeQueueSize > 4) await drain()
    }
    await drain()
    debugStep('audio-encoded')
    // Real waveform of the whole timeline, computed while the decoded windows
    // are still in memory, then the buffers are released before frames start.
    const peaks = timelinePeaks(
      decoded.map((d) => ({ buffer: d.buffer, start: d.start, dur: d.dur, audioAt: d.audioAt })),
      totalDur,
    )
    decoded = null

    const frameCount = Math.max(1, Math.round(totalDur * OFFLINE_FPS))
    let curSlide = null
    let lastActive = -1
    for (let i = 0; i < frameCount; i++) {
      if (encError) throw new Error('encode-error')
      const elapsed = i / OFFLINE_FPS
      let slide = slides[0]
      for (const s of slides) if (s.slideAt <= elapsed) slide = s
      if (slide !== curSlide) {
        curSlide = slide
        lastActive = -1
      }
      if (slide.words) {
        const found = activeWord(slide.words.segs, (elapsed - slide.slideAt) * 1000)
        if (found >= 0) lastActive = found
      } else {
        lastActive = -1
      }
      const winFrac = Math.min(1, elapsed / totalDur)
      drawSlide(ctx, {
        surahLabel,
        surahNumber,
        ayah: ayahs[slide.index],
        index: slide.index,
        total: ayahs.length,
        words: slide.words,
        active: lastActive,
        fit: slide.fit,
        fonts,
        reciterLabel,
        progress: {
          fraction: winFrac,
          splits: slides.map((s) => ({ at: s.slideAt / totalDur, label: ayahs[s.index].number })),
        },
        waveform: { peaks, fraction: winFrac },
      })
      const frame = new VideoFrame(canvas, {
        timestamp: Math.round(elapsed * 1e6),
        duration: Math.round(1e6 / OFFLINE_FPS),
      })
      videoEncoder.encode(frame)
      frame.close()
      if (videoEncoder.encodeQueueSize > 4) await drain()
      if (pending.length >= 32) await drain()
      if (i % 100 === 99 && i !== frameCount - 1) {
        await videoEncoder.flush()
        await drain()
      }
      if (i % 24 === 0 || i === frameCount - 1) {
        onProgress?.({ phase: 'render', done: i + 1, total: frameCount })
        debugStep('frames', `${i + 1}/${frameCount}`)
      }
    }
    await drain()

    await videoEncoder.flush()
    await audioEncoder.flush()
    videoSource.close()
    audioSource.close()
    debugStep('flushed')
    await output.finalize()
    if (encError) throw new Error('encode-error')
    debugStep('muxed', `${output.target.buffer.byteLength} bytes`)
    const blob = new Blob([output.target.buffer], { type: 'video/mp4' })
    debugStep('blob-ready')
    return { blob, ext: 'mp4' }
  } catch (err) {
    try {
      await output.cancel()
    } catch {}
    throw err
  } finally {
    try {
      videoEncoder.close()
    } catch {}
    try {
      audioEncoder.close()
    } catch {}
  }
}