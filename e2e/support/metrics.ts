/** Leest de waarde van één Prometheus-sample, bv. `price_cache_hits_total{kind="markets"}`. */
export function readMetric(metricsText: string, sample: string): number {
  const line = metricsText.split('\n').find((l) => l.startsWith(`${sample} `));
  return line ? Number(line.slice(sample.length + 1)) : 0;
}
