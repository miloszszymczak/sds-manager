import { notFound } from 'next/navigation';
import { prisma } from '@/server/db';
import { requirePageUser } from '@/server/auth/guard';
import { readLock } from '@/server/locks';
import { mixtureLock } from '@/lib/locks';
import { hasRole } from '@/lib/roles';
import type { Unit } from '@/lib/mixture';
import { Shell, Crumbs } from '@/components/Shell';
import { MixtureEditor } from '@/components/mixtures/MixtureEditor';

export const dynamic = 'force-dynamic';

export default async function MixturePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser();
  const { id } = await params;
  const [m, substances, lock] = await Promise.all([
    prisma.mixture.findUnique({
      where: { id },
      include: {
        packets: { orderBy: { position: 'asc' } },
        components: { orderBy: { position: 'asc' }, include: { substance: { select: { name: true, density: true } } } },
        variants: {
          orderBy: { volumeMl: 'desc' },
          include: {
            documents: { select: { id: true, packetId: true, productName: true, status: true } },
            productItems: { select: { product: { select: { id: true, name: true } } } },
          },
        },
        dilutions: { orderBy: { position: 'asc' } },
      },
    }),
    prisma.substance.findMany({ orderBy: { name: 'asc' }, select: { cas: true, name: true } }),
    readLock(mixtureLock(id), user),
  ]);
  if (!m) notFound();

  return (
    <Shell active="mieszaniny">
      <div className="mx-auto max-w-[1200px] px-5 pt-6">
        <Crumbs items={[{ href: '/mieszaniny', label: 'Mieszaniny' }, { label: m.name }]} />
      </div>
      <MixtureEditor
        substances={substances}
        lock={lock}
        canEdit={hasRole(user.role, 'EDITOR')}
        isAdmin={user.role === 'ADMIN'}
        mixture={{
          id: m.id,
          name: m.name,
          code: m.code,
          description: m.description,
          form: m.form,
          basisVolumeMl: m.basisVolumeMl,
          notes: m.notes,
          packets: m.packets.map(({ id, label, name }) => ({ id, label, name })),
          components: m.components.map((c) => ({
            id: c.id,
            packetId: c.packetId,
            cas: c.substanceCas,
            name: c.substance.name,
            quantity: c.quantity,
            unit: c.unit as Unit,
            density: c.substance.density,
            note: c.note,
          })),
          variants: m.variants.map((v) => ({
            id: v.id,
            volumeMl: v.volumeMl,
            sku: v.sku,
            documents: v.documents,
            products: v.productItems.map((i) => i.product),
          })),
          dilutions: m.dilutions.map(({ id, name, waterMl, documentId }) => ({ id, name, waterMl, documentId })),
        }}
      />
    </Shell>
  );
}
