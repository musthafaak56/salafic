export function managementNavigation(profile, pathname) {
  const platform = profile?.role === 'superadmin'
  const centers = profile?.centers || []
  if (!platform && !centers.length) return null
  const slug = pathname.match(/^\/c\/([^/]+)/)?.[1]
  const center = centers.find((item) => item.slug === slug) || centers[0]
  const selectedSlug = platform ? slug : center?.slug
  const role = platform ? 'owner' : center?.role
  const links = platform ? [
    { to: '/platform', label: 'Registration requests', icon: 'requests', end: true, group: selectedSlug ? 'Platform' : undefined },
    { to: '/platform/centers', label: 'Centers & masjids', icon: 'centers', group: selectedSlug ? 'Platform' : undefined },
  ] : []
  if (selectedSlug) {
    const base = `/c/${selectedSlug}/admin`
    links.push({ to: base, label: 'Overview', icon: 'overview', end: true, group: platform ? 'Center workspace' : undefined })
    if (['owner', 'admin', 'editor'].includes(role)) {
      for (const [path, label] of [['prayer-times', 'Prayer times'], ['announcements', 'Announcements'], ['events', 'Events'], ['forms', 'Forms']])
        links.push({ to: `${base}/${path}`, label, icon: path })
    }
    if (['owner', 'admin'].includes(role)) links.push({ to: `${base}/education`, label: 'Education', icon: 'education' })
    if (['owner', 'admin', 'finance'].includes(role))
      links.push({ to: `${base}/finances`, label: 'Finances', icon: 'finances' })
    if (role === 'owner') {
      for (const [path, label] of [['settings', 'Settings'], ['committee', 'Committee'], ['team', 'Team']])
        links.push({ to: `${base}/${path}`, label, icon: path })
    }
  }
  if (!platform) links.push({ to: '/onboarding', label: 'My requests', icon: 'requests', group: 'Account' })
  return { links, center, title: platform ? 'Platform administration' : center?.displayName || 'Center management' }
}
