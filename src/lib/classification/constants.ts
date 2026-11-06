/**
 * Stałe klasyfikacyjne wg Załącznika I do rozporządzenia CLP (WE) nr 1272/2008.
 *
 * ⚠️ UWAGA REGULACYJNA: poniższe wartości należy zweryfikować z aktualnym
 * tekstem Załącznika I i tablic 3.1.2 / 3.10.x. To dane wejściowe silnika
 * klasyfikacji — chemik musi je zatwierdzić przed użyciem produkcyjnym.
 *
 * Zakres automatu obejmuje główne punkty końcowe; pozostałe silnik oznacza
 * jako „poza zakresem — oceń ręcznie".
 */

/* ─────────── Toksyczność ostra — metoda addytywności (ATE) ─────────── */

export type AcuteRoute = 'oral' | 'dermal' | 'inhalDust' | 'inhalVapour';

/** Wartości przeliczeniowe ATE dla kategorii bez znanego ATE (Tabela 3.1.2). */
export const ATE_CONVERSION: Record<AcuteRoute, Record<1 | 2 | 3 | 4, number>> = {
  oral: { 1: 0.5, 2: 5, 3: 100, 4: 500 }, // mg/kg mc
  dermal: { 1: 5, 2: 50, 3: 300, 4: 1100 },
  inhalDust: { 1: 0.05, 2: 0.5, 3: 1.5, 4: 5.0 }, // mg/l (pyły/mgły)
  inhalVapour: { 1: 0.5, 2: 2.0, 3: 10, 4: 20 },
};

/** Górne granice ATEmix dla przyznania kategorii (Tabela 3.1.1). */
export const ATE_CATEGORY_BOUNDS: Record<AcuteRoute, { cat: 1 | 2 | 3 | 4; max: number }[]> = {
  oral: [{ cat: 1, max: 5 }, { cat: 2, max: 50 }, { cat: 3, max: 300 }, { cat: 4, max: 2000 }],
  dermal: [{ cat: 1, max: 50 }, { cat: 2, max: 200 }, { cat: 3, max: 1100 }, { cat: 4, max: 2000 }],
  inhalDust: [{ cat: 1, max: 0.05 }, { cat: 2, max: 0.5 }, { cat: 3, max: 1.0 }, { cat: 4, max: 5.0 }],
  inhalVapour: [{ cat: 1, max: 0.5 }, { cat: 2, max: 2.0 }, { cat: 3, max: 10 }, { cat: 4, max: 20 }],
};

/** Zwrot H toksyczności ostrej wg drogi i kategorii. */
export const ACUTE_STATEMENT: Record<AcuteRoute, Record<1 | 2 | 3 | 4, string>> = {
  oral: { 1: 'H300', 2: 'H300', 3: 'H301', 4: 'H302' },
  dermal: { 1: 'H310', 2: 'H310', 3: 'H311', 4: 'H312' },
  inhalDust: { 1: 'H330', 2: 'H330', 3: 'H331', 4: 'H332' },
  inhalVapour: { 1: 'H330', 2: 'H330', 3: 'H331', 4: 'H332' },
};

/** Dolne stężenie składnika uwzględnianego w sumie ATE [%]. */
export const ACUTE_CUTOFF = 1;

/* ─────────── Ogólne granice stężeń (GCL) — progi klasyfikacji ─────────── */

/**
 * Dla klas progowych: jeżeli jakikolwiek składnik o danej klasie występuje
 * w stężeniu ≥ granicy, mieszanina dziedziczy klasę. SCL składnika nadpisuje GCL.
 */
export const GENERIC_LIMIT: Record<string, number> = {
  // CMR
  'Carc. 1A': 0.1,
  'Carc. 1B': 0.1,
  'Carc. 2': 1.0,
  'Muta. 1A': 0.1,
  'Muta. 1B': 0.1,
  'Muta. 2': 1.0,
  'Repr. 1A': 0.3,
  'Repr. 1B': 0.3,
  'Repr. 2': 3.0,
  'Lact.': 0.3,
  // Uczulenie
  'Resp. Sens. 1': 1.0,
  'Resp. Sens. 1A': 0.1,
  'Resp. Sens. 1B': 1.0,
  'Skin Sens. 1': 1.0,
  'Skin Sens. 1A': 0.1,
  'Skin Sens. 1B': 1.0,
  // STOT
  'STOT SE 1': 10,
  'STOT SE 2': 10,
  'STOT SE 3': 20,
  'STOT RE 1': 10,
  'STOT RE 2': 10,
  // Aspiracja
  'Asp. Tox. 1': 10,
};

/* ─────────── Skóra / oczy — metoda sumowania ─────────── */

export const SKIN_EYE = {
  skinCorr1: 5, // ΣSkin Corr 1 ≥ 5 % → Skin Corr 1
  skinIrrit2: 10, // ΣSkin Irrit 2 + 10×ΣSkin Corr 1 ≥ 10 % → Skin Irrit 2
  eyeDam1: 3, // ΣEye Dam 1 + ΣSkin Corr 1 ≥ 3 % → Eye Dam 1
  eyeIrrit2: 10, // ΣEye Irrit 2 + ΣEye Dam 1 + ΣSkin Corr 1 ≥ 10 % → Eye Irrit 2
};

/* ─────────── Środowisko wodne — sumowanie z współczynnikiem M ─────────── */

export const AQUATIC = {
  /** Próg sumy [%] dla każdej warstwy. */
  threshold: 25,
  /** Mnożnik między warstwami przewlekłymi (Chronic 1 → 2 → 3). */
  layerFactor: 10,
};

/** Domyślny współczynnik M, gdy nie podano. */
export const DEFAULT_M = 1;
