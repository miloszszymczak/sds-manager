import 'server-only';
import { prisma } from '@/server/db';
import { UserError } from '@/server/errors';
import { dilutionCompositionRows, packetCompositionRows } from '@/lib/sds-compose';
import { loadMixtureComposition, replaceComponents } from '@/server/sds-records';

/**
 * Odtwarza sekcję 3 karty ze składu powiązanej mieszaniny (opakowanie wariantu
 * albo roztwór roboczy). Wywołujący musi trzymać blokadę karty.
 */
export async function syncDocumentCompositionUnderLock(documentId: string): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const doc = await tx.document.findUniqueOrThrow({ where: { id: documentId }, include: { packet: true, dilution: true } });
    const mixtureId = doc.packet?.mixtureId ?? doc.dilution?.mixtureId;
    if (!mixtureId) throw new UserError('Karta nie jest powiązana z mieszaniną.');
    const mixture = await loadMixtureComposition(tx, mixtureId);
    const composition = doc.packet
      ? packetCompositionRows(mixture, doc.packet.id)
      : dilutionCompositionRows(mixture, doc.dilution!.waterMl);
    await replaceComponents(tx, documentId, composition.rows);
    return composition.rows.length;
  });
}
