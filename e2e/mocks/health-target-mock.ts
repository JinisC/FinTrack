/**
 * Speelt de `/health` van finance-service na voor de monitoring-tests, met omschakelbare status.
 * Draait rechtstreeks met Node (type stripping).
 *
 * `POST /__control/mode` met body `{"mode": "ok" | "degraded" | "down"}`.
 */
import { createServer, type ServerResponse } from 'node:http';

type Mode = 'ok' | 'degraded' | 'down';

const port = Number(process.env.MOCK_PORT ?? 4011);
let mode: Mode = 'ok';

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function healthReport(current: Mode) {
  const now = new Date().toISOString();
  return {
    status: current,
    service: 'finance-service (mock)',
    timestamp: now,
    uptimeSeconds: 1,
    memory: { rssMb: 1, heapUsedMb: 1 },
    dependencies: {
      database: { status: current === 'down' ? 'down' : 'up', checkedAt: now },
      coingecko: { status: current === 'degraded' ? 'down' : 'up', checkedAt: now },
    },
  };
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
  if (url.pathname === '/health') {
    return json(res, mode === 'down' ? 503 : 200, healthReport(mode));
  }
  json(res, 404, { error: 'Not found (mock)' });
});

server.listen(port, () => console.log(`Health-target-mock luistert op http://localhost:${port}`));
