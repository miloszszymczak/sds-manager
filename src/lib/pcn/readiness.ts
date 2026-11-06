/**
 * Gotowość do zgłoszenia PCN (Poison Centre Notification) — F4.4.
 *
 * Sprawdza, czy dokument zawiera dane wymagane do zgłoszenia mieszaniny
 * do ośrodków zatruć (art. 45 CLP, zał. VIII). Czysta funkcja.
 *
 * ⚠️ To lista kontrolna gotowości, nie samo zgłoszenie. Pełne zgłoszenie
 * PCN wykonuje się w portalu ECHA (format PCN/IUCLID).
 */

export type CheckStatus = 'ok' | 'missing' | 'na';

export interface ReadinessItem {
  label: string;
  status: CheckStatus;
  detail?: string;
}

export interface PcnInput {
  ufi: string | null;
  productName: string;
  classes: string[];
  sections: Record<number, Record<string, unknown>>;
  components: { name: string; casNumber: string | null; concentration: string | null }[];
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const obj = (v: unknown) => (v && typeof v === 'object' ? (v as Record<string, string>) : {});

export function pcnReadiness(input: PcnInput): { items: ReadinessItem[]; ready: boolean } {
  const s = input.sections;
  const dostawca = obj(s[1]?.dostawca);
  const wlas = obj(s[9]?.wlasciwosci);
  const healthPhysical = input.classes.some((c) => !c.startsWith('Aquatic') && !c.startsWith('Ozone'));

  const items: ReadinessItem[] = [
    {
      label: 'Numer UFI',
      status: input.ufi ? 'ok' : healthPhysical ? 'missing' : 'na',
      detail: input.ufi ?? (healthPhysical ? 'wymagany dla mieszaniny klasyfikowanej zdrowotnie/fizycznie' : 'niewymagany'),
    },
    { label: 'Nazwa handlowa produktu', status: input.productName ? 'ok' : 'missing' },
    {
      label: 'Klasyfikacja (sekcja 2.1)',
      status: input.classes.length > 0 ? 'ok' : healthPhysical ? 'missing' : 'na',
      detail: input.classes.join(', ') || 'brak',
    },
    {
      label: 'Skład — składniki z identyfikatorem i stężeniem (sekcja 3)',
      status:
        input.components.length > 0 && input.components.every((c) => (c.casNumber || c.name) && c.concentration)
          ? 'ok'
          : 'missing',
      detail: `${input.components.length} składników`,
    },
    { label: 'Dane dostawcy (sekcja 1.3)', status: str(dostawca.przedsiebiorstwo) ? 'ok' : 'missing' },
    { label: 'Telefon alarmowy (sekcja 1.4)', status: hasEmergencyPhone(s[1]) ? 'ok' : 'missing' },
    {
      label: 'Postać, barwa, pH (sekcja 9)',
      status: str(wlas.stanSkupienia) ? 'ok' : 'missing',
      detail: [str(wlas.stanSkupienia), str(wlas.kolor), str(wlas.pH)].filter(Boolean).join(' · ') || 'brak',
    },
    {
      label: 'Informacje toksykologiczne (sekcja 11)',
      // Liczy się treść, nie same klucze pola — puste wartości nie wystarczają.
      status: hasAnyValue(obj(s[11]?.klasy)) || str(s[11]?.dzialanieChroniczne) ? 'ok' : 'missing',
    },
    {
      label: 'Rodzaj i wielkość opakowania',
      status: 'na',
      detail: 'do podania w zgłoszeniu PCN (poza kartą charakterystyki)',
    },
  ];

  const ready = items.every((i) => i.status !== 'missing');
  return { items, ready };
}

function hasEmergencyPhone(s1: Record<string, unknown> | undefined): boolean {
  if (!s1) return false;
  const t = s1.telefonyAlarmowe;
  return Array.isArray(t) ? t.some((r) => str((r as Record<string, string>).numer)) : false;
}

/** Czy obiekt klucz–wartość ma jakąkolwiek niepustą wartość. */
function hasAnyValue(o: Record<string, string>): boolean {
  return Object.values(o).some((v) => str(v).length > 0);
}
