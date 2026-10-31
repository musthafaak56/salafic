import test from 'node:test'
import assert from 'node:assert/strict'
import { managementNavigation } from '../src/lib/managementNavigation.js'

const center = { id: 'a', slug: 'my-center', displayName: 'My center', role: 'admin' }
test('superadmin has every center-owner control without a membership', () => {
  for (const slug of ['my-center', 'another-center']) {
    const path = `/c/${slug}/admin`
    const superLinks = managementNavigation({ role: 'superadmin', centers: [] }, path).links.map(link => link.to)
    const ownerLinks = managementNavigation({ centers: [{ ...center, slug, role: 'owner' }] }, path).links
    for (const link of ownerLinks.filter(link => link.to.startsWith(path))) assert.ok(superLinks.includes(link.to), link.to)
  }
})
test('visitors and applicants have no management sidebar', () => {
  assert.equal(managementNavigation(null, '/'), null)
  assert.equal(managementNavigation({ role: 'user', centers: [] }, '/onboarding'), null)
})
test('super-admin navigation stays available on public and account routes', () => {
  for (const path of ['/', '/quran', '/login', '/centers', '/onboarding'])
    assert.ok(managementNavigation({ role: 'superadmin' }, path).links.some(link => link.to === '/platform'))
})
test('center staff keep scoped navigation while browsing the website', () => {
  for (const path of ['/', '/quran', '/c/my-center', '/c/my-center/admin/events']) {
    const nav = managementNavigation({ centers: [center] }, path)
    assert.ok(nav.links.some(link => link.to === '/c/my-center/admin/prayer-times'))
    assert.ok(!nav.links.some(link => link.to.endsWith('/team')))
  }
  const other = managementNavigation({ centers: [center] }, '/c/another-center')
  assert.ok(!other.links.some(link => link.to.includes('/another-center/admin')))
})
test('owner and finance navigation preserve capability boundaries', () => {
  const owner = managementNavigation({ centers: [{ ...center, role: 'owner' }] }, '/')
  assert.ok(owner.links.some(link => link.to.endsWith('/team')))
  const finance = managementNavigation({ centers: [{ ...center, role: 'finance' }] }, '/')
  assert.ok(finance.links.some(link => link.to.endsWith('/finances')))
  assert.ok(!finance.links.some(link => link.to.endsWith('/prayer-times')))
})
test('management menus do not repeat public pages', () => {
  for (const profile of [{ role: 'superadmin' }, { centers: [center] }]) {
    const nav = managementNavigation(profile, '/')
    assert.ok(!nav.links.some(link => ['/', '/quran', '/centers'].includes(link.to)))
  }
})
test('Education is available only to superadmin, owner and admin', () => {
  for (const role of ['owner', 'admin', 'editor', 'finance']) {
    const nav = managementNavigation({ centers: [{ ...center, role }] }, '/')
    assert.equal(nav.links.some(link => link.to.endsWith('/education')), ['owner', 'admin'].includes(role))
  }
  assert.ok(managementNavigation({ role: 'superadmin' }, '/c/my-center/admin').links.some(link => link.to.endsWith('/education')))
})
