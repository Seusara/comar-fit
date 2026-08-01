import { describe, it, expect } from 'vitest';
import { registerUser, loginUser, logoutUser } from './auth';

function randomEmail() {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

describe('auth', () => {
  it('registers a new user with email and password', async () => {
    const email = randomEmail();
    const credential = await registerUser(email, 'secret123');
    expect(credential.user.email).toBe(email);
  });

  it('logs in a user that was already registered', async () => {
    const email = randomEmail();
    await registerUser(email, 'secret123');
    await logoutUser();

    const credential = await loginUser(email, 'secret123');
    expect(credential.user.email).toBe(email);
  });

  it('rejects login with the wrong password', async () => {
    const email = randomEmail();
    await registerUser(email, 'secret123');
    await logoutUser();

    await expect(loginUser(email, 'wrong-password')).rejects.toThrow();
  });
});
