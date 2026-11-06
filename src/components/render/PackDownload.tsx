'use client';

import { useState } from 'react';
import JSZip from 'jszip';
import { STANDALONE_CSS } from './standalone-css';

/**
 * Pobiera paczkę produktu (F4.5): zbiera wyrenderowane karty (`.print-root`
 * z atrybutem data-filename) obecne na stronie, pakuje każdą w samodzielny
 * plik HTML i tworzy archiwum ZIP. Wszystko po stronie klienta — bez zależności
 * zewnętrznych w wynikowych plikach (piktogramy to inline SVG).
 */
export function PackDownload({ folderName }: { folderName: string }) {
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      const zip = new JSZip();
      const roots = document.querySelectorAll<HTMLElement>('[data-card] .print-root');
      roots.forEach((root) => {
        const card = root.closest<HTMLElement>('[data-card]');
        const filename = card?.dataset.filename ?? 'karta';
        const title = card?.dataset.title ?? filename;
        zip.file(`${filename}.html`, standalone(title, root.outerHTML));
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slug(folderName)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button onClick={download} disabled={busy} className="btn-primary">
      {busy ? 'Pakuję…' : 'Pobierz paczkę produktu (ZIP)'}
    </button>
  );
}

function standalone(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="pl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Karta charakterystyki — ${escapeHtml(title)}</title>
<style>${STANDALONE_CSS}</style></head>
<body>${body}</body></html>`;
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
