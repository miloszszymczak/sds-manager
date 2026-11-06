/**
 * Treść kart D-76 (część A i B) przygotowana i zweryfikowana wcześniej
 * na podstawie kart producentów składników — wgrywana przez seed.
 */
export const SECTIONS_A: Record<number, Record<string, unknown>> = {
  1: {
    identyfikator: {
      nazwaProduktu: 'wyszło fotochemia — wywoływacz D-76 — część A',
      inneNazwy: 'D-76 część A; mieszanina wywołująca',
      postacHandlowa:
        'Mieszanina proszkowa (do rozpuszczenia w wodzie razem z częścią B w celu uzyskania roztworu roboczego wywoływacza negatywowego)',
      ufi: 'JXR2-K0MV-900S-YSDM',
      numerReach: 'nie dotyczy (mieszanina; numery rejestracji składników podano w sekcji 3)',
    },
    zastosowaniaZidentyfikowane:
      'Składnik wywoływacza negatywowego do obróbki chemicznej czarno-białych materiałów fotograficznych (filmów i papierów). Produkt fotochemiczny do użytku profesjonalnego i hobbystycznego.',
    zastosowaniaOdradzane:
      'Wszelkie zastosowania inne niż wymienione powyżej. Produkt nie jest przeznaczony do stosowania konsumenckiego bez znajomości zasad bezpieczeństwa pracy z chemikaliami fotograficznymi.',
    dostawca: {
      przedsiebiorstwo: 'Miłosz Szymczak',
      adres: 'ul. Ameriga Vespucciego 43/23, 51-505 Wrocław',
      telefon: '+48 780 16 32 64',
      email: 'msds@wyszlo.pro',
      www: 'wyszlo.pro',
      bdo: '000682063',
    },
  },
  2: {
    klasyfikacja: ['Acute Tox. 4', 'Eye Dam. 1', 'Skin Sens. 1', 'Muta. 2', 'Carc. 2', 'STOT RE 2', 'Aquatic Acute 1', 'Aquatic Chronic 1'],
    piktogramy: ['GHS05', 'GHS07', 'GHS08', 'GHS09'],
    hasloOstrzegawcze: 'NIEBEZPIECZEŃSTWO',
    zwrotyH: ['H302', 'H317', 'H318', 'H341', 'H351', 'H373', 'H410'],
    zwrotyP: ['P201', 'P202', 'P260', 'P273', 'P280', 'P302+P352', 'P305+P351+P338', 'P308+P313', 'P391', 'P501'],
    informacjeDodatkowe:
      'Zawiera: hydrochinon (CAS 123-31-9), siarczan metolu (CAS 55-55-0). Może powodować reakcję alergiczną.',
    inneZagrozenia: {
      pbt: 'Nie. Mieszanina nie spełnia kryteriów PBT/vPvB zgodnie z załącznikiem XIII do REACH.',
      svhc: 'Mieszanina nie zawiera substancji znajdujących się obecnie na liście kandydackiej SVHC.',
      endokrynne: 'Brak dostępnych danych wskazujących na takie właściwości dla składników w stężeniu obecnym w mieszaninie.',
      pozostale:
        'Pył produktu może podrażniać drogi oddechowe. Hydrochinon ulega utlenianiu na powietrzu do chinonu — zmiana barwy na brunatną świadczy o utracie aktywności.',
    },
  },
  3: {
    opis: 'Mieszanina dwóch substancji wywołujących stosowanych w fotografii czarno-białej.',
    uwagi: 'Pełny tekst zwrotów H przytoczonych w tej sekcji znajduje się w Sekcji 16.',
  },
  9: {
    wlasciwosci: {
      stanSkupienia: 'ciało stałe (proszek drobnokrystaliczny)',
      kolor: 'biały do jasnoszarego',
      zapach: 'słaby, niecharakterystyczny',
      progZapachu: 'Brak dostępnych danych',
      temperaturaTopnienia: '~170 °C (hydrochinon) / 260 °C (metol)',
      temperaturaWrzenia: 'nie dotyczy (rozkład przed wrzeniem)',
      palnosc: 'materiał nie jest łatwopalny',
      graniceWybuchowosci: 'Brak dostępnych danych',
      temperaturaZaplonu: 'nie dotyczy',
      temperaturaSamozaplonu: 'nie dotyczy',
      temperaturaRozkladu: 'Brak dostępnych danych',
      pH: '~3,5 (roztwór 5 % w wodzie, 20 °C)',
      lepkosc: 'nie dotyczy (ciało stałe)',
      rozpuszczalnosc: 'dobrze rozpuszczalny w wodzie',
      wspolczynnikPodzialu: '0,59 (hydrochinon)',
      preznoscPary: 'Brak dostępnych danych',
      gestosc: '~1,3–1,4 g/cm³',
      gestoscPary: 'nie dotyczy',
      charakterystykaCzasteczek: 'proszek; rozmiar cząstek może powodować unoszenie się pyłu',
    },
    inne: { wlasciwosciWybuchowe: 'nie wykazuje', wlasciwosciUtleniajace: 'nie wykazuje (hydrochinon jest reduktorem)' },
  },
  14: {
    wstep:
      'Produkt w postaci handlowej (opakowania jednostkowe do zastosowań fotograficznych) nie podlega przepisom transportowym dotyczącym towarów niebezpiecznych.',
    transport: { niePodlega: true, mody: {} },
  },
  16: {
    pelnyTekstH: true,
    skroty: true,
    szkolenia:
      'Pracownicy mający kontakt z produktem powinni być zapoznani z treścią niniejszej karty charakterystyki oraz przeszkoleni w zakresie BHP i postępowania w sytuacjach awaryjnych.',
    zrodla: [
      'Karty charakterystyki producentów składników (WARCHEM Sp. z o.o.)',
      'Baza danych ECHA (echa.europa.eu)',
      'Załącznik VI do rozporządzenia (WE) nr 1272/2008',
    ],
    zmiany: 'wersja 1.0 — pierwsze wydanie karty charakterystyki.',
    zastrzezenie:
      'Powyższe informacje zostały zebrane na podstawie aktualnej wiedzy dotyczącej produktu, jednak nie stanowią gwarancji jakichkolwiek konkretnych właściwości produktu i nie uzasadniają stosunku umownego.',
  },
};


export const SECTIONS_B: Record<number, Record<string, unknown>> = {
  1: {
    identyfikator: {
      nazwaProduktu: 'wyszło fotochemia — wywoływacz D-76 — część B',
      inneNazwy: 'D-76 część B; mieszanina konserwująco-alkalizująca',
      postacHandlowa:
        'Mieszanina proszkowa (do rozpuszczenia w wodzie razem z częścią A w celu uzyskania roztworu roboczego wywoływacza negatywowego)',
      ufi: 'F1S2-30A8-M009-N3YP',
      numerReach: 'nie dotyczy (mieszanina; numery rejestracji składników podano w sekcji 3)',
    },
    dostawca: {
      przedsiebiorstwo: 'Miłosz Szymczak',
      adres: 'ul. Ameriga Vespucciego 43/23, 51-505 Wrocław',
      telefon: '+48 780 16 32 64',
      email: 'msds@wyszlo.pro',
      www: 'wyszlo.pro',
      bdo: '000682063',
    },
  },
  2: {
    klasyfikacja: ['Repr. 1B'],
    piktogramy: ['GHS08'],
    hasloOstrzegawcze: 'NIEBEZPIECZEŃSTWO',
    zwrotyH: ['H360FD'],
    zwrotyP: ['P201', 'P202', 'P280', 'P308+P313', 'P405', 'P501'],
    informacjeDodatkowe: 'Zawiera: di-sodu tetraboran 10-hydrat (boraks, CAS 1303-96-4) — substancja SVHC.',
    inneZagrozenia: {
      pbt: 'Nie. Mieszanina nie spełnia kryteriów PBT/vPvB.',
      svhc:
        'Mieszanina zawiera di-sodu tetraboran 10-hydrat (boraks, CAS 1303-96-4) — substancję z listy kandydackiej SVHC. Obowiązek informowania zgodnie z art. 33 REACH.',
      endokrynne: 'Brak dostępnych danych.',
      pozostale: 'Brak dostępnych danych.',
    },
  },
  3: { opis: 'Mieszanina konserwantu (siarczyn sodu) i buforu zasadowego (boraks).' },
  9: { wlasciwosci: { stanSkupienia: 'ciało stałe (proszek)', kolor: 'biały' } },
};

