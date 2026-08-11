import { DateTime } from 'luxon';
import { describe, expect, it, vi } from 'vitest';
import { sendWorkoutReminders } from '../src/sendWorkoutReminders.js';

function setupDb({ time = '19:00', device = { token: 'valid-device-token-long-enough', enabled: true } } = {}) {
  const deviceRef = { set: vi.fn(), delete: vi.fn() };
  const devicesGet = vi.fn().mockResolvedValue({ docs: [{ data: () => device, ref: deviceRef }] });
  const userRef = { collection: vi.fn(() => ({ where: vi.fn(() => ({ get: devicesGet })) })) };
  const usersGet = vi.fn().mockResolvedValue({ docs: [{ data: () => ({ usualWorkoutTime: time }), ref: userRef }] });
  const db = { collection: vi.fn(() => ({ where: vi.fn(() => ({ get: usersGet })) })) };
  return { db, deviceRef, devicesGet };
}

describe('sendWorkoutReminders', () => {
  it('sends once to a registered device during its five-minute window', async () => {
    const { db, deviceRef } = setupDb();
    const messaging = { send: vi.fn().mockResolvedValue('message-id') };
    const sent = await sendWorkoutReminders({
      db,
      messaging,
      now: DateTime.fromISO('2026-08-11T19:03:00', { zone: 'America/Mexico_City' }),
    });
    expect(sent).toBe(1);
    expect(messaging.send).toHaveBeenCalledWith(expect.objectContaining({ token: 'valid-device-token-long-enough' }));
    expect(deviceRef.set).toHaveBeenCalledWith(expect.objectContaining({ lastReminderDate: '2026-08-11' }), { merge: true });
  });

  it('does not load devices outside the reminder window', async () => {
    const { db, devicesGet } = setupDb();
    const messaging = { send: vi.fn() };
    expect(await sendWorkoutReminders({
      db,
      messaging,
      now: DateTime.fromISO('2026-08-11T18:30:00', { zone: 'America/Mexico_City' }),
    })).toBe(0);
    expect(devicesGet).not.toHaveBeenCalled();
    expect(messaging.send).not.toHaveBeenCalled();
  });
});
