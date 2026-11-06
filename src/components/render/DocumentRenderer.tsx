import { SECTIONS, type FieldDef, type KeyValueRow } from '@/lib/schema/sections';
import { PICTOGRAM_BY_CODE } from '@/data/pictograms';
import { HAZARD_CLASS_BY_CODE } from '@/data/hazard-classes';
import { ABBREVIATIONS, TRANSPORT_MODES, TRANSPORT_PARAMS } from '@/data/reference-data';
import { tHazard, tPrecautionary, type Lang } from '@/data/translations';

export interface RenderData {
  productName: string;
  version: string;
  issueDate: Date;
  revisionDate: Date | null;
  ufi: string | null;
  /** Język wydania — 'pl' domyślnie; 'en' tłumaczy zwroty H/P (F4.3). */
  lang?: Lang;
  sectionData: Record<number, Record<string, unknown>>;
  components: {
    name: string;
    casNumber: string | null;
    ecNumber: string | null;
    indexNumber: string | null;
    reachNumber: string | null;
    concentration: string | null;
    hazardClasses: string[];
    hazardStatements: string[];
    sclNotes: string | null;
    isSvhc: boolean;
  }[];
  wasteCatalog: { code: string; descriptionPl: string; isHazardous: boolean }[];
  legalCatalog: { id: string; title: string; journalRef: string | null }[];
}

const fmt = (d: Date) => new Date(d).toLocaleDateString('pl-PL');

/** Kompletny dokument gotowy do druku / eksportu do PDF. */
export function DocumentRenderer({ data }: { data: RenderData }) {
  return (
    <article className="print-root mx-auto max-w-[210mm] bg-white p-[16mm] text-[10.5pt] leading-relaxed text-black shadow-lg print:shadow-none">
      {/* ── Nagłówek ── */}
      <header className="mb-4 border-2 border-black px-3 py-2 text-center">
        <div className="text-[13pt] font-bold">KARTA CHARAKTERYSTYKI</div>
        <div className="text-[9.5pt]">
          sporządzona zgodnie z rozporządzeniem (WE) nr 1907/2006 (REACH) z późn. zm. oraz rozporządzeniem Komisji (UE)
          2020/878
        </div>
      </header>

      <p className="mb-4 text-right text-[9pt] text-neutral-600">
        Data wystawienia: {fmt(data.issueDate)}
        {data.revisionDate && <> &nbsp;|&nbsp; Aktualizacja: {fmt(data.revisionDate)}</>}
        &nbsp;|&nbsp; Wersja: {data.version} &nbsp;|&nbsp; Język: polski
      </p>

      <h1 className="mb-5 text-center text-[14pt] font-bold">{data.productName}</h1>

      {SECTIONS.map((section) => (
        <section key={section.number} className="print-section mb-5">
          <h2 className="mb-2 border-l-4 border-neutral-700 bg-neutral-200 px-2 py-1 text-[12pt] font-bold">
            SEKCJA {section.number}: {section.title}
          </h2>

          {section.subsections.map((sub) => (
            <div key={sub.id} className="mb-3">
              <h3 className="mb-1 text-[11pt] font-semibold">
                {sub.id}. {sub.title}
              </h3>
              {sub.fields.map((field) => (
                <RenderField
                  key={field.key}
                  field={field}
                  value={data.sectionData[section.number]?.[field.key]}
                  data={data}
                />
              ))}
            </div>
          ))}
        </section>
      ))}

      <footer className="mt-6 border-t border-neutral-400 pt-2 text-center text-[8.5pt] text-neutral-600">
        {data.productName} &nbsp;|&nbsp; Wersja {data.version} &nbsp;|&nbsp; Strona wygenerowana{' '}
        {new Date().toLocaleDateString('pl-PL')}
      </footer>
    </article>
  );
}

/* ─────────────────────────────────────────────── */

function RenderField({
  field,
  value,
  data,
}: {
  field: FieldDef;
  value: unknown;
  data: RenderData;
}) {
  const Label = () =>
    !field.hideLabel && field.label ? <p className="mt-2 mb-0.5 font-semibold italic">{field.label}</p> : null;

  switch (field.type) {
    case 'text':
    case 'textarea': {
      const s = String(value ?? '').trim();
      if (!s) return null;
      return (
        <>
          <Label />
          <p className="mb-1 whitespace-pre-wrap">{s}</p>
        </>
      );
    }

    case 'list': {
      const items = (value as string[]) ?? [];
      if (items.length === 0) return null;
      return (
        <>
          <Label />
          <ul className="mb-1 list-disc pl-5">
            {items.filter(Boolean).map((it, i) => (
              <li key={i}>{it}</li>
            ))}
          </ul>
        </>
      );
    }

    case 'table': {
      const rows = (value as Record<string, string>[]) ?? [];
      const cols = field.columns ?? [];
      if (rows.length === 0) return null;
      return (
        <>
          <Label />
          <table className="mb-2 w-full border-collapse text-[9.5pt]">
            <thead>
              <tr>
                {cols.map((c) => (
                  <th
                    key={c.key}
                    style={{ width: c.width ? `${c.width}%` : undefined }}
                    className="border border-neutral-600 bg-neutral-200 px-1.5 py-1 text-left font-semibold"
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {cols.map((c) => (
                    <td key={c.key} className="border border-neutral-600 px-1.5 py-1 align-top">
                      {r[c.key] ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      );
    }

    case 'keyValue': {
      const obj = (value as Record<string, string>) ?? {};
      const rows = (field.rows ?? []).filter((r: KeyValueRow) => String(obj[r.key] ?? '').trim());
      if (rows.length === 0) return null;
      return (
        <>
          <Label />
          <table className="mb-2 w-full border-collapse text-[10pt]">
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <td className="w-[38%] border border-neutral-600 bg-neutral-100 px-1.5 py-1 align-top">
                    {r.marker && <span className="mr-1 text-neutral-500">{r.marker}</span>}
                    {r.label}
                  </td>
                  <td className="border border-neutral-600 px-1.5 py-1 align-top whitespace-pre-wrap">{obj[r.key]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      );
    }

    case 'signalWord': {
      const s = String(value ?? '');
      if (!s) return null;
      return (
        <p className="mb-1">
          <span className="font-semibold italic">Hasło ostrzegawcze: </span>
          <strong className={s === 'NIEBEZPIECZEŃSTWO' ? 'text-red-700' : ''}>{s}</strong>
        </p>
      );
    }

    case 'pictograms': {
      const codes = (value as string[]) ?? [];
      if (codes.length === 0) return null;
      return (
        <>
          <Label />
          <div className="mb-2 flex flex-wrap gap-3">
            {codes.map((c) => {
              const p = PICTOGRAM_BY_CODE.get(c);
              if (!p) return null;
              return (
                <figure key={c} className="w-[70px] text-center">
                  <div className="mx-auto h-[62px] w-[62px]" dangerouslySetInnerHTML={{ __html: p.svg }} />
                  <figcaption className="mt-0.5 text-[8pt] leading-tight">
                    <strong>{p.code}</strong>
                    <br />
                    {p.namePl}
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </>
      );
    }

    case 'hazardStatements': {
      const codes = (value as string[]) ?? [];
      if (codes.length === 0) return null;
      return (
        <>
          <Label />
          <ul className="mb-1">
            {codes.map((c) => (
              <li key={c}>
                <strong>{c}</strong> — {tHazard(c, data.lang ?? 'pl') || '(brak treści w słowniku)'}
              </li>
            ))}
          </ul>
        </>
      );
    }

    case 'precautionaryStatements': {
      const codes = (value as string[]) ?? [];
      if (codes.length === 0) return null;
      return (
        <>
          <Label />
          <ul className="mb-1">
            {codes.map((c) => (
              <li key={c}>
                <strong>{c}</strong> — {tPrecautionary(c, data.lang ?? 'pl') || '(brak treści w słowniku)'}
              </li>
            ))}
          </ul>
        </>
      );
    }

    case 'hazardClasses': {
      const codes = (value as string[]) ?? [];
      if (codes.length === 0) return null;
      return (
        <>
          <Label />
          <ul className="mb-1 list-disc pl-5">
            {codes.map((c) => {
              const hc = HAZARD_CLASS_BY_CODE.get(c);
              return (
                <li key={c}>
                  {hc ? `${hc.namePl} (${hc.categoryPl})` : c}
                  {hc?.defaultStatement && <>, {hc.defaultStatement}</>}
                </li>
              );
            })}
          </ul>
        </>
      );
    }

    case 'components': {
      const comps = data.components;
      if (comps.length === 0) return null;
      return (
        <table className="mb-2 w-full border-collapse text-[9.5pt]">
          <thead>
            <tr>
              <th className="w-[28%] border border-neutral-600 bg-neutral-200 px-1.5 py-1 text-left">Nazwa składnika</th>
              <th className="w-[24%] border border-neutral-600 bg-neutral-200 px-1.5 py-1 text-left">Identyfikatory</th>
              <th className="w-[13%] border border-neutral-600 bg-neutral-200 px-1.5 py-1 text-left">
                Zawartość [% m/m]
              </th>
              <th className="border border-neutral-600 bg-neutral-200 px-1.5 py-1 text-left">Klasyfikacja CLP</th>
            </tr>
          </thead>
          <tbody>
            {comps.map((c, i) => (
              <tr key={i}>
                <td className="border border-neutral-600 px-1.5 py-1 align-top">
                  <strong>{c.name}</strong>
                  {c.isSvhc && <div className="text-[8.5pt] text-red-700">substancja SVHC</div>}
                </td>
                <td className="border border-neutral-600 px-1.5 py-1 align-top text-[9pt]">
                  {c.casNumber && <div>Nr CAS: {c.casNumber}</div>}
                  {c.ecNumber && <div>Nr WE: {c.ecNumber}</div>}
                  {c.indexNumber && <div>Nr indeksowy: {c.indexNumber}</div>}
                  {c.reachNumber && <div>Nr REACH: {c.reachNumber}</div>}
                </td>
                <td className="border border-neutral-600 px-1.5 py-1 align-top">{c.concentration ?? '—'}</td>
                <td className="border border-neutral-600 px-1.5 py-1 align-top text-[9pt]">
                  {c.hazardClasses.map((hc, j) => (
                    <div key={j}>
                      {hc}
                      {HAZARD_CLASS_BY_CODE.get(hc)?.defaultStatement
                        ? `, ${HAZARD_CLASS_BY_CODE.get(hc)!.defaultStatement}`
                        : ''}
                    </div>
                  ))}
                  {c.sclNotes && <div className="mt-1 italic">{c.sclNotes}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    case 'transport': {
      const t = (value as { niePodlega: boolean; mody: Record<string, Record<string, string>> }) ?? {
        niePodlega: true,
        mody: {},
      };
      return (
        <table className="mb-2 w-full border-collapse text-[9.5pt]">
          <thead>
            <tr>
              <th className="w-[30%] border border-neutral-600 bg-neutral-200 px-1.5 py-1 text-left">Parametr</th>
              {TRANSPORT_MODES.map((m) => (
                <th key={m.key} className="border border-neutral-600 bg-neutral-200 px-1.5 py-1 text-left">
                  {m.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TRANSPORT_PARAMS.map((p) => (
              <tr key={p.key}>
                <td className="border border-neutral-600 bg-neutral-100 px-1.5 py-1 align-top">{p.label}</td>
                {TRANSPORT_MODES.map((m) => (
                  <td key={m.key} className="border border-neutral-600 px-1.5 py-1 align-top">
                    {t.niePodlega
                      ? p.key === 'un'
                        ? 'Nie jest uznana za towar niebezpieczny'
                        : 'nie dotyczy'
                      : (t.mody[m.key]?.[p.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    case 'wasteCodes': {
      const codes = (value as string[]) ?? [];
      if (codes.length === 0) return null;
      return (
        <>
          <Label />
          <table className="mb-2 w-full border-collapse text-[9.5pt]">
            <thead>
              <tr>
                <th className="w-[20%] border border-neutral-600 bg-neutral-200 px-1.5 py-1 text-left">Kod odpadu</th>
                <th className="border border-neutral-600 bg-neutral-200 px-1.5 py-1 text-left">Opis</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => {
                const w = data.wasteCatalog.find((x) => x.code === c);
                return (
                  <tr key={c}>
                    <td className="border border-neutral-600 px-1.5 py-1 font-semibold">{c}</td>
                    <td className="border border-neutral-600 px-1.5 py-1">{w?.descriptionPl ?? ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      );
    }

    case 'legalRefs': {
      const ids = (value as string[]) ?? [];
      if (ids.length === 0) return null;
      return (
        <ul className="mb-1 list-disc pl-5">
          {ids.map((id) => {
            const l = data.legalCatalog.find((x) => x.id === id);
            if (!l) return null;
            return (
              <li key={id}>
                {l.title}
                {l.journalRef && <> ({l.journalRef})</>}
              </li>
            );
          })}
        </ul>
      );
    }

    case 'boolean': {
      if (!value) return null;
      // Sekcja 16 — bloki generowane automatycznie
      if (field.key === 'pelnyTekstH') return <FullHazardTextBlock data={data} />;
      if (field.key === 'skroty') return <AbbreviationsBlock />;
      return null;
    }

    default:
      return null;
  }
}

/** Pełny tekst zwrotów H użytych w sekcjach 2 i 3 — generowany automatycznie. */
function FullHazardTextBlock({ data }: { data: RenderData }) {
  const codes = new Set<string>();
  for (const c of (data.sectionData[2]?.zwrotyH as string[]) ?? []) codes.add(c);
  for (const comp of data.components) for (const c of comp.hazardStatements) codes.add(c);

  if (codes.size === 0) return null;
  const sorted = [...codes].sort();

  return (
    <>
      <p className="mt-2 mb-0.5 font-semibold italic">Pełny tekst zwrotów H użytych w niniejszej karcie:</p>
      <ul className="mb-2 text-[9.5pt]">
        {sorted.map((c) => (
          <li key={c}>
            <strong>{c}</strong> — {tHazard(c, data.lang ?? 'pl')}
          </li>
        ))}
      </ul>
    </>
  );
}

function AbbreviationsBlock() {
  return (
    <>
      <p className="mt-2 mb-0.5 font-semibold italic">Wykaz skrótów i akronimów:</p>
      <ul className="mb-2 text-[9pt]">
        {ABBREVIATIONS.map((a) => (
          <li key={a.code}>
            <strong>{a.code}</strong> — {a.meaning}
          </li>
        ))}
      </ul>
    </>
  );
}
