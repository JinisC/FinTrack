# FinTrack

Finance & Monitoring Dashboard — persoonlijk full-stack CV-project.

Een gecombineerd dashboardplatform met twee samenwerkende services:

- **Finance Dashboard** — live cryptoprijzen, trends en een persoonlijke portfolio.
- **Monitoring Dashboard** — bewaakt de gezondheid, uptime en performance van de finance-applicatie zelf.

Volledige projectcontext, architectuur en tech-stackkeuzes: zie [`docs/architecture.md`](docs/architecture.md).

## Projectstructuur

```
fintrack/
├── apps/
│   ├── frontend/              # Angular app
│   ├── finance-service/       # NestJS
│   └── monitoring-service/    # NestJS
├── libs/
│   └── shared-types/          # Gedeelde TS-interfaces tussen frontend/backend
├── e2e/                       # Playwright-tests (nu API, later ook frontend)
├── docker-compose.yml
├── .github/
│   └── workflows/             # CI/CD pipelines
├── docs/
│   └── architecture.md
└── README.md
```

## Lokaal draaien

Vereisten: **Node 22+** (zie `.nvmrc`) en **pnpm 10**.

```bash
pnpm install
pnpm --filter @fintrack/finance-service start:dev   # http://localhost:3000
```

Configuratie via omgevingsvariabelen of een `.env` in `apps/finance-service/` — zie [`.env.example`](apps/finance-service/.env.example). Een gratis CoinGecko Demo-key (`COINGECKO_API_KEY`) is optioneel maar voorkomt snel rate-limiting.

### finance-service endpoints

| Endpoint | Beschrijving |
|---|---|
| `GET /api/prices?limit=20` | Top-coins op marktkapitalisatie (limit 1–50) |
| `GET /api/prices/:id/history?days=7` | Prijshistoriek van één coin (days: 1, 7, 14, 30, 90, 365) |
| `GET /health` | Status van de service + CoinGecko (`ok` / `degraded`) |
| `GET /metrics` | Prometheus-metrics (HTTP, CoinGecko, cache, Node-runtime) |

Prijsdata wordt 60s gecachet. Faalt CoinGecko (bv. rate limit), dan krijg je de laatst bekende data terug met `"stale": true`, of `503` als die er niet is.

### Scripts

| Commando | Doel |
|---|---|
| `pnpm build` | Build van libs en apps |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm test:e2e` | API-tests (Playwright) tegen een CoinGecko-mock |
| `pnpm lint` / `pnpm typecheck` | Oxlint / TypeScript-controle |

## Status

🚧 In opbouw — `finance-service` (CoinGecko, `/health`, `/metrics`) staat. Zie [`docs/architecture.md`](docs/architecture.md) voor de ontwikkelvolgorde.

## Workflow

- Feature branches per taak/issue, PR's naar `main` — geen directe commits op `main`.
- Issues volgen de templates in `.github/ISSUE_TEMPLATE/`.
