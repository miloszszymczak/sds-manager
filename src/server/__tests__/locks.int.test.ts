/**
 * Testy integracyjne na prawdziwym PostgreSQL (blokady, atomowy zapis sekcji).
 * Uruchamiane, gdy ustawiono TEST_DATABASE_URL (baza z zastosowanymi migracjami):
 *   TEST_DATABASE_URL=postgresql://… npm test
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

suite('blokady edycji i zapis sekcji (PostgreSQL)', () => {
  let db: typeof import('@/server/db');
  let locks: typeof import('@/server/locks');
  let sections: typeof import('@/server/sections');
  const users: { id: string; email: string; name: string; role: 'EDITOR' }[] = [];
  let documentId = '';
  const tag = `it-${Date.now()}`;

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    db = await import('@/server/db');
    locks = await import('@/server/locks');
    sections = await import('@/server/sections');
    for (const n of ['a', 'b']) {
      const u = await db.prisma.user.create({ data: { email: `${tag}-${n}@test`, name: `Test ${n}`, passwordHash: 'x' } });
      users.push({ id: u.id, email: u.email, name: u.name, role: 'EDITOR' });
    }
    documentId = (await db.prisma.document.create({ data: { productName: tag } })).id;
  });

  afterAll(async () => {
    if (!db) return;
    await db.prisma.document.deleteMany({ where: { productName: tag } });
    await db.prisma.user.deleteMany({ where: { email: { startsWith: tag } } });
    await db.prisma.$disconnect();
  });

  it('równoczesne próby przejęcia: dokładnie jeden właściciel', async () => {
    const resource = `document:${tag}-race` as const;
    const results = await Promise.all(Array.from({ length: 30 }, (_, i) => locks.acquireLock(resource, users[i % 2])));
    const owners = new Set(results.map((r, i) => (r.mine ? users[i % 2].id : null)).filter(Boolean));
    expect(owners.size).toBe(1);
    const row = await db.prisma.editLock.findUniqueOrThrow({ where: { resource } });
    expect(owners.has(row.userId)).toBe(true);
  });

  it('cudza blokada blokuje zapis; po wygaśnięciu można ją przejąć', async () => {
    const resource = `document:${tag}-exp` as const;
    const [a, b] = users;
    expect((await locks.acquireLock(resource, a)).mine).toBe(true);
    expect((await locks.acquireLock(resource, b)).holder?.name).toBe(a.name);
    await expect(locks.assertLock(resource, b)).rejects.toBeInstanceOf(locks.LockedError);
    await expect(locks.assertLock(resource, a)).resolves.toBeUndefined();

    await db.prisma.editLock.update({ where: { resource }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await expect(locks.assertLock(resource, a)).rejects.toBeInstanceOf(locks.LockedError); // wygasła — nie odnawiamy
    expect((await locks.acquireLock(resource, b)).mine).toBe(true);
  });

  it('wymuszone przejęcie i zwolnienie tylko własnej blokady', async () => {
    const resource = `document:${tag}-force` as const;
    const [a, b] = users;
    await locks.acquireLock(resource, a);
    expect((await locks.acquireLock(resource, b, true)).mine).toBe(true);
    await locks.releaseLock(resource, a.id); // a nie jest już właścicielem — nic się nie dzieje
    expect((await locks.readLock(resource, a)).holder?.id).toBe(b.id);
    await locks.releaseLock(resource, b.id);
    expect((await locks.readLock(resource, a)).holder).toBeNull();
  });

  it('withLock odmawia, gdy edytuje ktoś inny, i zwalnia blokadę tymczasową', async () => {
    const resource = `document:${tag}-with` as const;
    const [a, b] = users;
    await locks.acquireLock(resource, a);
    await expect(locks.withLock(resource, b, async () => 1)).rejects.toBeInstanceOf(locks.LockedError);
    await locks.releaseLock(resource, a.id);
    expect(await locks.withLock(resource, b, async () => 42)).toBe(42);
    expect(await db.prisma.editLock.findUnique({ where: { resource } })).toBeNull();
  });

  it('równoległe zapisy różnych pól tej samej sekcji nie gubią się', async () => {
    await Promise.all(Array.from({ length: 25 }, (_, i) => sections.mergeSectionData(documentId, 9, { [`pole${i}`]: i })));
    const s = await db.prisma.section.findUniqueOrThrow({ where: { documentId_number: { documentId, number: 9 } } });
    expect(Object.keys(db.asObject(s.data))).toHaveLength(25);
  });
});
