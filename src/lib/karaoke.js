// Word-accurate recitation data for the recited-word highlight.
// - Timings: quran-align (CC-BY-4.0), vendored in /data/timings-{reciter}.json
//   Format: [{ surah, ayah, segments: [[wordStart, wordEnd, startMs, endMs], ...] }]
// - Malayalam glosses: Amani Thafseer word-by-word (via quranwbw),
//   vendored in /data/ml-words.json. Format: { surah: { ayah: [[gloss, ...]] } }
// Each segment maps to one Malayalam gloss; the max segment word index equals
// the count of Arabic words for the ayah (verified across the corpus).

const TIMING_FILES = {
  Alafasy: '/data/timings-Alafasy.json',
  Sudais: '/data/timings-Sudais.json',
  Shatri: '/data/timings-Shatri.json',
  Shuraym: '/data/timings-Shuraym.json',
}

const ML_FILE = '/data/ml-words.json'

// Standalone recitation-stop markers the Uthmani text carries as separate
// whitespace tokens (ۖ ۗ ۘ ۙ ۚ ۛ ۜ ۝ ۞ ۩). They are not words, so drop them
// before counting words against the segment data.
const WAQF_RE = /[\u06d6-\u06de\u06e9]+/g

const timingCache = new Map()
const mlCache = new Map()

async function fetchJson(url, cache) {
  if (cache.has(url)) return cache.get(url)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Could not fetch ${url}`)
  const data = await res.json()
  cache.set(url, data)
  return data
}

export async function loadKaraoke(reciter) {
  const timingUrl = TIMING_FILES[reciter]
  if (!timingUrl) throw new Error(`No timing data for ${reciter}`)
  const [timings, ml] = await Promise.all([
    fetchJson(timingUrl, timingCache),
    fetchJson(ML_FILE, mlCache),
  ])
  return { timings, ml }
}

// Returns { ar: [arabicWords], ml: [glosses], segs: [[w0,w1,start,end],...] }
// aligned by index, or null when the data does not line up (static fallback).
// arabicText should already be basmala-stripped (as fetchSurahTexts provides).
export function ayahWords(timings, ml, surah, ayah, arabicText) {
  const entry = timings.find((t) => t.surah === surah && t.ayah === ayah)
  if (!entry || !entry.segments.length) return null
  const segs = entry.segments
  const maxWord = segs[segs.length - 1][1]
  const ar = arabicText.replace(WAQF_RE, '').split(/\s+/).filter(Boolean)
  if (ar.length !== maxWord) return null
  // Malayalam glosses are optional: muqatta'at ayahs and a few others have
  // none or a count that does not line up, in which case the Arabic words
  // still highlight on their own.
  const glosses = ml?.[String(surah)]?.[String(ayah)]?.[0]
  const mlGlosses =
    Array.isArray(glosses) && glosses.length === segs.length ? glosses : []
  return { ar, ml: mlGlosses, segs }
}

// Segment index (0-based) active at elapsedMs within the ayah's audio.
// Returns -1 for gaps between words (caller keeps the previous highlight).
export function activeWord(segs, elapsedMs) {
  for (let i = 0; i < segs.length; i++) {
    if (elapsedMs >= segs[i][2] && elapsedMs < segs[i][3]) return i
  }
  return -1
}

// A "*" gloss means "same meaning as the previous word" — highlight the last
// real gloss before the active index instead.
export function effectiveGloss(glosses, index) {
  for (let i = index; i >= 0; i--) {
    const text = (glosses[i] || '').replace(/\r\n/g, ' ').trim()
    if (text && text !== '*') return i
  }
  return -1
}

// Gloss text is aligned to segments; "*" slots continue the previous meaning.
export function glossFor(glosses, index) {
  const raw = glosses[index]
  if (!raw || raw === '*') return null
  return raw.replace(/\r\n/g, ' ').trim()
}
