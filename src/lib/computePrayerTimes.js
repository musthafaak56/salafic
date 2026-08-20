import {
  CalculationMethod,
  Coordinates,
  HighLatitudeRule,
  Madhab,
  PrayerTimes,
} from 'adhan'
import { addMinutes, isFriday } from './utils'

// Broadcasts a computed prayer schedule in the same shape as the Firestore
// docs (each entry { adhaan: 'HH:mm', iqama: 'HH:mm' }) so the rest of the
// app can consume it unchanged. Used for the TV's "current location" mode
// and as the fallback when the published masjid plan is out of date.

export function computePrayerTimes(lat, lng, dateStr, iqamaGapMin = 20) {
  const params = CalculationMethod.MuslimWorldLeague()
  params.madhab = Madhab.Shafi
  params.highLatitudeRule = HighLatitudeRule.MiddleOfTheNight

  const date = new Date(`${dateStr}T00:00:00`)
  const p = new PrayerTimes(new Coordinates(lat, lng), date, params)

  const entry = (d) => {
    const adhaan = `${String(d.getHours()).padStart(2, '0')}:${String(
      d.getMinutes(),
    ).padStart(2, '0')}`
    return { adhaan, iqama: addMinutes(adhaan, iqamaGapMin) }
  }

  const times = {
    date: dateStr,
    updatedAt: new Date(),
    sunrise: entry(p.sunrise),
    fajr: entry(p.fajr),
    dhuhr: entry(p.dhuhr),
    asr: entry(p.asr),
    maghrib: entry(p.maghrib),
    isha: entry(p.isha),
  }
  if (isFriday(dateStr)) times.jumuah = times.dhuhr
  return times
}