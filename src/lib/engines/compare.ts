import type { Card, SpendCategory, UserProfile } from "../types";
import { ALL_CATEGORIES, annualize } from "../utils";
import { incrementalValueOfCard } from "./arsenal";
import { cardCurrency } from "./valuation";
import {
  estimateCategoryRewards,
  getOwnedCardObjects,
  optimizeSpending,
} from "./spending";

export interface CardCompareResult {
  cardA: Card;
  cardB: Card;
  incrementalIfAddA: number;
  incrementalIfAddB: number;
  coverageAddsA: SpendCategory[];
  coverageAddsB: SpendCategory[];
  overlaps: SpendCategory[];
  ecosystemIntroA: string | null;
  ecosystemIntroB: string | null;
  categoryDeltas: {
    category: SpendCategory;
    winner: "A" | "B" | "tie";
    deltaDollars: number;
  }[];
}

function ownedPrograms(profile: UserProfile, catalog: Card[]): Set<string> {
  const programs = new Set<string>();
  for (const { card } of getOwnedCardObjects(profile.ownedCards, catalog)) {
    programs.add(card.rewardProgram);
  }
  return programs;
}

function bestCategoriesForCard(
  card: Card,
  profile: UserProfile,
  ownedRouting: Map<SpendCategory, { cardId: string; rewards: number }>
): SpendCategory[] {
  const adds: SpendCategory[] = [];
  for (const cat of ALL_CATEGORIES) {
    const spend = annualize(
      profile.spending.amounts[cat],
      profile.spending.mode
    );
    if (spend <= 0) continue;
    const current = ownedRouting.get(cat);
    const rewards = estimateCategoryRewards(
      card,
      cat,
      spend,
      profile.valuations
    );
    if (!current || rewards > current.rewards + 5) {
      adds.push(cat);
    }
  }
  return adds;
}

export function compareTwoCards(
  cardA: Card,
  cardB: Card,
  profile: UserProfile,
  catalog: Card[]
): CardCompareResult {
  const owned = getOwnedCardObjects(profile.ownedCards, catalog).map(
    (p) => p.card
  );
  const { routing } = optimizeSpending(
    owned,
    profile.spending,
    profile.valuations
  );
  const ownedRouting = new Map(
    routing.map((r) => [
      r.category,
      { cardId: r.cardId, rewards: r.annualRewards },
    ])
  );

  const coverageAddsA = bestCategoriesForCard(cardA, profile, ownedRouting);
  const coverageAddsB = bestCategoriesForCard(cardB, profile, ownedRouting);
  const overlaps = coverageAddsA.filter((c) => coverageAddsB.includes(c));

  const programs = ownedPrograms(profile, catalog);
  const ecoA = programs.has(cardA.rewardProgram)
    ? null
    : cardA.rewardProgram;
  const ecoB = programs.has(cardB.rewardProgram)
    ? null
    : cardB.rewardProgram;

  const categoryDeltas = ALL_CATEGORIES.map((category) => {
    const spend = annualize(
      profile.spending.amounts[category],
      profile.spending.mode
    );
    if (spend <= 0) {
      return { category, winner: "tie" as const, deltaDollars: 0 };
    }
    const rA = estimateCategoryRewards(
      cardA,
      category,
      spend,
      profile.valuations
    );
    const rB = estimateCategoryRewards(
      cardB,
      category,
      spend,
      profile.valuations
    );
    const delta = rA - rB;
    let winner: "A" | "B" | "tie" = "tie";
    if (delta > 2) winner = "A";
    else if (delta < -2) winner = "B";
    return { category, winner, deltaDollars: delta };
  }).filter((d) => d.deltaDollars !== 0 || profile.spending.amounts[d.category] > 0);

  return {
    cardA,
    cardB,
    incrementalIfAddA: incrementalValueOfCard(cardA, profile, catalog),
    incrementalIfAddB: incrementalValueOfCard(cardB, profile, catalog),
    coverageAddsA,
    coverageAddsB,
    overlaps,
    ecosystemIntroA: ecoA,
    ecosystemIntroB: ecoB,
    categoryDeltas,
  };
}

export function cardEcosystemLabel(card: Card): string {
  return `${card.issuer} · ${cardCurrency(card)}`;
}
