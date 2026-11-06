# Plan wdrożenia — od edytora do narzędzia projektującego SDS

Plan przekształcenia aplikacji z **edytora** kart charakterystyki w narzędzie,
które rozumie recepturę i przepisy CLP. Kolejność faz wynika z zależności
danych: najpierw fundament (strukturalne dane + model receptury), potem
obliczenia (silnik klasyfikacji, walidator), potem wyjścia i skala.

Odpowiada roadmapie „Od receptury do karty" (12 funkcji, obszary A–D).

## Jak czytać ten plan

- **Konwencje** — proza po polsku, identyfikatory/ścieżki po angielsku (jak w całym repo).
- Każda funkcja ma: **cel**, **schemat** (Prisma), **pliki**, **akcje**, **UI**,
  **logikę** (gdzie istotna), **kryteria akceptacji**, **testy**, **nakład**.
- **Nakład**: S ≈ 0,5–1 dzień, M ≈ 2–4 dni, L ≈ 1–2 tygodnie (zgrubnie, dla jednej osoby).
- ⚠️ = wymaga merytorycznej weryfikacji chemika przed wydaniem (regulacyjne).
- Każda faza kończy się działającym, wdrażalnym stanem (`npm run build` zielony).

## Zasady prowadzące

1. **Chemik w pętli** — wszystko, co regulacyjne (klasyfikacja, etykieta, klasyfikacja
   transportowa), program *proponuje i pokazuje regułę*, chemik zatwierdza lub nadpisuje.
   Nigdy „policz i ufaj".
2. **Nadpisywalność** — każde wyliczenie ma tryb ręcznego nadpisania z odnotowaniem,
   że wartość jest ręczna (`override`).
3. **Wsteczna zgodność** — istniejące dokumenty (JSON sekcji) muszą działać po każdej
   migracji; nowe pola opcjonalne, z rozsądnymi domyślnymi.
4. **Testy dla obliczeń** — silnik klasyfikacji (B1) i walidator (B3) to czyste funkcje
   z testami jednostkowymi na znanych przypadkach (m.in. D-76 część B).

---

# FAZA 1 — Fundament danych

Cel fazy: dane składników przestają być tekstem, pojawia się model receptury,
a sekcja 3 zaczyna wypełniać się z formuły. Po tej fazie nic jeszcze nie liczymy,
ale mamy z czego liczyć.

## F1.1 — Strukturalne dane zagrożeń substancji ⚠️

**Cel.** Współczynnik M, ATE i specyficzne stężenia graniczne (SCL) przestają być
tekstem w `sclNotes` — stają się polami, których może użyć silnik klasyfikacji.

**Schemat.** Nowa tabela `SubstanceHazard` (jedna substancja → wiele wpisów klasy zagrożenia),
zamiast trzymania klas jako `String` JSON. Zachowujemy `hazardClasses`/`hazardStatements`
jako pola pochodne (cache) dla zgodności z rendererem.

```prisma
model SubstanceHazard {
  id            String    @id @default(cuid())
  substanceId   String
  substance     Substance @relation(fields: [substanceId], references: [id], onDelete: Cascade)
  hazardClass   String    // kod klasy, np. "Aquatic Acute 1" (klucz do HAZARD_CLASSES)
  statement     String?   // zwrot H (domyślny z klasy, nadpisywalny)
  mFactorAcute  Float?     // współczynnik M — środowisko ostre
  mFactorChronic Float?    // współczynnik M — środowisko przewlekłe
  ateOral       Float?     // ATE [mg/kg] — droga pokarmowa
  ateDermal     Float?
  ateInhalDust  Float?     // ATE [mg/l] — pyły/mgły
  ateInhalVapour Float?
  sclMin        Float?     // dolna granica SCL [% m/m], np. boraks 8,5
  sclStatement  String?    // zwrot H przypisany do tego SCL (np. H360FD)
  note          String?
}
```

Dodać do `Substance`: `hazards SubstanceHazard[]`. Pola `hazardClasses`/`hazardStatements`
zostają, ale są odtwarzane z `hazards` przy zapisie (funkcja `syncSubstanceCache`).

**Pliki.**
- `prisma/schema.prisma` — model `SubstanceHazard`.
- `src/data/hazard-classes.ts` — dodać stałe domenowe: `GENERIC_CUTOFF` (wartości odcięcia),
  `GENERIC_CONCENTRATION_LIMITS` (GCL) per klasa — potrzebne w F2.1. (Tabele z Załącznika I do CLP.)
- `src/lib/actions.ts` — `updateSubstanceHazards(substanceId, hazards[])`, `syncSubstanceCache`.
- `src/app/substancje/[id]/page.tsx` *(nowa)* — edytor substancji z tabelą klas zagrożenia
  i polami M/ATE/SCL (dziś substancje dodaje się tylko z listy, bez edycji klas).

**UI.** Rozbudować stronę `substancje` o edycję pojedynczej substancji: tabela klas
zagrożenia (picker klas — już istnieje), a dla klas środowiskowych/CMR pola M/ATE/SCL
pojawiają się kontekstowo.

**Kryteria akceptacji.**
- Hydrochinon ma `Aquatic Acute 1` z `mFactorAcute = 10`.
- Boraks ma `Repr. 1B` z `sclMin = 8.5`, `sclStatement = "H360FD"`.
- Renderer sekcji 3 pokazuje te dane tak jak dziś (cache działa).

**Testy.** Skrypt Prisma: zapis + odczyt substancji z M i SCL; `syncSubstanceCache`
odtwarza `hazardClasses` identycznie jak przed migracją dla 4 substancji seeda.

**Nakład.** M.

## F1.2 — Model receptury

**Cel.** Chemik opisuje formułę roboczą (g/l) zamiast wpisywać zakresy %.
Receptura należy do **folderu produktu** (nie do pojedynczej karty), bo jeden
produkt = jedna receptura rozdzielona na części.

**Schemat.**

```prisma
model Formulation {
  id          String   @id @default(cuid())
  folderId    String   @unique              // receptura na produkt (folder)
  folder      Folder   @relation(fields: [folderId], references: [id], onDelete: Cascade)
  basis       Float    @default(1000)       // objętość odniesienia [ml] (na 1 l roztworu roboczego)
  ingredients FormulationIngredient[]
  parts       FormulationPart[]             // np. „część A", „część B"
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model FormulationPart {
  id            String @id @default(cuid())
  formulationId String
  formulation   Formulation @relation(fields: [formulationId], references: [id], onDelete: Cascade)
  name          String              // „część A"
  documentId    String?             // powiązana karta (część A → dokument)
  position      Int    @default(0)
  ingredients   FormulationIngredient[]
}

model FormulationIngredient {
  id            String @id @default(cuid())
  formulationId String
  formulation   Formulation @relation(fields: [formulationId], references: [id], onDelete: Cascade)
  substanceId   String
  substance     Substance @relation(fields: [substanceId], references: [id])
  grams         Float               // gramy na `basis` ml
  partId        String?             // do której części należy składnik
  part          FormulationPart? @relation(fields: [partId], references: [id], onDelete: SetNull)
  position      Int    @default(0)
}
```

Dodać relacje odwrotne w `Folder`, `Substance`, `Document`.

**Pliki.**
- `prisma/schema.prisma` — trzy modele powyżej.
- `src/lib/formulation.ts` *(nowy)* — czyste funkcje:
  `percentByMass(ingredients)` → %m/m całej mieszaniny i **per część**;
  wymaga `density`/`molarMass`? Nie — %m/m liczymy z gramów (suma gramów części = 100 %).
- `src/lib/actions.ts` — `upsertFormulation`, `addIngredient`, `updateIngredient`,
  `removeIngredient`, `addPart`, `assignIngredientToPart`.
- `src/app/dokumenty/folder/[id]/receptura/page.tsx` *(nowa trasa)* — edytor receptury folderu.
- `src/components/formulation/FormulationEditor.tsx` *(nowy)*.

**UI.** W panelu bocznym folderu (lub na widoku folderu) przycisk „Receptura".
Edytor: tabela składników (substancja z biblioteki, gramy, przypisanie do części),
lista części z podglądem wyliczonego %m/m. Autozapis jak w edytorze sekcji.

**Logika.** %m/m składnika w części = `grams_i / Σ grams_wczęści × 100`.
%m/m w roztworze roboczym = `grams_i / (Σ wszystkich gramów + masa wody)` — patrz A2.

**Kryteria akceptacji.**
- Formuła D-76 (metol 2, hydrochinon 5, siarczyn 100, boraks 2 g/l), część A = {metol, hydrochinon},
  część B = {siarczyn, boraks} → część A: hydrochinon ≈ 71,4 %, metol ≈ 28,6 %;
  część B: siarczyn ≈ 98,0 %, boraks ≈ 2,0 %.

**Testy.** `src/lib/formulation.test.ts` — powyższe wartości (po wprowadzeniu Vitest w F2).
Na tym etapie: skrypt Prisma sprawdzający wyliczenia.

**Nakład.** M.

## F1.3 (A1) — Receptura → sekcja 3

**Cel.** Wyliczone %m/m i identyfikatory składników automatycznie zasilają sekcję 3
każdej karty-części. Znika ręczne wpisywanie zakresów.

**Pliki.**
- `src/lib/actions.ts` — `syncPartToSection3(partId)`: dla części tworzy/aktualizuje
  `Component[]` powiązanej karty na podstawie `FormulationIngredient` (kopiuje CAS/WE/indeks/REACH,
  klasy zagrożenia i SCL z substancji, ustawia `concentration` z wyliczenia).
- `src/components/formulation/FormulationEditor.tsx` — przycisk „Zastosuj do kart".

**UI.** W edytorze receptury: „Zastosuj do kart" → aktualizuje sekcje 3 obu części.
Konflikt (ręczna edycja składnika w karcie) → ostrzeżenie z podglądem różnicy.

**Kryteria akceptacji.** Po „Zastosuj" sekcja 3 części A ma 2 składniki z poprawnymi %.

**Nakład.** S (na fundamencie F1.2).

---

# FAZA 2 — Obliczenia i kontrola

Rdzeń wartości dla chemika. Wprowadzamy tu **Vitest**, bo to kod regulacyjny.

## F2.0 — Wprowadzenie Vitest

**Cel.** Testy jednostkowe dla czystych funkcji (silnik, walidator, receptura).

**Pliki.** `vitest.config.ts`, `package.json` (skrypt `test`), pierwsze testy `*.test.ts`.
**Nakład.** S.

## F2.1 (B1) — Silnik klasyfikacji mieszaniny (CLP) ⚠️

**Cel.** Z składników (%, klasy, M, ATE, SCL) wyliczyć klasyfikację mieszaniny wg
Rozporządzenia CLP (Załącznik I), z pokazaniem **reguły decydującej** dla każdego
punktu końcowego. Chemik zatwierdza lub nadpisuje.

**Pliki.**
- `src/lib/classification/engine.ts` *(nowy)* — funkcja `classifyMixture(components) → ClassificationResult`.
- `src/lib/classification/rules/*.ts` — jeden moduł per grupa punktów końcowych.
- `src/lib/classification/constants.ts` — GCL, wartości odcięcia, konwersje ATE (z Załącznika I).
- `src/lib/classification/engine.test.ts` — przypadki referencyjne.
- `src/components/classification/ClassificationPanel.tsx` — panel w sekcji 2.1.
- `src/lib/actions.ts` — `applyClassification(documentId, result)`.

**Logika — reguły per punkt końcowy** (wartości do przepisania z Załącznika I i **weryfikacji chemika**):

| Punkt końcowy | Metoda | Kluczowe progi (GCL) |
|---|---|---|
| Toksyczność ostra | ATE: `100/ATEmix = Σ(Ci/ATEi)`; kategoria z zakresu ATEmix | odcięcie składnika ≥ 1 % (lub niższe) |
| Działanie żrące/drażniące skóra | sumowanie: `10×ΣSkinCorr1 + ΣSkinIrrit2` | Corr.1 ≥ 5 %; Irrit.2 ≥ 10 % |
| Uszkodzenie/drażnienie oczu | sumowanie analogiczne | Eye Dam.1 ≥ 3 %; Eye Irrit.2 ≥ 10 % |
| Uczulenie skóra/drogi odd. | próg | Sens.1 ≥ 1 % (odcięcie zwrotu ≥ 0,1 %) |
| CMR (Carc/Muta/Repr) | **próg + SCL** | Carc.1 ≥ 0,1 %, Carc.2 ≥ 1 %; Repr.1 ≥ 0,3 %, Repr.2 ≥ 3 % — **SCL nadpisuje** |
| STOT SE/RE | próg | kat.1 ≥ 10 %; (1–10 % → kat.2 z uwagą); SE3 ≥ 20 % |
| Aspiracja | próg + lepkość | ≥ 10 % i warunek lepkości |
| Środowisko — Aquatic Acute 1 | sumowanie z M: `Σ(M×Ci)` | ≥ 25 % |
| Środowisko — Aquatic Chronic 1/2/3 | sumowanie warstwowe z M | ≥ 25 % (z mnożnikami 10× między warstwami) |

**Wynik** (`ClassificationResult`) dla każdego punktu: przyznana klasa/kat. (lub brak),
**reguła i liczby, które przesądziły** (np. „Repr. 1B: boraks 2,0 % < SCL 8,5 % → mieszanina
nieklasyfikowana"), oraz porównanie z tym, co jest dziś wpisane w sekcji 2.1.

**UI.** Panel w sekcji 2.1: „Przelicz z składników" → tabela punktów końcowych z regułą,
przycisk „Zastosuj do sekcji 2" (ustawia klasyfikację, piktogramy, hasło, zwroty H
przez istniejące `pictogramsForClasses`/`statementsForClasses`). Rozbieżności podświetlone.
Zawsze widoczny przełącznik „wartość ręczna (override)".

**Kryteria akceptacji (testy referencyjne).**
- **D-76 część B, boraks 2 %** → mieszanina **nieklasyfikowana** dla Repr. (2 % < 8,5 % SCL).
- **Boraks 10 %** → **Repr. 1B, H360FD** (10 % ≥ 8,5 %).
- **D-76 część A** → Aquatic Acute 1 (hydrochinon M=10: `10×71,4 % = 714 % ≥ 25 %`),
  Carc. 2, Muta. 2, Skin Sens. 1, Acute Tox. 4 (z ATE), STOT RE 2.
- Każdy przypadek zwraca regułę decydującą w formie tekstu.

**Testy.** `engine.test.ts` — powyższe + zestaw brzegowych (dokładnie na progu, tuż pod).

**Nakład.** L. To najtrudniejszy element — zakres: uczciwie objąć główne punkty końcowe,
resztę oznaczyć „poza zakresem automatu — oceń ręcznie".

## F2.2 (B3) — Walidator spójności („linter" karty)

**Cel.** Kontrole między sekcjami przed podpisaniem karty. Panel z listą uchybień
i skokiem do naprawy.

**Pliki.**
- `src/lib/validation/rules.ts` *(nowy)* — czyste funkcje `validateDocument(doc) → Issue[]`.
- `src/lib/validation/rules.test.ts`.
- `src/components/validation/ValidationPanel.tsx` — panel (np. wysuwany z nagłówka edytora).
- Integracja w `DocumentHeader` (odznaka „N uchybień").

**Reguły (każda z `severity`: błąd / ostrzeżenie / info).**
1. Klasy w 2.1 ⇄ zwroty H składników w sekcji 3 (czy H w 2.2 są uzasadnione składnikami).
2. Piktogramy w 2.2 = `pictogramsForClasses(klasy 2.1)` (brakujące / nadmiarowe).
3. Hasło ostrzegawcze = `strongestSignalWord(klasy 2.1)`.
4. Sekcja 16 „pełny tekst H" pokrywa wszystkie kody użyte w 2 i 3.
5. Transport (14): jeśli mieszanina Aquatic Acute/Chronic 1 → oczekuj oznaczenia
   środowiskowego lub świadomej adnotacji „zwolnione (LQ/EQ)".
6. SVHC składnik > 0,1 % → wymagana wzmianka w 2.3 i 15 (art. 33 REACH).
7. UFI obecny, gdy mieszanina klasyfikowana zdrowotnie/fizycznie i wprowadzana do obrotu.
8. Puste obowiązkowe podsekcje (np. 1.3 dostawca, 9.1 stan skupienia).
9. Data wystawienia / wersja obecne.

**UI.** Panel: pogrupowane uchybienia, każde z linkiem „przejdź do sekcji N".
Odznaka w nagłówku (czerwona przy błędach, bursztynowa przy ostrzeżeniach).

**Kryteria akceptacji.**
- Dla seeda D-76 część A: 0 błędów (kompletna karta).
- Sztuczne uszkodzenie (usuń piktogram GHS08) → reguła 2 zgłasza brak.

**Testy.** `rules.test.ts` — dla każdej reguły przypadek pozytywny i negatywny.

**Nakład.** M.

---

# FAZA 3 — Wyjścia i wygoda

## F3.1 (B2) — Generator etykiety CLP ⚠️

**Cel.** Z gotowej karty złożyć etykietę zgodną z CLP (zastępuje ręczny `label.html`).

**Pliki.**
- `src/lib/label/build.ts` *(nowy)* — z danych sekcji 2 + UFI + „Zawiera" buduje model etykiety;
  dobór zwrotów P wg zasad (ograniczenie liczby, priorytety).
- `src/components/label/LabelRenderer.tsx` — render etykiety (piktogramy jako inline SVG,
  reguła min. rozmiaru: piktogram ≥ 1/15 etykiety i ≥ 1 cm²).
- `src/app/dokumenty/[id]/etykieta/page.tsx` *(nowa)* — podgląd + druk/eksport (jak podgląd karty).

**Logika.** Zawartość: piktogramy, hasło, zwroty H (z sekcji 2.2), dobór zwrotów P
(reguła: zwykle maks. ~6, priorytety zapobieganie/reagowanie), „Zawiera: …" (składniki
uczulające/nazwane), EUH, UFI, dane dostawcy. Rozmiary etykiety wg tabeli CLP
(zależnie od pojemności opakowania) — parametr wybierany przez chemika.

**Kryteria akceptacji.** Dla D-76 część A etykieta zawiera GHS05/07/08/09, NIEBEZPIECZEŃSTWO,
komplet zwrotów H, „Zawiera: hydrochinon, siarczan metolu", UFI.

**Nakład.** M.

## F3.2 (A2) — Roztwór roboczy i rozcieńczenia

**Cel.** Zamodelować mieszanie części + woda → roztwór roboczy i wygenerować wariant karty
(zwykle nieklasyfikowany). Wykorzystuje silnik B1 na rozcieńczonych stężeniach.

**Schemat.** Rozszerzyć `Formulation` o etapy rozcieńczenia:

```prisma
model DilutionStep {
  id            String @id @default(cuid())
  formulationId String
  formulation   Formulation @relation(fields: [formulationId], references: [id], onDelete: Cascade)
  name          String            // „roztwór roboczy 1:1"
  waterMl       Float             // woda dodana do bazy
  documentId    String?           // opcjonalna karta wariantu
  position      Int    @default(0)
}
```

**Pliki.** `src/lib/formulation.ts` — `concentrationsAtStep(step)`; akcje CRUD kroków;
`src/components/formulation/DilutionEditor.tsx`.

**Logika.** %m/m po rozcieńczeniu = `grams_i / (Σ grams + waterMl × 1 g/ml)`.
Wynik podajemy do B1 → często brak klasyfikacji (potwierdza wzorzec FOMA „roztwór 7 %").

**Kryteria akceptacji.** Roztwór roboczy D-76 (ok. 7 %): silnik B1 pokazuje niższe
stężenia i (przy zachowaniu progów) łagodniejszą lub brak klasyfikacji.

**Nakład.** M.

## F3.3 (A3) — Pakiet wiedzy fotochemicznej

**Cel.** Wstępnie wypełnione treści domenowe jako presety sekcji.

**Pliki.** `src/data/photochem-knowledge.ts` *(nowy)* — presety tekstów dla sekcji
5.2, 10.3–10.6, 13 (kody 09 01 xx + odzysk srebra), 7/8 (proszki, wentylacja).
`src/components/editor/PresetButton.tsx` — „Wstaw treść domenową" przy odpowiednich sekcjach.

**Kryteria akceptacji.** W sekcji 10.6 jednym kliknięciem wstawiamy „siarczyn + kwas → SO₂".

**Nakład.** S–M.

## F3.4 (C1) — Szablony sekcji i biblioteka fraz

**Cel.** Wielokrotnego użytku boilerplate dla sekcji 4–8, 10, 13, 15 i firmowe standardowe frazy.

**Schemat.**

```prisma
model SectionTemplate {
  id        String @id @default(cuid())
  name      String
  section   Int              // której sekcji dotyczy
  data      String           // JSON danych sekcji (jak Section.data)
  createdAt DateTime @default(now())
}
```

**Pliki.** akcje `createTemplateFromSection`, `applyTemplate`; `src/app/szablony/page.tsx`;
przycisk „Zapisz jako szablon" / „Wstaw z szablonu" w edytorze sekcji.

**Kryteria akceptacji.** Zapis sekcji 8 jako szablon i wstawienie do nowej karty odtwarza treść.

**Nakład.** S–M.

---

# FAZA 4 — Zgodność i skala

## F4.1 (C2) — Wersjonowanie i śledzenie zmian ⚠️

**Cel.** Niezmienne migawki wersji, różnica między wersjami, auto sekcja 16, sygnał powiadomienia.

**Schemat.**

```prisma
model DocumentSnapshot {
  id         String @id @default(cuid())
  documentId String
  document   Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  version    String
  payload    String            // pełny JSON dokumentu (sekcje + składniki) w chwili wydania
  createdAt  DateTime @default(now())
}
```

**Pliki.** `src/lib/diff.ts` (różnica dwóch payloadów po polach sekcji);
akcja `publishVersion(documentId)` (zamraża migawkę, podbija wersję);
`src/app/dokumenty/[id]/historia/page.tsx` (lista wersji + diff).
Auto sekcja 16: generuj „zmiany względem poprzedniej wersji" z diffu.

**Kryteria akceptacji.** Po `publishVersion` powstaje migawka; diff pokazuje zmienione sekcje;
sekcja 16 zawiera listę zmian.

**Nakład.** M–L.

## F4.2 (C3) — Synchronizacja danych regulacyjnych ⚠️

**Cel.** Pobieranie z ECHA klasyfikacji zharmonizowanej (Annex VI), listy SVHC, DNEL/PNEC;
alert przy zmianie klasyfikacji substancji lub cytatu Dz.U.

**Pliki.** `src/lib/echa/` (klient + parser; źródła: eksporty ECHA / API);
pole `Substance.lastVerified`, `Substance.sourceRef`; zadanie odświeżające (skrypt/CRON);
`src/components/substances/UpdateBadge.tsx` (odznaka „dane mogą być nieaktualne").
Rejestr `LegalReference` już istnieje — dodać `lastVerified` i alert o dezaktualizacji.

**Uwaga.** Integracja zewnętrzna — zakres zależny od dostępności danych ECHA (część
to pliki do pobrania, nie API). Zacząć od ręcznego importu + znacznika weryfikacji.

**Nakład.** L.

## F4.3 (C4) — Wielojęzyczność

**Cel.** Ta sama karta w DE / EN / FR. Frazy H/P są scentralizowane — ECHA publikuje je
we wszystkich językach UE.

**Schemat.** Rozszerzyć słowniki o kolumny językowe lub tabelę tłumaczeń:
`HazardStatement { textPl, textEn, textDe, textFr }` (lub `HazardStatementI18n`).
`Document.language` już istnieje.

**Pliki.** import tłumaczeń H/P (dane ECHA); przełącznik języka w podglądzie/renderze;
teksty stałe renderera przez słownik i18n.

**Zakres.** Frazy słownikowe (H/P/piktogramy/klasy) — automatyczne. Treść wpisana ręcznie
(sekcje 4–13) — wymaga tłumaczenia przez człowieka; oznaczyć nieprzetłumaczone.

**Nakład.** M (frazy) + otwarte (treść ręczna).

## F4.4 (D1) — Generowanie UFI + zestaw PCN ⚠️

**Cel.** UFI z receptury + eksport danych do zgłoszenia PCN (ECHA).

**Pliki.** `src/lib/ufi.ts` (generowanie UFI z numeru VAT + numeru formuły wg algorytmu ECHA);
`src/lib/pcn/export.ts` (zestaw danych PCN z receptury A1 i klasyfikacji B1);
akcja `generateUfi(folderId)`; pole `Formulation.formulaNumber`.

**Zależności.** A1 (receptura) + B1 (klasyfikacja).

**Nakład.** M–L.

## F4.5 (D2) — PDF serwerowy i paczka produktu

**Cel.** PDF po stronie serwera (Puppeteer) + eksport całego folderu jako paczka.

**Pliki.** `src/app/api/dokumenty/[id]/pdf/route.ts` (Puppeteer renderuje trasę `/podglad`);
`src/app/api/folder/[id]/pakiet/route.ts` (ZIP: część A + B + roztwór + etykieta);
przycisk „Eksportuj paczkę produktu" na widoku folderu.

**Uwaga.** Puppeteer dokłada zależność i pamięć — rozważyć osobny worker/serverless.
Warstwa renderująca (`DocumentRenderer`) jest już niezależna od sposobu eksportu.

**Nakład.** S–M (PDF) + S (paczka).

---

# Podsumowanie zależności

```
F1.1 (dane zagrożeń) ─┬─> F2.1 (silnik B1) ─┬─> F3.1 (etykieta B2)
F1.2 (receptura) ──── F1.3 (A1) ────────────┼─> F3.2 (roztwór A2)
                                             └─> F4.4 (UFI/PCN D1)
F2.0 (Vitest) ──> F2.1, F2.2
(niezależne): F2.2 (walidator B3), F3.3 (wiedza A3), F3.4 (szablony C1),
              F4.1 (wersje C2), F4.2 (ECHA C3), F4.3 (i18n C4), F4.5 (PDF D2)
```

# Kolejność wykonania (rekomendowana)

1. **F1.1 → F1.2 → F1.3** — fundament, karty zaczynają wypełniać się z receptury.
2. **F2.0 → F2.1 → F2.2** — rdzeń: policz i sprawdź (z testami).
3. **F3.1 → F3.2 → F3.3 → F3.4** — wyjścia i codzienna wygoda.
4. **F4.5 → F4.4 → F4.1 → F4.3 → F4.2** — zgodność i skala (PDF/paczka najpierw, bo tanie
   i użyteczne; ECHA na końcu, bo zewnętrzne i najbardziej otwarte).

# Uwagi końcowe

- **Weryfikacja regulacyjna** — tabele progów/GCL/SCL (F2.1) i reguły etykiety (F3.1)
  przepisać z Załącznika I do CLP i **dać chemikowi do weryfikacji** przed użyciem produkcyjnym.
- **Migracje** — po każdej zmianie schematu uruchomić `npm run db:push` (dev) lub przygotować
  migrację (prod); zaktualizować `prisma/seed.ts` o nowe pola (M dla hydrochinonu, SCL dla boraksu,
  receptura D-76).
- **Uwierzytelnianie** — nadal brak; przed wystawieniem do internetu z danymi produkcyjnymi
  dodać warstwę logowania (poza zakresem tego planu, ale warunek wdrożenia).
