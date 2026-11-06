/**
 * Arkusz stylów osadzany w eksportowanym pliku HTML.
 *
 * Renderer emituje semantyczny HTML (h1/h2/h3, table, ul, figure), więc
 * wystarczy ostylować elementy — plus kilka „shimów” na klasy narzędziowe
 * Tailwinda, które faktycznie pojawiają się w wyniku.
 */
export const STANDALONE_CSS = `
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: #e2e8f0;
    font-family: "Times New Roman", Georgia, serif;
    font-size: 10.5pt; line-height: 1.45; color: #000;
  }
  .print-root {
    max-width: 210mm; margin: 24px auto; background: #fff; padding: 16mm;
    box-shadow: 0 4px 24px rgba(0,0,0,.12);
  }

  h1 { font-size: 14pt; text-align: center; font-weight: 700; margin: 0 0 18px; }
  h2 {
    font-size: 12pt; font-weight: 700; background: #e5e5e5;
    border-left: 4px solid #404040; padding: 4px 8px; margin: 18px 0 8px;
  }
  h3 { font-size: 11pt; font-weight: 600; margin: 10px 0 4px; }
  p  { margin: 0 0 6px; }
  ul { margin: 0 0 6px; padding-left: 20px; }
  li { margin: 1px 0; }
  strong { font-weight: 700; }

  table { width: 100%; border-collapse: collapse; margin: 4px 0 10px; font-size: 9.5pt; }
  th, td { border: 1px solid #525252; padding: 3px 5px; text-align: left; vertical-align: top; }
  th { background: #e5e5e5; font-weight: 600; }

  /* Nagłówek w ramce */
  .print-root > header { border: 2px solid #000; padding: 6px 10px; text-align: center; margin-bottom: 14px; }
  .print-root > header > div:first-child { font-size: 13pt; font-weight: 700; }
  .print-root > header > div:last-child  { font-size: 9.5pt; }

  /* Piktogramy GHS */
  figure { display: inline-block; margin: 0 12px 8px 0; width: 70px; text-align: center; vertical-align: top; }
  figure > div { width: 62px; height: 62px; margin: 0 auto; }
  figure svg { width: 100%; height: 100%; }
  figcaption { margin-top: 2px; font-size: 8pt; line-height: 1.2; }

  footer {
    margin-top: 22px; border-top: 1px solid #a3a3a3; padding-top: 6px;
    text-align: center; font-size: 8.5pt; color: #525252;
  }

  /* Shimy klas narzędziowych używanych przez renderer */
  .whitespace-pre-wrap { white-space: pre-wrap; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .italic { font-style: italic; }
  .font-semibold { font-weight: 600; }
  .font-bold { font-weight: 700; }
  .text-red-700 { color: #b91c1c; }
  .text-neutral-500 { color: #737373; }
  .text-neutral-600 { color: #525252; }

  @media print {
    body { background: #fff; }
    .print-root { margin: 0; padding: 0; max-width: none; box-shadow: none; }
    .print-section { break-inside: avoid; }
    h2 { break-after: avoid; }
    tr { break-inside: avoid; }
    thead { display: table-header-group; }
  }
`;
