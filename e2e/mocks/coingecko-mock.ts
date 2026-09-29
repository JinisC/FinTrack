/**
 * Minimale CoinGecko-mock voor e2e-tests. Draait rechtstreeks met Node (type stripping).
 *
 * Tests kunnen het gedrag omschakelen via `POST /__control/mode` met body
 * `{"mode": "ok" | "rate-limit" | "down"}` om storingen te simuleren.
 */
import { readFileSync } from 'node:fs';
import { createServer, type ServerResponse } from 'node:http';
import { join } from 'node:path';

type Mode = 'ok' | 'rate-limit' | 'down';

const port = Number(process.env.MOCK_PORT ?? 4010);
const fixtures = join(import.meta.dirname, '..', 'fixtures');
const markets: unknown[] = JSON.parse(readFileSync(join(fixtures, 'markets.json'), 'utf8'));
const charts: Record<string, unknown> = {
  bitcoin: JSON.parse(readFileSync(join(fixtures, 'bitcoin-market-chart.json'), 'utf8')),
};

let mode: Mode = 'ok';

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${port}`);

  if (req.method === 'POST' && url.pathname === '/__control/mode') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      mode = (JSON.parse(body) as { mode: Mode }).mode;
      json(res, 200, { mode });
    });
    return;
  }

  if (mode === 'rate-limit') {
    return json(res, 429, { status: { error_code: 429, error_message: 'Rate limit (mock)' } });
  }
  if (mode === 'down') {
    return json(res, 500, { error: 'Internal error (mock)' });
  }

  if (url.pathname === '/ping') {
    return json(res, 200, { gecko_says: '(V3) To the Moon!' });
  }
  if (url.pathname === '/coins/markets') {
    const perPage = Number(url.searchParams.get('per_page') ?? 100);
    return json(res, 200, markets.slice(0, perPage));
  }
  const chartMatch = /^\/coins\/([^/]+)\/market_chart$/.exec(url.pathname);
  if (chartMatch) {
    const chart = charts[decodeURIComponent(chartMatch[1])];
    return chart ? json(res, 200, chart) : json(res, 404, { error: 'coin not found' });
  }
  json(res, 404, { error: 'Not found (mock)' });
});

server.listen(port, () => console.log(`CoinGecko-mock luistert op http://localhost:${port}`));
