# Edytor kart charakterystyki (SDS)

Wieloużytkownikowa aplikacja do projektowania i wydawania kart charakterystyki zgodnych
z **(WE) nr 1907/2006 (REACH)** w brzmieniu **(UE) 2020/878** oraz klasyfikacji mieszanin wg **CLP**.
Interfejs i dane: język polski.

## Model domeny

```
Substancja (CAS) ──< Składnik >── Mieszanina ──< Opakowanie (A, B, C…)
                                     │
                                     ├──< Wariant objętościowy (1 L, 0,5 L…)
                                     │        └── Karta SDS dla każdego opakowania wariantu
                                     └──< Roztwór roboczy (+ woda) → opcjonalna karta
Produkt (zestaw do sprzedaży) ──< Pozycja (wariant × liczba sztuk)
```

| Encja | Opis |
|---|---|
| **Substancja** | Identyfikowana numerem **CAS** (klucz główny, walidowany cyfrą kontrolną; zmiana CAS aktualizuje powiązania kaskadowo). Dane strukturalne zagrożeń (M, ATE, SCL) zasilają silnik klasyfikacji. |
| **Mieszanina** | Receptura w g lub ml na objętość odniesienia (np. 1000 ml), podzielona na **opakowania** (D-76: część A + część B). Skład %m/m liczony na żywo. |
| **Wariant objętościowy** | Skaluje recepturę (1 L, 0,5 L…). Każde opakowanie wariantu ma **własną kartę SDS** i masę netto (trafia na etykietę CLP). |
| **Produkt** | Zestaw do sprzedaży z opakowań różnych mieszanin (np. „Zestaw C-41 1 L” = wywoływacz A+B+C, wybielacz, utrwalacz). Pokazuje kompletność kart i generuje paczkę ZIP wszystkich kart. |

Karta przy tworzeniu z wariantu kopiuje treść karty tego samego opakowania z innego wariantu
(skład %m/m jest identyczny), a gdy jej nie ma — powstaje szkic: dostawca, sekcja 3 ze składu
i sekcja 2 wyliczona przez silnik CLP. Po zmianie receptury „Synchronizuj sekcję 3” odtwarza
skład we wszystkich kartach mieszaniny (pomijając karty edytowane w tej chwili przez innych).

## Użytkownicy i blokady edycji

- **Role:** Administrator (konta, przejmowanie blokad), Edytor (tworzenie i edycja), Podgląd (odczyt, eksport).
- **Logowanie:** e-mail + hasło (scrypt), sesja w ciasteczku `httpOnly`, w bazie przechowywany jest tylko skrót tokenu.
  Sesja przesuwna 14 dni; zablokowanie konta lub zmiana hasła przez administratora wylogowuje użytkownika.
- **Blokady (karty i mieszaniny):** otwarcie edytora przejmuje blokadę z dzierżawą 90 s odnawianą co 25 s.
  Inni widzą tryb tylko do odczytu z nazwiskiem edytującego; po zwolnieniu blokady edycja odblokowuje się sama
  (strona przeładowuje aktualną treść). Każdy zapis po stronie serwera sprawdza blokadę — UI nie jest jedyną ochroną.
  Przejęcie odbywa się atomowo jednym zapytaniem `INSERT … ON CONFLICT … WHERE`, z czasem liczonym przez bazę,
  więc działa poprawnie przy wielu replikach.
- **Zapis sekcji** to jedno atomowe scalenie `jsonb ||` — równoległe zapisy różnych pól nie mogą się nadpisać.

## Architektura

```
prisma/schema.prisma        model danych (PostgreSQL, jsonb, tablice)
prisma/migrations/          migracje (prisma migrate deploy)
prisma/seed.ts              idempotentny seed; prisma/data/ — dane startowe
src/lib/                    czysta logika domenowa (testy jednostkowe): CAS, receptury,
                            silnik CLP, walidator, etykieta, PCN, wersjonowanie, schemat sekcji
src/server/                 tylko serwer: Prisma, sesje, uprawnienia, blokady, zapis sekcji
src/server/actions/         akcje serwerowe wg domeny (auth, users, substances, mixtures,
                            products, documents, templates, locks) — każda zaczyna się od requireUser(rola)
src/components/             UI (edytory, renderer wydruku, blokady, komunikaty)
src/app/                    strony (App Router) + /api/health, /api/locks/release
deploy/k8s/                 manifesty Kubernetes (kustomize)
```

Zasady: akcje zwracają `ActionResult` (błędy oczekiwane — blokada, uprawnienia, walidacja — wracają jako wartość,
bo Next.js maskuje wyjątki w produkcji); wejście każdej akcji jest walidowane schematem zod;
`src/lib/schema/sections.ts` jest jedynym źródłem prawdy o strukturze 16 sekcji (edytor i wydruk).

## Uruchomienie lokalne

```bash
cp .env.example .env
npm install
docker compose up -d db        # PostgreSQL na localhost:55432
npm run db:deploy              # migracje
npm run db:seed                # słowniki, administrator, dane z arkusza „Chemikalia”
npm run dev                    # http://localhost:3000 — logowanie: ADMIN_EMAIL / ADMIN_PASSWORD z .env
```

Całość w kontenerach (jak w produkcji): `docker compose --profile full up --build`.

Testy: `npm test` (jednostkowe + walidacja manifestów). Testy integracyjne blokad na PostgreSQL:
`TEST_DATABASE_URL=postgresql://… npm test` (baza z zastosowanymi migracjami). Dodatkowo `npm run lint`, `npm run typecheck`.

## Wdrożenie w Kubernetes

Obraz (`Dockerfile`) zawiera serwer Next.js (standalone), Prisma CLI i zbudowany seed; działa jako
użytkownik 1001 z systemem plików tylko do odczytu. Obrazy publikuje `npm run release` (niżej).

1. **Sekret** z połączeniem do bazy (Twojej) i kontem startowym — szablon w `deploy/k8s/secret.example.yaml`:
   ```bash
   kubectl create namespace sds
   kubectl -n sds create secret generic sds-app \
     --from-literal=DATABASE_URL='postgresql://USER:HASLO@HOST:5432/sds?schema=public&connection_limit=10' \
     --from-literal=ADMIN_EMAIL='admin@twoja-domena.pl' \
     --from-literal=ADMIN_PASSWORD='silne-haslo' \
     --from-literal=NEXT_SERVER_ACTIONS_ENCRYPTION_KEY="$(openssl rand -base64 32)"
   ```
2. Wydaj obraz (`npm run release` — ustawia też obraz i tag w `deploy/k8s/kustomization.yaml`) i wdroż: `kubectl apply -k deploy/k8s`.
3. **IngressRoute** (Traefik) kieruj na `Service sds-app`, port `http` (przykład: `deploy/k8s/ingressroute.example.yaml`).
   Jeśli publiczna domena różni się od nagłówka `Host` docierającego do poda, wpisz ją
   w `SERVER_ACTIONS_ALLOWED_ORIGINS` (ConfigMap).

Co zostanie utworzone:

| Zasób | Rola |
|---|---|
| Deployment (2 repliki) | initContainer `migrate` stosuje migracje przy każdym wdrożeniu (blokada doradcza Prisma — bezpieczne przy wielu podach); sondy `/api/health` (liveness) i `/api/health?ready=1` (readiness, sprawdza bazę); rolling update bez przestojów |
| Job `sds-seed` | dane startowe i konto administratora (tylko gdy w bazie nie ma użytkowników); idempotentny — ponowne uruchomienie: `kubectl -n sds delete job sds-seed && kubectl apply -k deploy/k8s` |
| Service, PDB, HPA (2–5 replik, CPU 70 %) | — |

Repliki są bezstanowe (sesje i blokady w bazie) — sticky sessions nie są potrzebne.
Po wdrożeniu nowej wersji otwarte karty przeglądarki starej wersji poproszą o odświeżenie.

## Źródła danych

- **PubChem (NIH)** — na stronie substancji przycisk „Pobierz dane z PubChem” wyszukuje po numerze CAS identyfikatory
  (nr WE, nr indeksowy, wzór, masa molowa) oraz klasyfikację: **zharmonizowaną z zał. VI CLP**, a gdy jej brak —
  zwroty ze zgłoszeń do wykazu C&L ECHA z odsetkiem zgłaszających. To propozycja: chemik wybiera, co przyjąć
  (kategorie niejednoznaczne, np. H314 → 1A/1B/1C, wskazuje ręcznie). PubChem nie podaje SCL, współczynników M ani ATE.
  API jest publiczne, bez klucza; wysyłany jest wyłącznie numer CAS. Pod musi mieć wyjście do
  `pubchem.ncbi.nlm.nih.gov` (wyłączenie funkcji: `PUBCHEM_LOOKUP=off`).
- **ECHA** nie udostępnia publicznego API; źródłem wiążącym pozostaje tabela 3 zał. VI CLP (ECHA publikuje jej
  nieoficjalny arkusz Excel — kandydat do importu SCL i współczynników M).
- **Treść kart** tworzy się w aplikacji; nie istnieje darmowe źródło gotowych, zgodnych kart dla własnych mieszanin.
  Standardem wymiany danych kart jest otwarty format **eSDScom XML** (z katalogiem zwrotów EuPhraC) — naturalny
  kierunek dla eksportu/importu i standardowych zwrotów w sekcjach 4–13.

## Wydawanie nowych wersji

Jednorazowo: `cp .release.env.example .release.env`, wpisz `IMAGE_REPO` (np. `ghcr.io/twoj-login/sds-app`),
zaloguj się do rejestru (`docker login …`) i dodaj zdalne repozytorium (`git remote add origin …`).

```bash
npm run release            # 1.0.4 → 1.0.5 (patch, domyślnie)
npm run release -- minor   # 1.0.4 → 1.1.0
npm run release -- major   # 1.0.4 → 2.0.0
npm run release:dry        # plan bez zmian
```

Skrypt (`scripts/release.sh`) wymaga czystej gałęzi `master` zgodnej ze zdalną, uruchamia lint, typecheck i testy,
buduje obraz (`docker buildx`, platformy z `PLATFORMS`) z tagami `X.Y.Z`, `X.Y` i `latest` i wypycha go,
a dopiero potem podbija wersję w `package.json` i `deploy/k8s/kustomization.yaml`, tworzy commit
`release: vX.Y.Z` z tagiem `vX.Y.Z` i wypycha gałąź oraz tag — nieudany build nie zostawia commita.
Wersja jest zapisana w etykietach OCI obrazu i zwracana przez `/api/health` (`version`, `revision`),
więc po wdrożeniu widać, która wersja działa.

Praca nad zmianami: gałąź tematyczna → commit → merge do `master` → push; wydanie z `master`.

## Dane startowe

Seed wgrywa z arkusza **„Chemikalia”**: 34 substancje (CAS zweryfikowane cyfrą kontrolną), 13 mieszanin
(ECN-2: kąpiel wstępna, wywoływacz, wybielacz, utrwalacz; D-76 A/B; C-41: wywoływacz A/B/C, wybielacz,
utrwalacz v2; utrwalacz szybki; Pyro 510; D-96; ID-68; FX-37 z roztworem 1+3) z wariantami 1 L / 0,5 L / 100 ml,
7 produktów (zestawy ECN-2, D-76, C-41 w dwóch objętościach, Pyro 510) oraz zatwierdzone karty D-76.

⚠️ Numery WE/indeksowe i klasy zagrożenia wpisano tylko tam, gdzie wpis zharmonizowany (zał. VI CLP) jest
jednoznaczny; dla pozostałych substancji (m.in. CD-3, CD-4, trietyloamina, pirogalol, siarczan hydroksyloaminy)
klasyfikację trzeba uzupełnić. Wszystkie importowane substancje są oznaczone jako **niezweryfikowane**.
Założenia do sprawdzenia: „EDTA” = Na₂EDTA·2H₂O, „tiosiarczan sodu” = pentahydrat, chlorek cyny(II) = dihydrat,
jodek potasu w C-41 przypisany do części B.

## Ograniczenia

- Silnik klasyfikacji obejmuje główne punkty końcowe CLP; progi w `src/lib/classification/constants.ts` należy
  zweryfikować z zał. I. Działanie na skórę i oczy liczone jest addytywnie z granicami indywidualnymi
  (Σ Cᵢ/Lᵢ ≥ 1, gdzie Lᵢ to SCL albo granica ogólna) — SCL wpisuje się przy klasach substancji, także jako wpis
  „tylko stężenie graniczne” (np. NaOH: Skin Irrit. 2 przy 0,5–2 %). Dla toksyczności ostrej i środowiska SCL nie są
  stosowane (ATE i współczynniki M). Wynik jest propozycją z regułą decydującą — decyzja należy do chemika.
- Blokady obejmują karty i mieszaniny; substancje i produkty zapisują się według zasady „ostatni zapis wygrywa”.
- Limiter nieudanych logowań działa w pamięci poda — dodatkowo ogranicz żądania do `/login` na Traefiku.
- PDF powstaje przez druk przeglądarki; wielojęzyczność dotyczy tylko zwrotów H/P; PCN to lista kontrolna, bez zgłoszenia.
