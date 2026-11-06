'use client';

/** Eksport podsumowania danych do zgłoszenia PCN jako plik JSON (F4.4). */
export function PcnExport({ productName, summary }: { productName: string; summary: unknown }) {
  const download = () => {
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pcn-${slug(productName)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex items-center gap-3">
      <button onClick={download} className="btn-outline">
        Pobierz dane do zgłoszenia (JSON)
      </button>
      <span className="text-xs text-slate-500">
        Zestaw danych (skład, klasyfikacja, UFI) do przeniesienia do portalu PCN ECHA.
      </span>
    </div>
  );
}

function slug(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}
