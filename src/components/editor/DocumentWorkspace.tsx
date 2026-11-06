'use client';

import { documentLock, type LockState } from '@/lib/locks';
import { useEditLock } from '@/components/locks/useEditLock';
import { LockBanner } from '@/components/locks/LockBanner';
import { DocumentHeader, type DocumentContext } from './DocumentHeader';
import { DocumentEditor, type EditorProps } from './DocumentEditor';

type Props = Omit<EditorProps, 'editable' | 'onWriteError' | 'linkedToMixture'> & {
  status: 'SZKIC' | 'DO_PRZEGLADU' | 'ZATWIERDZONA';
  context: DocumentContext | null;
  lock: LockState;
  canEdit: boolean;
  isAdmin: boolean;
};

/** Edycja karty pod blokadą: pasek blokady, nagłówek i edytor sekcji. */
export function DocumentWorkspace({ context, lock, canEdit, isAdmin, ...editor }: Props) {
  const { state, editable, check, takeOver } = useEditLock(documentLock(editor.documentId), lock, canEdit);
  return (
    <>
      <LockBanner state={state} canEdit={canEdit} isAdmin={isAdmin} onTakeOver={takeOver} what="dokument" />
      <DocumentHeader
        documentId={editor.documentId}
        productName={editor.productName}
        version={editor.version}
        status={editor.status}
        ufi={editor.ufi}
        context={context}
        editable={editable}
        onWriteError={check}
      />
      <DocumentEditor {...editor} editable={editable} onWriteError={check} linkedToMixture={!!context} />
    </>
  );
}
