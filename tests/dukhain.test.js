import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { rangeTiming } from '../src/lib/quran.js'

test('Haitham ranges can advance at the original recording boundaries without seeking', () => {
  assert.deepEqual(rangeTiming('Dukhain'), { pad: 0, lead: 0 })
  const rows = JSON.parse(readFileSync(new URL('../public/data/timings-Dukhain.json', import.meta.url)))
  for (const [i, row] of rows.entries()) {
    // Some source timestamps coincide; continuity requires no gap or overlap.
    assert.ok(row.ayahEndMs >= row.ayahStartMs)
    if (rows[i - 1]?.surah === row.surah) {
      assert.equal(row.ayahStartMs, rows[i - 1].ayahEndMs, row.surah + ':' + row.ayah)
    }
  }
})
