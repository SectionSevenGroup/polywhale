import type { SignalLabel } from "./scoring";

export const MATERIAL_NOTIONAL_RATIO = 1.25;
export const MATERIAL_NOTIONAL_MIN_USD = 1_000;
export type MaterialSignalReason = "initial_detection" | "independent_whale_joined" | "label_changed_on_new_flow" | "material_notional_increase";

export interface FrozenSignalState {
  signalScore: number;
  label: SignalLabel;
  independentWhaleCount: number;
  totalNotional: number;
  marketMidpoint: number | null;
}

export interface SignalEventSnapshot extends FrozenSignalState {
  avgWhaleEntry: number;
  wallets: ReadonlyArray<Readonly<Record<string, unknown>>>;
}

/** Defensive in-memory snapshot; PostgreSQL supplies the authoritative mutation guard. */
export function freezeSignalEvent(input: SignalEventSnapshot): Readonly<SignalEventSnapshot> {
  const wallets = input.wallets.map(wallet => Object.freeze({ ...wallet }));
  return Object.freeze({ ...input, wallets: Object.freeze(wallets) });
}

/**
 * A new event represents a genuinely different setup, not another worker poll.
 * It is material when an independent wallet joins, a label changes alongside new
 * whale flow, or qualifying notional grows by both 25% and $1k. Price is ignored.
 */
export function isMaterialSignalChange(previous: FrozenSignalState | null, next: FrozenSignalState) {
  return materialSignalReason(previous, next) !== null;
}

export function materialSignalReason(previous: FrozenSignalState | null, next: FrozenSignalState): MaterialSignalReason | null {
  if (!previous) return "initial_detection";
  if (next.independentWhaleCount > previous.independentWhaleCount) return "independent_whale_joined";
  const notionalIncrease = next.totalNotional - previous.totalNotional;
  if (next.label !== previous.label && notionalIncrease > 0) return "label_changed_on_new_flow";
  if (notionalIncrease >= MATERIAL_NOTIONAL_MIN_USD && next.totalNotional >= previous.totalNotional * MATERIAL_NOTIONAL_RATIO) return "material_notional_increase";
  return null;
}

export function evaluationEdges(observedPrice: number, marketPriceAtDetection: number | null, whaleEntryAtDetection: number) {
  return {
    priceMoveSinceAlert: marketPriceAtDetection == null ? null : observedPrice - marketPriceAtDetection,
    whaleEntryEdge: observedPrice - whaleEntryAtDetection,
  };
}

export function thesisKey(conditionId: string, assetId: string, outcome: string) {
  return [conditionId.trim().toLowerCase(), assetId.trim().toLowerCase(), outcome.trim().toLowerCase()].join("|");
}

export interface PerformanceObservation { thesisKey: string; horizon: string; priceMoveSinceAlert: number | null; whaleEntryEdge: number | null }
export function performanceCounts(rows: PerformanceObservation[]) {
  return {
    eventObservations: rows.length,
    uniqueThesisObservations: new Set(rows.map(row => `${row.thesisKey}|${row.horizon}`)).size,
  };
}
