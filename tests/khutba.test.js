import test from 'node:test'
import assert from 'node:assert/strict'
import { findPassage } from '../src/lib/khutba.js'
import khutba from '../src/data/khutba.json' with { type: 'json' }
import november from '../src/data/khutbas/2026-11-20.json' with { type: 'json' }

test('November 20 includes both khutbahs in sequence with matchable bilingual passages', () => {
  assert.equal(november.date, '2026-11-20')
  assert.deepEqual([...new Set(november.passages.map(p => p.part))], [1, 2])
  november.passages.forEach(({ ar, en, part }, i) => {
    assert.ok(en.trim() && ar.trim())
    assert.ok(!i || part >= november.passages[i - 1].part)
    assert.equal(findPassage(ar.split(' ').slice(0, 8).join(' '), november.passages), i)
  })
  assert.match(november.passages.at(-1).en, /establish the prayer/)
})

test('each prepared passage can be joined midway and has a translation', () => {
  khutba.passages.forEach(({ ar, en }, i) => {
    assert.ok(en.trim())
    assert.equal(findPassage(ar.split(' ').slice(-3).join(' '), khutba.passages), i)
  })
})

test('ignores vowel marks, alef variants, and unrelated speech', () => {
  assert.equal(findPassage('الَّذِي أَمَرَنَا بِالإِحْسَانِ', khutba.passages), 0)
  assert.equal(findPassage('من حسن الجوار كلام آخر', khutba.passages), -1)
  assert.equal(findPassage('من حسن', khutba.passages), -1)
})

test('does not jump on a phrase shared by two passages', () => {
  const lines = [{ ar: 'وفي هذا اليوم' }, { ar: 'وفي هذا اليوم نتحدث' }]
  assert.equal(findPassage(lines[0].ar, lines), -1)
  assert.equal(findPassage(lines[1].ar, lines), 1)
})
