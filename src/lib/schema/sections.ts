/**
 * Deklaratywny schemat 16 sekcji karty charakterystyki.
 *
 * Ten plik jest jedynym źródłem prawdy o strukturze dokumentu:
 *  - edytor buduje z niego formularze (src/components/editor)
 *  - renderer buduje z niego HTML/PDF (src/components/render)
 *
 * Struktura zgodna z załącznikiem II do rozporządzenia (WE) nr 1907/2006
 * w brzmieniu nadanym rozporządzeniem Komisji (UE) 2020/878.
 */

export type FieldType =
  | 'text'
  | 'textarea'
  | 'list'
  | 'table'
  | 'keyValue'
  | 'signalWord'
  | 'hazardStatements'
  | 'precautionaryStatements'
  | 'pictograms'
  | 'hazardClasses'
  | 'components'
  | 'transport'
  | 'wasteCodes'
  | 'legalRefs'
  | 'boolean';

export interface TableColumn {
  key: string;
  label: string;
  /** Szerokość w procentach; pominięcie = równy podział */
  width?: number;
  type?: 'text' | 'textarea' | 'number';
}

export interface KeyValueRow {
  key: string;
  label: string;
  /** Oznaczenie literowe wg zał. II (np. "a)") */
  marker?: string;
  placeholder?: string;
}

export interface FieldDef {
  key: string;
  label?: string;
  type: FieldType;
  help?: string;
  placeholder?: string;
  /** Wartość domyślna dla nowego dokumentu */
  defaultValue?: unknown;
  /** Kolumny dla type: 'table' */
  columns?: TableColumn[];
  /** Wiersze dla type: 'keyValue' */
  rows?: KeyValueRow[];
  /** Ukryj etykietę przy renderowaniu (pole zajmuje całą szerokość) */
  hideLabel?: boolean;
}

export interface SubsectionDef {
  id: string;
  title: string;
  fields: FieldDef[];
}

export interface SectionDef {
  number: number;
  title: string;
  /** Krótka etykieta do nawigacji bocznej */
  shortTitle: string;
  subsections: SubsectionDef[];
}

const NIE_DOTYCZY = 'Brak dostępnych danych';

/* ────────────────────────────────────────────────────────────────
   Standardowe wiersze właściwości fizykochemicznych (sekcja 9.1)
   Kolejność i oznaczenia literowe wg zał. II pkt 9.1.
   ──────────────────────────────────────────────────────────────── */
const PHYS_PROPS: KeyValueRow[] = [
  { key: 'stanSkupienia', marker: 'a)', label: 'Stan skupienia' },
  { key: 'kolor', marker: 'b)', label: 'Kolor' },
  { key: 'zapach', marker: 'c)', label: 'Zapach' },
  { key: 'progZapachu', label: 'Próg zapachu' },
  { key: 'temperaturaTopnienia', marker: 'd)', label: 'Temperatura topnienia / krzepnięcia' },
  { key: 'temperaturaWrzenia', marker: 'e)', label: 'Temperatura wrzenia lub początkowa temperatura wrzenia i zakres temperatur wrzenia' },
  { key: 'palnosc', marker: 'f)', label: 'Palność' },
  { key: 'graniceWybuchowosci', marker: 'g)', label: 'Dolna i górna granica wybuchowości' },
  { key: 'temperaturaZaplonu', marker: 'h)', label: 'Temperatura zapłonu' },
  { key: 'temperaturaSamozaplonu', marker: 'i)', label: 'Temperatura samozapłonu' },
  { key: 'temperaturaRozkladu', marker: 'j)', label: 'Temperatura rozkładu' },
  { key: 'pH', marker: 'k)', label: 'pH' },
  { key: 'lepkosc', marker: 'l)', label: 'Lepkość kinematyczna' },
  { key: 'rozpuszczalnosc', marker: 'm)', label: 'Rozpuszczalność' },
  { key: 'wspolczynnikPodzialu', marker: 'n)', label: 'Współczynnik podziału n-oktanol/woda (log KOW)' },
  { key: 'preznoscPary', marker: 'o)', label: 'Prężność pary' },
  { key: 'gestosc', marker: 'p)', label: 'Gęstość lub gęstość względna' },
  { key: 'gestoscPary', marker: 'q)', label: 'Względna gęstość pary' },
  { key: 'charakterystykaCzasteczek', marker: 'r)', label: 'Charakterystyka cząsteczek' },
];

/* ────────────────────────────────────────────────────────────────
   Klasy zagrożenia zdrowotnego (sekcja 11.1) — punkty a)–j)
   ──────────────────────────────────────────────────────────────── */
const TOX_CLASSES: KeyValueRow[] = [
  { key: 'toksycznoscOstra', marker: 'a)', label: 'Toksyczność ostra' },
  { key: 'dzialanieZrace', marker: 'b)', label: 'Działanie żrące/drażniące na skórę' },
  { key: 'uszkodzenieOczu', marker: 'c)', label: 'Poważne uszkodzenie oczu / działanie drażniące na oczy' },
  { key: 'dzialanieUczulajace', marker: 'd)', label: 'Działanie uczulające na drogi oddechowe lub skórę' },
  { key: 'dzialanieMutagenne', marker: 'e)', label: 'Działanie mutagenne na komórki rozrodcze' },
  { key: 'dzialanieRakotworcze', marker: 'f)', label: 'Działanie rakotwórcze' },
  { key: 'szkodliweRozrodczosc', marker: 'g)', label: 'Szkodliwe działanie na rozrodczość' },
  { key: 'stotSe', marker: 'h)', label: 'Działanie toksyczne na narządy docelowe — narażenie jednorazowe' },
  { key: 'stotRe', marker: 'i)', label: 'Działanie toksyczne na narządy docelowe — narażenie powtarzane' },
  { key: 'zagrozenieAspiracja', marker: 'j)', label: 'Zagrożenie spowodowane aspiracją' },
];

/* ────────────────────────────────────────────────────────────────
   Drogi narażenia (sekcja 4.2 / 11.1)
   ──────────────────────────────────────────────────────────────── */
const EXPOSURE_ROUTES: KeyValueRow[] = [
  { key: 'oczy', label: 'Kontakt z oczami' },
  { key: 'skora', label: 'Kontakt ze skórą' },
  { key: 'wdychanie', label: 'Wdychanie' },
  { key: 'polkniecie', label: 'Połknięcie' },
];

export const SECTIONS: SectionDef[] = [
  /* ══════════════════════ SEKCJA 1 ══════════════════════ */
  {
    number: 1,
    shortTitle: 'Identyfikacja',
    title: 'Identyfikacja substancji/mieszaniny i identyfikacja przedsiębiorstwa',
    subsections: [
      {
        id: '1.1',
        title: 'Identyfikator produktu',
        fields: [
          {
            key: 'identyfikator',
            type: 'keyValue',
            hideLabel: true,
            rows: [
              { key: 'nazwaProduktu', label: 'Nazwa produktu' },
              { key: 'inneNazwy', label: 'Inne nazwy / oznaczenia' },
              { key: 'postacHandlowa', label: 'Postać handlowa' },
              { key: 'ufi', label: 'Numer UFI', placeholder: 'XXXX-XXXX-XXXX-XXXX' },
              { key: 'numerReach', label: 'Numer rejestracji REACH' },
            ],
          },
        ],
      },
      {
        id: '1.2',
        title: 'Istotne zidentyfikowane zastosowania substancji lub mieszaniny oraz zastosowania odradzane',
        fields: [
          { key: 'zastosowaniaZidentyfikowane', label: 'Zastosowania zidentyfikowane', type: 'textarea' },
          { key: 'zastosowaniaOdradzane', label: 'Zastosowania odradzane', type: 'textarea' },
        ],
      },
      {
        id: '1.3',
        title: 'Dane dotyczące dostawcy karty charakterystyki',
        fields: [
          {
            key: 'dostawca',
            type: 'keyValue',
            hideLabel: true,
            help: 'Dane pobierane z kartoteki dostawcy — możesz je nadpisać dla tego dokumentu.',
            rows: [
              { key: 'przedsiebiorstwo', label: 'Przedsiębiorstwo' },
              { key: 'adres', label: 'Adres' },
              { key: 'telefon', label: 'Telefon' },
              { key: 'email', label: 'E-mail osoby odpowiedzialnej za kartę' },
              { key: 'www', label: 'Strona internetowa' },
              { key: 'bdo', label: 'Numer BDO' },
            ],
          },
        ],
      },
      {
        id: '1.4',
        title: 'Numer telefonu alarmowego',
        fields: [
          {
            key: 'telefonyAlarmowe',
            type: 'table',
            hideLabel: true,
            columns: [
              { key: 'nazwa', label: 'Instytucja', width: 55 },
              { key: 'numer', label: 'Numer', width: 30 },
              { key: 'uwagi', label: 'Uwagi', width: 15 },
            ],
            defaultValue: [
              { nazwa: 'Telefon alarmowy ogólny', numer: '112', uwagi: 'całodobowy' },
              { nazwa: 'Straż pożarna', numer: '998', uwagi: '' },
              { nazwa: 'Pogotowie ratunkowe', numer: '999', uwagi: '' },
              { nazwa: 'Krajowe Centrum Informacji Toksykologicznej (Warszawa)', numer: '+48 22 619 66 54', uwagi: '' },
              { nazwa: 'Pomorskie Centrum Toksykologiczne (Gdańsk)', numer: '+48 58 682 19 39', uwagi: '' },
              { nazwa: 'Centrum Zatruć w Sosnowcu', numer: '+48 32 368 22 10', uwagi: '' },
            ],
          },
        ],
      },
    ],
  },

  /* ══════════════════════ SEKCJA 2 ══════════════════════ */
  {
    number: 2,
    shortTitle: 'Zagrożenia',
    title: 'Identyfikacja zagrożeń',
    subsections: [
      {
        id: '2.1',
        title: 'Klasyfikacja substancji lub mieszaniny',
        fields: [
          {
            key: 'klasyfikacja',
            label: 'Klasy i kategorie zagrożenia (CLP)',
            type: 'hazardClasses',
            help: 'Wybierz z listy. Piktogramy, hasło ostrzegawcze i zwroty H w pkt 2.2 zostaną podpowiedziane automatycznie.',
          },
          { key: 'uzasadnienie', label: 'Uzasadnienie / uwagi do klasyfikacji', type: 'textarea' },
        ],
      },
      {
        id: '2.2',
        title: 'Elementy oznakowania',
        fields: [
          { key: 'piktogramy', label: 'Piktogramy zagrożenia', type: 'pictograms' },
          { key: 'hasloOstrzegawcze', label: 'Hasło ostrzegawcze', type: 'signalWord' },
          { key: 'zwrotyH', label: 'Zwroty wskazujące rodzaj zagrożenia (H)', type: 'hazardStatements' },
          { key: 'zwrotyP', label: 'Zwroty wskazujące środki ostrożności (P)', type: 'precautionaryStatements' },
          { key: 'informacjeDodatkowe', label: 'Dodatkowe elementy oznakowania', type: 'textarea', help: 'np. „Zawiera: hydrochinon”, EUH-y' },
        ],
      },
      {
        id: '2.3',
        title: 'Inne zagrożenia',
        fields: [
          {
            key: 'inneZagrozenia',
            type: 'keyValue',
            hideLabel: true,
            rows: [
              { key: 'pbt', label: 'Spełnia kryteria PBT / vPvB' },
              { key: 'svhc', label: 'Substancje SVHC' },
              { key: 'endokrynne', label: 'Właściwości zaburzające funkcjonowanie układu hormonalnego' },
              { key: 'pozostale', label: 'Inne zagrożenia nieuwzględnione w klasyfikacji' },
            ],
          },
        ],
      },
    ],
  },

  /* ══════════════════════ SEKCJA 3 ══════════════════════ */
  {
    number: 3,
    shortTitle: 'Skład',
    title: 'Skład/informacja o składnikach',
    subsections: [
      {
        id: '3.2',
        title: 'Mieszaniny',
        fields: [
          { key: 'opis', label: 'Opis mieszaniny', type: 'textarea' },
          {
            key: 'skladniki',
            type: 'components',
            hideLabel: true,
            help: 'Dodaj składniki z biblioteki substancji — identyfikatory i klasyfikacja wypełnią się automatycznie.',
          },
          {
            key: 'uwagi',
            label: 'Uwagi',
            type: 'textarea',
            defaultValue: 'Pełny tekst zwrotów H przytoczonych w tej sekcji znajduje się w Sekcji 16.',
          },
        ],
      },
    ],
  },

  /* ══════════════════════ SEKCJA 4 ══════════════════════ */
  {
    number: 4,
    shortTitle: 'Pierwsza pomoc',
    title: 'Środki pierwszej pomocy',
    subsections: [
      {
        id: '4.1',
        title: 'Opis środków pierwszej pomocy',
        fields: [
          { key: 'uwagiOgolne', label: 'Uwagi ogólne', type: 'textarea' },
          {
            key: 'drogi',
            type: 'keyValue',
            hideLabel: true,
            rows: [
              { key: 'oczy', label: 'Kontakt z okiem' },
              { key: 'skora', label: 'Kontakt ze skórą' },
              { key: 'wdychanie', label: 'Wdychanie' },
              { key: 'polkniecie', label: 'Połknięcie' },
              { key: 'ochronaRatownika', label: 'Ochrona osób udzielających pierwszej pomocy' },
            ],
          },
        ],
      },
      {
        id: '4.2',
        title: 'Najważniejsze ostre i opóźnione objawy oraz skutki narażenia',
        fields: [{ key: 'objawy', type: 'list', hideLabel: true }],
      },
      {
        id: '4.3',
        title: 'Wskazania dotyczące wszelkiej natychmiastowej pomocy lekarskiej i szczególnego postępowania z poszkodowanym',
        fields: [{ key: 'pomocLekarska', type: 'textarea', hideLabel: true }],
      },
    ],
  },

  /* ══════════════════════ SEKCJA 5 ══════════════════════ */
  {
    number: 5,
    shortTitle: 'Pożar',
    title: 'Postępowanie w przypadku pożaru',
    subsections: [
      {
        id: '5.1',
        title: 'Środki gaśnicze',
        fields: [
          { key: 'odpowiednie', label: 'Odpowiednie środki gaśnicze', type: 'textarea' },
          { key: 'niewlasciwe', label: 'Niewłaściwe środki gaśnicze', type: 'textarea' },
        ],
      },
      {
        id: '5.2',
        title: 'Szczególne zagrożenia związane z substancją lub mieszaniną',
        fields: [{ key: 'zagrozenia', type: 'textarea', hideLabel: true }],
      },
      {
        id: '5.3',
        title: 'Informacje dla straży pożarnej',
        fields: [{ key: 'informacje', type: 'textarea', hideLabel: true }],
      },
    ],
  },

  /* ══════════════════════ SEKCJA 6 ══════════════════════ */
  {
    number: 6,
    shortTitle: 'Uwolnienie',
    title: 'Postępowanie w przypadku niezamierzonego uwolnienia do środowiska',
    subsections: [
      {
        id: '6.1',
        title: 'Indywidualne środki ostrożności, wyposażenie ochronne i procedury w sytuacjach awaryjnych',
        fields: [{ key: 'srodkiOstroznosci', type: 'textarea', hideLabel: true }],
      },
      {
        id: '6.2',
        title: 'Środki ostrożności w zakresie ochrony środowiska',
        fields: [{ key: 'ochronaSrodowiska', type: 'textarea', hideLabel: true }],
      },
      {
        id: '6.3',
        title: 'Metody i materiały zapobiegające rozprzestrzenianiu się skażenia i służące do usuwania skażenia',
        fields: [{ key: 'metodyUsuwania', type: 'textarea', hideLabel: true }],
      },
      {
        id: '6.4',
        title: 'Odniesienia do innych sekcji',
        fields: [
          {
            key: 'odniesienia',
            type: 'textarea',
            hideLabel: true,
            defaultValue:
              'Środki pierwszej pomocy — Sekcja 4. Środki ochrony indywidualnej — Sekcja 8. Postępowanie z odpadami — Sekcja 13.',
          },
        ],
      },
    ],
  },

  /* ══════════════════════ SEKCJA 7 ══════════════════════ */
  {
    number: 7,
    shortTitle: 'Magazynowanie',
    title: 'Postępowanie z substancjami i mieszaninami oraz ich magazynowanie',
    subsections: [
      {
        id: '7.1',
        title: 'Środki ostrożności dotyczące bezpiecznego postępowania',
        fields: [{ key: 'postepowanie', type: 'list', hideLabel: true }],
      },
      {
        id: '7.2',
        title: 'Warunki bezpiecznego magazynowania, w tym informacje dotyczące wszelkich wzajemnych niezgodności',
        fields: [{ key: 'magazynowanie', type: 'textarea', hideLabel: true }],
      },
      {
        id: '7.3',
        title: 'Szczególne zastosowanie(-a) końcowe',
        fields: [{ key: 'zastosowaniaKoncowe', type: 'textarea', hideLabel: true }],
      },
    ],
  },

  /* ══════════════════════ SEKCJA 8 ══════════════════════ */
  {
    number: 8,
    shortTitle: 'Kontrola narażenia',
    title: 'Kontrola narażenia / środki ochrony indywidualnej',
    subsections: [
      {
        id: '8.1',
        title: 'Parametry dotyczące kontroli',
        fields: [
          { key: 'podstawaPrawna', label: 'Podstawa prawna', type: 'text' },
          {
            key: 'nds',
            label: 'Najwyższe dopuszczalne stężenia (NDS)',
            type: 'table',
            columns: [
              { key: 'skladnik', label: 'Składnik (nr CAS)', width: 34 },
              { key: 'nds', label: 'NDS [mg/m³]', width: 16 },
              { key: 'ndsch', label: 'NDSCh [mg/m³]', width: 16 },
              { key: 'ndsp', label: 'NDSP [mg/m³]', width: 14 },
              { key: 'uwagi', label: 'Uwagi', width: 20 },
            ],
          },
          {
            key: 'dnel',
            label: 'Wartości DNEL',
            type: 'table',
            columns: [
              { key: 'substancja', label: 'Substancja', width: 24 },
              { key: 'droga', label: 'Droga narażenia', width: 40 },
              { key: 'pracownik', label: 'Pracownik', width: 18 },
              { key: 'populacja', label: 'Ogół populacji', width: 18 },
            ],
          },
          {
            key: 'pnec',
            label: 'Wartości PNEC',
            type: 'table',
            columns: [
              { key: 'substancja', label: 'Substancja', width: 30 },
              { key: 'przedzial', label: 'Przedział środowiska', width: 45 },
              { key: 'wartosc', label: 'Wartość', width: 25 },
            ],
          },
          { key: 'monitoring', label: 'Zalecane procedury monitorowania', type: 'textarea' },
        ],
      },
      {
        id: '8.2',
        title: 'Kontrola narażenia',
        fields: [
          { key: 'srodkiTechniczne', label: 'Stosowne techniczne środki kontroli', type: 'textarea' },
          {
            key: 'ochronaIndywidualna',
            label: 'Indywidualne środki ochrony',
            type: 'keyValue',
            rows: [
              { key: 'oczy', label: 'Ochrona oczu lub twarzy' },
              { key: 'rece', label: 'Ochrona rąk' },
              { key: 'drogiOddechowe', label: 'Ochrona dróg oddechowych' },
              { key: 'cialo', label: 'Ochrona ciała' },
              { key: 'inne', label: 'Inne środki ochrony' },
            ],
          },
          { key: 'kontrolaSrodowiska', label: 'Kontrola narażenia środowiska', type: 'textarea' },
        ],
      },
    ],
  },

  /* ══════════════════════ SEKCJA 9 ══════════════════════ */
  {
    number: 9,
    shortTitle: 'Właściwości',
    title: 'Właściwości fizyczne i chemiczne',
    subsections: [
      {
        id: '9.1',
        title: 'Informacje na temat podstawowych właściwości fizycznych i chemicznych',
        fields: [
          {
            key: 'wlasciwosci',
            type: 'keyValue',
            hideLabel: true,
            rows: PHYS_PROPS,
            defaultValue: Object.fromEntries(PHYS_PROPS.map((r) => [r.key, NIE_DOTYCZY])),
          },
        ],
      },
      {
        id: '9.2',
        title: 'Inne informacje',
        fields: [
          {
            key: 'inne',
            type: 'keyValue',
            hideLabel: true,
            rows: [
              { key: 'wlasciwosciWybuchowe', marker: 'a)', label: 'Właściwości wybuchowe' },
              { key: 'wlasciwosciUtleniajace', marker: 'b)', label: 'Właściwości utleniające' },
            ],
          },
        ],
      },
    ],
  },

  /* ══════════════════════ SEKCJA 10 ══════════════════════ */
  {
    number: 10,
    shortTitle: 'Stabilność',
    title: 'Stabilność i reaktywność',
    subsections: [
      { id: '10.1', title: 'Reaktywność', fields: [{ key: 'reaktywnosc', type: 'textarea', hideLabel: true }] },
      { id: '10.2', title: 'Stabilność chemiczna', fields: [{ key: 'stabilnosc', type: 'textarea', hideLabel: true }] },
      {
        id: '10.3',
        title: 'Możliwość występowania niebezpiecznych reakcji',
        fields: [{ key: 'niebezpieczneReakcje', type: 'textarea', hideLabel: true }],
      },
      {
        id: '10.4',
        title: 'Warunki, których należy unikać',
        fields: [{ key: 'warunkiDoUnikania', type: 'textarea', hideLabel: true }],
      },
      { id: '10.5', title: 'Materiały niezgodne', fields: [{ key: 'materialyNiezgodne', type: 'textarea', hideLabel: true }] },
      {
        id: '10.6',
        title: 'Niebezpieczne produkty rozkładu',
        fields: [{ key: 'produktyRozkladu', type: 'textarea', hideLabel: true }],
      },
    ],
  },

  /* ══════════════════════ SEKCJA 11 ══════════════════════ */
  {
    number: 11,
    shortTitle: 'Toksykologia',
    title: 'Informacje toksykologiczne',
    subsections: [
      {
        id: '11.1',
        title: 'Informacje na temat klas zagrożenia zdefiniowanych w rozporządzeniu (WE) nr 1272/2008',
        fields: [
          { key: 'klasy', type: 'keyValue', hideLabel: true, rows: TOX_CLASSES },
          {
            key: 'daneToksykologiczne',
            label: 'Dane toksykologiczne dla składników',
            type: 'table',
            columns: [
              { key: 'skladnik', label: 'Składnik', width: 26 },
              { key: 'parametr', label: 'Parametr', width: 13 },
              { key: 'droga', label: 'Droga', width: 15 },
              { key: 'gatunek', label: 'Gatunek', width: 14 },
              { key: 'wartosc', label: 'Wartość', width: 18 },
              { key: 'metoda', label: 'Metoda', width: 14 },
            ],
          },
          { key: 'drogiNarazenia', label: 'Informacje o możliwych drogach narażenia', type: 'keyValue', rows: EXPOSURE_ROUTES },
          { key: 'dzialanieChroniczne', label: 'Potencjalne chroniczne działanie na zdrowie', type: 'textarea' },
        ],
      },
      {
        id: '11.2',
        title: 'Informacje o innych zagrożeniach',
        fields: [{ key: 'inneZagrozenia', type: 'textarea', hideLabel: true }],
      },
    ],
  },

  /* ══════════════════════ SEKCJA 12 ══════════════════════ */
  {
    number: 12,
    shortTitle: 'Ekologia',
    title: 'Informacje ekologiczne',
    subsections: [
      {
        id: '12.1',
        title: 'Toksyczność',
        fields: [
          { key: 'podsumowanie', label: 'Podsumowanie', type: 'textarea' },
          {
            key: 'daneEkotoksykologiczne',
            type: 'table',
            hideLabel: true,
            columns: [
              { key: 'skladnik', label: 'Składnik', width: 22 },
              { key: 'parametr', label: 'Parametr', width: 13 },
              { key: 'gatunek', label: 'Gatunek / organizm', width: 25 },
              { key: 'czas', label: 'Czas narażenia', width: 14 },
              { key: 'wartosc', label: 'Wartość', width: 16 },
              { key: 'metoda', label: 'Metoda', width: 10 },
            ],
          },
        ],
      },
      {
        id: '12.2',
        title: 'Trwałość i zdolność do rozkładu',
        fields: [{ key: 'trwalosc', type: 'textarea', hideLabel: true }],
      },
      { id: '12.3', title: 'Zdolność do bioakumulacji', fields: [{ key: 'bioakumulacja', type: 'textarea', hideLabel: true }] },
      { id: '12.4', title: 'Mobilność w glebie', fields: [{ key: 'mobilnosc', type: 'textarea', hideLabel: true }] },
      {
        id: '12.5',
        title: 'Wyniki oceny właściwości PBT i vPvB',
        fields: [{ key: 'pbtVpvb', type: 'textarea', hideLabel: true }],
      },
      {
        id: '12.6',
        title: 'Właściwości zaburzające funkcjonowanie układu hormonalnego',
        fields: [{ key: 'endokrynne', type: 'textarea', hideLabel: true }],
      },
      {
        id: '12.7',
        title: 'Inne szkodliwe skutki działania',
        fields: [{ key: 'inneSkutki', type: 'textarea', hideLabel: true }],
      },
    ],
  },

  /* ══════════════════════ SEKCJA 13 ══════════════════════ */
  {
    number: 13,
    shortTitle: 'Odpady',
    title: 'Postępowanie z odpadami',
    subsections: [
      {
        id: '13.1',
        title: 'Metody unieszkodliwiania odpadów',
        fields: [
          { key: 'metody', label: 'Metody unieszkodliwiania', type: 'textarea' },
          {
            key: 'kodyOdpadow',
            label: 'Kody odpadów',
            type: 'wasteCodes',
            help: 'Wybierz z katalogu odpadów (Dz.U. 2020 poz. 10). Kody z gwiazdką oznaczają odpady niebezpieczne.',
          },
          { key: 'opakowania', label: 'Postępowanie z opakowaniami', type: 'textarea' },
        ],
      },
    ],
  },

  /* ══════════════════════ SEKCJA 14 ══════════════════════ */
  {
    number: 14,
    shortTitle: 'Transport',
    title: 'Informacje dotyczące transportu',
    subsections: [
      {
        id: '14',
        title: 'Klasyfikacja transportowa',
        fields: [
          { key: 'wstep', label: 'Uwaga wstępna', type: 'textarea' },
          {
            key: 'transport',
            type: 'transport',
            hideLabel: true,
            help: 'Wypełnij dla każdego środka transportu. Zaznacz „nie podlega”, jeśli produkt nie jest towarem niebezpiecznym.',
          },
          { key: 'informacjeDodatkowe', label: 'Dodatkowe informacje transportowe', type: 'textarea', help: 'LQ, EQ, instrukcje pakowania, kod ograniczeń tunelowych' },
        ],
      },
    ],
  },

  /* ══════════════════════ SEKCJA 15 ══════════════════════ */
  {
    number: 15,
    shortTitle: 'Przepisy',
    title: 'Informacje dotyczące przepisów prawnych',
    subsections: [
      {
        id: '15.1',
        title:
          'Przepisy prawne dotyczące bezpieczeństwa, ochrony zdrowia i środowiska specyficzne dla substancji lub mieszaniny',
        fields: [
          {
            key: 'przepisy',
            type: 'legalRefs',
            hideLabel: true,
            help: 'Wybierz z centralnego rejestru podstaw prawnych — aktualizacja tekstu jednolitego obejmie wszystkie dokumenty.',
          },
        ],
      },
      {
        id: '15.2',
        title: 'Ocena bezpieczeństwa chemicznego',
        fields: [{ key: 'ocenaBezpieczenstwa', type: 'textarea', hideLabel: true }],
      },
    ],
  },

  /* ══════════════════════ SEKCJA 16 ══════════════════════ */
  {
    number: 16,
    shortTitle: 'Inne',
    title: 'Inne informacje',
    subsections: [
      {
        id: '16',
        title: 'Informacje uzupełniające',
        fields: [
          {
            key: 'pelnyTekstH',
            label: 'Pełny tekst zwrotów H',
            type: 'boolean',
            help: 'Generuj automatycznie na podstawie zwrotów użytych w sekcjach 2 i 3.',
            defaultValue: true,
          },
          {
            key: 'skroty',
            label: 'Wykaz skrótów i akronimów',
            type: 'boolean',
            help: 'Dołącz standardowy wykaz skrótów.',
            defaultValue: true,
          },
          { key: 'szkolenia', label: 'Szkolenie pracowników', type: 'textarea' },
          { key: 'zrodla', label: 'Materiały źródłowe', type: 'list' },
          { key: 'zmiany', label: 'Zmiany w stosunku do poprzedniej wersji', type: 'textarea' },
          { key: 'zastrzezenie', label: 'Informacja dla czytelnika', type: 'textarea' },
        ],
      },
    ],
  },
];

/** Szybki dostęp do definicji sekcji po numerze. */
export const SECTION_BY_NUMBER = new Map(SECTIONS.map((s) => [s.number, s]));

/** Zwraca definicję pola dla ścieżki sekcja/podsekcja/klucz. */
export function findField(sectionNumber: number, fieldKey: string): FieldDef | undefined {
  const section = SECTION_BY_NUMBER.get(sectionNumber);
  if (!section) return undefined;
  for (const sub of section.subsections) {
    const f = sub.fields.find((x) => x.key === fieldKey);
    if (f) return f;
  }
  return undefined;
}

/** Buduje pustą strukturę danych sekcji z wartościami domyślnymi. */
export function emptySectionData(sectionNumber: number): Record<string, unknown> {
  const section = SECTION_BY_NUMBER.get(sectionNumber);
  if (!section) return {};
  const data: Record<string, unknown> = {};
  for (const sub of section.subsections) {
    for (const field of sub.fields) {
      if (field.defaultValue !== undefined) {
        data[field.key] = field.defaultValue;
      } else if (field.type === 'table' || field.type === 'list') {
        data[field.key] = [];
      } else if (field.type === 'keyValue') {
        data[field.key] = {};
      } else if (
        field.type === 'hazardStatements' ||
        field.type === 'precautionaryStatements' ||
        field.type === 'pictograms' ||
        field.type === 'hazardClasses' ||
        field.type === 'wasteCodes' ||
        field.type === 'legalRefs'
      ) {
        data[field.key] = [];
      } else if (field.type === 'transport') {
        data[field.key] = { niePodlega: true, mody: {} };
      } else {
        data[field.key] = '';
      }
    }
  }
  return data;
}
