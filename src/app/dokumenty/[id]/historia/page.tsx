import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/server/db';
import { requirePageUser } from '@/server/auth/guard';
import { Shell } from '@/components/Shell';
import { PublishVersion } from '@/components/versioning/PublishVersion';
import { ActionButton } from '@/components/ui/ActionButton';
import { deleteSnapshot } from '@/server/actions/documents';
import { hasRole } from '@/lib/roles';
import { diffSnapshots, summarizeDiff, type Snapshot } from '@/lib/versioning/diff';

export const dynamic = 'force-dynamic';

export default async function HistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser();
  const { id } = await params;
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) notFound();

  const snapshots = await prisma.documentSnapshot.findMany({
    where: { documentId: id },
    orderBy: { createdAt: 'desc' },
  });

  // Diff każdej wersji względem poprzedniej (starszej).
  const rows = snapshots.map((snap, i) => {
    const older = snapshots[i + 1];
    let change = 'pierwsze wydanie';
    if (older) {
      const a = (older.payload as unknown as Snapshot | null);
      const b = (snap.payload as unknown as Snapshot | null);
      if (a && b) change = summarizeDiff(diffSnapshots(a, b));
    }
    return { snap, change };
  });

  return (
    <Shell active="dokumenty">
      <main className="mx-auto max-w-[900px] px-5 py-8">
        <div className="mb-5 flex items-center gap-2 text-sm text-slate-400">
          <Link href="/" className="hover:text-slate-600">
            Dokumenty
          </Link>
          <span>/</span>
          <Link href={`/dokumenty/${id}`} className="hover:text-slate-600">
            {doc.productName}
          </Link>
          <span>/</span>
          <span className="text-slate-600">Historia wersji</span>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">Historia wersji</h1>
        <p className="mt-1 mb-6 text-sm text-slate-500">
          Wydanie wersji zamraża niezmienną migawkę treści. Zmiany względem poprzedniej wersji są automatycznie
          dopisywane do sekcji 16.
        </p>

        <div className="mb-8">
          {hasRole(user.role, 'EDITOR') && <PublishVersion documentId={id} currentVersion={doc.version} />}
        </div>

        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-10 text-center text-slate-500">
            Brak wydanych wersji. Użyj „Wydaj wersję” powyżej, aby zapisać pierwszą migawkę.
          </div>
        ) : (
          <ol className="relative space-y-4 border-l border-slate-200 pl-6">
            {rows.map(({ snap, change }, i) => (
              <li key={snap.id} className="relative">
                <span
                  className={`absolute top-1.5 -left-[27px] h-3 w-3 rounded-full border-2 border-white ${
                    i === 0 ? 'bg-brand-600' : 'bg-slate-300'
                  }`}
                />
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="badge bg-brand-50 text-brand-700">Wersja {snap.version}</span>
                      {i === 0 && <span className="badge bg-emerald-100 text-emerald-800">najnowsza</span>}
                      <span className="text-xs text-slate-400">
                        {new Date(snap.createdAt).toLocaleString('pl-PL')}
                      </span>
                    </div>
                    {user.role === 'ADMIN' && (
                      <ActionButton
                        action={deleteSnapshot.bind(null, snap.id)}
                        confirm={`Usunąć migawkę wersji ${snap.version}?`}
                        className="btn-danger px-2 text-xs"
                      >
                        Usuń
                      </ActionButton>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{change}</p>
                  {snap.note && <p className="mt-1 text-xs text-slate-500 italic">Notatka: {snap.note}</p>}
                  {snap.createdBy && <p className="mt-1 text-xs text-slate-400">wydał(a): {snap.createdBy}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </main>
    </Shell>
  );
}
