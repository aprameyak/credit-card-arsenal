import type { Card, PointValuation, RewardType } from "../types";

export const DEFAULT_VALUATIONS: PointValuation[] = [
  {
    currency: "USD",
    centsPerPoint: 1,
    label: "Cash back",
    isUserDefined: false,
  },
  {
    currency: "Ultimate Rewards",
    centsPerPoint: 1.5,
    label: "Chase Ultimate Rewards",
    isUserDefined: false,
  },
  {
    currency: "Membership Rewards",
    centsPerPoint: 2.0,
    label: "Amex Membership Rewards",
    isUserDefined: false,
  },
  {
    currency: "ThankYou Points",
    centsPerPoint: 1.6,
    label: "Citi ThankYou Points",
    isUserDefined: false,
  },
  {
    currency: "Capital One Miles",
    centsPerPoint: 1.5,
    label: "Capital One Miles",
    isUserDefined: false,
  },
  {
    currency: "Bilt Points",
    centsPerPoint: 1.5,
    label: "Bilt Rewards",
    isUserDefined: false,
  },
  {
    currency: "Cash Miles",
    centsPerPoint: 1.5,
    label: "U.S. Bank Altitude miles",
    isUserDefined: false,
  },
  {
    currency: "Discover Cashback",
    centsPerPoint: 1,
    label: "Discover cash back",
    isUserDefined: false,
  },
];

export const VALUATION_ASSUMPTIONS =
  "Default cents-per-point values are conservative baselines — not guaranteed redemption prices.";

export function cardCurrency(card: Card): string {
  return card.rewardCurrency;
}

export function resolveValuation(
  currency: string,
  valuations: PointValuation[]
): PointValuation {
  const user = valuations.find(
    (v) => v.currency.toLowerCase() === currency.toLowerCase()
  );
  if (user) return user;
  const fallback = DEFAULT_VALUATIONS.find(
    (v) => v.currency.toLowerCase() === currency.toLowerCase()
  );
  if (fallback) return fallback;
  if (currency.toLowerCase().includes("cash") || currency === "USD") {
    return DEFAULT_VALUATIONS[0];
  }
  return {
    currency,
    centsPerPoint: 1.0,
    label: currency,
    isUserDefined: false,
  };
}

export function rewardValueDollars(
  amount: number,
  rewardType: RewardType,
  currency: string,
  valuations: PointValuation[]
): number {
  if (rewardType === "cashback") {
    return amount;
  }
  const { centsPerPoint } = resolveValuation(currency, valuations);
  return (amount * centsPerPoint) / 100;
}

export function effectiveReturnRate(
  multiplier: number,
  rewardType: RewardType,
  currency: string,
  valuations: PointValuation[]
): number {
  if (rewardType === "cashback") {
    return multiplier / 100;
  }
  const { centsPerPoint } = resolveValuation(currency, valuations);
  return (multiplier * centsPerPoint) / 100;
}

export function mergeValuations(
  user: PointValuation[] | undefined
): PointValuation[] {
  const map = new Map(DEFAULT_VALUATIONS.map((v) => [v.currency, { ...v }]));
  for (const v of user ?? []) {
    map.set(v.currency, { ...v, isUserDefined: true });
  }
  return [...map.values()];
}
