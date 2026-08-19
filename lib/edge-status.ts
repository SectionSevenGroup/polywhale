export const EDGE_STATUS_PRIORITY = ["STALE", "WIDE SPREAD", "LOW LIQUIDITY", "ALREADY RAN", "MULTI-WHALE BUILDING", "EDGE NARROWING", "ENTRY INTACT"] as const;
export type EdgeStatus = typeof EDGE_STATUS_PRIORITY[number];

export const EDGE_THRESHOLDS = {
  staleMs: 15 * 60_000,
  wideSpread: 0.04,
  lowDepthUsd: 1_000,
  narrowingMove: 0.02,
  ranMove: 0.05,
} as const;

export type EdgeInput = {
  avg_entry: number;
  current_price: number | null;
  spread: number | null;
  depth_usd: number | null;
  /** Latest calibration-eligible V2 event count. Null means no reliable independence evidence. */
  independent_whale_count: number | null;
  last_seen_at: string;
};

/** Deterministic interpretation of live market quality; this never affects Signal Score. */
export function getEdgeStatus(input: EdgeInput, now = Date.now()): EdgeStatus {
  const age = now - new Date(input.last_seen_at).getTime();
  const move = input.current_price == null ? 0 : input.current_price - input.avg_entry;
  if (!Number.isFinite(age) || age > EDGE_THRESHOLDS.staleMs) return "STALE";
  if (input.spread != null && input.spread > EDGE_THRESHOLDS.wideSpread) return "WIDE SPREAD";
  if (input.depth_usd != null && input.depth_usd < EDGE_THRESHOLDS.lowDepthUsd) return "LOW LIQUIDITY";
  if (move > EDGE_THRESHOLDS.ranMove) return "ALREADY RAN";
  if (input.independent_whale_count != null && input.independent_whale_count >= 2) return "MULTI-WHALE BUILDING";
  if (move >= EDGE_THRESHOLDS.narrowingMove) return "EDGE NARROWING";
  return "ENTRY INTACT";
}
