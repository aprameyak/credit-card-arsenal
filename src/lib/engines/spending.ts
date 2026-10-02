import { CARD_DATABASE } from "../cards/database";
import type {
  Card,
  OwnedCard,
  PointValuation,
  RewardType,
  RewardPeriod,
  RoutingResult,
  SpendCategory,
  SpendingProfile,
  CategoryRewardRule,
} from "../types";
import { ALL_CATEGORIES, annualize } from "../utils";
import {
  cardCurrency,
  effectiveReturnRate,
  rewardValueDollars,
} from "./valuation";

export function getAnnualSpend(
  profile: SpendingProfile,
  category: SpendCategory
): number {
  return annualize(profile.amounts[category] ?? 0, profile.mode);
}

export function getTotalAnnualSpend(profile: SpendingProfile): number {
  return ALL_CATEGORIES.reduce(
    (sum, cat) => sum + getAnnualSpend(profile, cat),
    0
  );
}

export function estimateRewardsForCategory(
  card: Card,
  category: SpendCategory,
  annualSpend: number,
  valuations: PointValuation[]
): { rewards: number; rate: number; assumptions: string[] } {
  const rewards = estimateCategoryRewards(
    card,
    category,
    annualSpend,
    valuations
  );
  const rate = categoryEffectiveRate(card, category, valuations);
  const assumptions: string[] = [];
  const rule = bestRuleForCategory(card, category);
  if (rule?.cap != null) {
    assumptions.push(
      `Cap $${rule.cap} ${rule.period} on ${category} earn where applicable`
    );
  }
  if (rule?.restrictions?.length) {
    assumptions.push(rule.restrictions.join("; "));
  }
  return { rewards, rate, assumptions };
}

export function emptySpending(): SpendingProfile {
  const amounts = Object.fromEntries(
    ALL_CATEGORIES.map((c) => [c, 0])
  ) as Record<SpendCategory, number>;
  return { mode: "monthly", amounts };
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isRuleEffective(
  rule: CategoryRewardRule,
  on = todayIso()
): boolean {
  if (rule.effectiveFrom > on) return false;
  if (rule.effectiveTo != null && rule.effectiveTo < on) return false;
  return true;
}

export function bestRuleForCategory(
  card: Card,
  category: SpendCategory
): CategoryRewardRule | null {
  const matches = card.categoryRewards.filter(
    (r) => r.category === category && isRuleEffective(r)
  );
  if (matches.length === 0) return null;
  return matches.reduce((best, r) =>
    r.multiplier > best.multiplier ? r : best
  );
}

function isCashbackCard(card: Card): boolean {
  return card.rewardCurrency === "USD" || card.tags.includes("cashback");
}

function baseRewardType(card: Card): RewardType {
  if (isCashbackCard(card)) return "cashback";
  if (card.rewardCurrency.toLowerCase().includes("mile")) return "miles";
  return "points";
}

function capToAnnualSpendCap(
  cap: number | null,
  period: RewardPeriod
): number | null {
  if (cap == null) return null;
  switch (period) {
    case "monthly":
      return cap * 12;
    case "quarterly":
      return cap * 4;
    case "annual":
    case "permanent":
      return cap;
    default:
      return cap;
  }
}

export function estimateCategoryRewards(
  card: Card,
  category: SpendCategory,
  annualSpend: number,
  valuations: PointValuation[]
): number {
  if (annualSpend <= 0) return 0;
  const currency = cardCurrency(card);
  const rule = bestRuleForCategory(card, category);
  const baseMult = card.baseRewardRate;

  if (!rule) {
    const rewardType = baseRewardType(card);
    const raw =
      rewardType === "cashback"
        ? annualSpend * (baseMult / 100)
        : annualSpend * baseMult;
    return rewardValueDollars(raw, rewardType, currency, valuations);
  }

  const annualCap = capToAnnualSpendCap(rule.cap, rule.period);
  const elevatedSpend =
    annualCap != null ? Math.min(annualSpend, annualCap) : annualSpend;
  const remainder = annualSpend - elevatedSpend;

  const elevatedRaw =
    rule.rewardType === "cashback"
      ? elevatedSpend * (rule.multiplier / 100)
      : elevatedSpend * rule.multiplier;
  const remainderRaw =
    rule.rewardType === "cashback"
      ? remainder * (baseMult / 100)
      : remainder * baseMult;

  const elevatedVal = rewardValueDollars(
    elevatedRaw,
    rule.rewardType,
    currency,
    valuations
  );
  const remainderVal = rewardValueDollars(
    remainderRaw,
    baseRewardType(card),
    currency,
    valuations
  );
  return elevatedVal + remainderVal;
}

export function categoryEffectiveRate(
  card: Card,
  category: SpendCategory,
  valuations: PointValuation[]
): number {
  const rule = bestRuleForCategory(card, category);
  const currency = cardCurrency(card);
  if (rule) {
    return effectiveReturnRate(
      rule.multiplier,
      rule.rewardType,
      currency,
      valuations
    );
  }
  return effectiveReturnRate(
    card.baseRewardRate,
    baseRewardType(card),
    currency,
    valuations
  );
}

export function getOwnedCardObjects(
  ownedCards: OwnedCard[],
  catalog: Card[] = CARD_DATABASE
): { owned: OwnedCard; card: Card }[] {
  return ownedCards
    .map((owned) => {
      const card = catalog.find((c) => c.id === owned.cardId);
      return card ? { owned, card } : null;
    })
    .filter((x): x is { owned: OwnedCard; card: Card } => x != null);
}

export interface SpendingOptimization {
  routing: RoutingResult[];
  totalRewards: number;
}

export function optimizeSpending(
  cards: Card[],
  spending: SpendingProfile,
  valuations: PointValuation[]
): SpendingOptimization {
  const routing: RoutingResult[] = [];
  let totalRewards = 0;

  for (const category of ALL_CATEGORIES) {
    const annualSpend = annualize(spending.amounts[category], spending.mode);
    if (annualSpend <= 0) continue;

    let best: { card: Card; rewards: number } | null = null;
    for (const card of cards) {
      const rewards = estimateCategoryRewards(
        card,
        category,
        annualSpend,
        valuations
      );
      if (!best || rewards > best.rewards) {
        best = { card, rewards };
      }
    }

    if (best) {
      totalRewards += best.rewards;
      // Blended rate after caps — face multipliers misclassify capped earn as "strong".
      const effectiveRate =
        annualSpend > 0 ? best.rewards / annualSpend : 0;
      routing.push({
        category,
        cardId: best.card.id,
        cardName: best.card.cardName,
        effectiveRate,
        annualRewards: best.rewards,
        assumptions: [],
      });
    }
  }

  return { routing, totalRewards };
}

export function currentStrategyValue(
  owned: OwnedCard[],
  catalog: Card[],
  spending: SpendingProfile,
  valuations: PointValuation[]
): number {
  const pairs = getOwnedCardObjects(owned, catalog);
  const cards = pairs.map((p) => p.card);
  let total = 0;

  for (const category of ALL_CATEGORIES) {
    const annualSpend = annualize(spending.amounts[category], spending.mode);
    if (annualSpend <= 0) continue;

    const assigned = pairs.find((p) => p.owned.assignedRole === category);
    const catchall = pairs.find((p) => p.owned.assignedRole === "catchall");
    const card =
      assigned?.card ??
      catchall?.card ??
      cards.reduce<{ card: Card; rewards: number } | null>((best, c) => {
        const rewards = estimateCategoryRewards(
          c,
          category,
          annualSpend,
          valuations
        );
        if (!best || rewards > best.rewards) return { card: c, rewards };
        return best;
      }, null)?.card;

    if (card) {
      total += estimateCategoryRewards(
        card,
        category,
        annualSpend,
        valuations
      );
    }
  }

  return total;
}

export function optimizedStrategyValue(
  owned: OwnedCard[],
  catalog: Card[],
  spending: SpendingProfile,
  valuations: PointValuation[]
): number {
  const cards = getOwnedCardObjects(owned, catalog).map((p) => p.card);
  return optimizeSpending(cards, spending, valuations).totalRewards;
}

export function routePurchase(
  category: SpendCategory,
  cards: Card[],
  valuations: PointValuation[],
  amount = 1
): RoutingResult | null {
  const spend: SpendingProfile = {
    mode: "annual",
    amounts: { ...emptySpending().amounts, [category]: amount },
  };
  const { routing } = optimizeSpending(cards, spend, valuations);
  return routing.find((r) => r.category === category) ?? null;
}
