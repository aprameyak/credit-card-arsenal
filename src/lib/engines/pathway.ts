import type {
  Card,
  Pathway,
  PathwayStep,
  SpendCategory,
  UserProfile,
} from "../types";
import {
  categoryEffectiveRate,
  estimateRewardsForCategory,
  getOwnedCardObjects,
} from "./spending";
import { CATEGORY_LABELS, monthsBetween } from "../utils";
import { getCardById } from "../cards/database";
import { incrementalValueOfCard, gapCategories, analyzeArsenal } from "./arsenal";

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
}

function countChase524(profile: UserProfile): number {
  let n = 0;
  for (const entry of profile.applicationHistory) {
    if (entry.outcome !== "approved") continue;
    const card = getCardById(entry.cardId);
    if (!card || card.issuer !== "Chase") continue;
    if (card.businessOrPersonal === "business") continue;
    if (monthsBetween(entry.appliedAt) < 24) n += 1;
  }
  for (const owned of profile.ownedCards) {
    if (!owned.openedAt) continue;
    const card = getCardById(owned.cardId);
    if (!card || card.issuer !== "Chase") continue;
    if (card.businessOrPersonal === "business") continue;
    if (monthsBetween(owned.openedAt) < 24) n += 1;
  }
  return n;
}

export function checkEligibility(
  card: Card,
  profile: UserProfile
): EligibilityResult {
  const reasons: string[] = [];
  let eligible = true;

  for (const rule of card.applicationRules) {
    if (rule.ruleKey === "5_24" && card.issuer === "Chase") {
      const count = countChase524(profile);
      if (count >= 5) {
        eligible = false;
        reasons.push(
          `Likely over Chase 5/24 (${count} personal cards in 24 months).`
        );
      } else {
        reasons.push(`Chase 5/24: ${count}/5 personal cards in 24 months.`);
      }
    }
    if (rule.ruleKey === "one_sapphire") {
      const hasSapphire = profile.ownedCards.some((o) => {
        const c = getCardById(o.cardId);
        return c?.productFamily === "sapphire";
      });
      if (hasSapphire && card.productFamily === "sapphire") {
        eligible = false;
        reasons.push("Already hold a Chase Sapphire card.");
      }
    }
    if (rule.ruleKey === "welcome_once" && card.issuer === "American Express") {
      const prior = profile.applicationHistory.some(
        (h) =>
          h.cardId === card.id ||
          (getCardById(h.cardId)?.productFamily === card.productFamily &&
            h.outcome === "approved")
      );
      if (prior) {
        eligible = false;
        reasons.push("Amex welcome offer may be unavailable (prior approval).");
      }
    }
  }

  if (card.businessOrPersonal === "business" && !profile.businessInterest) {
    reasons.push("Business card — confirm business eligibility.");
  }

  if (eligible && reasons.length === 0) {
    reasons.push("No known issuer rule conflicts.");
  }

  return { eligible, reasons };
}

function ownedSet(profile: UserProfile): Set<string> {
  return new Set(profile.ownedCards.map((o) => o.cardId));
}

function stepForCard(
  card: Card,
  profile: UserProfile,
  catalog: Card[],
  fills: SpendCategory[],
  reason: string
): PathwayStep | null {
  const { eligible, reasons } = checkEligibility(card, profile);
  if (!eligible) return null;
  const incrementalValue = incrementalValueOfCard(card, profile, catalog);
  return {
    cardId: card.id,
    cardName: card.cardName,
    reason,
    incrementalValue,
    annualFee: card.annualFee,
    fillsGaps: fills,
    applicationNotes: reasons,
  };
}

export interface PurchaseRouteResult {
  category: SpendCategory;
  cardId: string;
  cardName: string;
  effectiveRate: number;
  estimatedReward: number;
  assumptions: string[];
}

export function routePurchase(
  profile: UserProfile,
  catalog: Card[],
  category: SpendCategory,
  amount: number
): PurchaseRouteResult | null {
  const cards = getOwnedCardObjects(profile.ownedCards, catalog).map(
    (p) => p.card
  );
  if (cards.length === 0) return null;

  let best: PurchaseRouteResult | null = null;

  for (const card of cards) {
    const { rewards, assumptions } = estimateRewardsForCategory(
      card,
      category,
      amount,
      profile.valuations
    );
    if (!best || rewards > best.estimatedReward) {
      best = {
        category,
        cardId: card.id,
        cardName: card.cardName,
        effectiveRate: categoryEffectiveRate(card, category, profile.valuations),
        estimatedReward: rewards,
        assumptions,
      };
    }
  }

  return best;
}

export function buildPathways(
  profile: UserProfile,
  catalog: Card[]
): Pathway[] {
  const analysis = analyzeArsenal(profile, catalog);
  const gaps = gapCategories(analysis.coverage);
  const owned = ownedSet(profile);
  const candidates = catalog.filter(
    (c) => c.active && !owned.has(c.id)
  );

  const gapFillSteps: PathwayStep[] = [];
  for (const g of gaps.slice(0, 4)) {
    const ranked = candidates
      .map((card) => ({
        card,
        value: incrementalValueOfCard(card, profile, catalog),
      }))
      .filter(({ card }) =>
        card.categoryRewards.some((r) => r.category === g.category)
      )
      .sort((a, b) => b.value - a.value);
    const top = ranked[0]?.card;
    if (!top) continue;
    const step = stepForCard(
      top,
      profile,
      catalog,
      [g.category],
      `Fill ${CATEGORY_LABELS[g.category]} gap (${g.gapReason})`
    );
    if (step) gapFillSteps.push(step);
  }

  const cashbackSteps: PathwayStep[] = [];
  const cashbackCards = candidates
    .filter((c) => c.tags.includes("cashback") || c.rewardCurrency === "USD")
    .sort(
      (a, b) =>
        incrementalValueOfCard(b, profile, catalog) -
        incrementalValueOfCard(a, profile, catalog)
    );
  for (const card of cashbackCards.slice(0, 3)) {
    const step = stepForCard(
      card,
      profile,
      catalog,
      [],
      "Straightforward cash back with low complexity"
    );
    if (step) cashbackSteps.push(step);
  }

  const flexSteps: PathwayStep[] = [];
  const flexCards = candidates
    .filter((c) => c.tags.includes("flexible_points"))
    .sort(
      (a, b) =>
        incrementalValueOfCard(b, profile, catalog) -
        incrementalValueOfCard(a, profile, catalog)
    );
  for (const card of flexCards.slice(0, 3)) {
    const step = stepForCard(
      card,
      profile,
      catalog,
      ["travel"],
      "Flexible transferable points for future travel"
    );
    if (step) flexSteps.push(step);
  }

  const travelSteps: PathwayStep[] = [];
  const travelCards = candidates
    .filter((c) => c.tags.includes("travel") || c.hasLounge)
    .sort(
      (a, b) =>
        incrementalValueOfCard(b, profile, catalog) -
        incrementalValueOfCard(a, profile, catalog)
    );
  for (const card of travelCards.slice(0, 2)) {
    const step = stepForCard(
      card,
      profile,
      catalog,
      ["flights", "hotels"],
      "Premium travel perks and elevated travel earn"
    );
    if (step) travelSteps.push(step);
  }

  function pathwayTotal(steps: PathwayStep[]) {
    return steps.reduce((s, st) => s + st.incrementalValue, 0);
  }

  function rolesFromSteps(steps: PathwayStep[]): Record<string, string> {
    const roles: Record<string, string> = {};
    for (const st of steps) {
      for (const cat of st.fillsGaps) {
        roles[cat] = st.cardName;
      }
    }
    return roles;
  }

  return [
    {
      id: "gap_fill",
      name: "Fill category gaps",
      description: "Target the weakest spend categories first.",
      steps: gapFillSteps,
      targetRoles: rolesFromSteps(gapFillSteps),
      estimatedNetValue: pathwayTotal(gapFillSteps),
      totalFees: gapFillSteps.reduce((s, st) => s + st.annualFee, 0),
      complexity: gapFillSteps.some((s) => s.annualFee > 200)
        ? "moderate"
        : "simple",
    },
    {
      id: "cashback",
      name: "Cash back pathway",
      description: "Simple, fee-light cards with strong cash earn.",
      steps: cashbackSteps,
      targetRoles: rolesFromSteps(cashbackSteps),
      estimatedNetValue: pathwayTotal(cashbackSteps),
      totalFees: cashbackSteps.reduce((s, st) => s + st.annualFee, 0),
      complexity: "simple",
    },
    {
      id: "flexible_points",
      name: "Flexible points",
      description: "Build transferable points for airlines and hotels.",
      steps: flexSteps,
      targetRoles: rolesFromSteps(flexSteps),
      estimatedNetValue: pathwayTotal(flexSteps),
      totalFees: flexSteps.reduce((s, st) => s + st.annualFee, 0),
      complexity: "moderate",
    },
    {
      id: "travel",
      name: "Travel alternative",
      description: "Premium travel cards if you want lounges and credits.",
      steps: travelSteps,
      targetRoles: rolesFromSteps(travelSteps),
      estimatedNetValue: pathwayTotal(travelSteps),
      totalFees: travelSteps.reduce((s, st) => s + st.annualFee, 0),
      complexity: "advanced",
    },
  ];
}

export const generatePathways = buildPathways;
