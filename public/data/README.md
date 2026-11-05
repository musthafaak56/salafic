# Word-by-word data (used for recited-word highlighting)

- `rayan-al-mulk.mp3` — Rayan Al Mohaisiny, Surah 67, Hafs an Asim,
  [recording from Way2Quran](https://media.way2quran.com/rayyan-al-muhaisani/hafs-an-asim/67.mp3).
  See the [provider's reuse guidance](https://way2quran.com/en/faq).
  `timings-Rayan.json` is specific to this audio: the 30 ayahs were aligned
  against the Uthmani text using stable-ts and faster-whisper-small. Times
  are model estimates; don't reuse them for another recording.
- The per-surah files under `rayan/` cover the rest of Juz 25–30, starting
  at Fussilat 41:47. Each file is loaded only for its surah. Audio
  streams directly from Way2Quran's Rayyan Al-Muhaisani Hafs collection.
  To regenerate missing files with the local speech model and FFmpeg:
  `uv run --python 3.12 --with stable-ts --with faster-whisper python scripts/align-rayan.py`.

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
