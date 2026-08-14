# CODEX BUILD BRIEF — POLY WHALE / SIGNAL CONTROL ROOM

Build and harden the supplied MVP into a production-quality read-only Polymarket whale intelligence dashboard.

## Product intent
This is not a generic crypto dashboard and not a copy-trading bot. It should continuously identify skilled Polymarket wallets, monitor their public trades, detect multi-wallet/high-conviction accumulation, assess whether the move is still copyable, and rank candidate markets for human review.

The dashboard visual language intentionally reuses the Folded Pizza “Financial Control Room” direction: warm off-white background, strong black/system typography, thin rules, spreadsheet/report discipline, large KPI blocks, restrained olive/terracotta status accents, squared controls, almost no pills, no generic SaaS card soup, no gradients, no decorative serif, no Google Fonts.

## Non-negotiable compliance boundary
- READ ONLY.
- Do not implement Polymarket order placement.
- Do not implement VPN, proxy, geo-spoofing or any method intended to evade Polymarket geographic restrictions.
- Do not store private keys or trading credentials.
- Dashboard may rank and explain candidate signals from public data.

## Current public data sources
- Data API: https://data-api.polymarket.com
- Gamma API: https://gamma-api.polymarket.com
- CLOB market data: https://clob.polymarket.com
- Public market WebSocket: wss://ws-subscriptions-clob.polymarket.com/ws/market
- Geoblock check: https://polymarket.com/api/geoblock

Use the official docs as source of truth. Do not scrape the website when an official API exists.

## Core architecture
1. Next.js + TypeScript dashboard.
2. PostgreSQL persistence shared by web app and worker.
3. Long-running Node worker for leaderboard refresh + watched-wallet trade polling.
4. Public CLOB order-book data for current price, spread and depth.
5. Later: use the public market WebSocket to keep books/prices current for assets appearing in active signals; wallet identity still comes from Data API trade polling.

## Required V1 functions
### Whale discovery
- Query leaderboard by PNL for WEEK, MONTH and ALL.
- Query at least OVERALL, POLITICS, CRYPTO, ECONOMICS, FINANCE, TECH, CULTURE and SPORTS.
- Deduplicate wallet addresses.
- Track top 100 by Whale Score.
- Persist historical leaderboard snapshots in a new table rather than overwriting all evidence.

### Whale scoring
Current `scoreWhale()` is an MVP heuristic. Improve it with backtesting.
Do not equate PnL / volume to ROI. Treat it only as an efficiency proxy.
Eventually include:
- realised outcome hit rate on closed positions
- calibration / Brier-style quality where reconstructable
- median price improvement after entry at +5m/+30m/+4h
- persistence across week/month/all leaderboards
- category-specific edge
- sample depth
- concentration penalty for one giant lucky market
- churn/noise penalty
- copyability: how much of the move remains after public detection

Expose both:
- Whale Edge Score (historical skill)
- Copyability Score (usefulness to a follower after detection)

### Signal formation
Group recent BUY trades by condition + asset/outcome over a rolling 10-minute window.
Calculate:
- distinct qualified whales
- weighted whale quality
- total notional
- average whale entry
- current midpoint / best ask
- price movement since whale entry
- spread
- near-book depth
- freshness
- category

The default board should suppress weak signals. Prefer missing a mediocre trade to surfacing noise.

Signal labels:
- 85–100 HIGH CONVICTION
- 72–84 STRONG
- 60–71 WATCH
- <60 PASS / hidden by default

### Critical anti-false-positive rules
- A single whale cannot receive a consensus score equivalent to 3+ independent whales.
- Detect wallets that appear behaviourally linked; do not count obvious linked wallets as independent consensus.
- Aggregate split fills from the same wallet/transaction rather than pretending they are multiple convictions.
- Penalise signals where the market has already moved materially beyond whale entry.
- Penalise wide spread / shallow depth.
- Penalise stale markets and trades close to resolution when fill risk becomes pathological.
- Do not treat market-maker churn as directional conviction.

### Dashboard
Keep the supplied visual system. Required sections:
1. Header: POLY WHALE | SIGNAL CONTROL ROOM + live status.
2. KPI band: tracked whales, strong signals, recent whale flow, best live setup.
3. Opportunity Board sorted by Signal Score.
4. Signal card details: side/outcome, whale count, combined flow, avg entry, current price, age, spread, depth, score component bars.
5. Whale Board: score, P&L, volume, category skill, persistence and copyability.
6. GO / NO-GO table.
7. Recent Whale Activity tape/table.
8. Signal history/performance page: what happened +5m/+30m/+4h/close after each alert.
9. Whale detail page: complete public track record, category strengths, recent entries and historical signal contribution.

No AI-generated prose is required in V1. Deterministic metrics are more trustworthy. Add an LLM explanation layer only after the numeric engine is proven.

## Alerts
Add optional Telegram and email alert adapters, OFF by default.
Only alert HIGH CONVICTION / STRONG signals after dedupe/cooldown.
Alert should show:
- market
- outcome
- score
- number of independent whales
- combined notional
- average entry
- current price
- move since entry
- spread/depth
- top contributing whales
- one-line reason the signal scored highly

No trade button.

## Tests Codex must add
- scoreWhale unit tests
- scoreSignal unit tests at all threshold boundaries
- dedupe of duplicate fills
- linked-wallet consensus penalty
- stale signal decay
- edge-remaining penalty after rapid price movement
- wide-spread penalty
- empty/malformed Polymarket API responses
- API rate limiting / retry/backoff
- worker idempotency
- database migration test
- dashboard API contract test

## First implementation pass
1. Inspect all files.
2. Fix any endpoint mismatch against current official Polymarket docs.
3. Add migrations and leaderboard snapshot table.
4. Add closed-position ingestion and outcome-based historical metrics.
5. Add the signal-history/backtest table and scheduled evaluation at +5m/+30m/+4h/resolution.
6. Make `/api/dashboard` and the UI fully live from PostgreSQL.
7. Add recent activity section to the UI.
8. Add robust retry/backoff and bounded concurrency so polling stays under official rate limits.
9. Add tests.
10. Keep execution read-only.

## Definition of done for V1
A fresh install can:
- initialise Postgres,
- discover and rank public whales,
- continuously ingest their public trades,
- produce scored signals,
- show them in the supplied responsive dashboard,
- record subsequent price performance,
- demonstrate from stored history which whales/signals had genuine forward edge.
