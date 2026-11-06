'use client';

import Link from 'next/link';
import { useState } from 'react';
import { STANDALONE_CSS } from './standalone-css';

/**
 * Pasek narzędzi podglądu.
 *
 * Eksport HTML działa po stronie klienta: bierze już wyrenderowany
 * fragment `.print-root` z DOM i pakuje go w samodzielny plik z osadzonym
 * arkuszem stylów. Dzięki temu wynik jest dokładnie tym, co widać na ekranie,
 * a plik nie ma żadnych zależności zewnętrznych (piktogramy to inline SVG).
 */
export function PrintBar({
  documentId,
  productName,
  htmlExport = true,
  children,
}: {
  documentId: string;
  productName: string;
  htmlExport?: boolean;
  children?: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);

  const downloadHtml = () => {
    setBusy(true);
    try {
      const root = document.querySelector('.print-root');
      if (!root) return;

      const html = `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Karta charakterystyki — ${escapeHtml(productName)}</title>
<style>
${STANDALONE_CSS}
</style>
</head>
<body>
${root.outerHTML}
</body>
</html>`;

      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slug(productName)}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="no-print sticky top-0 z-30 border-b border-slate-300 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-5 py-3">
        <Link href={`/dokumenty/${documentId}`} className="btn-ghost">
          ← Wróć do edytora
        </Link>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">{productName}</span>
        {children}
        {htmlExport && (
          <button onClick={downloadHtml} disabled={busy} className="btn-outline">
            Pobierz HTML
          </button>
        )}
        <button onClick={() => window.print()} className="btn-primary">
          Drukuj / Zapisz jako PDF
        </button>
      </div>
      <p className="mx-auto max-w-[1600px] px-5 pb-2 text-xs text-slate-500">
        Aby zapisać PDF: <strong>Drukuj</strong> → miejsce docelowe <strong>„Zapisz jako PDF”</strong> → format{' '}
        <strong>A4</strong>, marginesy <strong>domyślne</strong>.
      </p>
    </div>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
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
