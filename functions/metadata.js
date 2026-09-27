export const escapeHtml = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  )
export function centerHtml(template, center, origin) {
  const name = escapeHtml(center.displayName),
    description = escapeHtml(
      center.description ||
        `${center.displayName} — prayer times, community events and published financial reports in ${center.city}.`,
    )
  const canonical = escapeHtml(`${origin}/c/${encodeURIComponent(center.slug)}`)
  const image = center.coverUrl || center.logoUrl
  const metadata = `<link rel="canonical" href="${canonical}"/><meta name="description" content="${description}"/><meta property="og:title" content="${name}"/><meta property="og:description" content="${description}"/><meta property="og:url" content="${canonical}"/><meta property="og:type" content="website"/>${image ? `<meta property="og:image" content="${escapeHtml(image)}"/>` : ''}`
  return template
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${name} — Salafic</title>`)
    .replace(/<meta\s+name="description"[^>]*>/gi, '')
    .replace('</head>', `${metadata}</head>`)
    .replace(
      '<div id="root"></div>',
      `<div id="root"><main><h1>${name}</h1><p>${description}</p><p>${escapeHtml(center.address)} · ${escapeHtml(center.city)}</p><p>Prayer times and published community finances are available without signing in.</p></main></div>`,
    )
}
