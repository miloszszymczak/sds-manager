import 'server-only';
import { parsePubchemGhs, type PubchemGhs } from '@/lib/pubchem';
import { UserError } from '@/server/errors';

/**
 * Pobieranie danych substancji z PubChem (NIH/NLM) po numerze CAS — publiczne API
 * bez klucza (limit: 5 zapytań/s). Wysyłamy wyłącznie numer CAS.
 * Wyniki są buforowane przez dobę. Wyłączenie: PUBCHEM_LOOKUP=off.
 */
const BASE = 'https://pubchem.ncbi.nlm.nih.gov/rest';

export interface PubchemSubstance extends PubchemGhs {
  cid: number;
  title: string | null;
  iupacName: string | null;
  molecularFormula: string | null;
  molarMass: string | null;
  url: string;
}

async function getJson(path: string): Promise<unknown | null> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'sds-manager' },
      signal: AbortSignal.timeout(10_000),
      next: { revalidate: 86_400 },
    });
  } catch {
    throw new UserError('Nie udało się połączyć z PubChem — spróbuj ponownie później.');
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new UserError(`PubChem odpowiedział błędem ${res.status}.`);
  return res.json();
}

export async function lookupByCas(cas: string): Promise<PubchemSubstance | null> {
  if (process.env.PUBCHEM_LOOKUP === 'off') throw new UserError('Pobieranie danych z PubChem jest wyłączone w konfiguracji.');

  const cids = (await getJson(`/pug/compound/name/${encodeURIComponent(cas)}/cids/JSON`)) as {
    IdentifierList?: { CID?: number[] };
  } | null;
  const cid = cids?.IdentifierList?.CID?.[0];
  if (!cid) return null;

  const [props, ghs] = await Promise.all([
    getJson(`/pug/compound/cid/${cid}/property/Title,IUPACName,MolecularFormula,MolecularWeight/JSON`) as Promise<{
      PropertyTable?: { Properties?: { Title?: string; IUPACName?: string; MolecularFormula?: string; MolecularWeight?: string }[] };
    } | null>,
    getJson(`/pug_view/data/compound/${cid}/JSON?heading=GHS+Classification`),
  ]);
  const p = props?.PropertyTable?.Properties?.[0];
  const weight = p?.MolecularWeight ? Number(p.MolecularWeight) : NaN;

  return {
    cid,
    title: p?.Title ?? null,
    iupacName: p?.IUPACName ?? null,
    molecularFormula: p?.MolecularFormula ?? null,
    molarMass: Number.isFinite(weight) ? `${weight.toFixed(2).replace('.', ',')} g/mol` : null,
    url: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`,
    ...parsePubchemGhs(ghs),
  };
}
