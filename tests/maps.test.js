import test from 'node:test'
import assert from 'node:assert/strict'
import { coordinatesFromMaps, mapsUrl } from '../functions/maps.js'
import { resolveMapLocation } from '../functions/mapsResolver.js'
import { communityFields } from '../functions/community.js'

test('uses the place pin instead of the camera and infers the timezone', async () => {
  const result = await resolveMapLocation('https://www.google.com/maps/place/Masjid/@20,30,15z/data=!4m2!3d25.2048!4d55.2708')
  assert.equal(result.latitude, 25.2048)
  assert.equal(result.longitude, 55.2708)
  assert.equal(result.timezone, 'Asia/Dubai')
  assert.deepEqual(coordinatesFromMaps('https://maps.google.com/?q=-33.86%2C151.2'), { latitude: -33.86, longitude: 151.2 })
  assert.equal(coordinatesFromMaps('https://www.google.com/maps/@25,55,12z'), null)
})

test('expands a short Maps URL and rejects untrusted redirect destinations', async () => {
  let calls = 0
  const result = await resolveMapLocation('https://maps.app.goo.gl/Example', async (_url, options) => {
    calls++
    assert.equal(options.redirect, 'manual')
    return new Response(null, { status: 302, headers: { location: 'https://www.google.com/maps/search/?api=1&query=51.5074,-0.1278' } })
  })
  assert.equal(calls, 1)
  assert.equal(result.timezone, 'Europe/London')
  await assert.rejects(() => resolveMapLocation('https://maps.app.goo.gl/Example', async () => new Response(null, { status: 302, headers: { location: 'http://169.254.169.254/' } })), /Google Maps/)
  for (const url of ['https://google.com.evil.test/maps', 'https://user:pass@www.google.com/maps', 'https://www.google.com:8443/maps', 'https://127.0.0.1/maps', 'javascript:alert(1)']) assert.throws(() => mapsUrl(url))
  assert.throws(() => coordinatesFromMaps('https://www.google.com/maps?q=91,55'))
  await assert.rejects(() => resolveMapLocation('https://www.google.com/maps?q=masjid'), /pin/)
})

test('community information is bounded and excludes submitted access roles', () => {
  const fields = communityFields('committee', { members: [{ name: 'Person', role: 'Secretary', uid: 'other', admin: true }] })
  assert.deepEqual(fields.members, [{ name: 'Person', role: 'Secretary' }])
  assert.throws(() => communityFields('committee', { members: Array(51).fill({ name: 'A', role: 'B' }) }))
  assert.throws(() => communityFields('madrasa', { contactEmail: 'invalid' }))
  assert.throws(() => communityFields('members', {}))
})
