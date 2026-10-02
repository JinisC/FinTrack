import type { PricePoint } from '@fintrack/shared-types';
import type { EChartsCoreOption } from 'echarts/core';
import { formatUsd } from '../shared/format';

const LINE_COLOR = '#3b82f6';

/** ECharts-opties voor een prijs-lijngrafiek met tooltip en zoom. */
export function priceChartOptions(points: PricePoint[], dark: boolean): EChartsCoreOption {
  const text = dark ? '#c4c6d0' : '#44474e';
  const grid = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  return {
    backgroundColor: 'transparent',
    animation: false,
    grid: { left: 8, right: 16, top: 16, bottom: 56, containLabel: true },
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value: unknown) => formatUsd(Number(value)),
    },
    xAxis: {
      type: 'time',
      axisLabel: { color: text, hideOverlap: true },
      axisLine: { lineStyle: { color: grid } },
    },
    yAxis: {
      type: 'value',
      scale: true,
      axisLabel: { color: text, formatter: (value: number) => formatUsd(value) },
      splitLine: { lineStyle: { color: grid } },
    },
    dataZoom: [
      { type: 'inside' },
      { type: 'slider', height: 24, bottom: 8, textStyle: { color: text } },
    ],
    series: [
      {
        name: 'Prijs',
        type: 'line',
        showSymbol: false,
        data: points.map((p) => [p.timestamp, p.price]),
        lineStyle: { width: 2, color: LINE_COLOR },
        itemStyle: { color: LINE_COLOR },
        areaStyle: { color: LINE_COLOR, opacity: 0.12 },
      },
    ],
  };
}

/** Procentuele verandering tussen het eerste en laatste punt, of null bij te weinig data. */
export function periodChangePct(points: PricePoint[]): number | null {
  if (points.length < 2) return null;
  const first = points[0].price;
  const last = points[points.length - 1].price;
  return first === 0 ? null : ((last - first) / first) * 100;
}
