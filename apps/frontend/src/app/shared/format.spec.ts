import { formatChangePct, formatCompactUsd, formatUsd, trendClass } from './format';

// Intl gebruikt (vaste) spaties tussen symbool en bedrag; normaliseer die voor leesbare asserts.
const plain = (value: string) => value.replace(/\s/g, ' ');

describe('formatUsd', () => {
  it('toont gewone prijzen met 2 decimalen in nl-BE-notatie', () => {
    expect(plain(formatUsd(65000))).toBe('$ 65.000,00');
  });

  it('geeft kleine prijzen meer decimalen', () => {
    expect(plain(formatUsd(0.00001234))).toBe('$ 0,000012');
  });

  it('toont een streepje als er geen waarde is', () => {
    expect(formatUsd(null)).toBe('—');
    expect(formatUsd(undefined)).toBe('—');
  });
});

describe('formatCompactUsd', () => {
  it('verkort grote bedragen', () => {
    expect(plain(formatCompactUsd(1_300_000_000_000))).toMatch(/^\$ 1,3 bln\.?$/);
  });
});

describe('formatChangePct', () => {
  it('zet procentpunten om en toont het teken', () => {
    expect(plain(formatChangePct(2.5))).toBe('+2,50%');
    expect(plain(formatChangePct(-1.25))).toBe('-1,25%');
    expect(plain(formatChangePct(0))).toBe('0,00%');
  });
});

describe('trendClass', () => {
  it('kleurt winst en verlies, maar niet nul of onbekend', () => {
    expect(trendClass(1)).toBe('positive');
    expect(trendClass(-1)).toBe('negative');
    expect(trendClass(0)).toBe('');
    expect(trendClass(null)).toBe('');
  });
});
