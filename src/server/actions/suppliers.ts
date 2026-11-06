'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/server/db';
import { requireUser } from '@/server/auth/guard';

export async function createSupplier(form: FormData) {
  await requireUser('EDITOR');
  const get = (k: string) => String(form.get(k) ?? '').trim() || null;
  await prisma.supplier.create({
    data: {
      name: get('name') ?? 'Nowy dostawca',
      street: get('street'),
      postalCode: get('postalCode'),
      city: get('city'),
      phone: get('phone'),
      email: get('email'),
      website: get('website'),
      bdo: get('bdo'),
    },
  });
  revalidatePath('/');
}
