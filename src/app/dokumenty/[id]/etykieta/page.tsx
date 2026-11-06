import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma, asObject } from '@/server/db';
import { requirePageUser } from '@/server/auth/guard';
import { formatMass, packetMass, variantFactor, type Unit } from '@/lib/mixture';
import { buildLabel } from '@/lib/label/build';
import { LabelRenderer } from '@/components/label/LabelRenderer';
import { PrintBar } from '@/components/render/PrintBar';
import { HAZARD_STATEMENT_BY_CODE } from '@/data/hazard-statements';

export const dynamic = 'force-dynamic';

export default async function LabelPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageUser();
  const { id } = await params;
  const doc = await prisma.document.findUnique({
    where: { id },
    include: {
      supplier: true,
      sections: { where: { number: { in: [1, 2] } } },
      components: { select: { name: true, hazardStatements: true } },
      variant: { include: { mixture: { include: { components: { include: { substance: { select: { density: true } } } } } } } },
    },
  });
  if (!doc) notFound();

  const s2 = asObject(doc.sections.find((s) => s.number === 2)?.data);
  const s1 = asObject(doc.sections.find((s) => s.number === 1)?.data);
  const dostawca = (s1.dostawca ?? {}) as Record<string, string>;

  // Składniki uczulające / nazwane do zwrotu „Zawiera" — z zwrotów H składników.
  const named = doc.components.filter((c) => c.hazardStatements.some((h) => ['H317', 'H334'].includes(h))).map((c) => c.name);

  // Ilość nominalna: masa netto opakowania w wariancie objętościowym.
  const mixture = doc.variant?.mixture;
  const nominalQuantity =
    mixture && doc.packetId
      ? formatMass(
          packetMass(
            mixture.components.map((c) => ({ key: c.id, packetId: c.packetId, quantity: c.quantity, unit: c.unit as Unit, density: c.substance.density })),
            doc.packetId,
            variantFactor(doc.variant!.volumeMl, mixture.basisVolumeMl),
          ),
        )
      : null;

  const label = buildLabel({
    productName: doc.productName,
    ufi: doc.ufi,
    nominalQuantity,
    supplier: {
      name: dostawca.przedsiebiorstwo || doc.supplier?.name || '',
      address: dostawca.adres || '',
      phone: dostawca.telefon || doc.supplier?.phone || '',
    },
    pictograms: (s2.piktogramy as string[]) ?? [],
    signalWord: (s2.hasloOstrzegawcze as string) ?? null,
    hazardStatements: (s2.zwrotyH as string[]) ?? [],
    precautionaryStatements: (s2.zwrotyP as string[]) ?? [],
    supplementalText: (s2.informacjeDodatkowe as string) ?? '',
    namedComponents: named,
  });

  // sanity: pomiń zwroty bez treści (spójne z walidatorem)
  label.hazardStatements = label.hazardStatements.filter((h) => HAZARD_STATEMENT_BY_CODE.get(h.code));

  return (
    <div className="min-h-full bg-slate-200 print:bg-white">
      <PrintBar documentId={id} productName={`Etykieta — ${doc.productName}`} htmlExport={false} />
      <div className="py-8 print:py-0">
        <div className="mx-auto mb-4 max-w-[150mm] print:hidden">
          <Link href={`/dokumenty/${id}`} className="text-sm text-brand-700 hover:underline">
            ← Wróć do karty
          </Link>
        </div>
        <LabelRenderer label={label} />
        <p className="no-print mx-auto mt-4 max-w-[150mm] text-xs text-slate-500">
          Etykieta wygenerowana z sekcji 2 karty. Zweryfikuj dobór zwrotów P i rozmiar etykiety przed drukiem.
        </p>
      </div>
    </div>
  );
}
