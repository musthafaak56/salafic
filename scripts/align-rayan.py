"""Generate Juz 25–30 timing files. Run with uv and stable-ts/faster-whisper."""
import json
import re
import subprocess
import tempfile
from pathlib import Path
import stable_whisper

out = Path(__file__).resolve().parents[1] / "public/data/rayan"
out.mkdir(exist_ok=True)
model = stable_whisper.load_faster_whisper("small", device="cpu", compute_type="int8")


def fetch(url, path):
    subprocess.run(["curl", "--fail", "--silent", "--show-error", "--location",
                    "--retry", "3", "--max-time", "180", url, "-o", str(path)], check=True)


def generate(n, folder):
    audio = folder / "audio.mp3"
    source = folder / "text.json"
    fetch(f"https://media.way2quran.com/rayyan-al-muhaisani/hafs-an-asim/{n}.mp3", audio)
    fetch(f"https://api.alquran.cloud/v1/surah/{n}/quran-uthmani", source)
    ayahs = json.loads(source.read_text())["data"]["ayahs"]
    lines = [re.sub(r"[\u06d6-\u06de\u06e9]", "", a["text"]).split() for a in ayahs]
    normalize = lambda w: re.sub(r"[\u064b-\u065f\u0670]", "", w).replace("ٱ", "ا")
    if [normalize(w) for w in lines[0][:4]] == ["بسم", "الله", "الرحمن", "الرحيم"]:
        lines[0] = lines[0][4:]
    text = "\n".join(" ".join(map(normalize, words)) for words in lines)
    result = model.align(str(audio), text, language="ar", original_split=True, verbose=None)
    assert result and len(result.segments) == len(lines), "ayah count mismatch"
    rows = []
    end = 0
    for i, (s, words) in enumerate(zip(result.segments, lines), 1):
        assert len(s.words) == len(words), f"word count mismatch at {i}"
        start = max(end, round(s.start * 1000) - 300)
        end = round(s.end * 1000)
        assert end > start and s.end > s.start, f"empty ayah {i}"
        segs = [[j, j+1, max(0, round(w.start*1000)-start), round(w.end*1000)-start]
                for j, w in enumerate(s.words)]
        assert all(b >= a for _, _, a, b in segs), f"invalid word window at {i}"
        rows.append(dict(surah=n, ayah=i, ayahStartMs=start, ayahEndMs=end, segments=segs))
    if n == 41:
        rows = rows[46:]  # Juz 25 begins at Fussilat 47.
    path = out / f"{n}.json"
    path.with_suffix(".tmp").write_text(json.dumps(rows, separators=(",", ":")))
    path.with_suffix(".tmp").replace(path)


with tempfile.TemporaryDirectory() as temp:
    for n in (n for n in range(114, 40, -1) if n != 67):
        if not (out / f"{n}.json").exists():
            try:
                generate(n, Path(temp))
                print(f"Ready: {n}", flush=True)
            except Exception as error:
                print(f"Failed {n}: {error}", flush=True)
missing = [n for n in range(41, 115) if n != 67 and not (out / f"{n}.json").exists()]
if missing:
    raise SystemExit(f"Missing timings: {missing}")
