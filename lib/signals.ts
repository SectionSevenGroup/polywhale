import type { PublicTrade } from "./polymarket";

export function dedupeFills(trades: PublicTrade[]) {
  const grouped = new Map<string, PublicTrade>();
  for (const trade of trades) {
    const key = [trade.proxyWallet.toLowerCase(), trade.transactionHash, trade.asset, trade.side].join("|");
    const old = grouped.get(key);
    if (!old) grouped.set(key, { ...trade });
    else {
      const size = old.size + trade.size;
      grouped.set(key, { ...old, size, price: size ? (old.price * old.size + trade.price * trade.size) / size : old.price });
    }
  }
  return [...grouped.values()];
}

/** Conservative behavioural linkage: wallets repeatedly sharing transactions count once. */
export function independentWalletCount(trades: Pick<PublicTrade, "proxyWallet" | "transactionHash">[]) {
  const parents = new Map<string, string>();
  const root = (x: string): string => parents.get(x) === x ? x : root(parents.get(x) ?? x);
  const join = (a: string, b: string) => { a = root(a); b = root(b); parents.set(a, b); };
  const txWallets = new Map<string, string[]>();
  for (const t of trades) {
    const wallet = t.proxyWallet.toLowerCase(); parents.set(wallet, parents.get(wallet) ?? wallet);
    txWallets.set(t.transactionHash, [...(txWallets.get(t.transactionHash) ?? []), wallet]);
  }
  for (const wallets of txWallets.values()) for (let i = 1; i < wallets.length; i++) join(wallets[0], wallets[i]);
  return new Set([...parents.keys()].map(root)).size;
}
