// Pomocniki wydań (bez zależności): wersjonowanie SemVer i tag obrazu w kustomizacji.

/** Następna wersja: patch (domyślnie) | minor | major | jawna "X.Y.Z". */
export function nextVersion(current, level = 'patch') {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(current);
  if (!m) throw new Error(`Nieprawidłowa bieżąca wersja: ${current}`);
  if (/^\d+\.\d+\.\d+$/.test(level)) {
    if (compare(level, current) <= 0) throw new Error(`Wersja ${level} nie jest nowsza niż ${current}`);
    return level;
  }
  const [maj, min, pat] = m.slice(1).map(Number);
  switch (level) {
    case 'patch': return `${maj}.${min}.${pat + 1}`;
    case 'minor': return `${maj}.${min + 1}.0`;
    case 'major': return `${maj + 1}.0.0`;
    default: throw new Error(`Nieznany poziom wersji: ${level} (patch | minor | major | X.Y.Z)`);
  }
}

export function compare(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}

/** Ustawia newName/newTag obrazu `sds-app` w kustomization.yaml (zachowuje resztę pliku). */
export function setKustomizeImage(yaml, { name, tag }) {
  const block = /(-\s+name:\s*sds-app\s*\n\s+newName:\s*)([^\n]+)(\n\s+newTag:\s*)([^\n]+)/;
  if (!block.test(yaml)) throw new Error('Nie znaleziono wpisu obrazu sds-app w kustomization.yaml');
  return yaml.replace(block, (_, a, oldName, b) => `${a}${name ?? oldName}${b}"${tag}"`);
}

// CLI: node scripts/version.mjs next <current> <level>
//      node scripts/version.mjs kustomize <file> <name> <tag>
if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, ...args] = process.argv.slice(2);
  const fs = await import('node:fs');
  if (cmd === 'next') console.log(nextVersion(args[0], args[1]));
  else if (cmd === 'kustomize') {
    const [file, name, tag] = args;
    fs.writeFileSync(file, setKustomizeImage(fs.readFileSync(file, 'utf8'), { name: name || undefined, tag }));
  } else {
    console.error('użycie: version.mjs next <wersja> <poziom> | kustomize <plik> <obraz> <tag>');
    process.exit(2);
  }
}
