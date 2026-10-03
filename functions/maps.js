// Validate every URL, including each redirect, before contacting it.
export function mapsUrl(value) {
  if (typeof value !== 'string' || value.length > 8192)
    throw new Error('Paste a Google Maps share link for your center.')
  let url
  try { url = new URL(value.trim()) } catch {
    throw new Error('Paste a valid Google Maps share link.')
  }
  const host = url.hostname
  const allowed = host === 'maps.app.goo.gl' ||
    (host === 'goo.gl' && url.pathname.startsWith('/maps/')) ||
    (['google.com', 'www.google.com', 'maps.google.com'].includes(host) &&
      (host === 'maps.google.com' || /^\/maps(?:\/|$)/.test(url.pathname)))
  if (!allowed || url.protocol !== 'https:' || url.username || url.password || url.port)
    throw new Error('Use a HTTPS Google Maps link from Share → Copy link.')
  return url
}

function coordinates(lat, lng) {
  const latitude = Number(lat), longitude = Number(lng)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 || Math.abs(longitude) > 180)
    throw new Error('This map link contains an invalid location.')
  return { latitude, longitude }
}

export function coordinatesFromMaps(value) {
  const url = mapsUrl(value)
  let decoded
  try { decoded = decodeURIComponent(url.href) } catch {
    throw new Error('This map link is malformed. Copy it again from Google Maps.')
  }
  // Place/pin coordinates take precedence over the map camera position (@).
  const pin = decoded.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/)
  if (pin) return coordinates(pin[1], pin[2])
  for (const key of ['query', 'q', 'destination']) {
    const match = url.searchParams.get(key)?.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/)
    if (match) return coordinates(match[1], match[2])
  }
  // A camera position is not necessarily the selected masjid. Require a pin.
  return null
}
