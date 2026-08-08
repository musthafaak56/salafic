// Prayer time fetching via the Aladhan API (free, no API key required).
// Docs: https://aladhan.com/prayer-times-api
// After fetching, admins can edit every time to match the masjid exactly.

export const CALCULATION_METHODS = [
  { value: '3', label: 'Muslim World League' },
  { value: '2', label: 'ISNA (North America)' },
  { value: '1', label: 'University of Karachi (South Asia)' },
  { value: '4', label: 'Umm Al-Qura (Makkah)' },
  { value: '5', label: 'Egyptian General Authority' },
]

export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED
            ? 'Location access was denied. Allow location in the browser, or enter times manually.'
            : 'Could not determine your location.'
        reject(new Error(msg))
      },
      { timeout: 10000 }
    )
  })
}

function toDDMMYYYY(isoDate) {
  const [y, m, d] = isoDate.split('-')
  return `${d}-${m}-${y}`
}

export async function fetchPrayerTimes({ latitude, longitude, date, method = '3' }) {
  const url =
    `https://api.aladhan.com/v1/timings/${toDDMMYYYY(date)}` +
    `?latitude=${latitude}&longitude=${longitude}&method=${method}`

  const res = await fetch(url)
  if (!res.ok) throw new Error('Prayer time service is unavailable. Try again later.')

  const json = await res.json()
  if (json.code !== 200 || !json.data?.timings) {
    throw new Error('Could not fetch prayer times for this location.')
  }

  const t = json.data.timings
  return {
    sunrise: t.Sunrise?.slice(0, 5) || '',
    fajr: t.Fajr?.slice(0, 5) || '',
    dhuhr: t.Dhuhr?.slice(0, 5) || '',
    asr: t.Asr?.slice(0, 5) || '',
    maghrib: t.Maghrib?.slice(0, 5) || '',
    isha: t.Isha?.slice(0, 5) || '',
    location: json.data.meta?.timezone || '',
  }
}
