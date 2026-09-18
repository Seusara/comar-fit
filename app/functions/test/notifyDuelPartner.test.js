import { describe, expect, it, vi } from 'vitest';
import { notifyDuelPartner } from '../src/notifyDuelPartner.js';

const duel = {
  userA_uid: 'uidA',
  userB_uid: 'uidB',
  scoringSnapshot: { users: { uidA: { displayName: 'Aaron' }, uidB: { displayName: 'Alexa' } } },
};

function setupDb({ notificationsEnabled = true, devices = [{ token: 'device-token', enabled: true }] } = {}) {
  const deviceRefs = devices.map(() => ({ delete: vi.fn() }));
  const devicesGet = vi.fn().mockResolvedValue({
    docs: devices.map((data, i) => ({ data: () => data, ref: deviceRefs[i] })),
  });
  const partnerRef = {
    get: vi.fn().mockResolvedValue({ exists: true, data: () => ({ notificationsEnabled }) }),
    collection: vi.fn(() => ({ where: vi.fn(() => ({ get: devicesGet })) })),
  };
  const db = { doc: vi.fn(() => partnerRef) };
  return { db, partnerRef, deviceRefs, devicesGet };
}

describe('notifyDuelPartner', () => {
  it('sends a push to the other participant with the actor name', async () => {
    const { db } = setupDb();
    const messaging = { send: vi.fn().mockResolvedValue('message-id') };
    const sent = await notifyDuelPartner({ db, duel, actingUserId: 'uidA', messaging });
    expect(sent).toBe(1);
    expect(db.doc).toHaveBeenCalledWith('users/uidB');
    expect(messaging.send).toHaveBeenCalledWith(expect.objectContaining({
      token: 'device-token',
      notification: expect.objectContaining({ title: expect.stringContaining('Aaron') }),
      data: { url: '/duelo' },
    }));
  });

  it('does nothing when the partner disabled notifications', async () => {
    const { db } = setupDb({ notificationsEnabled: false });
    const messaging = { send: vi.fn() };
    expect(await notifyDuelPartner({ db, duel, actingUserId: 'uidA', messaging })).toBe(0);
    expect(messaging.send).not.toHaveBeenCalled();
  });

  it('deletes devices with an invalid token instead of throwing', async () => {
    const { db, deviceRefs } = setupDb();
    const messaging = { send: vi.fn().mockRejectedValue({ code: 'messaging/registration-token-not-registered' }) };
    expect(await notifyDuelPartner({ db, duel, actingUserId: 'uidA', messaging })).toBe(0);
    expect(deviceRefs[0].delete).toHaveBeenCalled();
  });
});
