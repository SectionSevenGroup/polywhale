CREATE TABLE IF NOT EXISTS whales (
  wallet TEXT PRIMARY KEY,
  username TEXT,
  pnl DOUBLE PRECISION NOT NULL DEFAULT 0,
  volume DOUBLE PRECISION NOT NULL DEFAULT 0,
  whale_score INTEGER NOT NULL DEFAULT 0,
  all_rank INTEGER,
  month_rank INTEGER,
  week_rank INTEGER,
  categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  tracked BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trades (
  id TEXT PRIMARY KEY,
  wallet TEXT NOT NULL REFERENCES whales(wallet) ON DELETE CASCADE,
  transaction_hash TEXT NOT NULL,
  condition_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT,
  event_slug TEXT,
  outcome TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('BUY','SELL')),
  size DOUBLE PRECISION NOT NULL,
  price DOUBLE PRECISION NOT NULL,
  notional DOUBLE PRECISION NOT NULL,
  traded_at TIMESTAMPTZ NOT NULL,
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS trades_recent_idx ON trades(traded_at DESC);
CREATE INDEX IF NOT EXISTS trades_market_idx ON trades(condition_id, outcome, traded_at DESC);

CREATE TABLE IF NOT EXISTS signals (
  id TEXT PRIMARY KEY,
  condition_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT,
  event_slug TEXT,
  outcome TEXT NOT NULL,
  signal_score INTEGER NOT NULL,
  label TEXT NOT NULL,
  whale_count INTEGER NOT NULL,
  total_notional DOUBLE PRECISION NOT NULL,
  avg_entry DOUBLE PRECISION NOT NULL,
  current_price DOUBLE PRECISION,
  spread DOUBLE PRECISION,
  depth_usd DOUBLE PRECISION,
  edge_remaining DOUBLE PRECISION,
  components JSONB NOT NULL,
  wallets JSONB NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS signals_score_idx ON signals(signal_score DESC, updated_at DESC);

CREATE TABLE IF NOT EXISTS worker_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
