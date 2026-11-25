import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import { createAuthService } from '../src/services/authService.js';
import { getDatabaseStatus } from '../src/config/database.js';

const mongoUri = process.env.MONGODB_TEST_URI;

describe('isolated MongoDB integration', { skip: !mongoUri }, () => {
  before(async () => {
    const hostname = new URL(mongoUri).hostname.replace(/^\[|\]$/g, '');
    if (!['localhost', '127.0.0.1', '::1'].includes(hostname)) {
      throw new Error('MONGODB_TEST_URI must point to a local isolated MongoDB instance.');
    }
    await mongoose.connect(mongoUri, {
      dbName: 'jobfit_ai_integration_test',
      autoIndex: false,
      autoCreate: false,
    });
  });

  after(async () => {
    await mongoose.disconnect();
  });

  it('persists and authenticates a user through the real Mongoose model', async () => {
    const email = `integration-${randomBytes(8).toString('hex')}@example.test`;
    const service = createAuthService({ createToken: () => 'integration-token' });

    try {
      const created = await service.register({
        fullName: 'Integration User',
        email,
        password: 'a-long-integration-password',
      });
      const authenticated = await service.login({ email, password: 'a-long-integration-password' });

      assert.equal(getDatabaseStatus(), 'connected');
      assert.equal(created.email, email);
      assert.equal(created.toJSON().passwordHash, undefined);
      assert.equal(authenticated.user.email, email);
      assert.equal(authenticated.token, 'integration-token');
    } finally {
      await User.deleteOne({ email });
    }
  });
});
