import type { Prisma } from '@prisma/client';

export type JsonObject = Record<string, unknown>;

/** Odczyt kolumny jsonb jako obiektu (bezpieczny dla null/tablic/prymitywów). */
export function asObject(value: Prisma.JsonValue | null | undefined): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonObject) : {};
}

/** Zapis wartości do kolumny jsonb. */
export function toJson(value: unknown): Prisma.InputJsonValue {
  return (value ?? {}) as Prisma.InputJsonValue;
}
