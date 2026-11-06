/**
 * Zwroty wskazujące środki ostrożności (P)
 * — załącznik IV do rozporządzenia CLP (WE) nr 1272/2008, wersja polska.
 * Uwzględniono zwroty pojedyncze oraz najczęściej stosowane kombinacje.
 */

export interface PrecautionaryStatementData {
  code: string;
  textPl: string;
  type: 'OGOLNE' | 'ZAPOBIEGANIE' | 'REAGOWANIE' | 'PRZECHOWYWANIE' | 'USUWANIE';
}

export const PRECAUTIONARY_STATEMENTS: PrecautionaryStatementData[] = [
  // ── Ogólne ──
  { code: 'P101', textPl: 'W razie konieczności zasięgnięcia porady lekarza należy pokazać pojemnik lub etykietę.', type: 'OGOLNE' },
  { code: 'P102', textPl: 'Chronić przed dziećmi.', type: 'OGOLNE' },
  { code: 'P103', textPl: 'Uważnie przeczytać wszystkie instrukcje i zastosować się do nich.', type: 'OGOLNE' },

  // ── Zapobieganie ──
  { code: 'P201', textPl: 'Przed użyciem zapoznać się ze specjalnymi środkami ostrożności.', type: 'ZAPOBIEGANIE' },
  { code: 'P202', textPl: 'Nie używać przed zapoznaniem się i zrozumieniem wszystkich środków bezpieczeństwa.', type: 'ZAPOBIEGANIE' },
  { code: 'P210', textPl: 'Przechowywać z dala od źródeł ciepła, gorących powierzchni, iskier, otwartego ognia i innych źródeł zapłonu. Nie palić.', type: 'ZAPOBIEGANIE' },
  { code: 'P211', textPl: 'Nie rozpylać nad otwartym ogniem lub innym źródłem zapłonu.', type: 'ZAPOBIEGANIE' },
  { code: 'P220', textPl: 'Trzymać z dala od odzieży i innych materiałów zapalnych.', type: 'ZAPOBIEGANIE' },
  { code: 'P221', textPl: 'Stosować wszelkie środki ostrożności w celu uniknięcia mieszania z innymi materiałami zapalnymi.', type: 'ZAPOBIEGANIE' },
  { code: 'P222', textPl: 'Nie dopuszczać do kontaktu z powietrzem.', type: 'ZAPOBIEGANIE' },
  { code: 'P223', textPl: 'Nie dopuszczać do kontaktu z wodą.', type: 'ZAPOBIEGANIE' },
  { code: 'P231', textPl: 'Używać i przechowywać zawartość w atmosferze obojętnego gazu.', type: 'ZAPOBIEGANIE' },
  { code: 'P232', textPl: 'Chronić przed wilgocią.', type: 'ZAPOBIEGANIE' },
  { code: 'P233', textPl: 'Przechowywać pojemnik szczelnie zamknięty.', type: 'ZAPOBIEGANIE' },
  { code: 'P234', textPl: 'Przechowywać wyłącznie w oryginalnym opakowaniu.', type: 'ZAPOBIEGANIE' },
  { code: 'P235', textPl: 'Przechowywać w chłodnym miejscu.', type: 'ZAPOBIEGANIE' },
  { code: 'P240', textPl: 'Uziemić i połączyć pojemnik i sprzęt odbiorczy.', type: 'ZAPOBIEGANIE' },
  { code: 'P241', textPl: 'Używać elektrycznego/wentylującego/oświetleniowego przeciwwybuchowego sprzętu.', type: 'ZAPOBIEGANIE' },
  { code: 'P242', textPl: 'Używać nieiskrzących narzędzi.', type: 'ZAPOBIEGANIE' },
  { code: 'P243', textPl: 'Podjąć działania zapobiegające wyładowaniom elektrostatycznym.', type: 'ZAPOBIEGANIE' },
  { code: 'P244', textPl: 'Chronić zawory i przyłącza przed olejem i tłuszczem.', type: 'ZAPOBIEGANIE' },
  { code: 'P250', textPl: 'Nie poddawać szlifowaniu/wstrząsom/tarciu.', type: 'ZAPOBIEGANIE' },
  { code: 'P251', textPl: 'Nie przekłuwać ani nie spalać, nawet po zużyciu.', type: 'ZAPOBIEGANIE' },
  { code: 'P260', textPl: 'Nie wdychać pyłu/dymu/gazu/mgły/par/rozpylonej cieczy.', type: 'ZAPOBIEGANIE' },
  { code: 'P261', textPl: 'Unikać wdychania pyłu/dymu/gazu/mgły/par/rozpylonej cieczy.', type: 'ZAPOBIEGANIE' },
  { code: 'P262', textPl: 'Nie wprowadzać do oczu, na skórę lub na odzież.', type: 'ZAPOBIEGANIE' },
  { code: 'P263', textPl: 'Unikać kontaktu w czasie ciąży i karmienia piersią.', type: 'ZAPOBIEGANIE' },
  { code: 'P264', textPl: 'Dokładnie umyć ręce po użyciu.', type: 'ZAPOBIEGANIE' },
  { code: 'P270', textPl: 'Nie jeść, nie pić i nie palić podczas używania produktu.', type: 'ZAPOBIEGANIE' },
  { code: 'P271', textPl: 'Stosować wyłącznie na zewnątrz lub w dobrze wentylowanym pomieszczeniu.', type: 'ZAPOBIEGANIE' },
  { code: 'P272', textPl: 'Zanieczyszczonej odzieży ochronnej nie wynosić poza miejsce pracy.', type: 'ZAPOBIEGANIE' },
  { code: 'P273', textPl: 'Unikać uwolnienia do środowiska.', type: 'ZAPOBIEGANIE' },
  { code: 'P280', textPl: 'Stosować rękawice ochronne / odzież ochronną / ochronę oczu / ochronę twarzy.', type: 'ZAPOBIEGANIE' },
  { code: 'P282', textPl: 'Nosić rękawice izolujące od zimna oraz albo osłonę twarzy, albo ochronę oczu.', type: 'ZAPOBIEGANIE' },
  { code: 'P283', textPl: 'Nosić odzież ognioodporną lub o właściwościach opóźniających zapłon.', type: 'ZAPOBIEGANIE' },
  { code: 'P284', textPl: 'Stosować indywidualne środki ochrony dróg oddechowych.', type: 'ZAPOBIEGANIE' },

  // ── Reagowanie ──
  { code: 'P301', textPl: 'W PRZYPADKU POŁKNIĘCIA:', type: 'REAGOWANIE' },
  { code: 'P301+P310', textPl: 'W PRZYPADKU POŁKNIĘCIA: Natychmiast skontaktować się z OŚRODKIEM ZATRUĆ lub lekarzem.', type: 'REAGOWANIE' },
  { code: 'P301+P312', textPl: 'W PRZYPADKU POŁKNIĘCIA: W przypadku złego samopoczucia skontaktować się z OŚRODKIEM ZATRUĆ lub lekarzem.', type: 'REAGOWANIE' },
  { code: 'P301+P330+P331', textPl: 'W PRZYPADKU POŁKNIĘCIA: wypłukać usta. NIE wywoływać wymiotów.', type: 'REAGOWANIE' },
  { code: 'P302+P352', textPl: 'W PRZYPADKU KONTAKTU ZE SKÓRĄ: Umyć dużą ilością wody z mydłem.', type: 'REAGOWANIE' },
  { code: 'P302+P361+P354', textPl: 'W PRZYPADKU KONTAKTU ZE SKÓRĄ: Natychmiast zdjąć całą zanieczyszczoną odzież. Spłukać skórę wodą.', type: 'REAGOWANIE' },
  { code: 'P303+P361+P353', textPl: 'W PRZYPADKU KONTAKTU ZE SKÓRĄ (lub z włosami): Natychmiast zdjąć całą zanieczyszczoną odzież. Spłukać skórę pod strumieniem wody lub prysznicem.', type: 'REAGOWANIE' },
  { code: 'P304+P340', textPl: 'W PRZYPADKU DOSTANIA SIĘ DO DRÓG ODDECHOWYCH: Wyprowadzić lub wynieść poszkodowanego na świeże powietrze i zapewnić mu warunki do swobodnego oddychania.', type: 'REAGOWANIE' },
  { code: 'P305+P351+P338', textPl: 'W PRZYPADKU DOSTANIA SIĘ DO OCZU: Ostrożnie płukać wodą przez kilka minut. Wyjąć soczewki kontaktowe, jeżeli są i można je łatwo usunąć. Nadal płukać.', type: 'REAGOWANIE' },
  { code: 'P306+P360', textPl: 'W PRZYPADKU KONTAKTU Z ODZIEŻĄ: Natychmiast spłukać zanieczyszczoną odzież i skórę dużą ilością wody przed zdjęciem odzieży.', type: 'REAGOWANIE' },
  { code: 'P308+P313', textPl: 'W przypadku narażenia lub styczności: Zasięgnąć porady/zgłosić się pod opiekę lekarza.', type: 'REAGOWANIE' },
  { code: 'P310', textPl: 'Natychmiast skontaktować się z OŚRODKIEM ZATRUĆ lub lekarzem.', type: 'REAGOWANIE' },
  { code: 'P311', textPl: 'Skontaktować się z OŚRODKIEM ZATRUĆ lub lekarzem.', type: 'REAGOWANIE' },
  { code: 'P312', textPl: 'W przypadku złego samopoczucia skontaktować się z OŚRODKIEM ZATRUĆ lub lekarzem.', type: 'REAGOWANIE' },
  { code: 'P313', textPl: 'Zasięgnąć porady/zgłosić się pod opiekę lekarza.', type: 'REAGOWANIE' },
  { code: 'P314', textPl: 'W przypadku złego samopoczucia zasięgnąć porady/zgłosić się pod opiekę lekarza.', type: 'REAGOWANIE' },
  { code: 'P315', textPl: 'Natychmiast zasięgnąć porady/zgłosić się pod opiekę lekarza.', type: 'REAGOWANIE' },
  { code: 'P321', textPl: 'Zastosować określone leczenie (patrz informacje na etykiecie).', type: 'REAGOWANIE' },
  { code: 'P330', textPl: 'Wypłukać usta.', type: 'REAGOWANIE' },
  { code: 'P331', textPl: 'NIE wywoływać wymiotów.', type: 'REAGOWANIE' },
  { code: 'P332+P313', textPl: 'W przypadku wystąpienia podrażnienia skóry: Zasięgnąć porady/zgłosić się pod opiekę lekarza.', type: 'REAGOWANIE' },
  { code: 'P333+P313', textPl: 'W przypadku wystąpienia podrażnienia skóry lub wysypki: Zasięgnąć porady/zgłosić się pod opiekę lekarza.', type: 'REAGOWANIE' },
  { code: 'P337+P313', textPl: 'W przypadku utrzymywania się działania drażniącego na oczy: Zasięgnąć porady/zgłosić się pod opiekę lekarza.', type: 'REAGOWANIE' },
  { code: 'P342+P311', textPl: 'W przypadku wystąpienia objawów ze strony układu oddechowego: Skontaktować się z OŚRODKIEM ZATRUĆ lub lekarzem.', type: 'REAGOWANIE' },
  { code: 'P362+P364', textPl: 'Zanieczyszczoną odzież zdjąć i wyprać przed ponownym użyciem.', type: 'REAGOWANIE' },
  { code: 'P370+P378', textPl: 'W przypadku pożaru: Użyć odpowiednich środków gaśniczych do gaszenia.', type: 'REAGOWANIE' },
  { code: 'P391', textPl: 'Zebrać wyciek.', type: 'REAGOWANIE' },

  // ── Przechowywanie ──
  { code: 'P401', textPl: 'Przechowywać zgodnie z przepisami krajowymi.', type: 'PRZECHOWYWANIE' },
  { code: 'P402', textPl: 'Przechowywać w suchym miejscu.', type: 'PRZECHOWYWANIE' },
  { code: 'P402+P404', textPl: 'Przechowywać w suchym miejscu. Przechowywać w zamkniętym pojemniku.', type: 'PRZECHOWYWANIE' },
  { code: 'P403+P233', textPl: 'Przechowywać w dobrze wentylowanym miejscu. Przechowywać pojemnik szczelnie zamknięty.', type: 'PRZECHOWYWANIE' },
  { code: 'P403+P235', textPl: 'Przechowywać w dobrze wentylowanym miejscu. Przechowywać w chłodnym miejscu.', type: 'PRZECHOWYWANIE' },
  { code: 'P405', textPl: 'Przechowywać pod zamknięciem.', type: 'PRZECHOWYWANIE' },
  { code: 'P406', textPl: 'Przechowywać w pojemniku odpornym na korozję o odpornej powłoce wewnętrznej.', type: 'PRZECHOWYWANIE' },
  { code: 'P407', textPl: 'Zachować szczelinę powietrzną pomiędzy stosami lub paletami.', type: 'PRZECHOWYWANIE' },
  { code: 'P410', textPl: 'Chronić przed światłem słonecznym.', type: 'PRZECHOWYWANIE' },
  { code: 'P410+P403', textPl: 'Chronić przed światłem słonecznym. Przechowywać w dobrze wentylowanym miejscu.', type: 'PRZECHOWYWANIE' },
  { code: 'P411', textPl: 'Przechowywać w temperaturze nieprzekraczającej określonej wartości.', type: 'PRZECHOWYWANIE' },
  { code: 'P412', textPl: 'Nie wystawiać na działanie temperatury przekraczającej 50 °C.', type: 'PRZECHOWYWANIE' },
  { code: 'P413', textPl: 'Przechowywać luzem masy przekraczające określoną wartość w temperaturze nieprzekraczającej określonej wartości.', type: 'PRZECHOWYWANIE' },
  { code: 'P420', textPl: 'Przechowywać oddzielnie.', type: 'PRZECHOWYWANIE' },

  // ── Usuwanie ──
  { code: 'P501', textPl: 'Zawartość/pojemnik usuwać do uprawnionego odbiorcy odpadów zgodnie z przepisami krajowymi.', type: 'USUWANIE' },
  { code: 'P502', textPl: 'Przestrzegać wskazówek producenta lub dostawcy dotyczących odzysku lub wtórnego wykorzystania.', type: 'USUWANIE' },
  { code: 'P503', textPl: 'Przestrzegać wskazówek producenta/dostawcy dotyczących usuwania lub odzysku odpadów.', type: 'USUWANIE' },
];

export const PRECAUTIONARY_BY_CODE = new Map(PRECAUTIONARY_STATEMENTS.map((p) => [p.code, p]));
