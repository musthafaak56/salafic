# Word-by-word data (used for recited-word highlighting)

- `timings-*.json` — Word-accurate ayah timing segments from the Quran
  Alignment project (https://github.com/cpfair/quran-align), CC-BY-4.0.
  Format: `[{surah, ayah, segments: [[word0, word1, start_ms, end_ms], ...]}]`,
  one file per reciter (Alafasy, Sudais, Shatri, Shuraym).
- `timings-Dukhain.json` — Automatically generated word timings for the
  Haitham Al-Dukhain recitation. Whole-surah MP3s were transcribed with
  faster-whisper (word timestamps) and aligned word-by-word to the Uthmani
  text (Needleman–Wunsch, diacritic-normalized). One entry per ayah; if the
  ayah offset inside a surah audio file is known, `ayahStartMs`/`ayahEndMs`
  give the absolute window so the surah-mode player and video renderer can
  seek and slice the whole-surah file.
- `ml-words.json` — Malayalam word-by-word glosses (Amani Thafseer),
  sourced via the quranwbw word-by-word dataset
  (https://quranwbw.com, translations/12.json).
  Format: `{surah: {ayah: [[gloss1, gloss2, ...]]}}`.
