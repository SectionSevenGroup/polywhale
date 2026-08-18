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

-- Immutable alert-time snapshots. `signals` remains the mutable live projection; all
-- forward-performance measurements must anchor to one of these frozen events.
CREATE TABLE IF NOT EXISTS signal_events (
  id UUID PRIMARY KEY,
  signal_id TEXT NOT NULL REFERENCES signals(id) ON DELETE RESTRICT,
  condition_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  outcome TEXT NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL,
  signal_score INTEGER NOT NULL,
  label TEXT NOT NULL,
  weighted_whale_quality DOUBLE PRECISION NOT NULL,
  independent_whale_count INTEGER NOT NULL,
  wallets JSONB NOT NULL,
  total_notional DOUBLE PRECISION NOT NULL,
  avg_whale_entry DOUBLE PRECISION NOT NULL,
  market_midpoint DOUBLE PRECISION,
  best_bid DOUBLE PRECISION,
  best_ask DOUBLE PRECISION,
  spread DOUBLE PRECISION,
  depth_usd DOUBLE PRECISION NOT NULL,
  edge_remaining DOUBLE PRECISION,
  freshness_score INTEGER NOT NULL,
  components JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS signal_events_latest_idx ON signal_events(signal_id, detected_at DESC);

-- Existing immutable V1 events may have been emitted by price movement alone.
-- Preserve them, classify them as legacy, and exclude them from clean cohorts.
ALTER TABLE signal_events ADD COLUMN IF NOT EXISTS thesis_key TEXT;
UPDATE signal_events SET thesis_key=lower(btrim(condition_id) || '|' || btrim(asset_id) || '|' || btrim(outcome)) WHERE thesis_key IS NULL;
ALTER TABLE signal_events ALTER COLUMN thesis_key SET NOT NULL;
ALTER TABLE signal_events ADD COLUMN IF NOT EXISTS event_version TEXT NOT NULL DEFAULT 'legacy_v1_price_possible';
ALTER TABLE signal_events ADD COLUMN IF NOT EXISTS trigger_reason TEXT NOT NULL DEFAULT 'legacy_unknown';
ALTER TABLE signal_events ADD COLUMN IF NOT EXISTS calibration_eligible BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS signal_events_thesis_idx ON signal_events(thesis_key, detected_at DESC);

CREATE OR REPLACE FUNCTION reject_signal_event_mutation() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'signal_events are immutable';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS signal_events_immutable ON signal_events;
CREATE TRIGGER signal_events_immutable BEFORE UPDATE OR DELETE ON signal_events
FOR EACH ROW EXECUTE FUNCTION reject_signal_event_mutation();

CREATE TABLE IF NOT EXISTS signal_event_evaluations (
  event_id UUID NOT NULL REFERENCES signal_events(id) ON DELETE RESTRICT,
  horizon TEXT NOT NULL CHECK(horizon IN ('5m','30m','4h','resolution')),
  due_at TIMESTAMPTZ NOT NULL,
  evaluated_at TIMESTAMPTZ,
  observed_price DOUBLE PRECISION,
  price_move_since_alert DOUBLE PRECISION,
  whale_entry_edge DOUBLE PRECISION,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  won BOOLEAN,
  PRIMARY KEY(event_id, horizon)
);
CREATE INDEX IF NOT EXISTS signal_event_evaluations_due_idx ON signal_event_evaluations(due_at) WHERE evaluated_at IS NULL;

CREATE OR REPLACE VIEW signal_performance_summary AS
SELECT 'event'::text grain,e.horizon,count(*)::bigint observations,
  avg(e.price_move_since_alert) avg_price_move_since_alert,avg(e.whale_entry_edge) avg_whale_entry_edge
FROM signal_event_evaluations e JOIN signal_events s ON s.id=e.event_id
WHERE e.evaluated_at IS NOT NULL AND s.calibration_eligible=TRUE GROUP BY e.horizon
UNION ALL
SELECT 'thesis'::text grain,x.horizon,count(*)::bigint observations,
  avg(x.price_move_since_alert),avg(x.whale_entry_edge)
FROM (SELECT DISTINCT ON (s.thesis_key,e.horizon) s.thesis_key,e.horizon,e.price_move_since_alert,e.whale_entry_edge
  FROM signal_event_evaluations e JOIN signal_events s ON s.id=e.event_id
  WHERE e.evaluated_at IS NOT NULL AND s.calibration_eligible=TRUE
  ORDER BY s.thesis_key,e.horizon,s.detected_at DESC) x GROUP BY x.horizon;

CREATE TABLE IF NOT EXISTS signal_history (
  signal_id TEXT NOT NULL REFERENCES signals(id) ON DELETE CASCADE, horizon TEXT NOT NULL CHECK(horizon IN ('5m','30m','4h','resolution')),
  due_at TIMESTAMPTZ NOT NULL, evaluated_at TIMESTAMPTZ, observed_price DOUBLE PRECISION,
  price_change DOUBLE PRECISION, resolved BOOLEAN NOT NULL DEFAULT FALSE, won BOOLEAN,
  PRIMARY KEY(signal_id, horizon)
);
-- Rows in this original mutable-signal history are retained, but are explicitly
-- non-equivalent to immutable event measurements.
ALTER TABLE signal_history ADD COLUMN IF NOT EXISTS measurement_version TEXT NOT NULL DEFAULT 'legacy_mutable_v0';
CREATE INDEX IF NOT EXISTS signal_history_due_idx ON signal_history(due_at) WHERE evaluated_at IS NULL;

CREATE TABLE IF NOT EXISTS worker_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
