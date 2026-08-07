export const RECITERS = [
  { id: 'Alafasy', label: 'Mishari Rashid Alafasy' },
  { id: 'Sudais', label: 'Abdur-Rahman as-Sudais' },
  { id: 'Shuraym', label: 'Sa‘ud ash-Shuraym' },
  { id: 'Shatri', label: 'Abu Bakr ash-Shatri' },
]

const SURAHS_KEY = 'salafic-quran-surahs'
const SURAHS_TTL = 7 * 24 * 60 * 60 * 1000

const SURAH_NAMES = {
  1: 'Al-Fatiha', 2: 'Al-Baqara', 3: 'Aal-Imran', 4: 'An-Nisa', 5: 'Al-Ma’ida',
  6: "Al-An'am", 7: 'Al-A’raf', 8: 'Al-Anfal', 9: 'At-Tawba', 10: 'Yunus',
  11: 'Hud', 12: 'Yusuf', 13: 'Ar-Ra’d', 14: 'Ibrahim', 15: 'Al-Hijr',
  16: 'An-Nahl', 17: 'Al-Isra', 18: 'Al-Kahf', 19: 'Maryam', 20: 'Ta-Ha',
  21: 'Al-Anbiya', 22: 'Al-Hajj', 23: 'Al-Mu’minun', 24: 'An-Nur', 25: 'Al-Furqan',
  26: 'Ash-Shu’ara', 27: 'An-Naml', 28: 'Al-Qasas', 29: 'Al-’Ankabut', 30: 'Ar-Rum',
  31: 'Luqman', 32: 'As-Sajda', 33: 'Al-Ahzab', 34: 'Saba', 35: 'Fatir',
  36: 'Ya-Sin', 37: 'As-Saffat', 38: 'Sad', 39: 'Az-Zumar', 40: 'Ghafir',
  41: 'Fussilat', 42: 'Ash-Shura', 43: 'Az-Zukhruf', 44: 'Ad-Dukhan', 45: 'Al-Jathiya',
  46: 'Al-Ahqaf', 47: 'Muhammad', 48: 'Al-Fath', 49: 'Al-Hujurat', 50: 'Qaf',
  51: 'Adh-Dhariyat', 52: 'At-Tur', 53: 'An-Najm', 54: 'Al-Qamar', 55: 'Ar-Rahman',
  56: 'Al-Waqi’a', 57: 'Al-Hadid', 58: 'Al-Mujadila', 59: 'Al-Hashr', 60: 'Al-Mumtahana',
  61: 'As-Saff', 62: 'Al-Jumu’a', 63: 'Al-Munafiqun', 64: 'At-Taghabun', 65: 'At-Talaq',
  66: 'At-Tahrim', 67: 'Al-Mulk', 68: 'Al-Qalam', 69: 'Al-Haqqa', 70: 'Al-Ma’arij',
  71: 'Nuh', 72: 'Al-Jinn', 73: 'Al-Muzzammil', 74: 'Al-Muddaththir', 75: 'Al-Qiyama',
  76: 'Al-Insan', 77: 'Al-Mursalat', 78: 'An-Naba', 79: 'An-Nazi’at', 80: 'Abasa',
  81: 'At-Takwir', 82: 'Al-Infitar', 83: 'Al-Mutaffifin', 84: 'Al-Inshiqaq', 85: 'Al-Buruj',
  86: 'At-Tariq', 87: 'Al-A’la', 88: 'Al-Ghashiya', 89: 'Al-Fajr', 90: 'Al-Balad',
  91: 'Ash-Shams', 92: 'Al-Layl', 93: 'Ad-Duha', 94: 'Ash-Sharh', 95: 'At-Tin',
  96: 'Al-’Alaq', 97: 'Al-Qadr', 98: 'Al-Bayyina', 99: 'Az-Zalzala', 100: 'Al-’Adiyat',
  101: 'Al-Qari’a', 102: 'At-Takathur', 103: 'Al-’Asr', 104: 'Al-Humaza', 105: 'Al-Fil',
  106: 'Quraysh', 107: 'Al-Ma’un', 108: 'Al-Kawthar', 109: 'Al-Kafirun', 110: 'An-Nasr',
  111: 'Al-Masad', 112: 'Al-Ikhlas', 113: 'Al-Falaq', 114: 'An-Nas',
}

export function ayahUrl(reciter, surah, ayah) {
  const s = String(surah).padStart(3, '0')
  const a = String(ayah).padStart(3, '0')
  return `https://verses.quran.com/${reciter}/mp3/${s}${a}.mp3`
}

export function fallbackSurahs() {
  const counts = [
    7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128,
    111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73,
    54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49,
    62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28,
    28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20,
    15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4,
    5, 6,
  ]
  return counts.map((ayahCount, i) => ({
    number: i + 1,
    englishName: SURAH_NAMES[i + 1] || `Surah ${i + 1}`,
    arabicName: '',
    numberOfAyahs: ayahCount,
  }))
}

export async function fetchSurahs() {
  try {
    const cached = JSON.parse(localStorage.getItem(SURAHS_KEY) || 'null')
    if (cached && Date.now() - cached.fetchedAt < SURAHS_TTL) return cached.data
  } catch {}
  try {
    const res = await fetch('https://api.alquran.cloud/v1/surah')
    if (!res.ok) throw new Error('failed to fetch surah list')
    const json = await res.json()
    const data = json.data.map((s) => ({
      number: s.number,
      englishName: s.englishName,
      arabicName: s.name,
      numberOfAyahs: s.numberOfAyahs,
    }))
    try {
      localStorage.setItem(SURAHS_KEY, JSON.stringify({ fetchedAt: Date.now(), data }))
    } catch {}
    return data
  } catch {
    return fallbackSurahs()
  }
}
