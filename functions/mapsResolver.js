import timezoneAt from 'tz-lookup'
import { mapsUrl, coordinatesFromMaps } from './maps.js'

export async function resolveMapLocation(value, fetcher = fetch) {
  let url = mapsUrl(value)
  const original = url.href
  const signal = AbortSignal.timeout(10000)
  for (let hop = 0; hop < 5; hop++) {
    const point = coordinatesFromMaps(url.href)
    if (point) return { ...point, mapsUrl: original, timezone: timezoneAt(point.latitude, point.longitude) }
    if (!['maps.app.goo.gl', 'goo.gl'].includes(url.hostname)) break
    const response = await fetcher(url.href, { method: 'HEAD', redirect: 'manual', signal })
    const target = response.headers.get('location')
    if (response.status < 300 || response.status >= 400 || !target) break
    url = mapsUrl(new URL(target, url).href)
  }
  throw new Error('We could not find the center’s pin in this link. In Google Maps, select the exact place or drop a pin, then use Share → Copy link. A search or map-view link is not enough.')
}
