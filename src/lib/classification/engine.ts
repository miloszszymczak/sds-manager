/**
 * Silnik klasyfikacji mieszaniny wg CLP (B1).
 *
 * Czysta funkcja: `classifyMixture(components)` → wynik z klasami, zwrotami H
 * i — dla każdego punktu końcowego — **regułą decydującą** z liczbami.
 * Bez zależności od bazy; wejście buduje `build.ts`.
 *
 * Chemik zawsze weryfikuje i może nadpisać. Punkty spoza zakresu automatu
 * są oznaczane jako „oceń ręcznie".
 */

import {
  ATE_CONVERSION,
  ATE_CATEGORY_BOUNDS,
  ACUTE_STATEMENT,
  ACUTE_CUTOFF,
  GENERIC_LIMIT,
  SKIN_EYE,
  AQUATIC,
  DEFAULT_M,
  type AcuteRoute,
} from './constants';

export interface EngineHazard {
  hazardClass: string;
  statement?: string | null;
  mFactorAcute?: number | null;
  mFactorChronic?: number | null;
  ateOral?: number | null;
  ateDermal?: number | null;
  ateInhalDust?: number | null;
  ateInhalVapour?: number | null;
  sclMin?: number | null;
  sclStatement?: string | null;
  /**
   * Wpis jest wyłącznie stężeniem granicznym (SCL) — nie jest klasą samej substancji.
   * Np. NaOH (Skin Corr. 1A) ma wpisy graniczne: Skin Corr. 1B ≥ 2 %, Skin Irrit. 2 ≥ 0,5 %.
   */
  limitOnly?: boolean | null;
}

export interface EngineComponent {
  name: string;
  /** %m/m (dla zakresów — górna granica) */
  percent: number;
  hazards: EngineHazard[];
}

export interface EndpointResult {
  /** Etykieta punktu końcowego po polsku */
  endpoint: string;
  /** Przyznana klasa CLP lub null (brak klasyfikacji) */
  hazardClass: string | null;
  /** Zwrot H (jeśli klasa przyznana) */
  statement: string | null;
  /** Reguła decydująca z liczbami */
  rule: string;
  /** Nazwy składników, które przesądziły */
  contributors: string[];
}

export interface ClassificationResult {
  endpoints: EndpointResult[];
  hazardClasses: string[];
  statements: string[];
}

const catNum = (code: string): number | null => {
  const m = code.match(/(\d)(?=[AB]?$)/);
  return m ? Number(m[1]) : null;
};
/** Czy substancja sama należy do klasy (wpisy „tylko SCL” się nie liczą). */
const has = (c: EngineComponent, prefix: string) =>
  c.hazards.some((h) => !h.limitOnly && h.hazardClass.startsWith(prefix));
const fmt = (n: number) => Number(n.toFixed(2)).toString().replace('.', ',');

/* ─────────────────────────── główna funkcja ─────────────────────────── */

export function classifyMixture(components: EngineComponent[]): ClassificationResult {
  // Toksyczność ostra i środowisko liczą się z klas własnych substancji.
  const own = components.map((c) => ({ ...c, hazards: c.hazards.filter((h) => !h.limitOnly) }));
  const skin = skinCorrosion(components);
  const endpoints: EndpointResult[] = [
    ...acuteToxicity(own),
    skin,
    eyeDamage(components, skin),
    ...thresholdEndpoints(components),
    ...aquatic(own),
  ];

  const hazardClasses: string[] = [];
  const statements: string[] = [];
  for (const e of endpoints) {
    if (e.hazardClass) {
      hazardClasses.push(e.hazardClass);
      if (e.statement) statements.push(e.statement);
    }
  }
  return {
    endpoints,
    hazardClasses: [...new Set(hazardClasses)],
    statements: [...new Set(statements)],
  };
}

/* ─────────────────────────── toksyczność ostra ─────────────────────────── */

function acuteToxicity(components: EngineComponent[]): EndpointResult[] {
  const routes: { route: AcuteRoute; label: string; ateKey: keyof EngineHazard }[] = [
    { route: 'oral', label: 'Toksyczność ostra — droga pokarmowa', ateKey: 'ateOral' },
    { route: 'dermal', label: 'Toksyczność ostra — skóra', ateKey: 'ateDermal' },
    { route: 'inhalDust', label: 'Toksyczność ostra — wdychanie (pyły/mgły)', ateKey: 'ateInhalDust' },
    { route: 'inhalVapour', label: 'Toksyczność ostra — wdychanie (pary)', ateKey: 'ateInhalVapour' },
  ];

  const out: EndpointResult[] = [];
  for (const { route, label, ateKey } of routes) {
    let sumFrac = 0;
    const contributors: string[] = [];
    for (const c of components) {
      if (c.percent < ACUTE_CUTOFF) continue;
      const acute = c.hazards.find((h) => h.hazardClass.startsWith('Acute Tox.'));
      if (!acute) continue;
      const ate = acute[ateKey] as number | null | undefined;
      let effAte: number | null = null;
      if (ate && ate > 0) effAte = ate;
      else if (route === 'oral') {
        // brak ATE → wartość przeliczeniowa z kategorii (przyjmujemy drogę pokarmową)
        const cat = catNum(acute.hazardClass) as 1 | 2 | 3 | 4 | null;
        if (cat) effAte = ATE_CONVERSION.oral[cat];
      }
      if (effAte) {
        sumFrac += c.percent / effAte;
        contributors.push(c.name);
      }
    }
    if (sumFrac <= 0) continue;
    const ateMix = 100 / sumFrac;
    const bound = ATE_CATEGORY_BOUNDS[route].find((b) => ateMix <= b.max);
    if (!bound) continue;
    out.push({
      endpoint: label,
      hazardClass: `Acute Tox. ${bound.cat}`,
      statement: ACUTE_STATEMENT[route][bound.cat],
      rule: `ATEmix = 100 / Σ(Cᵢ/ATEᵢ) = ${fmt(ateMix)} → kat. ${bound.cat} (≤ ${bound.max})`,
      contributors,
    });
  }
  return out;
}

/* ─────────────────────────── skóra / oczy ─────────────────────────── */

/**
 * Addytywność z granicami indywidualnymi (CLP 3.2.3.3 / 3.3.3.3, wytyczne ECHA):
 * mieszanina spełnia kryterium, gdy Σ(Cᵢ / Lᵢ) ≥ 1, gdzie Lᵢ to specyficzne stężenie
 * graniczne składnika (SCL), a gdy go brak — granica ogólna. Bez SCL daje to dokładnie
 * klasyczne sumy (np. Σ Skin Corr. 1 ≥ 5 %; 10×Σ Skin Corr. 1 + Σ Skin Irrit. 2 ≥ 10 %).
 */
interface Level {
  /** Prefiksy klas, których SCL definiuje granicę składnika dla tego poziomu */
  sclPrefixes: string[];
  /** Granice ogólne wg klasy własnej składnika: [prefiks, granica %] (pierwsze trafienie) */
  generic: [string, number][];
}

function limitFor(c: EngineComponent, level: Level): { limit: number; scl: boolean } | null {
  const scls = c.hazards
    .filter((h) => h.sclMin != null && h.sclMin > 0 && level.sclPrefixes.some((p) => h.hazardClass.startsWith(p)))
    .map((h) => h.sclMin!);
  if (scls.length) return { limit: Math.min(...scls), scl: true };
  for (const [prefix, limit] of level.generic) if (has(c, prefix)) return { limit, scl: false };
  return null;
}

function ratio(components: EngineComponent[], level: Level) {
  let sum = 0;
  let usesScl = false;
  const names: string[] = [];
  for (const c of components) {
    const l = limitFor(c, level);
    if (!l || c.percent <= 0) continue;
    sum += c.percent / l.limit;
    usesScl ||= l.scl;
    names.push(c.name);
  }
  return { sum, usesScl, names, met: sum >= 1 - 1e-9 };
}

const ratioRule = (label: string, r: { sum: number; usesScl: boolean }) =>
  `Σ(Cᵢ/Lᵢ) dla ${label} = ${fmt(r.sum)} ${r.sum >= 1 - 1e-9 ? '≥' : '<'} 1${r.usesScl ? ' (z SCL)' : ''}`;

const G = SKIN_EYE;
const SKIN_CORR: Level = { sclPrefixes: ['Skin Corr.'], generic: [['Skin Corr.', G.skinCorr1]] };
const SKIN_CORR_1A: Level = { sclPrefixes: ['Skin Corr. 1A'], generic: [['Skin Corr. 1A', G.skinCorr1]] };
const SKIN_CORR_1AB: Level = {
  sclPrefixes: ['Skin Corr. 1A', 'Skin Corr. 1B'],
  generic: [['Skin Corr. 1A', G.skinCorr1], ['Skin Corr. 1B', G.skinCorr1]],
};
const SKIN_IRRIT: Level = {
  sclPrefixes: ['Skin Irrit.'],
  // substancja żrąca liczy się 10× (granica 1 %), drażniąca — granica 10 %
  generic: [['Skin Corr.', G.skinIrrit2 / 10], ['Skin Irrit.', G.skinIrrit2]],
};
const EYE_DAM: Level = { sclPrefixes: ['Eye Dam.'], generic: [['Eye Dam.', G.eyeDam1], ['Skin Corr.', G.eyeDam1]] };
const EYE_IRRIT: Level = {
  sclPrefixes: ['Eye Irrit.'],
  generic: [['Eye Irrit.', G.eyeIrrit2], ['Eye Dam.', G.eyeIrrit2], ['Skin Corr.', G.eyeIrrit2]],
};

function skinCorrosion(components: EngineComponent[]): EndpointResult {
  const endpoint = 'Działanie żrące/drażniące na skórę';
  const corr = ratio(components, SKIN_CORR);
  if (corr.met) {
    // CLP 3.2.3.3.4: podkategoria wynika z udziału składników poszczególnych podkategorii.
    const unspecified = components.some((c) =>
      c.hazards.some((h) => !h.limitOnly && h.hazardClass === 'Skin Corr. 1' && c.percent > 0),
    );
    const hazardClass = unspecified
      ? 'Skin Corr. 1'
      : ratio(components, SKIN_CORR_1A).met
        ? 'Skin Corr. 1A'
        : ratio(components, SKIN_CORR_1AB).met
          ? 'Skin Corr. 1B'
          : 'Skin Corr. 1C';
    return { endpoint, hazardClass, statement: 'H314', rule: `${ratioRule('Skin Corr. 1', corr)} → ${hazardClass}`, contributors: corr.names };
  }
  const irrit = ratio(components, SKIN_IRRIT);
  if (irrit.met) {
    return { endpoint, hazardClass: 'Skin Irrit. 2', statement: 'H315', rule: ratioRule('Skin Irrit. 2', irrit), contributors: irrit.names };
  }
  return { endpoint, hazardClass: null, statement: null, rule: `poniżej progu: ${ratioRule('Skin Irrit. 2', irrit)}`, contributors: [] };
}

function eyeDamage(components: EngineComponent[], skin: EndpointResult): EndpointResult {
  const endpoint = 'Poważne uszkodzenie/działanie drażniące na oczy';
  // Mieszanina żrąca dla skóry z definicji powoduje poważne uszkodzenie oczu (CLP 3.3.2.1.1).
  if (skin.hazardClass?.startsWith('Skin Corr.')) {
    return { endpoint, hazardClass: 'Eye Dam. 1', statement: 'H318', rule: `wynika z klasyfikacji ${skin.hazardClass}`, contributors: skin.contributors };
  }
  const dam = ratio(components, EYE_DAM);
  if (dam.met) {
    return { endpoint, hazardClass: 'Eye Dam. 1', statement: 'H318', rule: ratioRule('Eye Dam. 1', dam), contributors: dam.names };
  }
  const irrit = ratio(components, EYE_IRRIT);
  if (irrit.met) {
    return { endpoint, hazardClass: 'Eye Irrit. 2', statement: 'H319', rule: ratioRule('Eye Irrit. 2', irrit), contributors: irrit.names };
  }
  return { endpoint, hazardClass: null, statement: null, rule: `poniżej progu: ${ratioRule('Eye Irrit. 2', irrit)}`, contributors: [] };
}

/* ─────────────────────────── klasy progowe (CMR, uczulenie, STOT, aspiracja) ─────────────────────────── */

const THRESHOLD_ENDPOINTS: { prefixes: string[]; label: string }[] = [
  { prefixes: ['Carc.'], label: 'Działanie rakotwórcze' },
  { prefixes: ['Muta.'], label: 'Działanie mutagenne' },
  { prefixes: ['Repr.', 'Lact.'], label: 'Szkodliwe działanie na rozrodczość' },
  { prefixes: ['Resp. Sens.'], label: 'Działanie uczulające na drogi oddechowe' },
  { prefixes: ['Skin Sens.'], label: 'Działanie uczulające na skórę' },
  { prefixes: ['STOT SE'], label: 'Działanie toksyczne na narządy — narażenie jednorazowe' },
  { prefixes: ['STOT RE'], label: 'Działanie toksyczne na narządy — narażenie powtarzane' },
  { prefixes: ['Asp. Tox.'], label: 'Zagrożenie spowodowane aspiracją' },
];

function thresholdEndpoints(components: EngineComponent[]): EndpointResult[] {
  return THRESHOLD_ENDPOINTS.map(({ prefixes, label }) => {
    // Najsurowsza klasa spełniająca próg (SCL nadpisuje GCL).
    let best: { cls: string; statement: string | null; c: EngineComponent; limit: number; scl: boolean } | null = null;
    for (const c of components) {
      for (const h of c.hazards) {
        if (!prefixes.some((p) => h.hazardClass.startsWith(p))) continue;
        if (h.limitOnly && h.sclMin == null) continue;
        const scl = h.sclMin != null;
        const limit = scl ? h.sclMin! : (GENERIC_LIMIT[h.hazardClass] ?? Infinity);
        if (c.percent >= limit) {
          const cat = catNum(h.hazardClass) ?? 9;
          if (!best || cat < (catNum(best.cls) ?? 9)) {
            best = {
              cls: h.hazardClass,
              statement: (scl ? h.sclStatement : null) || h.statement || null,
              c,
              limit,
              scl,
            };
          }
        }
      }
    }
    if (best) {
      return {
        endpoint: label,
        hazardClass: best.cls,
        statement: best.statement,
        rule: `${best.c.name} ${fmt(best.c.percent)} % ≥ ${fmt(best.limit)} % (${best.scl ? 'SCL' : 'granica ogólna'})`,
        contributors: [best.c.name],
      };
    }
    // Zbierz najbliższy przypadek podprogowy do informacji (np. boraks < SCL)
    const near = components
      .flatMap((c) => c.hazards.filter((h) => prefixes.some((p) => h.hazardClass.startsWith(p))).map((h) => ({ c, h })))
      .sort((a, b) => b.c.percent - a.c.percent)[0];
    const rule = near
      ? `${near.c.name} ${fmt(near.c.percent)} % < ${fmt(near.h.sclMin ?? GENERIC_LIMIT[near.h.hazardClass] ?? 0)} % (${near.h.sclMin != null ? 'SCL' : 'granica ogólna'}) → brak klasyfikacji`
      : 'brak składników z tą klasą';
    return { endpoint: label, hazardClass: null, statement: null, rule, contributors: [] };
  });
}

/* ─────────────────────────── środowisko wodne ─────────────────────────── */

function aquatic(components: EngineComponent[]): EndpointResult[] {
  const mAcute = (h: EngineHazard) => h.mFactorAcute ?? DEFAULT_M;
  const mChronic = (h: EngineHazard) => h.mFactorChronic ?? DEFAULT_M;

  // Ostre 1: Σ(M × C) dla Aquatic Acute 1
  let acuteSum = 0;
  const acuteNames: string[] = [];
  for (const c of components)
    for (const h of c.hazards)
      if (h.hazardClass === 'Aquatic Acute 1') {
        acuteSum += mAcute(h) * c.percent;
        acuteNames.push(c.name);
      }

  // Przewlekłe — warstwy
  const chronic: Record<1 | 2 | 3, { sum: number; names: string[] }> = {
    1: { sum: 0, names: [] },
    2: { sum: 0, names: [] },
    3: { sum: 0, names: [] },
  };
  for (const c of components)
    for (const h of c.hazards) {
      if (h.hazardClass === 'Aquatic Chronic 1') {
        chronic[1].sum += mChronic(h) * c.percent;
        chronic[1].names.push(c.name);
      } else if (h.hazardClass === 'Aquatic Chronic 2') {
        chronic[2].sum += c.percent;
        chronic[2].names.push(c.name);
      } else if (h.hazardClass === 'Aquatic Chronic 3') {
        chronic[3].sum += c.percent;
        chronic[3].names.push(c.name);
      }
    }

  const T = AQUATIC.threshold;
  const L = AQUATIC.layerFactor;
  const out: EndpointResult[] = [];

  out.push(
    acuteSum >= T
      ? {
          endpoint: 'Środowisko wodne — zagrożenie ostre',
          hazardClass: 'Aquatic Acute 1',
          statement: 'H400',
          rule: `Σ(M × C) = ${fmt(acuteSum)} % ≥ ${T} %`,
          contributors: acuteNames,
        }
      : {
          endpoint: 'Środowisko wodne — zagrożenie ostre',
          hazardClass: null,
          statement: null,
          rule: `Σ(M × C) = ${fmt(acuteSum)} % < ${T} %`,
          contributors: [],
        },
  );

  // Chronic 1: Σ(M×C dla Chronic1) ≥ 25
  // Chronic 2: 10×Σ(Chronic1·M) + Σ(Chronic2) ≥ 25
  // Chronic 3: 100×Σ(Chronic1·M) + 10×Σ(Chronic2) + Σ(Chronic3) ≥ 25
  let chronicResult: EndpointResult;
  if (chronic[1].sum >= T) {
    chronicResult = {
      endpoint: 'Środowisko wodne — zagrożenie przewlekłe',
      hazardClass: 'Aquatic Chronic 1',
      statement: 'H410',
      rule: `Σ(M × C) [Chronic 1] = ${fmt(chronic[1].sum)} % ≥ ${T} %`,
      contributors: chronic[1].names,
    };
  } else if (L * chronic[1].sum + chronic[2].sum >= T) {
    chronicResult = {
      endpoint: 'Środowisko wodne — zagrożenie przewlekłe',
      hazardClass: 'Aquatic Chronic 2',
      statement: 'H411',
      rule: `10×Σ(Chronic 1) + Σ(Chronic 2) = ${fmt(L * chronic[1].sum + chronic[2].sum)} % ≥ ${T} %`,
      contributors: [...chronic[1].names, ...chronic[2].names],
    };
  } else if (L * L * chronic[1].sum + L * chronic[2].sum + chronic[3].sum >= T) {
    chronicResult = {
      endpoint: 'Środowisko wodne — zagrożenie przewlekłe',
      hazardClass: 'Aquatic Chronic 3',
      statement: 'H412',
      rule: `100×Σ(Chronic 1) + 10×Σ(Chronic 2) + Σ(Chronic 3) ≥ ${T} %`,
      contributors: [...chronic[1].names, ...chronic[2].names, ...chronic[3].names],
    };
  } else {
    chronicResult = {
      endpoint: 'Środowisko wodne — zagrożenie przewlekłe',
      hazardClass: null,
      statement: null,
      rule: `poniżej progu (Σ Chronic 1 = ${fmt(chronic[1].sum)} %)`,
      contributors: [],
    };
  }
  out.push(chronicResult);
  return out;
}
