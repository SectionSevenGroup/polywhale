export type SignalLabel = "HIGH CONVICTION" | "STRONG" | "WATCH" | "PASS";
export const signalLabel = (score: number): SignalLabel => score >= 85 ? "HIGH CONVICTION" : score >= 72 ? "STRONG" : score >= 60 ? "WATCH" : "PASS";

const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));
const rankScore = (rank?: number | null) => rank ? clamp(105 - Math.log10(rank + 1) * 42) : 25;

export interface WhaleScoreInput {
  pnl: number;
  volume: number;
  allRank?: number | null;
  monthRank?: number | null;
  weekRank?: number | null;
  categoryAppearances?: number;
  closedPositions?: number;
  hitRate?: number | null;
  concentration?: number;
  medianImprovement?: number | null;
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
  const sample = clamp(Math.log10(Math.max(1, x.closedPositions ?? 0) + 1) * 38);
  const outcomes = x.hitRate == null ? 50 : clamp(x.hitRate * 100);
  const forwardEdge = x.medianImprovement == null ? 50 : clamp(50 + x.medianImprovement * 800);
  const concentrationPenalty = clamp((x.concentration ?? 0) * 25, 0, 25);

  const score =
    efficiencyScore * 0.19 + persistence * 0.22 + pnlScale * 0.12 + volumeScale * 0.07 +
    categoryBreadth * 0.08 + sample * 0.10 + outcomes * 0.12 + forwardEdge * 0.10 - concentrationPenalty;

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
  independentWhaleCount?: number;
  minutesToResolution?: number | null;
}

export function scoreSignal(x: SignalScoreInput) {
  const quality = clamp(x.weightedWhaleQuality);
  const independent = x.independentWhaleCount ?? x.whaleCount;
  const consensus = clamp(
    18 + Math.max(0, independent - 1) * 22 + ((x.sameDirectionRatio ?? 1) - 0.5) * 22,
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

  let freshness = clamp(100 - (x.ageSeconds / 60) * 7.5);
  if (x.minutesToResolution != null && x.minutesToResolution < 60) freshness *= .45;

  let score = clamp(
    quality * 0.34 +
    consensus * 0.20 +
    conviction * 0.13 +
    liquidity * 0.13 +
    edgeRemaining * 0.14 +
    freshness * 0.06,
  );
  if (independent <= 1) score = Math.min(score, 69);
  if (x.spread != null && x.spread > .08) score = Math.min(score, 59);

  const rounded = Math.round(score);
  const label = signalLabel(rounded);

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
