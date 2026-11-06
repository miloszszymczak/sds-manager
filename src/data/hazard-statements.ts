/**
 * Zwroty wskazujące rodzaj zagrożenia (H) oraz uzupełniające (EUH)
 * — załącznik III do rozporządzenia CLP (WE) nr 1272/2008, wersja polska.
 */

export interface HazardStatementData {
  code: string;
  textPl: string;
  category: 'FIZYCZNE' | 'ZDROWOTNE' | 'SRODOWISKOWE' | 'UZUPELNIAJACE';
  isEuh?: boolean;
}

export const HAZARD_STATEMENTS: HazardStatementData[] = [
  // ── Zagrożenia fizyczne (H2xx) ──
  { code: 'H200', textPl: 'Materiały wybuchowe niestabilne.', category: 'FIZYCZNE' },
  { code: 'H201', textPl: 'Materiał wybuchowy; zagrożenie wybuchem masowym.', category: 'FIZYCZNE' },
  { code: 'H202', textPl: 'Materiał wybuchowy; poważne zagrożenie rozrzutem.', category: 'FIZYCZNE' },
  { code: 'H203', textPl: 'Materiał wybuchowy; zagrożenie pożarem, wybuchem lub rozrzutem.', category: 'FIZYCZNE' },
  { code: 'H204', textPl: 'Zagrożenie pożarem lub rozrzutem.', category: 'FIZYCZNE' },
  { code: 'H205', textPl: 'Może powodować wybuch masowy w razie pożaru.', category: 'FIZYCZNE' },
  { code: 'H220', textPl: 'Skrajnie łatwopalny gaz.', category: 'FIZYCZNE' },
  { code: 'H221', textPl: 'Gaz łatwopalny.', category: 'FIZYCZNE' },
  { code: 'H222', textPl: 'Skrajnie łatwopalny aerozol.', category: 'FIZYCZNE' },
  { code: 'H223', textPl: 'Aerozol łatwopalny.', category: 'FIZYCZNE' },
  { code: 'H224', textPl: 'Skrajnie łatwopalna ciecz i pary.', category: 'FIZYCZNE' },
  { code: 'H225', textPl: 'Wysoce łatwopalna ciecz i pary.', category: 'FIZYCZNE' },
  { code: 'H226', textPl: 'Łatwopalna ciecz i pary.', category: 'FIZYCZNE' },
  { code: 'H228', textPl: 'Substancja stała łatwopalna.', category: 'FIZYCZNE' },
  { code: 'H229', textPl: 'Pojemnik pod ciśnieniem: Ogrzanie grozi wybuchem.', category: 'FIZYCZNE' },
  { code: 'H230', textPl: 'Może reagować wybuchowo nawet bez dostępu powietrza.', category: 'FIZYCZNE' },
  { code: 'H231', textPl: 'Może reagować wybuchowo nawet bez dostępu powietrza pod zwiększonym ciśnieniem i/lub po ogrzaniu.', category: 'FIZYCZNE' },
  { code: 'H240', textPl: 'Ogrzanie grozi wybuchem.', category: 'FIZYCZNE' },
  { code: 'H241', textPl: 'Ogrzanie może spowodować pożar lub wybuch.', category: 'FIZYCZNE' },
  { code: 'H242', textPl: 'Ogrzanie może spowodować pożar.', category: 'FIZYCZNE' },
  { code: 'H250', textPl: 'Zapala się samorzutnie w przypadku wystawienia na działanie powietrza.', category: 'FIZYCZNE' },
  { code: 'H251', textPl: 'Substancja samonagrzewająca się: może się zapalić.', category: 'FIZYCZNE' },
  { code: 'H252', textPl: 'Substancja samonagrzewająca się w dużych ilościach; może się zapalić.', category: 'FIZYCZNE' },
  { code: 'H260', textPl: 'W kontakcie z wodą uwalniają łatwopalne gazy, które mogą ulegać samozapaleniu.', category: 'FIZYCZNE' },
  { code: 'H261', textPl: 'W kontakcie z wodą uwalnia łatwopalne gazy.', category: 'FIZYCZNE' },
  { code: 'H270', textPl: 'Może spowodować lub intensyfikować pożar; utleniacz.', category: 'FIZYCZNE' },
  { code: 'H271', textPl: 'Może spowodować pożar lub wybuch; silny utleniacz.', category: 'FIZYCZNE' },
  { code: 'H272', textPl: 'Może intensyfikować pożar; utleniacz.', category: 'FIZYCZNE' },
  { code: 'H280', textPl: 'Zawiera gaz pod ciśnieniem; ogrzanie grozi wybuchem.', category: 'FIZYCZNE' },
  { code: 'H281', textPl: 'Zawiera schłodzony gaz; może spowodować oparzenia kriogeniczne lub obrażenia.', category: 'FIZYCZNE' },
  { code: 'H290', textPl: 'Może powodować korozję metali.', category: 'FIZYCZNE' },

  // ── Zagrożenia dla zdrowia (H3xx) ──
  { code: 'H300', textPl: 'Połknięcie grozi śmiercią.', category: 'ZDROWOTNE' },
  { code: 'H301', textPl: 'Działa toksycznie po połknięciu.', category: 'ZDROWOTNE' },
  { code: 'H302', textPl: 'Działa szkodliwie po połknięciu.', category: 'ZDROWOTNE' },
  { code: 'H304', textPl: 'Połknięcie i dostanie się przez drogi oddechowe może grozić śmiercią.', category: 'ZDROWOTNE' },
  { code: 'H310', textPl: 'Grozi śmiercią w kontakcie ze skórą.', category: 'ZDROWOTNE' },
  { code: 'H311', textPl: 'Działa toksycznie w kontakcie ze skórą.', category: 'ZDROWOTNE' },
  { code: 'H312', textPl: 'Działa szkodliwie w kontakcie ze skórą.', category: 'ZDROWOTNE' },
  { code: 'H314', textPl: 'Powoduje poważne oparzenia skóry oraz uszkodzenia oczu.', category: 'ZDROWOTNE' },
  { code: 'H315', textPl: 'Działa drażniąco na skórę.', category: 'ZDROWOTNE' },
  { code: 'H317', textPl: 'Może powodować reakcję alergiczną skóry.', category: 'ZDROWOTNE' },
  { code: 'H318', textPl: 'Powoduje poważne uszkodzenie oczu.', category: 'ZDROWOTNE' },
  { code: 'H319', textPl: 'Działa drażniąco na oczy.', category: 'ZDROWOTNE' },
  { code: 'H330', textPl: 'Wdychanie grozi śmiercią.', category: 'ZDROWOTNE' },
  { code: 'H331', textPl: 'Działa toksycznie w następstwie wdychania.', category: 'ZDROWOTNE' },
  { code: 'H332', textPl: 'Działa szkodliwie w następstwie wdychania.', category: 'ZDROWOTNE' },
  { code: 'H334', textPl: 'Może powodować objawy alergii lub astmy lub trudności w oddychaniu w następstwie wdychania.', category: 'ZDROWOTNE' },
  { code: 'H335', textPl: 'Może powodować podrażnienie dróg oddechowych.', category: 'ZDROWOTNE' },
  { code: 'H336', textPl: 'Może wywoływać uczucie senności lub zawroty głowy.', category: 'ZDROWOTNE' },
  { code: 'H340', textPl: 'Może powodować wady genetyczne.', category: 'ZDROWOTNE' },
  { code: 'H341', textPl: 'Podejrzewa się, że powoduje wady genetyczne.', category: 'ZDROWOTNE' },
  { code: 'H350', textPl: 'Może powodować raka.', category: 'ZDROWOTNE' },
  { code: 'H350i', textPl: 'Wdychanie może spowodować raka.', category: 'ZDROWOTNE' },
  { code: 'H351', textPl: 'Podejrzewa się, że powoduje raka.', category: 'ZDROWOTNE' },
  { code: 'H360', textPl: 'Może działać szkodliwie na płodność lub na dziecko w łonie matki.', category: 'ZDROWOTNE' },
  { code: 'H360F', textPl: 'Może działać szkodliwie na płodność.', category: 'ZDROWOTNE' },
  { code: 'H360D', textPl: 'Może działać szkodliwie na dziecko w łonie matki.', category: 'ZDROWOTNE' },
  { code: 'H360FD', textPl: 'Może działać szkodliwie na płodność. Może działać szkodliwie na dziecko w łonie matki.', category: 'ZDROWOTNE' },
  { code: 'H360Fd', textPl: 'Może działać szkodliwie na płodność. Podejrzewa się, że działa szkodliwie na dziecko w łonie matki.', category: 'ZDROWOTNE' },
  { code: 'H360Df', textPl: 'Może działać szkodliwie na dziecko w łonie matki. Podejrzewa się, że działa szkodliwie na płodność.', category: 'ZDROWOTNE' },
  { code: 'H361', textPl: 'Podejrzewa się, że działa szkodliwie na płodność lub na dziecko w łonie matki.', category: 'ZDROWOTNE' },
  { code: 'H361f', textPl: 'Podejrzewa się, że działa szkodliwie na płodność.', category: 'ZDROWOTNE' },
  { code: 'H361d', textPl: 'Podejrzewa się, że działa szkodliwie na dziecko w łonie matki.', category: 'ZDROWOTNE' },
  { code: 'H361fd', textPl: 'Podejrzewa się, że działa szkodliwie na płodność. Podejrzewa się, że działa szkodliwie na dziecko w łonie matki.', category: 'ZDROWOTNE' },
  { code: 'H362', textPl: 'Może działać szkodliwie na dzieci karmione piersią.', category: 'ZDROWOTNE' },
  { code: 'H370', textPl: 'Powoduje uszkodzenie narządów.', category: 'ZDROWOTNE' },
  { code: 'H371', textPl: 'Może powodować uszkodzenie narządów.', category: 'ZDROWOTNE' },
  { code: 'H372', textPl: 'Powoduje uszkodzenie narządów poprzez długotrwałe lub powtarzane narażenie.', category: 'ZDROWOTNE' },
  { code: 'H373', textPl: 'Może powodować uszkodzenie narządów poprzez długotrwałe lub powtarzane narażenie.', category: 'ZDROWOTNE' },

  // ── Zagrożenia dla środowiska (H4xx) ──
  { code: 'H400', textPl: 'Działa bardzo toksycznie na organizmy wodne.', category: 'SRODOWISKOWE' },
  { code: 'H410', textPl: 'Działa bardzo toksycznie na organizmy wodne, powodując długotrwałe skutki.', category: 'SRODOWISKOWE' },
  { code: 'H411', textPl: 'Działa toksycznie na organizmy wodne, powodując długotrwałe skutki.', category: 'SRODOWISKOWE' },
  { code: 'H412', textPl: 'Działa szkodliwie na organizmy wodne, powodując długotrwałe skutki.', category: 'SRODOWISKOWE' },
  { code: 'H413', textPl: 'Może powodować długotrwałe szkodliwe skutki dla organizmów wodnych.', category: 'SRODOWISKOWE' },
  { code: 'H420', textPl: 'Szkodliwe dla zdrowia publicznego i środowiska w związku z niszczeniem ozonu w górnej warstwie atmosfery.', category: 'SRODOWISKOWE' },

  // ── Zwroty uzupełniające (EUH) ──
  { code: 'EUH014', textPl: 'Reaguje gwałtownie z wodą.', category: 'UZUPELNIAJACE', isEuh: true },
  { code: 'EUH018', textPl: 'Podczas stosowania mogą powstawać łatwopalne lub wybuchowe mieszaniny par z powietrzem.', category: 'UZUPELNIAJACE', isEuh: true },
  { code: 'EUH019', textPl: 'Może tworzyć wybuchowe nadtlenki.', category: 'UZUPELNIAJACE', isEuh: true },
  { code: 'EUH029', textPl: 'W kontakcie z wodą uwalnia toksyczne gazy.', category: 'UZUPELNIAJACE', isEuh: true },
  { code: 'EUH031', textPl: 'W kontakcie z kwasami uwalnia toksyczne gazy.', category: 'UZUPELNIAJACE', isEuh: true },
  { code: 'EUH032', textPl: 'W kontakcie z kwasami uwalnia bardzo toksyczne gazy.', category: 'UZUPELNIAJACE', isEuh: true },
  { code: 'EUH066', textPl: 'Powtarzające się narażenie może powodować wysuszanie lub pękanie skóry.', category: 'UZUPELNIAJACE', isEuh: true },
  { code: 'EUH070', textPl: 'Działa toksycznie w kontakcie z oczami.', category: 'UZUPELNIAJACE', isEuh: true },
  { code: 'EUH071', textPl: 'Działa żrąco na drogi oddechowe.', category: 'UZUPELNIAJACE', isEuh: true },
  { code: 'EUH201', textPl: 'Zawiera ołów. Nie stosować na powierzchniach, które mogą być żute lub ssane przez dzieci.', category: 'UZUPELNIAJACE', isEuh: true },
  { code: 'EUH208', textPl: 'Zawiera <nazwa substancji uczulającej>. Może powodować wystąpienie reakcji alergicznej.', category: 'UZUPELNIAJACE', isEuh: true },
  { code: 'EUH210', textPl: 'Karta charakterystyki dostępna na żądanie.', category: 'UZUPELNIAJACE', isEuh: true },
  { code: 'EUH401', textPl: 'W celu uniknięcia zagrożeń dla zdrowia ludzi i środowiska, należy postępować zgodnie z instrukcją użycia.', category: 'UZUPELNIAJACE', isEuh: true },
];

export const HAZARD_STATEMENT_BY_CODE = new Map(HAZARD_STATEMENTS.map((h) => [h.code, h]));
