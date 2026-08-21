export const RECITERS = [
  { id: 'Alafasy', label: 'Mishari Rashid Alafasy' },
  { id: 'Sudais', label: 'Abdur-Rahman as-Sudais' },
  { id: 'Shuraym', label: 'Sa‘ud ash-Shuraym' },
  { id: 'Shatri', label: 'Abu Bakr ash-Shatri' },
  { id: 'Dukhain', label: 'Haitham Al-Dukhain' },
]

// Reciters whose audio is served as one file per surah instead of one file
// per ayah (like the other four). Playback seeks within the surah file using
// the ayah windows stored in the timing data.
export function surahMode(reciter) {
  return reciter === 'Dukhain'
}

// Selectable font pairs for the recited-word view and video.
// ar/ml are CSS font-family stacks; canvas uses the same names.
export const FONT_PAIRS = [
  {
    id: 'naskh',
    label: 'Noto Naskh',
    ar: '"Noto Naskh Arabic"',
    ml: '"Noto Sans Malayalam"',
  },
  {
    id: 'amiri',
    label: 'Amiri',
    ar: '"Amiri"',
    ml: '"Noto Serif Malayalam"',
  },
  {
    id: 'scheherazade',
    label: 'Scheherazade New',
    ar: '"Scheherazade New"',
    ml: '"Manjari"',
  },
]

const SURAHS_KEY = 'salafic-quran-surahs'
const SURAHS_TTL = 7 * 24 * 60 * 60 * 1000

export const SURAH_METADATA = {
  1: { ar: 'الفاتحة', ml: 'അല് ഫാത്തിഹ', en: 'Al-Fatiha' },
  2: { ar: 'البقرة', ml: 'അല് ബഖറ', en: 'Al-Baqara' },
  3: { ar: 'آل عمران', ml: 'ആലു ഇംറാന്', en: 'Aal-Imran' },
  4: { ar: 'النساء', ml: 'അന്നിസാഅ്', en: 'An-Nisa' },
  5: { ar: 'المائدة', ml: 'അല് മാഇദ', en: 'Al-Ma’ida' },
  6: { ar: 'الأنعام', ml: 'അല് അന്ആം', en: "Al-An'am" },
  7: { ar: 'الأعراف', ml: 'അല് അഅ്റാഫ്', en: 'Al-A’raf' },
  8: { ar: 'الأنفال', ml: 'അല് അന്ഫാല്', en: 'Al-Anfal' },
  9: { ar: 'التوبة', ml: 'അത്തൗബ', en: 'At-Tawba' },
  10: { ar: 'يونس', ml: 'യൂനുസ്', en: 'Yunus' },
  11: { ar: 'هود', ml: 'ഹൂദ്', en: 'Hud' },
  12: { ar: 'يوسف', ml: 'യൂസുഫ്', en: 'Yusuf' },
  13: { ar: 'الرعد', ml: 'അർറഅ്ദ്', en: 'Ar-Ra’d' },
  14: { ar: 'إبراهيم', ml: 'ഇബ്രാഹീം', en: 'Ibrahim' },
  15: { ar: 'الحجر', ml: 'അല് ഹിജ്റ്', en: 'Al-Hijr' },
  16: { ar: 'النحل', ml: 'അന്നഹ്ല്', en: 'An-Nahl' },
  17: { ar: 'الإسراء', ml: 'അല് ഇസ്റാഅ്', en: 'Al-Isra' },
  18: { ar: 'الكهف', ml: 'അല് കഹ്ഫ്', en: 'Al-Kahf' },
  19: { ar: 'മريم', ml: 'മർയം', en: 'Maryam' },
  20: { ar: 'طه', ml: 'ത്വാഹാ', en: 'Ta-Ha' },
  21: { ar: 'الأنبياء', ml: 'അല് അന്ബിയാഅ്', en: 'Al-Anbiya' },
  22: { ar: 'الحج', ml: 'അല് ഹജ്ജ്', en: 'Al-Hajj' },
  23: { ar: 'المؤمنون', ml: 'അല് മുഅ്മിനൂന്', en: 'Al-Mu’minun' },
  24: { ar: 'النور', ml: 'അന്നൂര്', en: 'An-Nur' },
  25: { ar: 'الفرقان', ml: 'അല് ഫുർഖാന്', en: 'Al-Furqan' },
  26: { ar: 'الشعراء', ml: 'അശ്ശുഅറാഅ്', en: 'Ash-Shu’ara' },
  27: { ar: 'النمل', ml: 'അന്നംല്', en: 'An-Naml' },
  28: { ar: 'القصص', ml: 'അല് ഖസ്വസ്വ്', en: 'Al-Qasas' },
  29: { ar: 'العنكبوت', ml: 'അല് അന്കബൂത്ത്', en: 'Al-’Ankabut' },
  30: { ar: 'الروم', ml: 'അറ്രൂം', en: 'Ar-Rum' },
  31: { ar: 'لقمان', ml: 'ലുഖ്മാന്', en: 'Luqman' },
  32: { ar: 'السجدة', ml: 'അസ്സജ്ദ', en: 'As-Sajda' },
  33: { ar: 'الأحزاب', ml: 'അല് അഹ്സാബ്', en: 'Al-Ahzab' },
  34: { ar: 'سبأ', ml: 'സബഅ്', en: 'Saba' },
  35: { ar: 'فاطر', ml: 'ഫാത്വിർ', en: 'Fatir' },
  36: { ar: 'يس', ml: 'യാസീന്', en: 'Ya-Sin' },
  37: { ar: 'الصافات', ml: 'അസ്സ്വാഫ്ഫാത്ത്', en: 'As-Saffat' },
  38: { ar: 'ص', ml: 'സ്വാദ്', en: 'Sad' },
  39: { ar: 'الزمر', ml: 'അസ്സുമർ', en: 'Az-Zumar' },
  40: { ar: 'غافر', ml: 'ഗാഫിർ', en: 'Ghafir' },
  41: { ar: 'فصلت', ml: 'ഫുസ്സ്വിലത്ത്', en: 'Fussilat' },
  42: { ar: 'الشورى', ml: 'അശ്ശൂറാ', en: 'Ash-Shura' },
  43: { ar: 'الزخرف', ml: 'അസ്സുഖ്റുഫ്', en: 'Az-Zukhruf' },
  44: { ar: 'الدخان', ml: 'അദ്ദുഖാന്', en: 'Ad-Dukhan' },
  45: { ar: 'الجاثية', ml: 'അല് ജാഥിയ', en: 'Al-Jathiya' },
  46: { ar: 'الأحقاف', ml: 'അല് അഹ്ഖാഫ്', en: 'Al-Ahqaf' },
  47: { ar: 'محمد', ml: 'മുഹമ്മദ്', en: 'Muhammad' },
  48: { ar: 'الفتح', ml: 'അല് ഫത്ഹ്', en: 'Al-Fath' },
  49: { ar: 'الحجرات', ml: 'അല് ഹുജുറാത്ത്', en: 'Al-Hujurat' },
  50: { ar: 'ق', ml: 'ഖാഫ്', en: 'Qaf' },
  51: { ar: 'الذاريات', ml: 'അദ്ദാരിയാത്ത്', en: 'Adh-Dhariyat' },
  52: { ar: 'الطور', ml: 'അത്ത്വൂർ', en: 'At-Tur' },
  53: { ar: 'النجم', ml: 'അന്നജ്മ്', en: 'An-Najm' },
  54: { ar: 'القمر', ml: 'അല് ഖമർ', en: 'Al-Qamar' },
  55: { ar: 'الرحمن', ml: 'അർറഹ്മാന്', en: 'Ar-Rahman' },
  56: { ar: 'الواقعة', ml: 'അല് വാഖിഅ', en: 'Al-Waqi’a' },
  57: { ar: 'الحديد', ml: 'അല് ഹദീദ്', en: 'Al-Hadid' },
  58: { ar: 'المجادلة', ml: 'അല് മുജാദില', en: 'Al-Mujadila' },
  59: { ar: 'الحشر', ml: 'അല് ഹശ്ര്', en: 'Al-Hashr' },
  60: { ar: 'الممتحنة', ml: 'അല് മുംതഹന', en: 'Al-Mumtahana' },
  61: { ar: 'الصف', ml: 'അസ്സ്വഫ്ഫ്', en: 'As-Saff' },
  62: { ar: 'الجمعة', ml: 'അല് ജുമുഅ', en: 'Al-Jumu’a' },
  63: { ar: 'المنافقون', ml: 'അല് മുനാഫിഖൂന്', en: 'Al-Munafiqun' },
  64: { ar: 'التغابن', ml: 'അത്തഗാബുന്', en: 'At-Taghabun' },
  65: { ar: 'الطلاق', ml: 'അത്ത്വലാഖ്', en: 'At-Talaq' },
  66: { ar: 'التحريم', ml: 'അത്തഹ്രീം', en: 'At-Tahrim' },
  67: { ar: 'الملك', ml: 'അല് മുല്ക്', en: 'Al-Mulk' },
  68: { ar: 'القلم', ml: 'അല് ഖലം', en: 'Al-Qalam' },
  69: { ar: 'الحاقة', ml: 'അല് ഹാഖ്ഖ', en: 'Al-Haqqa' },
  70: { ar: 'المعارج', ml: 'അല് മആരിജ്', en: 'Al-Ma’arij' },
  71: { ar: 'نوح', ml: 'നൂഹ്', en: 'Nuh' },
  72: { ar: 'الجن', ml: 'അല് ജിന്ന്', en: 'Al-Jinn' },
  73: { ar: 'المزمل', ml: 'അല് മുസ്സമ്മില്', en: 'Al-Muzzammil' },
  74: { ar: 'المدثر', ml: 'അല് മുദ്ദഥ്ഥിർ', en: 'Al-Muddaththir' },
  75: { ar: 'القيامة', ml: 'അല് ഖിയാമ', en: 'Al-Qiyama' },
  76: { ar: 'الإنسان', ml: 'അല് ഇന്സാന്', en: 'Al-Insan' },
  77: { ar: 'المرسلات', ml: 'അല് മുർസലാത്ത്', en: 'Al-Mursalat' },
  78: { ar: 'النبأ', ml: 'അന്നബഅ്', en: 'An-Naba' },
  79: { ar: 'النازعات', ml: 'അന്നാസിആത്ത്', en: 'An-Nazi’at' },
  80: { ar: 'عبس', ml: 'അബസ', en: 'Abasa' },
  81: { ar: 'التكوير', ml: 'അത്തക്വീർ', en: 'At-Takwir' },
  82: { ar: 'الانفطار', ml: 'അല് ഇന്ഫിത്വാർ', en: 'Al-Infitar' },
  83: { ar: 'المطففين', ml: 'അല് മുത്വഫ്ഫിഫീന്', en: 'Al-Mutaffifin' },
  84: { ar: 'الانشقاق', ml: 'അല് ഇന്ഷിഖാഖ്', en: 'Al-Inshiqaq' },
  85: { ar: 'البروج', ml: 'അല് ബുറൂജ്', en: 'Al-Buruj' },
  86: { ar: 'الطارق', ml: 'അത്ത്വാരിഖ്', en: 'At-Tariq' },
  87: { ar: 'الأعلى', ml: 'അല് അഅ്ലാ', en: 'Al-A’la' },
  88: { ar: 'الغاشية', ml: 'അല് ഗാശിയ', en: 'Al-Ghashiya' },
  89: { ar: 'الفجر', ml: 'അല് ഫജ്റ്', en: 'Al-Fajr' },
  90: { ar: 'البلد', ml: 'അല് ബലദ്', en: 'Al-Balad' },
  91: { ar: 'الشمس', ml: 'അശ്ശമ്സ്', en: 'Ash-Shams' },
  92: { ar: 'الليل', ml: 'അല് ലൈല്', en: 'Al-Layl' },
  93: { ar: 'الضحى', ml: 'അള്ളുഹാ', en: 'Ad-Duha' },
  94: { ar: 'الشرح', ml: 'അശ്ശർഹ്', en: 'Ash-Sharh' },
  95: { ar: 'التين', ml: 'അത്തീന്', en: 'At-Tin' },
  96: { ar: 'العلق', ml: 'അല് അലഖ്', en: 'Al-’Alaq' },
  97: { ar: 'القدر', ml: 'അല് ഖദ്ർ', en: 'Al-Qadr' },
  98: { ar: 'البينة', ml: 'അല് ബയ്യിന', en: 'Al-Bayyina' },
  99: { ar: 'الزلزلة', ml: 'അസ്സല്സല', en: 'Az-Zalzala' },
  100: { ar: 'العاديات', ml: 'അല് ആദിയാത്ത്', en: 'Al-’Adiyat' },
  101: { ar: 'القارعة', ml: 'അല് ഖാരിഅ', en: 'Al-Qari’a' },
  102: { ar: 'التكاثر', ml: 'അത്തകാഥുർ', en: 'At-Takathur' },
  103: { ar: 'العصر', ml: 'അല് അസ്വ്ർ', en: 'Al-’Asr' },
  104: { ar: 'الهمزة', ml: 'അല് ഹുമസ', en: 'Al-Humaza' },
  105: { ar: 'الفيل', ml: 'അല് ഫീല്', en: 'Al-Fil' },
  106: { ar: 'قريش', ml: 'ഖുറൈശ്', en: 'Quraysh' },
  107: { ar: 'الماعون', ml: 'അല് മാഊന്', en: 'Al-Ma’un' },
  108: { ar: 'الكوثر', ml: 'അല് കൗഥർ', en: 'Al-Kawthar' },
  109: { ar: 'الكافرون', ml: 'അല് കാഫിറൂന്', en: 'Al-Kafirun' },
  110: { ar: 'النصر', ml: 'അന്നസ്വ്ർ', en: 'An-Nasr' },
  111: { ar: 'المسد', ml: 'അല് മസദ്', en: 'Al-Masad' },
  112: { ar: 'الإخلاص', ml: 'അല് ഇഖ്ലാസ്വ്', en: 'Al-Ikhlas' },
  113: { ar: 'الفلق', ml: 'അല് ഫലഖ്', en: 'Al-Falaq' },
  114: { ar: 'الناس', ml: 'അന്നാസ്', en: 'An-Nas' },
}

export const SURAH_NAMES = Object.fromEntries(
  Object.entries(SURAH_METADATA).map(([num, meta]) => [num, meta.en]),
)

export function formatAyahCopyText(surahNumber, ayahs) {
  const meta = SURAH_METADATA[surahNumber] || { ar: '', ml: '', en: '' }
  const blocks = ayahs.map((ayah) => {
    const arName = meta.ar || `Surah ${surahNumber}`
    const mlName = meta.ml || meta.en || ''
    const header = mlName
      ? `${surahNumber}. ${arName} - ${mlName} - ${surahNumber}:${ayah.number}`
      : `${surahNumber}. ${arName} - ${surahNumber}:${ayah.number}`
    const arabic = (ayah.arabic || '').trim()
    const translation = (ayah.translationMl || ayah.translation || '').trim()
    return `${header}\n\n${arabic}\n\n${translation}`
  })
  return blocks.join('\n\n\n')
}

export function ayahUrl(reciter, surah, ayah) {
  const s = String(surah).padStart(3, '0')
  const a = String(ayah).padStart(3, '0')
  return `https://verses.quran.com/${reciter}/mp3/${s}${a}.mp3`
}

// Whole-surah audio URL. Per-ayah URLs do not exist for this reciter.
const DUKHAIN_BASE = 'https://server16.mp3quran.net/h_dukhain/Rewayat-Hafs-A-n-Assem'

export function surahAudioUrl(reciter, surah) {
  if (reciter === 'Dukhain') {
    return `${DUKHAIN_BASE}/${String(surah).padStart(3, '0')}.mp3`
  }
  return null
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

const SURAH_TEXT_CACHE = new Map()

// The Uthmani edition glues the Basmala onto ayah 1 of every surah (except
// Al-Fatiha and At-Tawba). Split it off so it renders as its own line.
// Built from verified codepoints — the API writes combining marks in the
// order shadda-then-vowel, which a hand-typed literal gets wrong.
const BASMALA_WORDS = [
  [0x628, 0x650, 0x633, 0x652, 0x645, 0x650],
  [0x671, 0x644, 0x644, 0x651, 0x64e, 0x647, 0x650],
  [
    0x671, 0x644, 0x631, 0x651, 0x64e, 0x62d, 0x652, 0x645, 0x64e, 0x670,
    0x646, 0x650,
  ],
  [0x671, 0x644, 0x631, 0x651, 0x64e, 0x62d, 0x650, 0x64a, 0x645, 0x650],
]
// The first word may carry a shadda on the ب (some editions write بِّسْمِ).
const BASMALA_WORDS_RE = BASMALA_WORDS.map((w, i) =>
  i === 0
    ? `${String.fromCodePoint(0x628)}[\\u0651]?${w.slice(1).map((c) => String.fromCodePoint(c)).join('')}`
    : String.fromCodePoint(...w)
)
const BASMALA_RE = new RegExp(`^${BASMALA_WORDS_RE.join('\\s+')}\\s+`)

// Arabic (Uthmani script) + English (Sahih International) + Malayalam
// (Cheriyamundam Abdul Hameed & Kunhi Mohammed Parappoor) text for a whole
// surah, cached in memory for the session.
export async function fetchSurahTexts(surahNumber) {
  const hit = SURAH_TEXT_CACHE.get(surahNumber)
  if (hit) return hit
  const res = await fetch(
    `https://api.alquran.cloud/v1/surah/${surahNumber}/editions/quran-uthmani,en.sahih,ml.abdulhameed`
  )
  if (!res.ok) throw new Error(`Could not fetch surah ${surahNumber} text`)
  const editions = (await res.json()).data
  const [arabic, english, malayalam] = editions
  const data = {
    arabicName: arabic.name,
    englishName: arabic.englishName,
    ayahs: arabic.ayahs.map((a, i) => {
      let text = a.text
      let basmala = false
      if (i === 0 && surahNumber !== 1) {
        const m = text.match(BASMALA_RE)
        if (m && text.length > m[0].length) {
          basmala = true
          text = text.slice(m[0].length)
        }
      }
      return {
        number: a.numberInSurah,
        arabic: text,
        basmala,
        translation: english.ayahs[i]?.text ?? '',
        translationMl: malayalam?.ayahs[i]?.text ?? '',
      }
    }),
  }
  SURAH_TEXT_CACHE.set(surahNumber, data)
  return data
}
