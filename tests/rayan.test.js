import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { fallbackSurahs, surahAudioUrl } from '../src/lib/quran.js'

test('Rayan has ordered ayah and word windows throughout Juz 25–30', () => {
  assert.equal(surahAudioUrl('Rayan', 40), null)
  for (const { number, numberOfAyahs } of fallbackSurahs().slice(40)) {
    const filename = number === 67 ? 'timings-Rayan.json' : `rayan/${number}.json`
    const rows = JSON.parse(readFileSync(new URL(`../public/data/${filename}`, import.meta.url)))
    assert.ok(surahAudioUrl('Rayan', number))
    const first = number === 41 ? 47 : 1
    assert.equal(rows.length, numberOfAyahs - first + 1)
    let last = 0
    for (const [i, row] of rows.entries()) {
      const where = `${number}:${i + first}`
      assert.equal(row.surah, number, where)
      assert.equal(row.ayah, i + first, where)
      assert.ok(row.ayahStartMs >= last && row.ayahEndMs > row.ayahStartMs, where)
      last = row.ayahEndMs
      assert.ok(row.segments.length, where)
      let cursor = 0
      for (const [j, [w0, w1, start, end]] of row.segments.entries()) {
        assert.ok(w0 === j && w1 === j + 1, where)
        assert.ok(start >= cursor && end >= start && end <= last - row.ayahStartMs, where)
        cursor = end
      }
    }
  }
})
