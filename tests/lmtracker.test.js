import test from 'node:test'
import assert from 'node:assert/strict'
import { localDateKey, trackerWeek, TRACKER_ITEMS, readTrackerDay, trackerKey } from '../src/lib/lmtracker.js'

test('all 44 checklist items have distinct IDs including repeated duas', () => {
  assert.equal(TRACKER_ITEMS.length, 44)
  assert.equal(new Set(TRACKER_ITEMS.map((item) => item.id)).size, 44)
  assert.equal(TRACKER_ITEMS.filter((item) => item.label === 'Dua').length, 6)
})

test('seven dates center today and cross month/year boundaries', () => {
  const week = trackerWeek(new Date(2026, 0, 1, 1))
  assert.deepEqual(week.map((day) => day.key), ['2025-12-29', '2025-12-30', '2025-12-31', '2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04'])
  assert.equal(localDateKey(new Date(2026, 9, 31, 23)), '2026-10-31')
})

test('saved progress is isolated by date and retains independent duplicate labels', () => {
  const saved = new Map()
  const storage = { getItem: (key) => saved.get(key) ?? null }
  saved.set(trackerKey('2026-10-31'), JSON.stringify(['0-4', '1-6']))
  assert.deepEqual(readTrackerDay(storage, '2026-10-31'), ['0-4', '1-6'])
  assert.deepEqual(readTrackerDay(storage, '2026-11-01'), [])
  saved.set(trackerKey('2026-11-01'), JSON.stringify(['0-0']))
  assert.deepEqual(readTrackerDay(storage, '2026-10-31'), ['0-4', '1-6'])
})

test('malformed, unknown and blocked storage is surfaced instead of silently treated as saved', () => {
  for (const raw of ['{', 'null', '{}', '["unknown"]']) {
    assert.throws(() => readTrackerDay({ getItem: () => raw }, '2026-10-31'))
  }
  assert.throws(() => readTrackerDay({ getItem: () => { throw new Error('blocked') } }, '2026-10-31'))
  assert.deepEqual(readTrackerDay({ getItem: () => '["0-0","0-0"]' }, '2026-10-31'), ['0-0'])
})
