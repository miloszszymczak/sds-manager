import type { LabelModel } from '@/lib/label/build';

/**
 * Podgląd etykiety CLP (B2). Piktogramy jako inline SVG (czerwony romb).
 * Layout zbliżony do drukowanej etykiety; rozmiar piktogramów spełnia
 * regułę ≥ 1/15 powierzchni i ≥ 1 cm².
 */
export function LabelRenderer({ label }: { label: LabelModel }) {
  return (
    <div className="print-label mx-auto max-w-[150mm] border-2 border-black bg-white p-[8mm] text-black">
      {/* Nazwa produktu */}
      <h1 className="text-center text-[15pt] leading-tight font-bold">{label.productName}</h1>

      {/* Piktogramy */}
      {label.pictograms.length > 0 && (
        <div className="my-3 flex flex-wrap justify-center gap-3">
          {label.pictograms.map((p) => (
            <div key={p.code} className="h-[18mm] w-[18mm]" dangerouslySetInnerHTML={{ __html: p.svg }} />
          ))}
        </div>
      )}

      {/* Hasło ostrzegawcze */}
      {label.signalWord && (
        <p className="text-center text-[13pt] font-bold" style={{ color: label.signalWord === 'NIEBEZPIECZEŃSTWO' ? '#c00' : '#000' }}>
          {label.signalWord}
        </p>
      )}

      {/* Zwroty H */}
      {label.hazardStatements.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-[10pt]">
          {label.hazardStatements.map((h) => (
            <li key={h.code}>
              <strong>{h.code}</strong> {h.text}
            </li>
          ))}
        </ul>
      )}

      {/* Zwroty P */}
      {label.precautionaryStatements.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-[10pt]">
          {label.precautionaryStatements.map((p) => (
            <li key={p.code}>
              <strong>{p.code}</strong> {p.text}
            </li>
          ))}
        </ul>
      )}

      {/* Uzupełniające / EUH */}
      {label.supplemental.length > 0 && (
        <p className="mt-2 text-[10pt]">{label.supplemental.join(' · ')}</p>
      )}

      {/* Zawiera */}
      {label.contains.length > 0 && (
        <p className="mt-2 text-[10pt]">
          <strong>Zawiera:</strong> {label.contains.join(', ')}
        </p>
      )}

      {/* Stopka: dostawca + UFI */}
      <div className="mt-3 border-t border-black pt-2 text-[9pt]">
        <p className="font-semibold">{label.supplier.name}</p>
        {label.supplier.address && <p>{label.supplier.address}</p>}
        {label.supplier.phone && <p>tel. {label.supplier.phone}</p>}
        {label.nominalQuantity && (
          <p>
            <strong>Zawartość netto:</strong> {label.nominalQuantity}
          </p>
        )}
        {label.ufi && (
          <p className="mt-1 font-mono">
            <strong>UFI:</strong> {label.ufi}
          </p>
        )}
      </div>
    </div>
  );
}
