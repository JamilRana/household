/**
 * Money formatting. Set NEXT_PUBLIC_DEFAULT_CURRENCY (e.g. "BDT", "EUR") to change the
 * app-wide default; until per-user settings exist this replaces the old hard-coded "USD".
 */
export const DEFAULT_CURRENCY = process.env.NEXT_PUBLIC_DEFAULT_CURRENCY || "USD";

export function formatMoney(
  amount: number | string | { toString(): string },
  currency: string = DEFAULT_CURRENCY,
  opts: { cents?: boolean } = {}
): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: opts.cents === false ? 0 : undefined,
      maximumFractionDigits: opts.cents === false ? 0 : undefined,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}
