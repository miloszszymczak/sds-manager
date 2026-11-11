'use client';

import type { LockState } from '@/lib/locks';

/** Pasek stanu blokady: kto edytuje, tryb tylko do odczytu, przejęcie (admin). */
export function LockBanner({
  state,
  canEdit,
  isAdmin,
  onTakeOver,
  what = 'dokument',
}: {
  state: LockState;
  canEdit: boolean;
  isAdmin: boolean;
  onTakeOver: () => void;
  what?: string;
}) {
  if (!canEdit) {
    return (
      <div className="no-print border-b border-slate-200 bg-slate-50 px-5 py-2 text-center text-xs text-slate-600">
        Masz uprawnienia tylko do podglądu — edycja wyłączona.
      </div>
    );
  }
  // Brak właściciela = blokada właśnie jest przejmowana (ułamek sekundy) — bez migania paskiem.
  const holder = state.holder;
  if (state.mine || !holder) return null;
  return (
    <div className="no-print flex flex-wrap items-center justify-center gap-3 border-b border-amber-200 bg-amber-50 px-5 py-2 text-sm text-amber-900">
      <span>
        🔒 Ten {what} edytuje teraz <strong>{holder.name}</strong> — tryb tylko do odczytu. Edycja odblokuje się
        automatycznie, gdy zakończy pracę.
      </span>
      {isAdmin && (
        <button
          className="btn-outline px-2 py-1 text-xs"
          onClick={() => confirm(`Przejąć edycję od: ${holder.name}? Jego niezapisane zmiany mogą przepaść.`) && onTakeOver()}
        >
          Przejmij edycję
        </button>
      )}
    </div>
  );
}
