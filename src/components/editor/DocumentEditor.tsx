'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { SECTIONS, type FieldDef } from '@/lib/schema/sections';
import { saveSectionFields, syncDocumentComposition } from '@/server/actions/documents';
import { pictogramsForClasses, statementsForClasses, strongestSignalWord } from '@/data/hazard-classes';
import { section2FromClasses } from '@/lib/classification/suggest';
import { attempt, call } from '@/components/ui/toast';
import {
  TextField,
  ListField,
  TableField,
  KeyValueField,
  SignalWordField,
  BooleanField,
  TransportField,
} from '@/components/fields/BasicFields';
import {
  HazardStatementsField,
  PrecautionaryStatementsField,
  HazardClassesField,
  PictogramsField,
  WasteCodesField,
  LegalRefsField,
} from '@/components/fields/CatalogFields';
import { ComponentsField, type ComponentRow, type SubstanceOption } from '@/components/fields/ComponentsField';
import { ClassificationPanel } from '@/components/classification/ClassificationPanel';
import { ValidationPanel, buildValidationInput } from '@/components/validation/ValidationPanel';
import { validateDocument, summarize } from '@/lib/validation/rules';
import { PhotochemPresets } from '@/components/editor/PhotochemPresets';
import { SectionTemplateControls, type SectionTemplate } from '@/components/editor/SectionTemplateControls';

export interface EditorProps {
  documentId: string;
  /** Czy bieżący użytkownik trzyma blokadę edycji */
  editable: boolean;
  /** Wywoływane po nieudanym zapisie (np. utrata blokady) */
  onWriteError: () => void;
  /** Karta powiązana z mieszaniną — można odtworzyć sekcję 3 ze składu */
  linkedToMixture: boolean;
  productName: string;
  version: string;
  status: string;
  ufi: string | null;
  sectionData: Record<number, Record<string, unknown>>;
  components: ComponentRow[];
  substances: SubstanceOption[];
  wasteCatalog: { code: string; descriptionPl: string; isHazardous: boolean }[];
  legalCatalog: { id: string; title: string; journalRef: string | null; category: string }[];
  templates: SectionTemplate[];
}

/** Wartości uznawane za „puste” przy liczeniu postępu (m.in. domyślne wypełnienia). */
const PLACEHOLDERS = new Set(['', 'brak dostępnych danych', 'nie dotyczy', '—']);

function isMeaningful(text: unknown): boolean {
  const s = String(text ?? '')
    .trim()
    .toLowerCase();
  return s.length > 0 && !PLACEHOLDERS.has(s);
}

/** Ile pól sekcji ma merytoryczną treść — steruje wskaźnikiem postępu w nawigacji. */
function completeness(data: Record<string, unknown> | undefined): number {
  if (!data) return 0;
  const values = Object.values(data);
  if (values.length === 0) return 0;
  const filled = values.filter((v) => {
    if (v == null) return false;
    if (typeof v === 'string') return isMeaningful(v);
    if (typeof v === 'boolean') return false; // domyślne przełączniki nie świadczą o postępie
    if (Array.isArray(v)) return v.some((x) => (typeof x === 'object' ? Object.values(x).some(isMeaningful) : isMeaningful(x)));
    if (typeof v === 'object') return Object.values(v as object).some(isMeaningful);
    return true;
  }).length;
  return filled / values.length;
}

export function DocumentEditor(props: EditorProps) {
  const { documentId } = props;
  const [active, setActive] = useState(1);
  const [showValidation, setShowValidation] = useState(false);
  const section = SECTIONS.find((s) => s.number === active)!;

  // Lokalna, autorytatywna kopia danych sekcji. Dzięki niej podpowiedzi
  // (klasyfikacja → oznakowanie) i wskaźniki postępu reagują natychmiast,
  // a zapis do bazy odbywa się w tle bez odświeżania całej strony.
  const [sectionData, setSectionData] = useState<Record<number, Record<string, unknown>>>(props.sectionData);

  const progress = useMemo(
    () => Object.fromEntries(SECTIONS.map((s) => [s.number, completeness(sectionData[s.number])])),
    [sectionData],
  );

  // Walidacja spójności — na żywo, po stronie klienta, na bieżącym stanie
  const validationInput = useMemo(
    () => buildValidationInput(sectionData, props.components, props.ufi, props.version),
    [sectionData, props.components, props.ufi, props.version],
  );
  const validationSummary = useMemo(() => summarize(validateDocument(validationInput)), [validationInput]);

  // Sugestie wynikające z klasyfikacji w sekcji 2.1
  const chosenClasses = useMemo(() => (sectionData[2]?.klasyfikacja as string[] | undefined) ?? [], [sectionData]);
  const suggestedPictograms = useMemo(() => pictogramsForClasses(chosenClasses), [chosenClasses]);
  const suggestedStatements = useMemo(() => statementsForClasses(chosenClasses), [chosenClasses]);
  const suggestedSignalWord = useMemo(() => strongestSignalWord(chosenClasses), [chosenClasses]);

  const { onWriteError } = props;

  /**
   * Zapis pól sekcji: natychmiastowa aktualizacja kopii lokalnej, potem jedno
   * atomowe żądanie (scalenie jsonb po stronie bazy). Błąd → komunikat,
   * stan „błąd zapisu” w polu i ponowne sprawdzenie blokady.
   */
  const saveFields = useCallback(
    async (sectionNumber: number, patch: Record<string, unknown>) => {
      setSectionData((prev) => ({ ...prev, [sectionNumber]: { ...prev[sectionNumber], ...patch } }));
      try {
        await call(saveSectionFields(documentId, sectionNumber, patch));
      } catch (e) {
        onWriteError();
        throw e;
      }
    },
    [documentId, onWriteError],
  );

  const save = useCallback(
    (sectionNumber: number, key: string) => (value: unknown) => saveFields(sectionNumber, { [key]: value }),
    [saveFields],
  );

  /** Wstawia wartość presetu/domeny do pola aktywnej sekcji. */
  const insertValue = useCallback(
    (sectionNumber: number, key: string, value: unknown) => {
      save(sectionNumber, key)(value).catch(() => undefined);
    },
    [save],
  );

  /** Wstawia komplet pól z szablonu do aktywnej sekcji (atomowo). */
  const applyTemplateData = useCallback(
    (sectionNumber: number, data: Record<string, unknown>) => void saveFields(sectionNumber, data).catch(() => undefined),
    [saveFields],
  );

  /** Zastosowanie wyniku silnika klasyfikacji: ustawia komplet pól sekcji 2 (atomowo). */
  const applyClassificationResult = useCallback(
    (classes: string[], statements: string[]) => saveFields(2, section2FromClasses(classes, statements)),
    [saveFields],
  );

  const renderField = (field: FieldDef) => {
    const value = sectionData[active]?.[field.key];
    const onSave = save(active, field.key);
    const key = `${active}-${field.key}`;

    switch (field.type) {
      case 'text':
      case 'textarea':
        return <TextField key={key} field={field} value={(value as string) ?? ''} save={onSave} />;
      case 'list':
        return <ListField key={key} field={field} value={(value as string[]) ?? []} save={onSave} />;
      case 'table':
        return <TableField key={key} field={field} value={(value as Record<string, string>[]) ?? []} save={onSave} />;
      case 'keyValue':
        return <KeyValueField key={key} field={field} value={(value as Record<string, string>) ?? {}} save={onSave} />;
      case 'signalWord':
        return (
          <SignalWordField
            key={key}
            field={field}
            value={(value as string) ?? ''}
            save={onSave}
            suggestion={suggestedSignalWord}
          />
        );
      case 'hazardStatements':
        return (
          <HazardStatementsField
            key={key}
            field={field}
            value={(value as string[]) ?? []}
            save={onSave}
            suggestions={suggestedStatements}
          />
        );
      case 'precautionaryStatements':
        return <PrecautionaryStatementsField key={key} field={field} value={(value as string[]) ?? []} save={onSave} />;
      case 'hazardClasses':
        return <HazardClassesField key={key} field={field} value={(value as string[]) ?? []} save={onSave} />;
      case 'pictograms':
        return (
          <PictogramsField
            key={key}
            field={field}
            value={(value as string[]) ?? []}
            save={onSave}
            suggestions={suggestedPictograms}
          />
        );
      case 'wasteCodes':
        return (
          <WasteCodesField
            key={key}
            field={field}
            value={(value as string[]) ?? []}
            save={onSave}
            catalog={props.wasteCatalog}
          />
        );
      case 'legalRefs':
        return (
          <LegalRefsField
            key={key}
            field={field}
            value={(value as string[]) ?? []}
            save={onSave}
            catalog={props.legalCatalog}
          />
        );
      case 'transport':
        return (
          <TransportField
            key={key}
            field={field}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            value={(value as any) ?? { niePodlega: true, mody: {} }}
            save={onSave}
          />
        );
      case 'boolean':
        return <BooleanField key={key} field={field} value={Boolean(value)} save={onSave} />;
      case 'components':
        return (
          <div key={key}>
            {field.help && <p className="mb-2 text-xs text-slate-500">{field.help}</p>}
            {props.linkedToMixture && (
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-brand-200 bg-brand-50/50 px-3 py-2 text-xs text-brand-900">
                Skład tej karty pochodzi z receptury mieszaniny.
                <button
                  className="btn-outline px-2 py-1 text-xs"
                  onClick={() =>
                    confirm('Odtworzyć sekcję 3 z aktualnego składu mieszaniny? Ręczne zmiany składników zostaną zastąpione.') &&
                    void attempt(syncDocumentComposition(documentId), 'Sekcja 3 odtworzona z mieszaniny.')
                  }
                >
                  Odtwórz z mieszaniny
                </button>
              </div>
            )}
            <ComponentsField
              documentId={documentId}
              components={props.components}
              substances={props.substances}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto flex max-w-[1600px] gap-6 px-5 py-6">
      {/* ── Nawigacja po sekcjach ── */}
      <aside className="no-print sticky top-[4.5rem] flex max-h-[calc(100vh-5.5rem)] w-64 shrink-0 flex-col self-start">
        <nav className="min-h-0 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          {SECTIONS.map((s) => {
            const pct = progress[s.number] ?? 0;
            const isActive = s.number === active;
            return (
              <button
                key={s.number}
                onClick={() => setActive(s.number)}
                className={`flex w-full items-center gap-2.5 border-l-[3px] px-3 py-1.5 text-left transition ${
                  isActive
                    ? 'border-brand-600 bg-brand-50 text-brand-900'
                    : 'border-transparent text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded text-xs font-semibold ${
                    isActive ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {s.number}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{s.shortTitle}</span>
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    pct > 0.66 ? 'bg-emerald-500' : pct > 0.15 ? 'bg-amber-400' : 'bg-slate-200'
                  }`}
                  title={`Wypełnienie: ${Math.round(pct * 100)} %`}
                />
              </button>
            );
          })}
        </nav>

        <div className="mt-3 flex shrink-0 gap-2">
          <button
            onClick={() => setActive((n) => Math.max(1, n - 1))}
            disabled={active === 1}
            className="btn-outline flex-1"
          >
            ← Poprz.
          </button>
          <button
            onClick={() => setActive((n) => Math.min(16, n + 1))}
            disabled={active === 16}
            className="btn-outline flex-1"
          >
            Nast. →
          </button>
        </div>
      </aside>

      {/* ── Treść sekcji ── */}
      <div className="min-w-0 flex-1">
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wider text-brand-600 uppercase">Sekcja {section.number}</p>
            <h2 className="mt-0.5 text-xl font-semibold tracking-tight text-slate-900">{section.title}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SectionTemplateControls
              section={active}
              currentData={sectionData[active] ?? {}}
              templates={props.templates}
              onApply={(data) => applyTemplateData(active, data)}
            />
          <button
            onClick={() => setShowValidation((v) => !v)}
            className={`btn shrink-0 border ${
              validationSummary.errors > 0
                ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                : validationSummary.warnings > 0
                  ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
            title="Sprawdź spójność karty"
          >
            {validationSummary.errors > 0 ? (
              <>✕ {validationSummary.errors} {validationSummary.errors === 1 ? 'błąd' : 'błędów'}</>
            ) : validationSummary.warnings > 0 ? (
              <>! {validationSummary.warnings} ostrzeżeń</>
            ) : (
              <>✓ Spójna</>
            )}
          </button>
          </div>
        </header>

        <fieldset disabled={!props.editable} className="space-y-6">
          {showValidation && (
            <ValidationPanel
              input={validationInput}
              onClose={() => setShowValidation(false)}
              onJump={(s) => setActive(s)}
            />
          )}
          {active === 2 && (
            <ClassificationPanel
              documentId={documentId}
              currentClasses={(sectionData[2]?.klasyfikacja as string[]) ?? []}
              onApply={applyClassificationResult}
            />
          )}
          <PhotochemPresets section={active} onInsert={(key, value) => insertValue(active, key, value)} />
          {section.subsections.map((sub) => (
            <section key={sub.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 flex items-baseline gap-2 border-b border-slate-100 pb-2.5">
                <span className="font-mono text-sm font-semibold text-brand-700">{sub.id}</span>
                <span className="text-[15px] font-medium text-slate-800">{sub.title}</span>
              </h3>
              <div className="space-y-5">{sub.fields.map(renderField)}</div>
            </section>
          ))}
        </fieldset>

        <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4">
          <span className="text-xs text-slate-400">Zmiany zapisują się automatycznie</span>
          <Link href={`/dokumenty/${documentId}/podglad`} className="btn-primary">
            Podgląd i eksport →
          </Link>
        </div>
      </div>
    </div>
  );
}

