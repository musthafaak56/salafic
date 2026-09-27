import test from 'node:test'
import assert from 'node:assert/strict'
import { accountDestination } from '../src/lib/accountAccess.js'

test('new accounts and invited staff land on registration and invitations', () => {
  assert.equal(accountDestination({ role: 'user' }), '/onboarding')
  assert.equal(accountDestination({ role: 'admin', centers: [{ slug: 'one' }], invitations: [{ id: 'pending' }] }), '/onboarding')
})
test('approved admins go to their dashboard, multiple centers to the directory', () => {
  assert.equal(accountDestination({ role: 'admin', centers: [{ slug: 'one' }] }), '/c/one/admin')
  assert.equal(accountDestination({ role: 'admin', centers: [{ slug: 'one' }, { slug: 'two' }] }), '/centers')
  assert.equal(accountDestination({ role: 'superadmin' }), '/platform')
})
