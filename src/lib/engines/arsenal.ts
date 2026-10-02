import type {
  Card,
  CategoryCoverage,
  Complexity,
  RoutingResult,
  SpendCategory,
  UserProfile,
  WalletConfig,
} from "../types";
import {
  ALL_CATEGORIES,
  CATEGORY_LABELS,
  PRIMARY_CATEGORIES,
  annualize,
} from "../utils";
import {
  estimateCategoryRewards,
  getOwnedCardObjects,
  optimizeSpending,
  optimizedStrategyValue,
  currentStrategyValue,
} from "./spending";

export interface ArsenalInsight {
  id: string;
  severity: "info" | "warning" | "opportunity";
  title: string;
  body: string;
}

export interface ArsenalAnalysis {
  roles: Record<string, string>;
  insights: ArsenalInsight[];
  coverage: CategoryCoverage[];
  currentAnnualRewards: number;
  optimizedAnnualRewards: number;
  annualFees: number;
  netOptimizedValue: number;
}

const COMPLEXITY_RANK: Record<Complexity, number> = {
  simple: 0,
  moderate: 1,
  advanced: 2,
};

function cardAllowed(card: Card, max: Complexity): boolean {
  return COMPLEXITY_RANK[card.complexity] <= COMPLEXITY_RANK[max];
}

function annualFeesForCards(cards: Card[]): number {
  return cards.reduce((s, c) => s + c.annualFee, 0);
}

function creditsValue(
  cards: Card[],
  ownedById?: Map<string, import("../types").OwnedCard>
): number {
  return cards.reduce((s, c) => {
    const owned = ownedById?.get(c.id);
    return (
      s +
      c.credits.reduce((a, cr) => {
        if (!owned) return a + cr.annualValue;
        const used = owned.benefitsUsed[cr.id];
        if (used != null) return a + Math.min(used, cr.annualValue);
        const status = owned.benefitStatuses?.[cr.id];
        if (status === "not_valuable" || status === "unused") return a;
        if (owned.benefitUserValues?.[cr.id] != null) {
          return a + owned.benefitUserValues[cr.id]!;
        }
        return a + cr.annualValue;
      }, 0)
    );
  }, 0);
}

export function gapCategories(
  coverage: CategoryCoverage[]
): CategoryCoverage[] {
  return coverage.filter(
    (c) => c.gap === "gap" && c.annualSpend > 0
  );
}

export function analyzeArsenal(
  profile: UserProfile,
  catalog: Card[]
): ArsenalAnalysis {
  const pairs = getOwnedCardObjects(profile.ownedCards, catalog);
  const cards = pairs.map((p) => p.card);
  const { routing } = optimizeSpending(cards, profile.spending, profile.valuations);
  const routingByCat = new Map(routing.map((r) => [r.category, r]));

  const roles: Record<string, string> = {};
  for (const r of routing) {
    roles[r.category] = r.cardName;
  }
  for (const p of pairs) {
    if (p.owned.assignedRole) {
      roles[p.owned.assignedRole] = p.card.cardName;
    }
  }

  const coverage: CategoryCoverage[] = ALL_CATEGORIES.map((category) => {
    const annualSpend = annualize(
      profile.spending.amounts[category],
      profile.spending.mode
    );
    const best = routingByCat.get(category);
    const rate = best?.effectiveRate ?? 0;
    const estimatedAnnualRewards = best?.annualRewards ?? 0;

    let gap: CategoryCoverage["gap"] = "none";
    let gapReason = "No spend in this category";
    if (annualSpend > 0) {
      if (rate >= 0.04) {
        gap = "strong";
        gapReason = "High effective return on current wallet";
      } else if (rate >= 0.02) {
        gap = "adequate";
        gapReason = "Reasonable coverage";
      } else {
        gap = "gap";
        gapReason = "Low return vs. available category bonuses";
      }
    }

    return {
      category,
      bestCardId: best?.cardId ?? null,
      bestCardName: best?.cardName ?? null,
      effectiveRate: rate,
      annualSpend,
      estimatedAnnualRewards,
      gap,
      gapReason,
    };
  });

  const insights: ArsenalInsight[] = [];
  const gaps = gapCategories(coverage);
  if (gaps.length > 0) {
    insights.push({
      id: "coverage-gaps",
      severity: "opportunity",
      title: "Category gaps detected",
      body: `Consider boosting rewards on ${gaps
        .slice(0, 3)
        .map((g) => CATEGORY_LABELS[g.category])
        .join(", ")}.`,
    });
  }

  const current = currentStrategyValue(
    profile.ownedCards,
    catalog,
    profile.spending,
    profile.valuations
  );
  const optimized = optimizedStrategyValue(
    profile.ownedCards,
    catalog,
    profile.spending,
    profile.valuations
  );
  if (optimized > current + 50) {
    insights.push({
      id: "routing-drift",
      severity: "info",
      title: "Wallet routing can improve",
      body: `Reassigning spend to the best owned card could add about $${Math.round(optimized - current)}/yr.`,
    });
  }

  if (cards.length === 0) {
    insights.push({
      id: "empty-wallet",
      severity: "warning",
      title: "No cards in wallet",
      body: "Add your cards to analyze coverage and pathways.",
    });
  }

  const fees = annualFeesForCards(cards);
  const ownedById = new Map(pairs.map((p) => [p.card.id, p.owned]));
  const credits = creditsValue(cards, ownedById);

  return {
    roles,
    insights,
    coverage,
    currentAnnualRewards: current,
    optimizedAnnualRewards: optimized,
    annualFees: fees,
    netOptimizedValue: optimized + credits - fees,
  };
}

export function incrementalValueOfCard(
  card: Card,
  profile: UserProfile,
  catalog: Card[]
): number {
  const ownedIds = new Set(profile.ownedCards.map((o) => o.cardId));
  if (ownedIds.has(card.id)) return 0;

  const currentCards = getOwnedCardObjects(profile.ownedCards, catalog).map(
    (p) => p.card
  );
  const withCard = [...currentCards, card];
  const before = optimizeSpending(
    currentCards,
    profile.spending,
    profile.valuations
  ).totalRewards;
  const after = optimizeSpending(
    withCard,
    profile.spending,
    profile.valuations
  ).totalRewards;
  const feeDelta = card.annualFee;
  const creditDelta = card.credits.reduce((s, c) => s + c.annualValue, 0);
  return after - before + creditDelta - feeDelta;
}

function buildWalletConfig(
  id: string,
  name: string,
  description: string,
  cardIds: string[],
  catalog: Card[],
  profile: UserProfile
): WalletConfig {
  const cards = cardIds
    .map((cid) => catalog.find((c) => c.id === cid))
    .filter((c): c is Card => c != null);
  const { routing, totalRewards } = optimizeSpending(
    cards,
    profile.spending,
    profile.valuations
  );
  const roles: Record<string, string> = {};
  for (const r of routing) {
    roles[r.category] = r.cardName;
  }
  const fees = annualFeesForCards(cards);
  const credits = creditsValue(cards);
  const complexity = cards.reduce<Complexity>(
    (max, c) =>
      COMPLEXITY_RANK[c.complexity] > COMPLEXITY_RANK[max]
        ? c.complexity
        : max,
    "simple"
  );
  return {
    id,
    name,
    description,
    cardIds,
    estimatedAnnualRewards: totalRewards,
    annualFees: fees,
    netValue: totalRewards + credits - fees,
    complexity,
    roles,
  };
}

function pickBestForCategory(
  category: SpendCategory,
  candidates: Card[],
  profile: UserProfile
): Card | null {
  const annualSpend = annualize(
    profile.spending.amounts[category],
    profile.spending.mode
  );
  if (annualSpend <= 0) return null;
  let best: Card | null = null;
  let bestVal = -1;
  for (const card of candidates) {
    const val = estimateCategoryRewards(
      card,
      category,
      annualSpend,
      profile.valuations
    );
    if (val > bestVal) {
      bestVal = val;
      best = card;
    }
  }
  return best;
}

export interface WalletStats {
  totalRewards: number;
  totalFees: number;
  creditValue: number;
  netValue: number;
}

export function computeWalletStats(
  profile: UserProfile,
  catalog: Card[]
): WalletStats {
  const analysis = analyzeArsenal(profile, catalog);
  const creditValue =
    analysis.netOptimizedValue -
    analysis.optimizedAnnualRewards +
    analysis.annualFees;
  return {
    totalRewards: analysis.optimizedAnnualRewards,
    totalFees: analysis.annualFees,
    creditValue,
    netValue: analysis.netOptimizedValue,
  };
}

export function computeRouting(
  profile: UserProfile,
  catalog: Card[]
): RoutingResult[] {
  const cards = getOwnedCardObjects(profile.ownedCards, catalog).map((p) => p.card);
  return optimizeSpending(cards, profile.spending, profile.valuations).routing;
}

export function diminishingReturnsNote(
  profile: UserProfile,
  catalog: Card[]
): string {
  const wallets = proposeTargetWallets(profile, catalog);
  const optimized = wallets.find((w) => w.id === "optimized");
  const simple = wallets.find((w) => w.id === "simple");
  if (!optimized || !simple) {
    return "Add spend and cards to compare simple vs. optimized wallets.";
  }
  const delta = optimized.netValue - simple.netValue;
  const extraCards = optimized.cardIds.length - simple.cardIds.length;
  if (extraCards <= 0 || delta <= 25) {
    return "A lean wallet is close to your optimized stack — extra cards may not be worth the complexity.";
  }
  return `Moving from the simple to optimized target adds about $${Math.round(delta)}/yr net with ${extraCards} more card(s). Past that, each additional premium card usually adds less marginal value once category gaps are filled.`;
}

export function proposeTargetWallets(
  profile: UserProfile,
  catalog: Card[]
): WalletConfig[] {
  const maxCx = profile.desiredComplexity;
  const active = catalog.filter((c) => c.active && cardAllowed(c, maxCx));

  const simplePool = active.filter(
    (c) =>
      c.complexity === "simple" &&
      (c.annualFee === 0 || profile.feeTolerance !== "none")
  );
  const cashbackPool = active.filter(
    (c) => c.tags.includes("cashback") || c.rewardCurrency === "USD"
  );
  const travelPool = active.filter(
    (c) => c.tags.includes("travel") || c.tags.includes("flexible_points")
  );

  const simpleIds: string[] = [];
  const flat =
    pickBestForCategory("other", simplePool, profile) ??
    simplePool.find((c) => c.id === "wells-active-cash") ??
    simplePool.find((c) => c.id === "citi-double-cash");
  if (flat) simpleIds.push(flat.id);
  const dining = pickBestForCategory("dining", simplePool, profile);
  if (dining && dining.id !== flat?.id) simpleIds.push(dining.id);

  const optimizedIds = new Set<string>();
  for (const cat of PRIMARY_CATEGORIES) {
    const best = pickBestForCategory(cat, active, profile);
    if (best) optimizedIds.add(best.id);
  }
  if (optimizedIds.size === 0 && flat) optimizedIds.add(flat.id);

  const premiumIds = new Set<string>();
  const premiumCandidates = travelPool
    .filter((c) => cardAllowed(c, maxCx === "simple" ? "moderate" : maxCx))
    .filter((c) => {
      if (profile.feeTolerance === "none") return c.annualFee === 0;
      if (profile.feeTolerance === "low") return c.annualFee <= 95;
      return true;
    });
  for (const cat of ["travel", "flights", "hotels", "dining"] as SpendCategory[]) {
    const best = pickBestForCategory(cat, premiumCandidates, profile);
    if (best) premiumIds.add(best.id);
  }
  const catchall = pickBestForCategory("other", premiumCandidates, profile);
  if (catchall) premiumIds.add(catchall.id);

  const cashbackIds = new Set<string>();
  for (const cat of PRIMARY_CATEGORIES) {
    const best = pickBestForCategory(
      cat,
      cashbackPool.filter((c) => cardAllowed(c, maxCx)),
      profile
    );
    if (best) cashbackIds.add(best.id);
  }

  if (profile.desiredComplexity === "simple") {
    while (optimizedIds.size > 3) {
      const arr = [...optimizedIds];
      optimizedIds.delete(arr[arr.length - 1]!);
    }
    while (premiumIds.size > 2) {
      const arr = [...premiumIds];
      premiumIds.delete(arr[arr.length - 1]!);
    }
  }

  return [
    buildWalletConfig(
      "simple",
      "Simple wallet",
      "One flat-rate card plus a category booster — minimal mental overhead.",
      [...new Set(simpleIds)],
      catalog,
      profile
    ),
    buildWalletConfig(
      "optimized",
      "Optimized for your spend",
      "Best owned-eligible cards per category within your complexity comfort.",
      [...optimizedIds],
      catalog,
      profile
    ),
    buildWalletConfig(
      "premium_travel",
      "Premium travel",
      "Travel-forward stack with transfer partners (respects fee tolerance).",
      [...premiumIds],
      catalog,
      profile
    ),
    buildWalletConfig(
      "cashback",
      "Cash back focus",
      "Maximize straightforward cash back without points transfers.",
      [...cashbackIds],
      catalog,
      profile
    ),
  ];
}
