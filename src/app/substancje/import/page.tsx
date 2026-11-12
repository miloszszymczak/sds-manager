import { requirePageUser } from '@/server/auth/guard';
import { Shell, Crumbs } from '@/components/Shell';
import { AnnexViImport } from '@/components/substances/AnnexViImport';

export const dynamic = 'force-dynamic';

export default async function AnnexViImportPage() {
  await requirePageUser('EDITOR');
  return (
    <Shell active="substancje">
      <main className="mx-auto max-w-[1100px] px-5 py-8">
        <Crumbs items={[{ href: '/substancje', label: 'Substancje' }, { label: 'Import z zał. VI CLP' }]} />
        <h1 className="text-2xl font-semibold tracking-tight">Import klasyfikacji zharmonizowanej (zał. VI CLP)</h1>
        <p className="mt-1 mb-6 text-sm text-slate-500">
          Uzupełnia bibliotekę substancji o klasy, specyficzne stężenia graniczne, współczynniki M i ATE z tabeli 3 zał. VI.
        </p>
        <AnnexViImport />
      </main>
    </Shell>
  );
}
