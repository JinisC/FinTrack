import { periodChangePct, priceChartOptions } from './price-chart';

const points = [
  { timestamp: 1, price: 100 },
  { timestamp: 2, price: 110 },
];

describe('periodChangePct', () => {
  it('berekent de verandering tussen eerste en laatste punt', () => {
    expect(periodChangePct(points)).toBeCloseTo(10);
  });

  it('geeft null bij te weinig data of een startprijs van 0', () => {
    expect(periodChangePct([])).toBeNull();
    expect(periodChangePct([{ timestamp: 1, price: 5 }])).toBeNull();
    expect(periodChangePct([{ timestamp: 1, price: 0 }, ...points])).toBeNull();
  });
});

describe('priceChartOptions', () => {
  it('zet de punten om naar [timestamp, prijs]-paren', () => {
    const options = priceChartOptions(points, false) as { series: { data: unknown }[] };
    expect(options.series[0].data).toEqual([
      [1, 100],
      [2, 110],
    ]);
  });
});
