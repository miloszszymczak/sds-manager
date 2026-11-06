'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/server/db';
import { requireUser } from '@/server/auth/guard';
import { hashPassword, MIN_PASSWORD_LENGTH } from '@/server/auth/password';
import { result, UserError } from '@/server/errors';

const role = z.enum(['ADMIN', 'EDITOR', 'VIEWER']);
const password = z.string().min(MIN_PASSWORD_LENGTH, `Hasło musi mieć co najmniej ${MIN_PASSWORD_LENGTH} znaków.`);

const newUser = z.object({
  email: z.string().trim().toLowerCase().email('Nieprawidłowy adres e-mail.'),
  name: z.string().trim().min(1, 'Podaj imię i nazwisko.'),
  role,
  password,
});

export async function createUser(input: z.input<typeof newUser>) {
  return result(async () => {
    await requireUser('ADMIN');
    const data = newUser.parse(input);
    if (await prisma.user.findUnique({ where: { email: data.email } })) throw new UserError('Użytkownik o tym adresie już istnieje.');
    await prisma.user.create({
      data: { email: data.email, name: data.name, role: data.role, passwordHash: await hashPassword(data.password) },
    });
    revalidatePath('/uzytkownicy');
  });
}

const patch = z.object({ name: z.string().trim().min(1).optional(), role: role.optional(), active: z.boolean().optional() });

export async function updateUser(id: string, input: z.input<typeof patch>) {
  return result(async () => {
    const me = await requireUser('ADMIN');
    const data = patch.parse(input);
    if (id === me.id && (data.role && data.role !== 'ADMIN' || data.active === false)) {
      throw new UserError('Nie możesz odebrać uprawnień administratora ani zablokować własnego konta.');
    }
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data });
      if (data.active === false) await tx.session.deleteMany({ where: { userId: id } });
      if ((await tx.user.count({ where: { role: 'ADMIN', active: true } })) === 0) {
        throw new UserError('Musi pozostać co najmniej jeden aktywny administrator.');
      }
    });
    revalidatePath('/uzytkownicy');
  });
}

export async function resetUserPassword(id: string, newPassword: string) {
  return result(async () => {
    await requireUser('ADMIN');
    await prisma.$transaction([
      prisma.user.update({ where: { id }, data: { passwordHash: await hashPassword(password.parse(newPassword)) } }),
      prisma.session.deleteMany({ where: { userId: id } }),
    ]);
  });
}

export async function deleteUser(id: string) {
  return result(async () => {
    const me = await requireUser('ADMIN');
    if (id === me.id) throw new UserError('Nie możesz usunąć własnego konta.');
    await prisma.user.delete({ where: { id } });
    revalidatePath('/uzytkownicy');
  });
}
