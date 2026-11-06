import { notFound } from 'next/navigation';
import { requirePageUser } from '@/server/auth/guard';
import { buildRenderData } from '@/server/documents';
import { DocumentRenderer } from '@/components/render/DocumentRenderer';
import { PrintBar } from '@/components/render/PrintBar';
import { LanguageSwitch } from '@/components/render/LanguageSwitch';

export const dynamic = 'force-dynamic';

export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  await requirePageUser();
  const { id } = await params;
  const { lang: langParam } = await searchParams;
  const lang = langParam === 'en' ? 'en' : 'pl';

  const data = await buildRenderData(id);
  if (!data) notFound();
  data.lang = lang;

  return (
    <div className="min-h-full bg-slate-200 print:bg-white">
      <PrintBar documentId={id} productName={data.productName}>
        <LanguageSwitch current={lang} />
      </PrintBar>
      {lang !== 'pl' && (
        <div className="no-print mx-auto mt-4 max-w-[210mm] rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          Podgląd wielojęzyczny: przetłumaczono standaryzowane zwroty H/P. Etykiety sekcji i treść wpisana ręcznie
          pozostają po polsku — nie używać jako oficjalnej karty w innym języku bez pełnego tłumaczenia.
        </div>
      )}
      <div className="py-8 print:py-0">
        <DocumentRenderer data={data} />
      </div>
    </div>
  );
}
