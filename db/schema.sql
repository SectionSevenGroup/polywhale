CREATE TABLE IF NOT EXISTS whales (
  wallet TEXT PRIMARY KEY,
  username TEXT,
  pnl DOUBLE PRECISION NOT NULL DEFAULT 0,
  volume DOUBLE PRECISION NOT NULL DEFAULT 0,
  whale_score INTEGER NOT NULL DEFAULT 0,
  copyability_score INTEGER NOT NULL DEFAULT 50,
  hit_rate DOUBLE PRECISION,
  closed_positions INTEGER NOT NULL DEFAULT 0,
  all_rank INTEGER,
  month_rank INTEGER,
  week_rank INTEGER,
  categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  tracked BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
  id BIGSERIAL PRIMARY KEY, wallet TEXT NOT NULL, category TEXT NOT NULL, period TEXT NOT NULL,
  rank INTEGER NOT NULL, pnl DOUBLE PRECISION NOT NULL, volume DOUBLE PRECISION NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(wallet, category, period, captured_at)
);
CREATE INDEX IF NOT EXISTS leaderboard_snapshots_wallet_idx ON leaderboard_snapshots(wallet, captured_at DESC);

CREATE TABLE IF NOT EXISTS closed_positions (
  wallet TEXT NOT NULL REFERENCES whales(wallet) ON DELETE CASCADE, condition_id TEXT NOT NULL,
  asset_id TEXT NOT NULL, title TEXT NOT NULL, outcome TEXT NOT NULL, avg_price DOUBLE PRECISION NOT NULL,
  total_bought DOUBLE PRECISION NOT NULL DEFAULT 0, realized_pnl DOUBLE PRECISION NOT NULL DEFAULT 0,
  end_date TIMESTAMPTZ, ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(wallet, condition_id, asset_id)
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

CREATE TABLE IF NOT EXISTS wallet_links (
  wallet_a TEXT NOT NULL, wallet_b TEXT NOT NULL, reason TEXT NOT NULL,
  evidence_count INTEGER NOT NULL DEFAULT 1, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(wallet_a,wallet_b,reason), CHECK(wallet_a < wallet_b)
);

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

CREATE TABLE IF NOT EXISTS signal_history (
  signal_id TEXT NOT NULL REFERENCES signals(id) ON DELETE CASCADE, horizon TEXT NOT NULL CHECK(horizon IN ('5m','30m','4h','resolution')),
  due_at TIMESTAMPTZ NOT NULL, evaluated_at TIMESTAMPTZ, observed_price DOUBLE PRECISION,
  price_change DOUBLE PRECISION, resolved BOOLEAN NOT NULL DEFAULT FALSE, won BOOLEAN,
  PRIMARY KEY(signal_id, horizon)
);
CREATE INDEX IF NOT EXISTS signal_history_due_idx ON signal_history(due_at) WHERE evaluated_at IS NULL;

CREATE TABLE IF NOT EXISTS worker_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
