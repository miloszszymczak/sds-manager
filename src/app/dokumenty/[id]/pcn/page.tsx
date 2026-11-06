import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/server/db';
import { requirePageUser } from '@/server/auth/guard';
import { toSectionMap } from '@/server/documents';
import { Shell } from '@/components/Shell';
import { pcnReadiness } from '@/lib/pcn/readiness';
import { PcnExport } from '@/components/pcn/PcnExport';

export const dynamic = 'force-dynamic';

const ICON: Record<string, string> = { ok: '✓', missing: '✕', na: '—' };
const STYLE: Record<string, string> = {
  ok: 'text-emerald-700',
  missing: 'text-red-700',
  na: 'text-slate-400',
};

export default async function PcnPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageUser();
  const { id } = await params;
  const doc = await prisma.document.findUnique({
    where: { id },
    include: { sections: true, components: { orderBy: { position: 'asc' } } },
  });
  if (!doc) notFound();

  const sections = toSectionMap(doc.sections);

  const components = doc.components.map((c) => ({ name: c.name, casNumber: c.casNumber, concentration: c.concentration }));
  const { items, ready } = pcnReadiness({
    ufi: doc.ufi,
    productName: doc.productName,
    classes: (sections[2]?.klasyfikacja as string[]) ?? [],
    sections,
    components,
  });

  const summary = {
    produkt: doc.productName,
    ufi: doc.ufi,
    klasyfikacja: (sections[2]?.klasyfikacja as string[]) ?? [],
    zwrotyH: (sections[2]?.zwrotyH as string[]) ?? [],
    sklad: components,
    postac: (sections[9]?.wlasciwosci as Record<string, string>)?.stanSkupienia ?? null,
    pH: (sections[9]?.wlasciwosci as Record<string, string>)?.pH ?? null,
  };

  return (
    <Shell active="dokumenty">
      <main className="mx-auto max-w-[820px] px-5 py-8">
        <div className="mb-5 flex items-center gap-2 text-sm text-slate-400">
          <Link href="/" className="hover:text-slate-600">Dokumenty</Link>
          <span>/</span>
          <Link href={`/dokumenty/${id}`} className="hover:text-slate-600">{doc.productName}</Link>
          <span>/</span>
          <span className="text-slate-600">Gotowość PCN</span>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">Gotowość do zgłoszenia PCN</h1>
        <p className="mt-1 mb-6 text-sm text-slate-500">
          Lista kontrolna danych wymaganych do zgłoszenia mieszaniny do ośrodków zatruć (art. 45 CLP, zał. VIII).
          Samo zgłoszenie wykonuje się w portalu ECHA (format PCN/IUCLID).
        </p>

        <div
          className={`mb-5 rounded-xl border p-4 ${
            ready ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'
          }`}
        >
          <p className={`font-semibold ${ready ? 'text-emerald-800' : 'text-amber-800'}`}>
            {ready ? '✓ Dokument zawiera komplet danych do przygotowania zgłoszenia PCN.' : '! Uzupełnij brakujące pozycje przed zgłoszeniem.'}
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <ul className="divide-y divide-slate-100">
            {items.map((it, i) => (
              <li key={i} className="flex items-start gap-3 px-4 py-3">
                <span className={`mt-0.5 w-5 shrink-0 text-center font-bold ${STYLE[it.status]}`}>{ICON[it.status]}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">{it.label}</p>
                  {it.detail && <p className="mt-0.5 text-xs text-slate-500">{it.detail}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6">
          <PcnExport productName={doc.productName} summary={summary} />
        </div>
      </main>
    </Shell>
  );
}
