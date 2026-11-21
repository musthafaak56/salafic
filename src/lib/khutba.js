function words(text) {
  return text.normalize('NFKC').replace(/[\p{M}ـ]/gu, '').replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي').match(/[\u0621-\u063a\u0641-\u064a]+/g) ?? []
}

// Match only a recent phrase. Old speech must not keep moving the reader
// after the imam goes off script. Reject ties (common repeated phrases).
export function findPassage(transcript, passages) {
  const recent = words(transcript).slice(-8)
  let best = 2, index = -1
  for (const [i, passage] of passages.entries()) {
    const line = words(passage.ar)
    for (let end = 1; end <= line.length; end++) {
      let count = 0
      while (count < recent.length && count < end &&
        recent[recent.length - count - 1] === line[end - count - 1]) count++
      if (count > best) { best = count; index = i }
      else if (count === best && index !== i) index = -1
    }
  }
  return index
}
