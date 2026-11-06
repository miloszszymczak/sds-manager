import 'server-only';
import { prisma } from '@/server/db';
import { packetMass, variantFactor, type Unit } from '@/lib/mixture';
import type { ProductData } from '@/components/products/ProductEditor';

/** Produkt z pozycjami, masami netto opakowań i stanem kart SDS. */
export async function loadProduct(id: string): Promise<ProductData | null> {
  const p = await prisma.product.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { position: 'asc' },
        include: {
          variant: {
            include: {
              documents: { select: { id: true, packetId: true, status: true } },
              mixture: {
                include: {
                  packets: { orderBy: { position: 'asc' } },
                  components: { include: { substance: { select: { density: true } } } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    description: p.description,
    items: p.items.map((i) => {
      const { variant } = i;
      const { mixture } = variant;
      const inputs = mixture.components.map((c) => ({
        key: c.id,
        packetId: c.packetId,
        quantity: c.quantity,
        unit: c.unit as Unit,
        density: c.substance.density,
      }));
      const factor = variantFactor(variant.volumeMl, mixture.basisVolumeMl);
      return {
        id: i.id,
        variantId: variant.id,
        quantity: i.quantity,
        volumeMl: variant.volumeMl,
        mixture: { id: mixture.id, name: mixture.name },
        packets: mixture.packets.map((pk) => {
          const doc = variant.documents.find((d) => d.packetId === pk.id);
          return {
            label: pk.label,
            name: pk.name,
            netMass: packetMass(inputs, pk.id, factor),
            document: doc ? { id: doc.id, status: doc.status } : null,
          };
        }),
      };
    }),
  };
}
