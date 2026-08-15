// Shared line model for the recited Arabic text. The video renderer and the
// in-page player both wrap the ayah's words into lines with identical logic
// so both reveal the same line at the same time.

// Font sizes and wrap budget that guarantee identical line breaks in the
// rendered video (720x1280 canvas, Arabic block 900 * 1280/1920 px wide,
// 4 lines max) and on the page: any measure of the active line matches.
export const TEXT_SIZES = [48, 44, 40, 38, 36, 34, 32, 30, 28, 26, 24, 22]
export const ARABIC_MAX_WIDTH = 600
export const ARABIC_MAX_LINES = 4

// Picks the largest Arabic font size whose wrapped line count stays within
// the line budget, and returns the lines + size. Mirrors the video layout
// exactly (font weight 600, same max width).
export function fitArabicWords(ctx, words, fontFamily, maxWidth = ARABIC_MAX_WIDTH, maxLines = ARABIC_MAX_LINES) {
  for (const size of TEXT_SIZES) {
    ctx.font = `600 ${size}px ${fontFamily}`
    const lines = wrapWords(ctx, words, maxWidth)
    if (lines.length <= maxLines) return { lines, size, leading: Math.round(size * 1.8) }
  }
  ctx.font = `600 22px ${fontFamily}`
  return { lines: wrapWords(ctx, words, maxWidth), size: 22, leading: 40 }
}

// Wraps an array of words (or word-units with a .text + .w width) into lines,
// preserving the original index of each unit for highlight tracking.
export function wrapWords(ctx, units, maxWidth) {
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

// Returns the index of the line whose word range intersects the active
// segment [w0, w1), or -1 when the segment covers no word (start of ayah).
export function activeLineOf(lines, seg) {
  if (!seg) return 0
  const w0 = seg[0]
  let best = -1
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li]
    const first = line[0].i
    const last = line[line.length - 1].i
    if (w0 >= first && w0 <= last) return li
    if (w0 > last) best = li
  }
  return best >= 0 ? best : 0
}

// Normalizes a Malayalam token for comparison: strips punctuation, zero-width
// joiners and case so inflected forms can still be matched against glosses.
function normToken(t) {
  return t
    .replace(/[.,;:()“”‘’]/g, '')
    .replace(/[\u200d\u200c]/g, '')
    .trim()
    .toLowerCase()
}

// Similarity of two normalized Malayalam tokens: exact = 1, one a prefix of
// the other = 0.8, shared prefix of >= 3 letters = partial 0.5-0.8.
function tokenSim(a, b) {
  if (a === b) return 1
  const la = a.length
  const lb = b.length
  if (la < 3 || lb < 3) return 0
  if (la <= lb ? b.startsWith(a) : a.startsWith(b)) return 0.8
  let p = 0
  const m = Math.min(la, lb)
  while (p < m && a[p] === b[p]) p++
  if (p >= 3) return 0.5 + 0.3 * (p / m)
  return 0
}

// Splits the real Malayalam sentence (translationMl) into one plain-text
// fragment per wrapped Arabic line, verified against the word-by-word glosses:
// the sentence's tokens are partitioned (dynamic programming) into contiguous
// groups whose tokens best match each line's gloss tokens, with the relative
// gloss length as the tie-break so the split stays proportional when the
// translations paraphrase. Returns the fragments in line order; empty when
// there is no sentence or no glosses to verify against.
export function sentenceSplits(lines, segs, ml, sentence) {
  if (!sentence || !lines.length || !segs.length || !ml.length) return []
  const raw = sentence.replace(/\r\n/g, ' ').trim()
  if (!raw) return []
  const tokens = raw.split(/\s+/)
  const m = tokens.length
  const L = lines.length
  if (!m || !L) return []

  // Resolved per-word glosses ("*" continues the previous meaning).
  const eff = []
  let prev = ''
  for (let si = 0; si < segs.length; si++) {
    const text = (ml[si] || '').replace(/\r\n/g, ' ').trim()
    if (text === '*') eff.push(prev)
    else if (text) {
      eff.push(text)
      prev = text
    } else eff.push('')
  }

  // Per line: the set of gloss tokens of the words it covers.
  const targets = lines.map((line) => {
    const set = new Set()
    for (const unit of line) {
      const segIndex = segs.findIndex((s) => unit.i >= s[0] && unit.i < s[1])
      if (segIndex < 0) continue
      for (const w of (eff[segIndex] || '').split(/\s+/)) {
        const n = normToken(w)
        if (n) set.add(n)
      }
    }
    return [...set]
  })

  // Proportional expected token boundary for each line (tie-break prior).
  const glossLen = targets.map((t) => t.length)
  const totalGloss = glossLen.reduce((a, b) => a + b, 0)
  const expect = []
  {
    let acc = 0
    for (let l = 0; l < L; l++) {
      acc += glossLen[l]
      expect.push(totalGloss ? Math.round((acc / totalGloss) * m) : 0)
    }
  }

  // DP over (tokens consumed, lines assigned): group score = sum of each
  // token's best similarity to the line's gloss tokens, minus a tiny
  // proportional-position penalty that only breaks ties.
  const norm = tokens.map(normToken)
  const simArr = norm.map((t) =>
    targets.map((tg) => {
      let best = 0
      for (const g of tg) {
        const s = tokenSim(t, g)
        if (s > best) best = s
      }
      return best
    }),
  )
  const neg = -1e9
  const dp = Array.from({ length: m + 1 }, () => Array(L + 1).fill(neg))
  const cut = Array.from({ length: m + 1 }, () => Array(L + 1).fill(-1))
  dp[0][0] = 0
  for (let i = 1; i <= m; i++) {
    for (let l = 1; l <= L && l <= i; l++) {
      let best = neg
      let bk = -1
      for (let k = 0; k < i; k++) {
        let sc = 0
        for (let t = k; t < i; t++) sc += simArr[t][l - 1]
        sc -= 0.001 * Math.abs((k + i) / 2 - expect[l - 1])
        if (dp[k][l - 1] + sc > best) {
          best = dp[k][l - 1] + sc
          bk = k
        }
      }
      dp[i][l] = best
      cut[i][l] = bk
    }
  }

  const frags = []
  if (m >= L && dp[m][L] > neg) {
    let i = m
    const bounds = []
    for (let l = L; l >= 1; l--) {
      bounds.unshift(cut[i][l])
      i = cut[i][l]
    }
    bounds.push(m)
    for (let l = 0; l < L; l++) frags.push(tokens.slice(bounds[l], bounds[l + 1]).join(' '))
  } else {
    // Too short or nothing matched: pure proportional split snapped to words.
    let prevBound = 0
    for (let l = 0; l < L; l++) {
      const next = Math.max(
        prevBound + 1,
        Math.min(m - (L - l - 1), totalGloss ? Math.round((glossLen[l] / totalGloss) * m) : 0),
      )
      frags.push(tokens.slice(prevBound, next).join(' '))
      prevBound = next
    }
  }
  return frags
}

// The word-by-word Malayalam glosses that belong to one Arabic line, one token
// per timing segment (segments can cover several Arabic words that share a
// single gloss). Kept in reading order so they can be drawn under the
// sentence; segIndex identifies the segment for karaoke highlighting.
export function lineGlosses(line, segs, ml) {
  const out = []
  const seen = new Set()
  for (const unit of line) {
    const si = segs.findIndex((s) => unit.i >= s[0] && unit.i < s[1])
    if (si < 0 || seen.has(si)) continue
    seen.add(si)
    const text = (ml[si] || '').replace(/\r\n/g, ' ').trim()
    if (text && text !== '*') out.push({ text, segIndex: si })
  }
  return out
}