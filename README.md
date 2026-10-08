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
│   ├── frontend/              # Angular 22 + Angular Material + ECharts
│   ├── finance-service/       # NestJS
│   └── monitoring-service/    # NestJS
├── libs/
│   ├── shared-types/          # Gedeelde TS-interfaces tussen frontend/backend
│   └── nest-observability/    # Gedeelde /metrics + HTTP-metrics voor alle NestJS-services
├── e2e/                       # Playwright-tests (nu API, later ook frontend)
├── docker-compose.yml
├── .github/
│   └── workflows/             # CI/CD pipelines
├── docs/
│   └── architecture.md
└── README.md
```

## Lokaal draaien

Vereisten: **Node 22+** (zie `.nvmrc`), **pnpm 10** en **Docker Desktop** (voor Postgres en Mailpit).

```bash
pnpm install
cp apps/finance-service/.env.example apps/finance-service/.env
cp apps/monitoring-service/.env.example apps/monitoring-service/.env

pnpm db:up                                              # Postgres 17 + Mailpit in Docker
pnpm --filter @fintrack/finance-service db:deploy       # migraties toepassen (schema finance)
pnpm --filter @fintrack/monitoring-service db:deploy    # migraties toepassen (schema monitoring)
pnpm --filter @fintrack/finance-service db:seed         # demo-gebruiker + voorbeeld-portfolio (optioneel)

pnpm dev    # frontend op :4200, finance-service op :3000 en monitoring-service op :3001, in watch-modus
```

Open daarna http://localhost:4200. De Angular-dev-server stuurt `/api` door naar de finance-service (zie [`apps/frontend/proxy.conf.mjs`](apps/frontend/proxy.conf.mjs)), dus CORS is niet nodig.

Configuratie via omgevingsvariabelen of een `.env` per service — zie de `.env.example` in [`apps/finance-service`](apps/finance-service/.env.example) en [`apps/monitoring-service`](apps/monitoring-service/.env.example). Een gratis CoinGecko Demo-key (`COINGECKO_API_KEY`) is optioneel maar voorkomt snel rate-limiting.

**Mailpit** vangt alle alert-mails lokaal op — bekijk ze op http://localhost:8025. Er wordt niets echt verstuurd.

### finance-service endpoints

| Endpoint | Beschrijving |
|---|---|
| `GET /api/prices?limit=20` | Top-coins op marktkapitalisatie (limit 1–50) |
| `GET /api/prices/:id/history?days=7` | Prijshistoriek van één coin (days: 1, 7, 14, 30, 90, 365) |
| `GET /api/portfolio` | Portfolio met actuele waarde en winst/verlies per entry en in totaal |
| `POST /api/portfolio/entries` | Aankoop toevoegen (`coinId`, `amount`, `buyPriceUsd`, `boughtAt`, `note?`) |
| `PATCH /api/portfolio/entries/:id` | Aankoop wijzigen |
| `DELETE /api/portfolio/entries/:id` | Aankoop verwijderen |
| `GET /health` | Status van database + CoinGecko (`ok` / `degraded` / `down`) |
| `GET /metrics` | Prometheus-metrics (HTTP, CoinGecko, cache, Node-runtime) |

- Prijsdata wordt 60s gecachet. Faalt CoinGecko (bv. rate limit), dan krijg je de laatst bekende data terug met `"stale": true`, of `503` als die er niet is. De portfolio blijft dan zichtbaar, zonder waardering.
- Zolang er geen authenticatie is, horen alle portfolio-requests bij een vaste demo-gebruiker.
- `/health` geeft `503` als de database onbereikbaar is; een CoinGecko-storing geeft `degraded` met `200`.

### monitoring-service endpoints

Pollt `finance-service /health` (elke 30s) en `CoinGecko /ping` (elke 60s), bewaart elke check en opent een **incident** na 2 opeenvolgende mislukte checks — met een alert-mail bij start en herstel. `degraded` telt als beschikbaar en opent geen incident.

| Endpoint | Beschrijving |
|---|---|
| `GET /api/status` | Huidige status per target + eventueel open incident |
| `GET /api/uptime?window=24h` | Uptime-% en gemiddelde/p95-responstijd per target (`24h`, `7d`, `30d`) |
| `GET /api/checks?target=finance-service&window=24h` | Tijdreeks in buckets (5 min / 1 u / 6 u) voor grafieken |
| `GET /api/incidents?limit=20` | Recente incidenten met duur |
| `GET /health` | Status van database + poller |
| `GET /metrics` | Prometheus-metrics (o.a. `monitored_target_status`, responstijden, verstuurde alerts) |

Checks ouder dan 30 dagen worden dagelijks opgeruimd; incidenten blijven bewaard.

### Scripts

| Commando | Doel |
|---|---|
| `pnpm db:up` / `pnpm db:down` | Postgres- en Mailpit-containers starten / stoppen |
| `pnpm dev` | Frontend en beide services in watch-modus |
| `pnpm build` | Build van libs en apps |
| `pnpm test` | Unit tests (Vitest) van services en frontend |
| `pnpm test:e2e` | API- en browsertests (Playwright) tegen mocks, de database `fintrack_e2e` en Mailpit (vereist `pnpm db:up`) |
| `pnpm --filter @fintrack/e2e browsers` | Chromium voor de browsertests installeren (eenmalig) |
| `pnpm lint` / `pnpm typecheck` | Oxlint / TypeScript-controle |
| `pnpm --filter @fintrack/<service> db:migrate` | Nieuwe migratie maken na een wijziging in `prisma/schema.prisma` |
| `pnpm --filter @fintrack/<service> db:studio` | Prisma Studio: database bekijken in de browser |

## Status

🚧 In opbouw — `finance-service` (CoinGecko, portfolio), `monitoring-service` (polling, incidenten, alerts, dashboard-API) en de Angular-frontend (markt, prijsgrafieken, portfolio) staan, met CI via GitHub Actions. Authenticatie volgt; tot dan hoort alles bij een demo-gebruiker. Zie [`docs/architecture.md`](docs/architecture.md) voor de ontwikkelvolgorde.

## Workflow

- Feature branches per taak/issue, PR's naar `main` — geen directe commits op `main`.
- Issues volgen de templates in `.github/ISSUE_TEMPLATE/`.

### CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) draait bij elke PR naar `main` en na elke merge, met twee parallelle jobs:

| Job | Wat | Lokaal hetzelfde |
|---|---|---|
| `checks` | Lint, typecheck, unittests en build | `pnpm lint && pnpm typecheck && pnpm test && pnpm build` |
| `e2e` | Playwright-API- en browsertests met Postgres en Mailpit als service-containers | `pnpm db:up && pnpm test:e2e` |

Faalt `e2e`, dan staat het Playwright-rapport 7 dagen als artifact (`playwright-report`) bij de run op GitHub.
