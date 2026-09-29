import { classifyCoinGeckoPing, classifyFinanceHealth } from './classify.js';

const report = (status: string, dependencies: Record<string, { status: string }> = {}) => ({
  status,
  dependencies,
});

describe('classifyFinanceHealth', () => {
  it('up bij 200 + ok', () => {
    expect(classifyFinanceHealth({ httpStatus: 200, body: report('ok') })).toEqual({
      status: 'up',
      error: null,
    });
  });

  it('degraded bij 200 + degraded, met de falende afhankelijkheid als reden', () => {
    const body = report('degraded', { database: { status: 'up' }, coingecko: { status: 'down' } });
    expect(classifyFinanceHealth({ httpStatus: 200, body })).toEqual({
      status: 'degraded',
      error: 'coingecko down',
    });
  });

  it('down bij 503 met de database als reden', () => {
    const body = report('down', { database: { status: 'down' }, coingecko: { status: 'up' } });
    expect(classifyFinanceHealth({ httpStatus: 503, body })).toEqual({
      status: 'down',
      error: 'HTTP 503: database down',
    });
  });

  it('down bij een onverwacht antwoord (bv. 404 of HTML)', () => {
    expect(classifyFinanceHealth({ httpStatus: 404, body: '<html>' })).toEqual({
      status: 'down',
      error: 'HTTP 404',
    });
  });

  it('down zonder antwoord, met de netwerkfout als reden', () => {
    expect(classifyFinanceHealth(null, 'Time-out na 5000 ms')).toEqual({
      status: 'down',
      error: 'Time-out na 5000 ms',
    });
  });
});

describe('classifyCoinGeckoPing', () => {
  it.each([
    [200, 'up', null],
    [429, 'degraded', 'Rate limit (HTTP 429)'],
    [403, 'down', 'HTTP 403'],
    [500, 'down', 'HTTP 500'],
  ])('HTTP %i → %s', (httpStatus, status, error) => {
    expect(classifyCoinGeckoPing({ httpStatus, body: {} })).toEqual({ status, error });
  });

  it('down zonder antwoord', () => {
    expect(classifyCoinGeckoPing(null).status).toBe('down');
  });
});
