import { Pipe, type PipeTransform } from '@angular/core';

const LOCALE = 'nl-BE';

const usdFormats = new Map<number, Intl.NumberFormat>();

function usdFormat(fractionDigits: number): Intl.NumberFormat {
  let format = usdFormats.get(fractionDigits);
  if (!format) {
    format = new Intl.NumberFormat(LOCALE, {
      style: 'currency',
      currency: 'USD',
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: Math.min(2, fractionDigits),
      maximumFractionDigits: fractionDigits,
    });
    usdFormats.set(fractionDigits, format);
  }
  return format;
}

const compactUsd = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'USD',
  currencyDisplay: 'narrowSymbol',
  notation: 'compact',
  maximumFractionDigits: 2,
});

const signedPercent = new Intl.NumberFormat(LOCALE, {
  style: 'percent',
  signDisplay: 'exceptZero',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** USD-bedrag; kleine prijzen (bv. 0,00001234) krijgen meer decimalen. */
export function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const abs = Math.abs(value);
  const digits = abs > 0 && abs < 1 ? 6 : 2;
  return usdFormat(digits).format(value);
}

/** Verkort USD-bedrag, bv. "$ 1,3 bln." voor marktkapitalisatie. */
export function formatCompactUsd(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return compactUsd.format(value);
}

/** Procentuele verandering met teken, bv. "+2,50%". Input is in procentpunten (2.5 = 2,5%). */
export function formatChangePct(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return signedPercent.format(value / 100);
}

/** CSS-klasse voor winst/verlies-kleuring. */
export function trendClass(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) return '';
  return value > 0 ? 'positive' : 'negative';
}

@Pipe({ name: 'usd' })
export class UsdPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return formatUsd(value);
  }
}

@Pipe({ name: 'compactUsd' })
export class CompactUsdPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return formatCompactUsd(value);
  }
}

@Pipe({ name: 'changePct' })
export class ChangePctPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return formatChangePct(value);
  }
}

@Pipe({ name: 'trendClass' })
export class TrendClassPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return trendClass(value);
  }
}
