'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/server/db';
import { requireUser } from '@/server/auth/guard';
import { result, UserError } from '@/server/errors';

const path = (id: string) => `/produkty/${id}`;

export async function createProduct(form: FormData) {
  await requireUser('EDITOR');
  const product = await prisma.product.create({
    data: { name: String(form.get('name') ?? '').trim() || 'Nowy produkt' },
  });
  redirect(path(product.id));
}

const productSchema = z
  .object({
    name: z.string().trim().min(1, 'Podaj nazwę produktu.'),
    sku: z.string().trim().transform((v) => v || null).nullable(),
    description: z.string().nullable(),
  })
  .partial();

export async function updateProduct(id: string, values: z.input<typeof productSchema>) {
  return result(async () => {
    await requireUser('EDITOR');
    const data = productSchema.parse(values);
    if (data.sku && (await prisma.product.findFirst({ where: { sku: data.sku, id: { not: id } } }))) {
      throw new UserError(`SKU ${data.sku} jest już używane.`);
    }
    await prisma.product.update({ where: { id }, data });
    revalidatePath(path(id));
  });
}

export async function deleteProduct(id: string) {
  await requireUser('EDITOR');
  await prisma.product.delete({ where: { id } });
  redirect('/produkty');
}

export async function addProductItem(productId: string, variantId: string, quantity = 1) {
  return result(async () => {
    await requireUser('EDITOR');
    const qty = z.number().int().min(1, 'Ilość musi być ≥ 1.').parse(quantity);
    const position = await prisma.productItem.count({ where: { productId } });
    await prisma.productItem.upsert({
      where: { productId_variantId: { productId, variantId } },
      update: { quantity: { increment: qty } },
      create: { productId, variantId, quantity: qty, position },
    });
    revalidatePath(path(productId));
  });
}

export async function updateProductItem(id: string, quantity: number) {
  return result(async () => {
    await requireUser('EDITOR');
    const item = await prisma.productItem.update({
      where: { id },
      data: { quantity: z.number().int().min(1, 'Ilość musi być ≥ 1.').parse(quantity) },
    });
    revalidatePath(path(item.productId));
  });
}

export async function removeProductItem(id: string) {
  return result(async () => {
    await requireUser('EDITOR');
    const item = await prisma.productItem.delete({ where: { id } });
    revalidatePath(path(item.productId));
  });
}
