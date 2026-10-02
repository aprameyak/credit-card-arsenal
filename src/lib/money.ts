export type Cents = number;

export function dollarsToCents(dollars: number): Cents {
  return Math.round(dollars * 100);
}

export function centsToDollars(cents: Cents): number {
  return cents / 100;
}

export function addCents(...amounts: Cents[]): Cents {
  return amounts.reduce((sum, a) => sum + a, 0);
}

export function mulCentsRate(
  cents: Cents,
  rate: number,
  rateIsBasisPoints = false
): Cents {
  const decimal = rateIsBasisPoints ? rate / 10_000 : rate;
  return Math.round(cents * decimal);
}

export function formatMoneyFromCents(
  cents: Cents,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
): string {
  const dollars = cents / 100;
  const min = options?.minimumFractionDigits ?? 0;
  const max = options?.maximumFractionDigits ?? min;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: min,
    maximumFractionDigits: Math.max(min, max),
  }).format(dollars);
}
