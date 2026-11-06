#!/usr/bin/env bash
# Wydanie nowej wersji obrazu Docker z automatycznym podbiciem numeru wersji.
#
#   npm run release                 # 1.0.4 → 1.0.5 (patch)
#   npm run release -- minor        # 1.0.4 → 1.1.0
#   npm run release -- major        # 1.0.4 → 2.0.0
#   npm run release -- 1.2.0        # wersja jawna (musi być nowsza)
#   npm run release -- --dry-run    # pokaż plan, niczego nie zmieniaj
#   npm run release -- --no-push    # zbuduj lokalnie, bez wypychania obrazu i gita
#   npm run release -- --skip-checks
#
# Kroki: kontrole repozytorium → lint/typecheck/testy → nowa wersja → build obrazu
# (tagi X.Y.Z, X.Y, latest) i push → package.json + kustomization.yaml → commit
# „release: vX.Y.Z” + tag vX.Y.Z → push gałęzi i taga.
# Nieudany build nie zostawia commita ani taga.
#
# Konfiguracja: .release.env (szablon: .release.env.example) lub zmienne środowiskowe.
set -euo pipefail

cd "$(dirname "$0")/.."
[[ -f .release.env ]] && set -a && source .release.env && set +a

IMAGE_REPO="${IMAGE_REPO:-}"
PLATFORMS="${PLATFORMS:-linux/amd64}"
GIT_REMOTE="${GIT_REMOTE:-origin}"
RELEASE_BRANCH="${RELEASE_BRANCH:-master}"

LEVEL="patch"; DRY_RUN=0; PUSH=1; CHECKS=1
for arg in "$@"; do
  case "$arg" in
    patch|minor|major) LEVEL="$arg" ;;
    [0-9]*.[0-9]*.[0-9]*) LEVEL="$arg" ;;
    --dry-run) DRY_RUN=1 ;;
    --no-push) PUSH=0 ;;
    --skip-checks) CHECKS=0 ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "Nieznany argument: $arg" >&2; exit 2 ;;
  esac
done

say() { printf '\033[1;34m→\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }
run() { if (( DRY_RUN )); then printf '  [dry-run] %s\n' "$*" >&2; else "$@"; fi; }

# ── kontrole ──
[[ -n "$IMAGE_REPO" ]] || die "Ustaw IMAGE_REPO (np. ghcr.io/twoj-login/sds-app) w .release.env"
command -v docker >/dev/null || die "Brak dockera"
branch="$(git rev-parse --abbrev-ref HEAD)"
[[ "$branch" == "$RELEASE_BRANCH" ]] || die "Wydania tylko z gałęzi $RELEASE_BRANCH (bieżąca: $branch)"
[[ -z "$(git status --porcelain)" ]] || die "Niezatwierdzone zmiany — zacommituj je przed wydaniem"
if (( PUSH )); then
  git remote get-url "$GIT_REMOTE" >/dev/null 2>&1 || die "Brak zdalnego repozytorium '$GIT_REMOTE' (git remote add $GIT_REMOTE <url>) albo użyj --no-push"
  git fetch -q "$GIT_REMOTE" "$RELEASE_BRANCH" 2>/dev/null || true
  if git rev-parse -q --verify "$GIT_REMOTE/$RELEASE_BRANCH" >/dev/null; then
    [[ -z "$(git rev-list HEAD.."$GIT_REMOTE/$RELEASE_BRANCH")" ]] || die "Gałąź jest za $GIT_REMOTE/$RELEASE_BRANCH — najpierw git pull"
  fi
fi

current="$(node -p "require('./package.json').version")"
version="$(node scripts/version.mjs next "$current" "$LEVEL")"
git rev-parse -q --verify "refs/tags/v$version" >/dev/null && die "Tag v$version już istnieje"
minor_tag="${version%.*}"
sha="$(git rev-parse --short HEAD)"

say "Wydanie $current → $version (obraz $IMAGE_REPO, platformy $PLATFORMS)"

if (( CHECKS )); then
  say "Kontrole jakości: lint, typecheck, testy"
  run npm run -s lint
  run npm run -s typecheck
  run npm test --silent
fi

# ── obraz ──
tags=(-t "$IMAGE_REPO:$version" -t "$IMAGE_REPO:$minor_tag" -t "$IMAGE_REPO:latest")
build_args=(--build-arg "APP_VERSION=$version" --build-arg "GIT_SHA=$sha")
if (( PUSH )); then
  say "Budowanie i wypychanie obrazu"
  run docker buildx build --platform "$PLATFORMS" "${build_args[@]}" "${tags[@]}" --push .
else
  say "Budowanie obrazu lokalnie (bez wypychania)"
  run docker buildx build --platform "${PLATFORMS%%,*}" "${build_args[@]}" "${tags[@]}" --load .
fi

# ── wersja w repozytorium ──
say "Aktualizacja package.json i deploy/k8s/kustomization.yaml"
run npm version "$version" --no-git-tag-version --allow-same-version >/dev/null
run node scripts/version.mjs kustomize deploy/k8s/kustomization.yaml "$IMAGE_REPO" "$version"
run git add package.json package-lock.json deploy/k8s/kustomization.yaml
run git commit -q -m "release: v$version"
run git tag -a "v$version" -m "Release v$version"

if (( PUSH )); then
  say "Wypychanie gałęzi $RELEASE_BRANCH i taga v$version do $GIT_REMOTE"
  run git push -q "$GIT_REMOTE" "$RELEASE_BRANCH"
  run git push -q "$GIT_REMOTE" "v$version"
fi

printf '\033[1;32m✓ Wydano v%s\033[0m  obraz: %s:%s\n' "$version" "$IMAGE_REPO" "$version"
echo "  Wdrożenie:  kubectl apply -k deploy/k8s"
echo "  Kontrola:   curl https://<twoja-domena>/api/health   (pole \"version\")"
