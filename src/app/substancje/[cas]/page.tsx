import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/server/db';
import { requirePageUser } from '@/server/auth/guard';
import { hasRole } from '@/lib/roles';
import { Shell, Crumbs } from '@/components/Shell';
import { SubstanceMeta } from '@/components/substances/SubstanceMeta';
import { HazardEditor } from '@/components/substances/HazardEditor';
import { VerifyControl } from '@/components/substances/VerifyControl';
import { ActionButton } from '@/components/ui/ActionButton';
import { deleteSubstance } from '@/server/actions/substances';

export const dynamic = 'force-dynamic';

export default async function SubstancePage({ params }: { params: Promise<{ cas: string }> }) {
  const user = await requirePageUser();
  const cas = decodeURIComponent((await params).cas);
  const s = await prisma.substance.findUnique({
    where: { cas },
    include: {
      hazards: { orderBy: { position: 'asc' } },
      mixtureComponents: { select: { mixture: { select: { id: true, name: true } } }, distinct: ['mixtureId'] },
    },
  });
  if (!s) notFound();
  const readOnly = !hasRole(user.role, 'EDITOR');

  return (
    <Shell active="substancje">
      <main className="mx-auto max-w-[1100px] px-5 py-8">
        <Crumbs items={[{ href: '/substancje', label: 'Substancje' }, { label: s.name }]} />
        <div className="mb-2 flex items-baseline justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">{s.name}</h1>
          <span className="font-mono text-sm text-slate-500">CAS {s.cas}</span>
        </div>
        <p className="mb-6 text-sm text-slate-500">
          Dane strukturalne (współczynnik M, ATE, stężenia graniczne) zasilają silnik klasyfikacji mieszanin.
          {s.mixtureComponents.length > 0 && (
            <>
              {' '}Składnik mieszanin:{' '}
              {s.mixtureComponents.map((c, i) => (
                <span key={c.mixture.id}>
                  {i > 0 && ', '}
                  <Link href={`/mieszaniny/${c.mixture.id}`} className="text-brand-700 hover:underline">
                    {c.mixture.name}
                  </Link>
                </span>
              ))}
              .
            </>
          )}
        </p>

        <div className="space-y-6">
          <VerifyControl cas={s.cas} lastVerified={s.lastVerified?.toISOString() ?? null} sourceRef={s.sourceRef} />
          <SubstanceMeta
            key={s.cas}
            readOnly={readOnly}
            initial={{
              cas: s.cas,
              name: s.name,
              nameEn: s.nameEn,
              ecNumber: s.ecNumber,
              indexNumber: s.indexNumber,
              reachNumber: s.reachNumber,
              molecularFormula: s.molecularFormula,
              molarMass: s.molarMass,
              density: s.density,
              sclNotes: s.sclNotes,
              notes: s.notes,
              isSvhc: s.isSvhc,
            }}
          />
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <HazardEditor
              cas={s.cas}
              readOnly={readOnly}
              initial={s.hazards.map(({ id: _id, substanceCas: _c, position: _p, ...h }) => h)}
            />
          </div>
          {!readOnly && s.mixtureComponents.length === 0 && (
            <ActionButton
              action={deleteSubstance.bind(null, s.cas)}
              confirm={`Usunąć substancję „${s.name}” z biblioteki?`}
              success="Usunięto substancję."
              redirectTo="/substancje"
              className="btn-danger"
            >
              Usuń substancję
            </ActionButton>
          )}
        </div>
      </main>
    </Shell>
  );
}
