export const TRACKER_GROUPS = [
  { title: 'Start the day', items: ['Waking up dua', 'Morning sunnah niyyath', 'Inna fee', 'Thahajjud/Witr', 'Dua', 'Isthigfar', 'Zikr', 'Fajr Sunnah', 'Fajr Jamaath', 'Swalah Zikr', 'Azkarusswabaah', 'Quran 3 pages'] },
  { title: 'Through the day', items: ['Cleaning', 'Helping Ummi', 'Behaving Calmly', 'Sharing Deen', 'Niyyah in Zikra', 'Dhuha', 'Dua', 'Dhuhr sunnah', 'Dhuhr', 'Dua', 'Asr', 'Dua', 'Azkarul Masaah', 'Swadaqah', 'Doura Class', 'Marking Attendance', 'Quran 1 juz'] },
  { title: 'Evening & night', items: ['Magrib', 'Magrib Sunnah', 'Dua', 'Calling ❤️', 'Ashlin Class 30 mins', 'Isha', 'Isha sunnah', 'Dua', 'Night prayers', 'Surah Al Mulk', '10 ikhlas'] },
  { title: 'Habits to protect', note: 'Tick each one when you have avoided it today.', items: ['No gheebath', 'No lie', 'No timewasting videos', 'No over scrollings'] },
].map((group, groupIndex) => ({ ...group, items: group.items.map((label, index) => ({ id: `${groupIndex}-${index}`, label })) }))

export const TRACKER_ITEMS = TRACKER_GROUPS.flatMap((group) => group.items)
const validIds = new Set(TRACKER_ITEMS.map((item) => item.id))
export const trackerKey = (date) => `salafic-lmtracker-v1:${date}`

export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function trackerWeek(today = new Date()) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + index - 3, 12)
    return { key: localDateKey(date), date }
  })
}

export function readTrackerDay(storage, date) {
  const raw = storage.getItem(trackerKey(date))
  if (raw === null) return []
  const value = JSON.parse(raw)
  if (!Array.isArray(value) || value.some((id) => !validIds.has(id))) throw new Error('Invalid tracker data')
  return [...new Set(value)]
}
