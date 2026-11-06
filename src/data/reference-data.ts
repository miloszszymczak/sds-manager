/**
 * Katalog odpadów oraz rejestr podstaw prawnych.
 * Stany prawne zweryfikowane wg ISAP na sierpień 2026.
 */

export interface WasteCodeData {
  code: string;
  descriptionPl: string;
  isHazardous: boolean;
}

/** Wybór z rozp. Ministra Klimatu z 2.01.2020 (Dz.U. 2020 poz. 10) — grupy istotne dla fotochemii i laboratoriów. */
export const WASTE_CODES: WasteCodeData[] = [
  { code: '06 03 13*', descriptionPl: 'Sole i roztwory zawierające metale ciężkie', isHazardous: true },
  { code: '06 03 14', descriptionPl: 'Sole i roztwory inne niż wymienione w 06 03 11 i 06 03 13', isHazardous: false },
  { code: '07 06 81', descriptionPl: 'Zwroty kosmetyków i próbek', isHazardous: false },
  { code: '09 01 01*', descriptionPl: 'Wodne roztwory wywoływaczy i aktywatorów', isHazardous: true },
  { code: '09 01 02*', descriptionPl: 'Wodne roztwory wywoływaczy do płyt offsetowych', isHazardous: true },
  { code: '09 01 03*', descriptionPl: 'Roztwory wywoływaczy opartych na rozpuszczalnikach', isHazardous: true },
  { code: '09 01 04*', descriptionPl: 'Roztwory utrwalaczy', isHazardous: true },
  { code: '09 01 05*', descriptionPl: 'Roztwory wybielaczy i kąpieli wybielająco-utrwalających', isHazardous: true },
  { code: '09 01 06*', descriptionPl: 'Osady z zakładowych oczyszczalni ścieków zawierające srebro', isHazardous: true },
  { code: '09 01 07', descriptionPl: 'Błony i papier fotograficzny zawierające srebro lub związki srebra', isHazardous: false },
  { code: '09 01 08', descriptionPl: 'Błony i papier fotograficzny niezawierające srebra', isHazardous: false },
  { code: '15 01 01', descriptionPl: 'Opakowania z papieru i tektury', isHazardous: false },
  { code: '15 01 02', descriptionPl: 'Opakowania z tworzyw sztucznych', isHazardous: false },
  { code: '15 01 04', descriptionPl: 'Opakowania z metali', isHazardous: false },
  { code: '15 01 07', descriptionPl: 'Opakowania ze szkła', isHazardous: false },
  { code: '15 01 10*', descriptionPl: 'Opakowania zawierające pozostałości substancji niebezpiecznych lub nimi zanieczyszczone', isHazardous: true },
  { code: '16 03 03*', descriptionPl: 'Nieorganiczne odpady zawierające substancje niebezpieczne', isHazardous: true },
  { code: '16 03 05*', descriptionPl: 'Organiczne odpady zawierające substancje niebezpieczne', isHazardous: true },
  { code: '16 05 06*', descriptionPl: 'Chemikalia laboratoryjne i analityczne (np. odczynniki chemiczne) zawierające substancje niebezpieczne', isHazardous: true },
  { code: '16 05 09', descriptionPl: 'Zużyte chemikalia inne niż wymienione w 16 05 06, 16 05 07 lub 16 05 08', isHazardous: false },
];

export interface LegalReferenceData {
  title: string;
  journalRef?: string;
  category: 'UE' | 'KRAJOWE' | 'TRANSPORT';
  sortOrder: number;
}

/** Stan prawny zweryfikowany wg ISAP — sierpień 2026. */
export const LEGAL_REFERENCES: LegalReferenceData[] = [
  {
    title: 'Rozporządzenie (WE) nr 1907/2006 Parlamentu Europejskiego i Rady (REACH) z późn. zm.',
    category: 'UE',
    sortOrder: 10,
  },
  {
    title: 'Rozporządzenie (WE) nr 1272/2008 Parlamentu Europejskiego i Rady (CLP) z późn. zm.',
    category: 'UE',
    sortOrder: 20,
  },
  {
    title:
      'Rozporządzenie Komisji (UE) 2020/878 z dnia 18 czerwca 2020 r. zmieniające załącznik II do rozporządzenia (WE) nr 1907/2006',
    category: 'UE',
    sortOrder: 30,
  },
  {
    title: 'Ustawa z dnia 25 lutego 2011 r. o substancjach chemicznych i ich mieszaninach',
    journalRef: 't.j. Dz.U. 2022 poz. 1816 z późn. zm.',
    category: 'KRAJOWE',
    sortOrder: 40,
  },
  {
    title:
      'Rozporządzenie Ministra Zdrowia z dnia 16 września 2016 r. w sprawie bezpieczeństwa i higieny pracy związanej z występowaniem w miejscu pracy czynników chemicznych',
    journalRef: 't.j. Dz.U. 2016 poz. 1488',
    category: 'KRAJOWE',
    sortOrder: 50,
  },
  {
    title:
      'Rozporządzenie Ministra Rodziny, Pracy i Polityki Społecznej z dnia 12 czerwca 2018 r. w sprawie najwyższych dopuszczalnych stężeń i natężeń czynników szkodliwych dla zdrowia w środowisku pracy',
    journalRef: 'Dz.U. 2018 poz. 1286 z późn. zm.',
    category: 'KRAJOWE',
    sortOrder: 60,
  },
  {
    title:
      'Rozporządzenie Ministra Zdrowia z dnia 2 lutego 2011 r. w sprawie badań i pomiarów czynników szkodliwych dla zdrowia w środowisku pracy',
    journalRef: 't.j. Dz.U. 2025 poz. 949',
    category: 'KRAJOWE',
    sortOrder: 70,
  },
  {
    title: 'Ustawa z dnia 14 grudnia 2012 r. o odpadach',
    journalRef: 't.j. Dz.U. 2023 poz. 1587 z późn. zm.',
    category: 'KRAJOWE',
    sortOrder: 80,
  },
  {
    title: 'Ustawa z dnia 13 czerwca 2013 r. o gospodarce opakowaniami i odpadami opakowaniowymi',
    journalRef: 't.j. Dz.U. 2026 poz. 619',
    category: 'KRAJOWE',
    sortOrder: 90,
  },
  {
    title: 'Rozporządzenie Ministra Klimatu z dnia 2 stycznia 2020 r. w sprawie katalogu odpadów',
    journalRef: 'Dz.U. 2020 poz. 10',
    category: 'KRAJOWE',
    sortOrder: 100,
  },
  {
    title: 'Ustawa z dnia 27 kwietnia 2001 r. Prawo ochrony środowiska',
    journalRef: 't.j. Dz.U. 2025 poz. 647 z późn. zm.',
    category: 'KRAJOWE',
    sortOrder: 110,
  },
  {
    title: 'Ustawa z dnia 19 sierpnia 2011 r. o przewozie towarów niebezpiecznych',
    journalRef: 't.j. Dz.U. 2024 poz. 643',
    category: 'TRANSPORT',
    sortOrder: 120,
  },
  {
    title:
      'Umowa europejska dotycząca międzynarodowego przewozu drogowego towarów niebezpiecznych (ADR), w aktualnym brzmieniu',
    category: 'TRANSPORT',
    sortOrder: 130,
  },
];

/** Standardowy wykaz skrótów dołączany do sekcji 16. */
export const ABBREVIATIONS: { code: string; meaning: string }[] = [
  { code: 'ADR', meaning: 'Umowa europejska dotycząca międzynarodowego przewozu drogowego towarów niebezpiecznych' },
  { code: 'ADN', meaning: 'Europejskie porozumienie w sprawie międzynarodowego przewozu materiałów niebezpiecznych śródlądowymi drogami wodnymi' },
  { code: 'ATE', meaning: 'Acute Toxicity Estimate — oszacowanie toksyczności ostrej' },
  { code: 'BCF', meaning: 'Bioconcentration Factor — współczynnik biokoncentracji' },
  { code: 'CAS', meaning: 'Chemical Abstracts Service' },
  { code: 'CLP', meaning: 'Rozporządzenie (WE) nr 1272/2008 w sprawie klasyfikacji, oznakowania i pakowania' },
  { code: 'CMR', meaning: 'Substancja rakotwórcza, mutagenna lub działająca szkodliwie na rozrodczość' },
  { code: 'DNEL', meaning: 'Derived No-Effect Level — pochodny poziom niepowodujący zmian' },
  { code: 'DMEL', meaning: 'Derived Minimal Effect Level — pochodny minimalny poziom powodujący zmiany' },
  { code: 'EC50', meaning: 'Stężenie wywołujące 50 % efekt' },
  { code: 'ECHA', meaning: 'Europejska Agencja Chemikaliów' },
  { code: 'EINECS', meaning: 'Europejski Wykaz Istniejących Substancji o Znaczeniu Komercyjnym' },
  { code: 'GHS', meaning: 'Globalny Zharmonizowany System Klasyfikacji i Oznakowania Chemikaliów' },
  { code: 'IATA', meaning: 'Międzynarodowe Zrzeszenie Przewoźników Powietrznych' },
  { code: 'IMDG', meaning: 'Międzynarodowy morski kodeks towarów niebezpiecznych' },
  { code: 'KOW', meaning: 'Współczynnik podziału n-oktanol/woda' },
  { code: 'LC50 / LD50', meaning: 'Stężenie/dawka śmiertelna dla 50 % badanej populacji' },
  { code: 'NDS / NDSCh / NDSP', meaning: 'Najwyższe dopuszczalne stężenie / chwilowe / pułapowe' },
  { code: 'NOEC', meaning: 'No Observed Effect Concentration — stężenie bez obserwowanego efektu' },
  { code: 'OECD', meaning: 'Organizacja Współpracy Gospodarczej i Rozwoju' },
  { code: 'PBT', meaning: 'Substancja trwała, wykazująca zdolność do bioakumulacji i toksyczna' },
  { code: 'PNEC', meaning: 'Predicted No-Effect Concentration — przewidywane stężenie niepowodujące zmian w środowisku' },
  { code: 'REACH', meaning: 'Rozporządzenie (WE) nr 1907/2006' },
  { code: 'RID', meaning: 'Regulamin międzynarodowego przewozu kolejami towarów niebezpiecznych' },
  { code: 'SCBA', meaning: 'Autonomiczny aparat oddechowy' },
  { code: 'STOT SE / RE', meaning: 'Działanie toksyczne na narządy docelowe — narażenie jednorazowe / powtarzane' },
  { code: 'SVHC', meaning: 'Substancja stanowiąca bardzo duże zagrożenie' },
  { code: 'UFI', meaning: 'Unique Formula Identifier — niepowtarzalny identyfikator postaci czynnej' },
  { code: 'vPvB', meaning: 'Substancja bardzo trwała i wykazująca bardzo dużą zdolność do bioakumulacji' },
];

/** Środki transportu obsługiwane w sekcji 14. */
export const TRANSPORT_MODES = [
  { key: 'adr', label: 'ADR/RID' },
  { key: 'adn', label: 'ADN' },
  { key: 'imdg', label: 'IMDG' },
  { key: 'iata', label: 'IATA' },
] as const;

/** Parametry sekcji 14 (14.1–14.7). */
export const TRANSPORT_PARAMS = [
  { key: 'un', label: '14.1 Numer UN lub numer identyfikacyjny ID' },
  { key: 'nazwa', label: '14.2 Prawidłowa nazwa przewozowa UN' },
  { key: 'klasa', label: '14.3 Klasa(-y) zagrożenia w transporcie' },
  { key: 'grupaPakowania', label: '14.4 Grupa pakowania' },
  { key: 'zagrozeniaSrodowiska', label: '14.5 Zagrożenia dla środowiska' },
  { key: 'srodkiOstroznosci', label: '14.6 Szczególne środki ostrożności dla użytkowników' },
  { key: 'transportLuzem', label: '14.7 Transport morski luzem zgodnie z instrumentami IMO' },
] as const;
