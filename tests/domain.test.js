import test from 'node:test'
import assert from 'node:assert/strict'
import {
  minorUnits,
  money,
  prayerSettings,
  activeNotices,
  checkVersion,
  applicationFields,
  can,
} from '../functions/domain.js'
import {
  calculateSchedule,
  localDate,
  zonedInstant,
  nextPrayer,
} from '../src/lib/centerPrayer.js'
import { eventFields, nextEvent } from '../functions/time.js'
import { centerHtml } from '../functions/metadata.js'

const center = {
  latitude: 25.2048,
  longitude: 55.2708,
  timezone: 'Asia/Dubai',
  locale: 'en',
  prayer: prayerSettings({ method: 'Dubai' }),
}
test('currency precision respects USD, INR, JPY and KWD', () => {
  assert.equal(minorUnits('12.34', 'USD'), 1234)
  assert.equal(minorUnits('1.01', 'INR'), 101)
  assert.equal(minorUnits('120', 'JPY'), 120)
  assert.equal(minorUnits('1.234', 'KWD'), 1234)
  assert.throws(() => minorUnits('1.1', 'JPY'))
  assert.throws(() => minorUnits('1.234', 'USD'))
  assert.throws(() => minorUnits('-5', 'USD'))
  assert.match(money(1234, 'USD', 'en-US'), /12.34/)
})
test('offsets are signed, repeatable and do not compound across recalculation', () => {
  const base = calculateSchedule(center, '2026-09-26')
  const adjusted = {
    ...center,
    prayer: prayerSettings({
      method: 'Dubai',
      offsets: { fajr: 5, dhuhr: -3 },
    }),
  }
  const a = calculateSchedule(adjusted, '2026-09-26'),
    b = calculateSchedule(adjusted, '2026-09-26')
  assert.equal(
    Date.parse(a.prayers[0].at) - Date.parse(base.prayers[0].at),
    5 * 60000,
  )
  assert.equal(
    Date.parse(a.prayers[1].at) - Date.parse(base.prayers[1].at),
    -3 * 60000,
  )
  assert.deepEqual(a, b)
  const manual = calculateSchedule(adjusted, '2026-09-26', {
    fajr: { adhaan: '05:15', iqama: '05:30' },
  })
  assert.equal(manual.prayers[0].at, '2026-09-26T01:15:00.000Z')
})
test('center date and DST conversions do not depend on device timezone', () => {
  assert.equal(
    localDate('Asia/Dubai', new Date('2026-09-26T21:00:00Z')),
    '2026-09-27',
  )
  assert.equal(
    zonedInstant('2026-01-15', '12:00', 'America/New_York'),
    '2026-01-15T17:00:00.000Z',
  )
  assert.equal(
    zonedInstant('2026-07-15', '12:00', 'America/New_York'),
    '2026-07-15T16:00:00.000Z',
  )
  assert.throws(() => zonedInstant('2026-03-08', '02:30', 'America/New_York'))
  const schedules = [
    calculateSchedule(center, '2026-09-26'),
    calculateSchedule(center, '2026-09-27'),
  ]
  assert.equal(
    nextPrayer(schedules, Date.parse(schedules[0].prayers[4].at) + 1).at,
    schedules[1].prayers[0].at,
  )
})
test('scheduled announcements expire at the boundary offline too', () => {
  const n = {
    startsAt: '2026-09-26T10:00:00Z',
    expiresAt: '2026-09-26T11:00:00Z',
    surfaces: ['tv'],
  }
  assert.equal(activeNotices([n], 'tv', Date.parse(n.startsAt)).length, 1)
  assert.equal(activeNotices([n], 'tv', Date.parse(n.expiresAt)).length, 0)
  assert.equal(activeNotices([n], 'home', Date.parse(n.startsAt)).length, 0)
})
test('capabilities and publication version conflicts are enforced', () => {
  assert.equal(can('finance', 'content'), false)
  assert.equal(can('editor', 'finance'), false)
  assert.equal(can('admin', 'finance'), true)
  assert.throws(() => checkVersion(2, 1))
  assert.doesNotThrow(() => checkVersion(2, 2))
})
test('applications validate timezone, coordinates and intended admin independently', () => {
  const fields = {
    ...center,
    displayName: 'Test Center',
    type: 'center',
    city: 'Dubai',
    countryCode: 'AE',
    address: 'Test address',
    currency: 'AED',
    slug: 'test-center',
    designatedAdminEmail: 'ADMIN@example.com',
  }
  assert.equal(
    applicationFields(fields).designatedAdminEmail,
    'admin@example.com',
  )
  assert.throws(() => applicationFields({ ...fields, timezone: 'Bad/Zone' }))
  assert.throws(() => applicationFields({ ...fields, latitude: 91 }))
  assert.throws(() => applicationFields({ ...fields, slug: 'admin' }))
})
test('weekly events retain center wall time across daylight-saving changes', () => {
  const event = eventFields(
    { eventAt: '2026-03-01T12:00', repeat: 'weekly' },
    'America/New_York',
  )
  assert.equal(event.eventAt, '2026-03-01T17:00:00.000Z')
  assert.equal(
    nextEvent(event, Date.parse('2026-03-02T00:00Z')),
    '2026-03-08T16:00:00.000Z',
  )
  assert.throws(() =>
    eventFields({ eventAt: '2026-03-08T02:30' }, 'America/New_York'),
  )
  assert.throws(() =>
    eventFields({ eventAt: '2026-02-31T12:00' }, 'America/New_York'),
  )
})
test('center search metadata escapes public content and preserves application assets', () => {
  const html = centerHtml(
    '<html><head><title>Generic</title></head><body><div id="root"></div><script src="/assets/app.js"></script></body></html>',
    {
      displayName: '<script>alert(1)</script>',
      city: 'Dubai',
      address: 'Main street',
      slug: 'test-center',
      logoUrl: 'https://example.com/logo.png',
    },
    'https://example.com',
  )
  assert.equal(html.includes('<script>alert(1)</script>'), false)
  assert.match(html, /&lt;script&gt;/)
  assert.match(html, /https:\/\/example.com\/c\/test-center/)
  assert.match(html, /src="\/assets\/app.js"/)
})
