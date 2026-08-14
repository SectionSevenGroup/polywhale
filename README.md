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

`DATABASE_URL` must point to PostgreSQL. The dashboard never presents fixtures as live data: it shows explicit loading, empty, stale, and database-error states.

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
Whale Edge Score blends leaderboard persistence, the explicitly labelled PnL/volume efficiency proxy, category breadth, closed-position hit rate, sample depth and observed forward edge. Copyability is kept separate. Signal Score is capped for one independent wallet and penalises age, spread/depth, a price move that has already run, and near-resolution risk. Scores are prioritisation heuristics—not probabilities, advice, or true ROI.

## Public API assumptions and current limitations
- The worker uses only the documented public hosts: Data API `/v1/leaderboard`, `/trades`, `/positions`, and `/closed-positions`; Gamma `/markets`; CLOB `/book`, `/midpoint`, and `/prices-history`. No credentials, signing, order methods, website scraping, or geolocation workarounds exist.
- Data API trade timestamps are treated as Unix seconds and token `asset` values as CLOB token IDs. Leaderboard monetary fields are treated as PnL and volume, never ROI.
- Split fills sharing wallet + transaction + asset + side are one conviction. Wallets sharing transaction hashes are conservatively linked. This is an initial heuristic; robust funding/behaviour clustering is not yet implemented.
- The database schedules +5m, +30m, and +4h observations. The schema supports resolution observations, but automatic Gamma resolution reconciliation is still incomplete. Historical price reconstruction and Brier/calibration metrics remain incomplete where the public history cannot reconstruct the exact detection-time book.
- Alert adapters, public market WebSocket updates, a dedicated whale-detail route, and outbound Telegram/email delivery are not included in this pass. Polling remains read-only, retrying with exponential backoff and a bounded sequential request pattern.
- API rate limits are not a stability guarantee; deployment operators should tune polling intervals and monitor 429 responses.
