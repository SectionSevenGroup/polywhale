# POLY WHALE — Signal Control Room

Read-only Polymarket whale intelligence: discovers high-performing public wallets, monitors public trades, groups coordinated accumulation and scores candidate signals by whale quality, consensus, liquidity, freshness and remaining price edge.

## Important boundary
This repository intentionally does **not** place orders and contains no geoblock circumvention. It is an analytics/monitoring system.

## Stack
- Next.js / React / TypeScript
- PostgreSQL
- Separate Node/TS worker
- Official Polymarket public Data API + CLOB market data

## Local start
```bash
cp .env.example .env.local
npm install
npm run db:init
npm run worker
# separate terminal
npm run dev
```

`DATABASE_URL` must point to PostgreSQL. The web dashboard shows labelled demo cards if the database API is unavailable, making visual development possible before the worker is running.

## Architecture
`worker/index.ts`
- refreshes leaderboard-derived whale universe
- ranks wallets
- polls recent public trades for qualified wallets
- groups current accumulation into signals
- reads CLOB order books for spread/depth/current midpoint
- upserts signal state

`app/api/dashboard/route.ts`
- exposes dashboard query only

`app/page.tsx`
- renders the Folded-Pizza-derived control-room visual language
- refreshes every 15 seconds

## Scoring caveat
The included scoring engine is deliberately labelled heuristic. PnL/volume is **not ROI**. The next stage is historical validation: closed positions, forward price movement after whale entries, concentration penalties and copyability. See `CODEX_TASK.md`.
