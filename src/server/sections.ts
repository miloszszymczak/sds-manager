import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma, type JsonObject } from '@/server/db';

/**
 * Atomowe scalenie pól sekcji w jednym zapytaniu (jsonb `||`).
 * Brak odczytu-modyfikacji-zapisu po stronie aplikacji, więc równoległe zapisy
 * różnych pól tej samej sekcji nie mogą się nawzajem nadpisać.
 */
export async function mergeSectionData(
  documentId: string,
  number: number,
  patch: JsonObject,
  tx: Prisma.TransactionClient = prisma,
): Promise<void> {
  const json = JSON.stringify(patch);
  await tx.$executeRaw`
    INSERT INTO "Section" ("id", "documentId", "number", "data", "updatedAt")
    VALUES (gen_random_uuid()::text, ${documentId}, ${number}, ${json}::jsonb, now())
    ON CONFLICT ("documentId", "number") DO UPDATE
      SET "data" = "Section"."data" || EXCLUDED."data", "updatedAt" = now()`;
}
