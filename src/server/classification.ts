import 'server-only';
import { prisma } from '@/server/db';
import type { EngineComponent } from '@/lib/classification/engine';
import { toEngineHazard } from '@/lib/classification/suggest';
import { parsePercent } from '@/lib/percent';

/** Wejście silnika z sekcji 3 karty: dane strukturalne substancji lub kody zapisane na składniku. */
export async function engineInputForDocument(documentId: string): Promise<EngineComponent[]> {
  const components = await prisma.component.findMany({
    where: { documentId },
    orderBy: { position: 'asc' },
    include: { substance: { include: { hazards: { orderBy: { position: 'asc' } } } } },
  });
  return components.map((c) => ({
    name: c.name,
    percent: parsePercent(c.concentration),
    hazards: c.substance ? c.substance.hazards.map(toEngineHazard) : c.hazardClasses.map((hazardClass) => ({ hazardClass })),
  }));
}
