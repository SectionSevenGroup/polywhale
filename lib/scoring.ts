export type SignalLabel = "HIGH CONVICTION" | "STRONG" | "WATCH" | "PASS";

const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));
const rankScore = (rank?: number | null) => rank ? clamp(105 - Math.log10(rank + 1) * 42) : 25;

export interface WhaleScoreInput {
  pnl: number;
  volume: number;
  allRank?: number | null;
  monthRank?: number | null;
  weekRank?: number | null;
  categoryAppearances?: number;
}

/**
 * Heuristic quality score, not a probability and not a true ROI measure.
 * PnL/volume is deliberately treated as an efficiency proxy only.
 */
export function scoreWhale(x: WhaleScoreInput) {
  const efficiency = x.volume > 0 ? x.pnl / x.volume : 0;
  const efficiencyScore = clamp(50 + efficiency * 600);
  const pnlScale = clamp(Math.log10(Math.max(1, x.pnl + 1000)) * 18);
  const volumeScale = clamp(Math.log10(Math.max(1, x.volume)) * 14);
  const persistence = (
    rankScore(x.allRank) * 0.45 +
    rankScore(x.monthRank) * 0.35 +
    rankScore(x.weekRank) * 0.20
  );
  const categoryBreadth = clamp((x.categoryAppearances ?? 1) * 13, 15, 90);

  const score =
    efficiencyScore * 0.30 +
    persistence * 0.30 +
    pnlScale * 0.18 +
    volumeScale * 0.12 +
    categoryBreadth * 0.10;

  return Math.round(clamp(score));
}

export interface SignalScoreInput {
  weightedWhaleQuality: number;
  whaleCount: number;
  totalNotional: number;
  avgEntry: number;
  currentPrice: number | null;
  spread: number | null;
  depthUsd: number;
  ageSeconds: number;
  sameDirectionRatio?: number;
}

export function scoreSignal(x: SignalScoreInput) {
  const quality = clamp(x.weightedWhaleQuality);
  const consensus = clamp(
    32 + Math.max(0, x.whaleCount - 1) * 17 + ((x.sameDirectionRatio ?? 1) - 0.5) * 30,
    20,
    100,
  );
  const conviction = clamp(22 + Math.log10(Math.max(10, x.totalNotional)) * 17);

  let liquidity = 45;
  if (x.spread != null) {
    liquidity = x.spread <= 0.01 ? 96 : x.spread <= 0.02 ? 86 : x.spread <= 0.04 ? 68 : x.spread <= 0.07 ? 45 : 25;
  }
  liquidity = clamp(liquidity * 0.7 + clamp(Math.log10(Math.max(10, x.depthUsd)) * 17) * 0.3);

  let edgeRemaining = 55;
  if (x.currentPrice != null) {
    const move = x.currentPrice - x.avgEntry;
    edgeRemaining = move <= 0.005 ? 100 : move <= 0.02 ? 82 : move <= 0.05 ? 58 : move <= 0.10 ? 30 : 8;
  }

  const freshness = clamp(100 - (x.ageSeconds / 60) * 6.5);

  const score = clamp(
    quality * 0.34 +
    consensus * 0.20 +
    conviction * 0.13 +
    liquidity * 0.13 +
    edgeRemaining * 0.14 +
    freshness * 0.06,
  );

  const rounded = Math.round(score);
  const label: SignalLabel = rounded >= 85 ? "HIGH CONVICTION" : rounded >= 72 ? "STRONG" : rounded >= 60 ? "WATCH" : "PASS";

  return {
    score: rounded,
    label,
    components: {
      quality: Math.round(quality),
      consensus: Math.round(consensus),
      conviction: Math.round(conviction),
      liquidity: Math.round(liquidity),
      edgeRemaining: Math.round(edgeRemaining),
      freshness: Math.round(freshness),
    },
  };
}
