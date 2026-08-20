import { Mp3Encoder } from '@breezystack/lamejs'

// Downmix + re-encode to a 64 kbps mono MP3 in a worker so the encode never
// blocks the UI (whole-surah ranges can take minutes of encoding time).
let enc = null
const parts = []

self.onmessage = (e) => {
  try {
    const msg = e.data
    if (msg.type === 'start') {
      enc = new Mp3Encoder(1, msg.sampleRate, 64)
      parts.length = 0
    } else if (msg.type === 'pcm') {
      // lamejs expects Int16 PCM; the decoder gives us Float32 in [-1, 1].
      // Without this conversion the pulses are near zero and the MP3 comes
      // out silent (with perfectly normal file size and duration).
      const f = msg.pcm
      const s = new Int16Array(f.length)
      for (let i = 0; i < f.length; i++) {
        const v = f[i]
        s[i] = v < -1 ? -32768 : v > 1 ? 32767 : Math.round(v * 32767)
      }
      const out = enc.encodeBuffer(s)
      if (out.length) parts.push(out)
    } else if (msg.type === 'finish') {
      const tail = enc.flush()
      if (tail.length) parts.push(tail)
      let total = 0
      for (const p of parts) total += p.length
      const merged = new Uint8Array(total)
      let off = 0
      for (const p of parts) {
        merged.set(p, off)
        off += p.length
      }
      const buf = merged.buffer
      parts.length = 0
      self.postMessage({ type: 'done', mp3: buf }, [buf])
    }
  } catch (err) {
    self.postMessage({ type: 'error', message: String((err && err.message) || err) })
  }
}