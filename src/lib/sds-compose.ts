/**
 * Czyste składanie treści karty z mieszaniny: wiersze sekcji 3 (skład %m/m
 * opakowania lub roztworu roboczego) i propozycja sekcji 2 z silnika CLP.
 */
import { formatConcentration, formatVolume, packetComposition, workingSolution, type CompositionInput, type Unit } from './mixture';
import { section2FromClasses, suggest, toEngineHazard, type HazardRecord } from './classification/suggest';

export interface SubstanceLike {
  cas: string;
  name: string;
  ecNumber: string | null;
  indexNumber: string | null;
  reachNumber: string | null;
  sclNotes: string | null;
  isSvhc: boolean;
  density: number | null;
  hazards: (HazardRecord & { hazardClass: string; statement: string | null; sclStatement: string | null })[];
}

export interface MixtureLike {
  name: string;
  components: { id: string; packetId: string; quantity: number; unit: string; substance: SubstanceLike }[];
}

export interface ComponentData {
  substanceCas: string;
  name: string;
  casNumber: string;
  ecNumber: string | null;
  indexNumber: string | null;
  reachNumber: string | null;
  concentration: string;
  hazardClasses: string[];
  hazardStatements: string[];
  sclNotes: string | null;
  isSvhc: boolean;
  position: number;
}

export interface Composition {
  rows: ComponentData[];
  /** Pola sekcji 2 wyliczone przez silnik klasyfikacji */
  section2: Record<string, unknown>;
}

/** Klasy i zwroty H substancji w postaci zapisywanej na składniku karty. */
export function substanceHazardCodes(s: Pick<SubstanceLike, 'hazards'>) {
  // Wpisy „tylko SCL” to granice stężeń, nie klasyfikacja samej substancji.
  const own = s.hazards.filter((h) => !h.limitOnly);
  return {
    hazardClasses: [...new Set(own.map((h) => h.hazardClass))],
    hazardStatements: [...new Set(own.map((h) => h.sclStatement || h.statement).filter((x): x is string => !!x))],
  };
}

const toInput = (c: MixtureLike['components'][number]): CompositionInput => ({
  key: c.id,
  packetId: c.packetId,
  quantity: c.quantity,
  unit: c.unit as Unit,
  density: c.substance.density,
});

function compose(comps: MixtureLike['components'], percent: Map<string, number>, dp: number): Composition {
  const rows = comps.map((c, position) => {
    const s = c.substance;
    return {
      substanceCas: s.cas,
      name: s.name,
      casNumber: s.cas,
      ecNumber: s.ecNumber,
      indexNumber: s.indexNumber,
      reachNumber: s.reachNumber,
      concentration: formatConcentration(percent.get(c.id) ?? 0, dp),
      ...substanceHazardCodes(s),
      sclNotes: s.sclNotes,
      isSvhc: s.isSvhc,
      position,
    };
  });
  const result = suggest(
    comps.map((c) => ({ name: c.substance.name, percent: percent.get(c.id) ?? 0, hazards: c.substance.hazards.map(toEngineHazard) })),
  );
  return { rows, section2: section2FromClasses(result.hazardClasses, result.statements) };
}

/** Skład opakowania (%m/m względem masy opakowania). */
export function packetCompositionRows(mixture: MixtureLike, packetId: string): Composition {
  const pct = new Map(packetComposition(mixture.components.map(toInput), packetId).map((r) => [r.key, r.percent]));
  return compose(mixture.components.filter((c) => c.packetId === packetId), pct, 1);
}

/** Skład roztworu roboczego: wszystkie opakowania + woda. */
export function dilutionCompositionRows(mixture: MixtureLike, waterMl: number): Composition {
  const pct = new Map(workingSolution(mixture.components.map(toInput), waterMl, 3).map((r) => [r.key, r.percent]));
  return compose(mixture.components, pct, 2);
}

export function supplierBlock(s: {
  name: string;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  bdo: string | null;
}) {
  return {
    przedsiebiorstwo: s.name,
    adres: [s.street, [s.postalCode, s.city].filter(Boolean).join(' ')].filter(Boolean).join(', '),
    telefon: s.phone ?? '',
    email: s.email ?? '',
    www: s.website ?? '',
    bdo: s.bdo ?? '',
  };
}

export function packetDocumentName(mixtureName: string, packet: { label: string; name: string | null }, volumeMl: number) {
  const part = packet.label ? ` — ${packet.name || `część ${packet.label}`}` : '';
  return `${mixtureName}${part} (${formatVolume(volumeMl)})`;
}
