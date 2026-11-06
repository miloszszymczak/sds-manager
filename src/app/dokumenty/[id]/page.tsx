import { notFound } from 'next/navigation';
import { prisma, asObject } from '@/server/db';
import { requirePageUser } from '@/server/auth/guard';
import { readLock } from '@/server/locks';
import { toSectionMap, componentView } from '@/server/documents';
import { documentLock } from '@/lib/locks';
import { hasRole } from '@/lib/roles';
import { formatVolume } from '@/lib/mixture';
import { Shell } from '@/components/Shell';
import { DocumentWorkspace } from '@/components/editor/DocumentWorkspace';

export const dynamic = 'force-dynamic';

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser();
  const { id } = await params;

  const [doc, substances, wasteCatalog, legalCatalog, templates, lock] = await Promise.all([
    prisma.document.findUnique({
      where: { id },
      include: {
        sections: true,
        components: { orderBy: { position: 'asc' } },
        packet: true,
        variant: { include: { mixture: { select: { id: true, name: true } } } },
        dilution: { include: { mixture: { select: { id: true, name: true } } } },
      },
    }),
    prisma.substance.findMany({ orderBy: { name: 'asc' }, select: { cas: true, name: true } }),
    prisma.wasteCode.findMany({ orderBy: { code: 'asc' } }),
    prisma.legalReference.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
    prisma.sectionTemplate.findMany({ orderBy: { name: 'asc' } }),
    readLock(documentLock(id), user),
  ]);
  if (!doc) notFound();

  const mixture = doc.variant?.mixture ?? doc.dilution?.mixture ?? null;
  const context = mixture
    ? {
        mixtureId: mixture.id,
        mixtureName: mixture.name,
        variant: doc.variant ? formatVolume(doc.variant.volumeMl) : doc.dilution ? doc.dilution.name : null,
        packet: doc.packet?.label ? doc.packet.name || `część ${doc.packet.label}` : null,
      }
    : null;

  return (
    <Shell active="dokumenty">
      <DocumentWorkspace
        documentId={doc.id}
        productName={doc.productName}
        version={doc.version}
        status={doc.status}
        ufi={doc.ufi}
        context={context}
        lock={lock}
        canEdit={hasRole(user.role, 'EDITOR')}
        isAdmin={user.role === 'ADMIN'}
        sectionData={toSectionMap(doc.sections)}
        components={doc.components.map((c) => ({ id: c.id, ...componentView(c) }))}
        substances={substances}
        wasteCatalog={wasteCatalog}
        legalCatalog={legalCatalog}
        templates={templates.map((t) => ({ id: t.id, name: t.name, section: t.section, data: asObject(t.data) }))}
      />
    </Shell>
  );
}
