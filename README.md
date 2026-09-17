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
├── docker-compose.yml
├── .github/
│   └── workflows/             # CI/CD pipelines
├── docs/
│   └── architecture.md
└── README.md
```

## Status

🚧 In opbouw — zie [`docs/architecture.md`](docs/architecture.md) voor de aanbevolen ontwikkelvolgorde.

## Workflow

- Feature branches per taak/issue, PR's naar `main` — geen directe commits op `main`.
- Issues volgen de templates in `.github/ISSUE_TEMPLATE/`.
