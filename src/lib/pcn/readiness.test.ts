import { describe, it, expect } from 'vitest';
import { pcnReadiness, type PcnInput } from './readiness';

/** Kompletne, gotowe do zgłoszenia wejście — testy usuwają z niego pojedyncze pola. */
function complete(): PcnInput {
  return {
    ufi: 'ABCD-1234-5678-90EF',
    productName: 'Wywoływacz D-76 część A',
    classes: ['Carc. 2', 'Aquatic Chronic 3'],
    components: [{ name: 'Hydrochinon', casNumber: '123-31-9', concentration: '71,4' }],
    sections: {
      1: { dostawca: { przedsiebiorstwo: 'ACME sp. z o.o.' }, telefonyAlarmowe: [{ numer: '112' }] },
      9: { wlasciwosci: { stanSkupienia: 'proszek', kolor: 'biały', pH: '9' } },
      11: { klasy: { toksycznoscOstra: 'LD50 ...' } },
    },
  };
}

const statusOf = (input: PcnInput, label: string) =>
  pcnReadiness(input).items.find((i) => i.label.startsWith(label))!.status;

describe('pcnReadiness', () => {
  it('kompletne wejście → ready', () => {
    const r = pcnReadiness(complete());
    expect(r.ready).toBe(true);
    expect(r.items.every((i) => i.status !== 'missing')).toBe(true);
  });

  it('brak UFI przy klasyfikacji zdrowotnej → missing i nie-ready', () => {
    const input = { ...complete(), ufi: null };
    expect(statusOf(input, 'Numer UFI')).toBe('missing');
    expect(pcnReadiness(input).ready).toBe(false);
  });

  it('brak UFI, ale tylko zagrożenia środowiskowe → na (niewymagany)', () => {
    const input: PcnInput = { ...complete(), ufi: null, classes: ['Aquatic Chronic 3'] };
    expect(statusOf(input, 'Numer UFI')).toBe('na');
    expect(pcnReadiness(input).ready).toBe(true);
  });

  it('składnik bez stężenia → skład missing', () => {
    const input: PcnInput = {
      ...complete(),
      components: [{ name: 'Hydrochinon', casNumber: '123-31-9', concentration: null }],
    };
    expect(statusOf(input, 'Skład')).toBe('missing');
  });

  it('brak składników → skład missing', () => {
    expect(statusOf({ ...complete(), components: [] }, 'Skład')).toBe('missing');
  });

  it('sekcja 11 z samymi pustymi wartościami → missing (liczy się treść, nie klucze)', () => {
    const input = complete();
    input.sections[11] = { klasy: { toksycznoscOstra: '', dzialanieZracace: '  ' } };
    expect(statusOf(input, 'Informacje toksykologiczne')).toBe('missing');
  });

  it('sekcja 11 z treścią w dzialanieChroniczne → ok', () => {
    const input = complete();
    input.sections[11] = { klasy: {}, dzialanieChroniczne: 'Podejrzewa się rakotwórczość.' };
    expect(statusOf(input, 'Informacje toksykologiczne')).toBe('ok');
  });

  it('brak telefonu alarmowego → missing', () => {
    const input = complete();
    input.sections[1] = { dostawca: { przedsiebiorstwo: 'ACME' }, telefonyAlarmowe: [{ numer: '' }] };
    expect(statusOf(input, 'Telefon alarmowy')).toBe('missing');
  });

  it('opakowanie zawsze na (poza kartą) i nie blokuje gotowości', () => {
    expect(statusOf(complete(), 'Rodzaj i wielkość opakowania')).toBe('na');
  });
});
