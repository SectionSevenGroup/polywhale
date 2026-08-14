import type { SignalLabel } from "./scoring";

export const MATERIAL_NOTIONAL_RATIO = 1.25;
export const MATERIAL_NOTIONAL_MIN_USD = 1_000;
export const MATERIAL_PRICE_MOVE = 0.03;

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
 * It is material when an independent wallet joins, the score changes label, flow
 * grows by both 25% and $1k, or the detection midpoint moves by at least 3 cents.
 */
export function isMaterialSignalChange(previous: FrozenSignalState | null, next: FrozenSignalState) {
  if (!previous) return true;
  if (next.independentWhaleCount > previous.independentWhaleCount) return true;
  if (next.label !== previous.label) return true;
  const notionalIncrease = next.totalNotional - previous.totalNotional;
  if (notionalIncrease >= MATERIAL_NOTIONAL_MIN_USD && next.totalNotional >= previous.totalNotional * MATERIAL_NOTIONAL_RATIO) return true;
  if (previous.marketMidpoint != null && next.marketMidpoint != null && Math.abs(next.marketMidpoint - previous.marketMidpoint) + Number.EPSILON * 10 >= MATERIAL_PRICE_MOVE) return true;
  return false;
}

export function evaluationEdges(observedPrice: number, marketPriceAtDetection: number | null, whaleEntryAtDetection: number) {
  return {
    priceMoveSinceAlert: marketPriceAtDetection == null ? null : observedPrice - marketPriceAtDetection,
    whaleEntryEdge: observedPrice - whaleEntryAtDetection,
  };
}
