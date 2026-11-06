'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { forceLock, lockResource, unlockResource } from '@/server/actions/locks';
import { LOCK_HEARTBEAT_MS, type LockResource, type LockState } from '@/lib/locks';
import { toast } from '@/components/ui/toast';

/**
 * Blokada edycji zasobu po stronie klienta:
 *  - przejmuje blokadę po zamontowaniu (gdy wolna) i odnawia ją heartbeatem,
 *  - gdy edytuje ktoś inny — tryb tylko do odczytu i cykliczne sprawdzanie,
 *  - po przejęciu blokady zwolnionej przez innego użytkownika przeładowuje stronę
 *    (dane mogły się zmienić), a przy opuszczeniu strony zwalnia blokadę.
 */
export function useEditLock(resource: LockResource, initial: LockState, canEdit: boolean) {
  const [state, setState] = useState<LockState>(initial);
  const hadForeignHolder = useRef(!!initial.holder);
  const wasMine = useRef(initial.mine);

  const apply = useCallback((next: LockState) => {
    if (next.mine && !wasMine.current && hadForeignHolder.current) {
      toast('Blokada zwolniona — wczytuję aktualną wersję…', 'info');
      window.location.reload();
      return;
    }
    if (!next.mine && wasMine.current) toast(next.holder ? `Edycję przejął: ${next.holder.name}` : 'Utracono blokadę edycji.', 'error');
    if (next.holder) hadForeignHolder.current = true;
    wasMine.current = next.mine;
    setState(next);
  }, []);

  const check = useCallback(async () => {
    if (!canEdit) return;
    try {
      apply(await lockResource(resource));
    } catch {
      // chwilowy brak połączenia — kolejna próba przy następnym takcie
    }
  }, [apply, canEdit, resource]);

  const takeOver = useCallback(async () => {
    hadForeignHolder.current = true;
    wasMine.current = false;
    apply(await forceLock(resource));
  }, [apply, resource]);

  useEffect(() => {
    if (!canEdit) return;
    void check();
    const timer = setInterval(check, LOCK_HEARTBEAT_MS);
    const onVisible = () => document.visibilityState === 'visible' && void check();
    const release = () => {
      if (wasMine.current) navigator.sendBeacon('/api/locks/release', JSON.stringify({ resource }));
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pagehide', release);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pagehide', release);
      if (wasMine.current) void unlockResource(resource);
    };
  }, [canEdit, check, resource]);

  return { state, editable: canEdit && state.mine, check, takeOver };
}
