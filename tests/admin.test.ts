import assert from 'node:assert/strict';
import test from 'node:test';

import { isAuthorizedAdmin } from '../lib/admin.ts';

const user = { userId: 'user_123', email: 'ilan@example.com' };

test('autoriza somente identificadores ou e-mails configurados', () => {
  assert.equal(isAuthorizedAdmin(user, { userIds: 'user_123', emails: '' }), true);
  assert.equal(isAuthorizedAdmin(user, { userIds: '', emails: 'ILAN@example.com' }), true);
  assert.equal(isAuthorizedAdmin(user, { userIds: 'outro', emails: 'outro@example.com' }), false);
});

test('permite a conta de demonstração somente no desenvolvimento local', () => {
  const localUser = { userId: 'local', email: 'seedy@sites.test' };
  assert.equal(isAuthorizedAdmin(localUser, { userIds: '', emails: '', development: true }), true);
  assert.equal(isAuthorizedAdmin(localUser, { userIds: '', emails: '', development: false }), false);
});
