import { prisma } from '@/server/db';
import { requirePageUser } from '@/server/auth/guard';
import { deleteSectionTemplate } from '@/server/actions/templates';
import { Shell } from '@/components/Shell';
import { ActionButton } from '@/components/ui/ActionButton';
import { hasRole } from '@/lib/roles';
import { SECTION_BY_NUMBER } from '@/lib/schema/sections';

export const dynamic = 'force-dynamic';

export default async function TemplatesPage() {
  const user = await requirePageUser();
  const templates = await prisma.sectionTemplate.findMany({ orderBy: [{ section: 'asc' }, { name: 'asc' }] });

  return (
    <Shell active="szablony">
      <main className="mx-auto max-w-[1000px] px-5 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Szablony sekcji</h1>
        <p className="mt-1 mb-6 text-sm text-slate-500">
          Wielokrotnego użytku treść sekcji. Zapisuj szablony w edytorze („Zapisz jako szablon”) i wstawiaj je do nowych
          kart. Przydatne dla sekcji, które w całym katalogu są niemal identyczne (4–8, 10, 13, 15).
        </p>

        {templates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-12 text-center text-slate-500">
            Brak szablonów. Otwórz kartę, przejdź do sekcji i użyj „Zapisz jako szablon”.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="w-24 px-4 py-3">Sekcja</th>
                  <th className="px-4 py-3">Nazwa</th>
                  <th className="px-4 py-3">Zakres</th>
                  <th className="w-24 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {templates.map((t) => (
                  <tr key={t.id} className="group hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <span className="badge bg-brand-50 text-brand-700">Sekcja {t.section}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{t.name}</td>
                    <td className="px-4 py-3 text-slate-500">{SECTION_BY_NUMBER.get(t.section)?.shortTitle ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {hasRole(user.role, 'EDITOR') && (
                        <ActionButton
                          action={deleteSectionTemplate.bind(null, t.id)}
                          confirm={`Usunąć szablon „${t.name}”?`}
                          className="btn-danger opacity-0 transition group-hover:opacity-100"
                        >
                          Usuń
                        </ActionButton>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </Shell>
  );
}
