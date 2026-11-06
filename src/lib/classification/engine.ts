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
const has = (c: EngineComponent, prefix: string) => c.hazards.some((h) => h.hazardClass.startsWith(prefix));
const fmt = (n: number) => Number(n.toFixed(2)).toString().replace('.', ',');

/* ─────────────────────────── główna funkcja ─────────────────────────── */

export function classifyMixture(components: EngineComponent[]): ClassificationResult {
  const endpoints: EndpointResult[] = [
    ...acuteToxicity(components),
    skinCorrosion(components),
    eyeDamage(components),
    ...thresholdEndpoints(components),
    ...aquatic(components),
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

function sumWhere(components: EngineComponent[], prefix: string): { sum: number; names: string[] } {
  let sum = 0;
  const names: string[] = [];
  for (const c of components) {
    if (has(c, prefix)) {
      sum += c.percent;
      names.push(c.name);
    }
  }
  return { sum, names };
}

function skinCorrosion(components: EngineComponent[]): EndpointResult {
  const corr = sumWhere(components, 'Skin Corr. 1');
  const irrit = sumWhere(components, 'Skin Irrit. 2');
  if (corr.sum >= SKIN_EYE.skinCorr1) {
    // CLP 3.2.3.3.4: podkategoria mieszaniny wynika z sum podkategorii składników.
    const sub1A = sumWhere(components, 'Skin Corr. 1A').sum;
    const sub1B = sumWhere(components, 'Skin Corr. 1B').sum;
    const sub1C = sumWhere(components, 'Skin Corr. 1C').sum;
    const unspecified = corr.sum - sub1A - sub1B - sub1C;
    const hazardClass =
      unspecified > 0
        ? 'Skin Corr. 1'
        : sub1A >= SKIN_EYE.skinCorr1
          ? 'Skin Corr. 1A'
          : sub1A + sub1B >= SKIN_EYE.skinCorr1
            ? 'Skin Corr. 1B'
            : 'Skin Corr. 1C';
    return {
      endpoint: 'Działanie żrące/drażniące na skórę',
      hazardClass,
      statement: 'H314',
      rule: `Σ(Skin Corr. 1) = ${fmt(corr.sum)} % ≥ ${SKIN_EYE.skinCorr1} % → ${hazardClass}`,
      contributors: corr.names,
    };
  }
  const combined = irrit.sum + 10 * corr.sum;
  if (combined >= SKIN_EYE.skinIrrit2) {
    return {
      endpoint: 'Działanie żrące/drażniące na skórę',
      hazardClass: 'Skin Irrit. 2',
      statement: 'H315',
      rule: `Σ(Skin Irrit. 2) + 10×Σ(Skin Corr. 1) = ${fmt(combined)} % ≥ ${SKIN_EYE.skinIrrit2} %`,
      contributors: [...irrit.names, ...corr.names],
    };
  }
  return {
    endpoint: 'Działanie żrące/drażniące na skórę',
    hazardClass: null,
    statement: null,
    rule: `poniżej progu (Σ = ${fmt(combined)} %)`,
    contributors: [],
  };
}

function eyeDamage(components: EngineComponent[]): EndpointResult {
  const corr = sumWhere(components, 'Skin Corr. 1');
  const dam = sumWhere(components, 'Eye Dam. 1');
  const irrit = sumWhere(components, 'Eye Irrit. 2');
  const damSum = dam.sum + corr.sum;
  if (damSum >= SKIN_EYE.eyeDam1) {
    return {
      endpoint: 'Poważne uszkodzenie/działanie drażniące na oczy',
      hazardClass: 'Eye Dam. 1',
      statement: 'H318',
      rule: `Σ(Eye Dam. 1 + Skin Corr. 1) = ${fmt(damSum)} % ≥ ${SKIN_EYE.eyeDam1} %`,
      contributors: [...dam.names, ...corr.names],
    };
  }
  const irritSum = irrit.sum + dam.sum + corr.sum;
  if (irritSum >= SKIN_EYE.eyeIrrit2) {
    return {
      endpoint: 'Poważne uszkodzenie/działanie drażniące na oczy',
      hazardClass: 'Eye Irrit. 2',
      statement: 'H319',
      rule: `Σ(Eye Irrit. 2 + Eye Dam. 1 + Skin Corr. 1) = ${fmt(irritSum)} % ≥ ${SKIN_EYE.eyeIrrit2} %`,
      contributors: [...irrit.names, ...dam.names, ...corr.names],
    };
  }
  return {
    endpoint: 'Poważne uszkodzenie/działanie drażniące na oczy',
    hazardClass: null,
    statement: null,
    rule: `poniżej progu (Σ = ${fmt(irritSum)} %)`,
    contributors: [],
  };
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
