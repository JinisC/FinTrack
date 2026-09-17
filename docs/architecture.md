# FinTrack — Finance & Monitoring Dashboard

## 1. Projectconcept

Een gecombineerd dashboard-platform met twee samenwerkende modules:

- **Finance Dashboard** — volgt actuele cryptoprijzen, trends en een persoonlijke portfolio.
- **Monitoring Dashboard** — bewaakt de gezondheid, uptime en performance van de finance-applicatie zelf (self-monitoring).

**Waarom deze combinatie werkt voor een CV:** het toont niet alleen feature-ontwikkeling, maar ook een productie-mindset — observability, betrouwbaarheid, en omgaan met falende externe afhankelijkheden. Het geeft bovendien een authentieke reden om met meerdere samenwerkende services te werken, in plaats van een kunstmatig opgesplitste monoliet.

## 2. Functionele scope

### MVP (fase 1)
- Live prijzen van top 10-20 crypto's + prijsgrafiek per coin
- Manuele portfolio-entries met P&L-berekening
- Health-check endpoint van de finance-service (`/health`, `/metrics`)
- Uptime% en response-time grafiek in het monitoring-dashboard
- Eenvoudige alert (bv. e-mail) bij downtime
- Basis JWT-authenticatie
- Lokaal draaien via docker-compose + werkende CI-pipeline

### Stretch (fase 2+)
- Price alerts / notificaties bij drempelwaarden
- Nieuws- of sentiment-indicator naast de cryptodata
- Drag-and-drop custom dashboard widgets
- Anomaly detection op monitoring-metrics
- Multi-region health checks
- Google OAuth naast JWT

## 3. Architectuur

Twee backend-services, gescheiden van verantwoordelijkheid, binnen deze monorepo:

- **`finance-service`** — haalt cryptodata op (CoinGecko API), beheert portfolio en alerts, exposeert `/health` en `/metrics` in Prometheus-formaat.
- **`monitoring-service`** — polled periodiek de endpoints van `finance-service` (en de externe CoinGecko-API), slaat historiek op, berekent uptime/response-times, triggert alerts.

Beide services delen dezelfde PostgreSQL-database (aparte schema's/tabellen) om binnen de gratis-tier-limieten van hosting providers te blijven.

Communicatie tussen frontend en backend via REST + WebSockets (live updates voor prijzen en alerts, zonder polling vanuit de client).

## 4. Tech stack met onderbouwing

| Laag | Keuze | Reden |
|---|---|---|
| Frontend framework | **Angular** (standalone components + Signals) | Vereiste; Signals is de actuele, aanbevolen Angular-aanpak |
| Styling / componenten | **Angular Material**, of **Spartan/Taiga UI** als modernere copy-paste-aanpak | Material = snel, officieel onderhouden; Spartan/Taiga = meer custom, Angular-compatibel |
| Grafieken | **Apache ECharts** (of ng2-charts als lichter alternatief) | Sterk in tijdreeksdata: candlesticks, zoomen, meerdere assen — relevant voor zowel cryptotrends als metrics |
| Backend taal/framework | **NestJS** (Node.js + TypeScript) | Zelfde taal als Angular — coherent full-stack verhaal; modulaire DI-structuur sluit aan bij Angular's patterns |
| Backend architectuur | 2 services: `finance-service` + `monitoring-service` | Authentieke reden voor multi-service-opzet; monitoring bewaakt finance |
| Database | **PostgreSQL** (via Supabase of Neon) | Eén relationele DB voor zowel transactionele als tijdreeksdata houdt gratis-tier-beheer simpel |
| Caching / Pub-Sub | **Redis** (via Upstash) | Voorkomt overmatige calls naar externe API (rate-limit-vriendelijk); ondersteunt live updates |
| Real-time | **WebSockets** (Socket.io) | Live prijzen/alerts zonder client-side polling |
| Externe data | **CoinGecko API** (gratis publieke endpoints) | Geen API-key nodig voor basisgebruik; rate-limit-verbruik is zelf een leuke metric om te monitoren |
| Auth | **JWT + refresh tokens**, optioneel Google OAuth | Industriestandaard, stateless, goed uit te leggen in een interview |
| Monitoring-aanpak | Eigen `/metrics`-endpoint (Prometheus-formaat) + zelfgebouwd Angular-dashboard | Toont kennis van de industriestandaard én de vaardigheid om een custom UI te bouwen |
| Containerisatie | **Docker + docker-compose** | Reproduceerbaar lokaal draaien, verwacht bij full-stack rollen |
| CI/CD | **GitHub Actions** | Gratis onbeperkte minuten voor publieke repo's |
| Hosting backend | **Render** (free web services) | Nog een van de weinige écht gratis tiers; spin-down na 15 min inactiviteit is een bekende, vermeldbare beperking |
| Hosting frontend | **Vercel** of **GitHub Pages** | Statische hosting, geen spin-down, gratis |
| Version control | **GitHub** (feature branches + PR's + Issues/Projects) | Vereiste; commit-discipline en PR-geschiedenis zijn zelf CV-materiaal |
| Testing | Jest/Jasmine (unit) + Playwright of Cypress (e2e) | Onderscheidt een portfolio-project met testdiscipline |

### Backend-alternatieven (indien niet TypeScript)
- **.NET (C#/ASP.NET Core)** — sterk getypeerd, populair in Benelux-bedrijven, Entity Framework voor relationele data
- **Python + FastAPI** — sneller te itereren, sterk als je later richting data-analyse/anomaly-detection wil

## 5. Belangrijke kanttekeningen bij "gratis" hosting

- **Render**: gratis web services gaan na 15 min inactiviteit in slaapstand (eerste request erna duurt 30-60 sec). Gratis Postgres verloopt na 30 dagen — gebruik daarvoor Supabase/Neon, niet Render's eigen DB.
- **Supabase**: gratis project pauzeert na 1 week zonder activiteit (manueel te herstarten). **Neon** heeft dit probleem niet en is een prima alternatief.
- **Railway** en **Fly.io**: hebben hun gratis tier grotendeels afgeschaft (Railway: 30 dagen proef + beperkt tegoed; Fly.io: geen gratis tier meer sinds 2024 voor nieuwe accounts).
- **GitHub Actions**: onbeperkte CI/CD-minuten, maar alleen voor **publieke** repositories.

## 6. Projectstructuur

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

## 7. GitHub-workflow

- Feature branches per taak/issue, PR's naar `main` (geen directe commits op main)
- Issue templates + GitHub Projects-bord voor planning
- CI draait lint/test/build op elke PR; CD deployt bij merge naar `main`

## 8. Ontwikkelvolgorde (aanbevolen)

1. Repo-structuur + docker-compose skeleton opzetten
2. `finance-service`: CoinGecko-integratie, `/health` en `/metrics` endpoints
3. Database-schema (portfolio, users, metrics-historiek)
4. `monitoring-service`: polling van finance-service + opslag van metrics
5. Angular-frontend: basis routing, auth, finance-dashboard UI
6. WebSocket-integratie voor live updates
7. Monitoring-dashboard UI
8. CI/CD-pipeline + deployment naar Render/Vercel
9. Tests toevoegen (unit + e2e)
10. Polish: alerts, stretch-features, README met screenshots
