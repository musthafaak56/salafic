export function accountDestination(profile) {
  if (profile?.role === 'superadmin') return '/platform'
  if (profile?.invitations?.length) return '/onboarding'
  if (profile?.centers?.length === 1) return `/c/${profile.centers[0].slug}/admin`
  if (profile?.centers?.length) return '/centers'
  return '/onboarding'
}
