import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
// @ts-expect-error — moduł .mjs bez deklaracji typów
import { nextVersion, setKustomizeImage } from './version.mjs';

describe('nextVersion', () => {
  it('podbija patch domyślnie', () => expect(nextVersion('1.0.9')).toBe('1.0.10'));
  it('minor i major zerują niższe człony', () => {
    expect(nextVersion('1.4.2', 'minor')).toBe('1.5.0');
    expect(nextVersion('1.4.2', 'major')).toBe('2.0.0');
  });
  it('przyjmuje jawną wersję tylko nowszą od bieżącej', () => {
    expect(nextVersion('1.4.2', '1.10.0')).toBe('1.10.0');
    expect(() => nextVersion('1.4.2', '1.4.2')).toThrow();
    expect(() => nextVersion('1.4.2', '1.3.9')).toThrow();
  });
  it('odrzuca nieznany poziom i zły format', () => {
    expect(() => nextVersion('1.0.0', 'hotfix')).toThrow();
    expect(() => nextVersion('1.0', 'patch')).toThrow();
  });
});

describe('setKustomizeImage', () => {
  const real = readFileSync(join(__dirname, '../deploy/k8s/kustomization.yaml'), 'utf8');
  it('ustawia tag i rejestr w prawdziwej kustomizacji, nie ruszając reszty', () => {
    const out = setKustomizeImage(real, { name: 'ghcr.io/acme/sds-app', tag: '1.2.3' });
    expect(out).toContain('newName: ghcr.io/acme/sds-app');
    expect(out).toContain('newTag: "1.2.3"');
    expect(out.replace(/newName:.*|newTag:.*/g, '')).toBe(real.replace(/newName:.*|newTag:.*/g, ''));
  });
  it('bez nazwy zostawia dotychczasowy rejestr', () => {
    const out = setKustomizeImage(real, { tag: '9.9.9' });
    expect(out).toMatch(/newName: \S+/);
    expect(out).toContain('newTag: "9.9.9"');
  });
});
