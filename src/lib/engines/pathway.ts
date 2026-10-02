import type {
  Card,
  Pathway,
  PathwayStep,
  SpendCategory,
  UserProfile,
} from "../types";
import { CATEGORY_LABELS, monthsBetween } from "../utils";
import { getCardById } from "../cards/database";
import { incrementalValueOfCard, gapCategories, analyzeArsenal } from "./arsenal";

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
}

function countChase524(profile: UserProfile, catalog?: Card[]): number {
  const counted = new Set<string>();
  let n = 0;

  const consider = (cardId: string, at: string) => {
    if (counted.has(cardId)) return;
    const card = getCardById(cardId, catalog);
    if (!card || card.issuer !== "Chase") return;
    if (card.businessOrPersonal === "business") return;
    if (monthsBetween(at) >= 24) return;
    counted.add(cardId);
    n += 1;
  };

  for (const entry of profile.applicationHistory) {
    if (entry.outcome !== "approved") continue;
    consider(entry.cardId, entry.appliedAt);
  }
  for (const owned of profile.ownedCards) {
    if (!owned.openedAt) continue;
    consider(owned.cardId, owned.openedAt);
  }
  return n;
}

export function checkEligibility(
  card: Card,
  profile: UserProfile,
  catalog?: Card[]
): EligibilityResult {
  const reasons: string[] = [];
  let eligible = true;

  for (const rule of card.applicationRules) {
    if (rule.ruleKey === "5_24" && card.issuer === "Chase") {
      const count = countChase524(profile, catalog);
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
        const c = getCardById(o.cardId, catalog);
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
          (getCardById(h.cardId, catalog)?.productFamily === card.productFamily &&
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

function emptyOwned(cardId: string) {
  return {
    cardId,
    openedAt: null,
    annualFeePaid: null,
    creditLimit: null,
    benefitsUsed: {},
    welcomeBonusCompleted: false,
    welcomeBonusValueRealized: 0,
  };
}

function stepForCard(
  card: Card,
  profile: UserProfile,
  catalog: Card[],
  fills: SpendCategory[],
  reason: string
): PathwayStep | null {
  const { eligible, reasons } = checkEligibility(card, profile, catalog);
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

/** Recompute step values sequentially so overlapping spend is not double-counted. */
function sequentializeSteps(
  steps: PathwayStep[],
  profile: UserProfile,
  catalog: Card[]
): PathwayStep[] {
  const seen = new Set<string>();
  let simulated = profile;
  const out: PathwayStep[] = [];

  for (const step of steps) {
    if (seen.has(step.cardId)) continue;
    seen.add(step.cardId);
    const card = catalog.find((c) => c.id === step.cardId);
    if (!card) continue;
    const { eligible, reasons } = checkEligibility(card, simulated, catalog);
    if (!eligible) continue;
    const incrementalValue = incrementalValueOfCard(card, simulated, catalog);
    out.push({
      ...step,
      incrementalValue,
      applicationNotes: reasons,
    });
    simulated = {
      ...simulated,
      ownedCards: [...simulated.ownedCards, emptyOwned(card.id)],
    };
  }
  return out;
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

  const gapFillRaw: PathwayStep[] = [];
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
    if (step) gapFillRaw.push(step);
  }

  const cashbackRaw: PathwayStep[] = [];
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
    if (step) cashbackRaw.push(step);
  }

  const flexRaw: PathwayStep[] = [];
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
    if (step) flexRaw.push(step);
  }

  const travelRaw: PathwayStep[] = [];
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
    if (step) travelRaw.push(step);
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

  const gapFillSteps = sequentializeSteps(gapFillRaw, profile, catalog);
  const cashbackSteps = sequentializeSteps(cashbackRaw, profile, catalog);
  const flexSteps = sequentializeSteps(flexRaw, profile, catalog);
  const travelSteps = sequentializeSteps(travelRaw, profile, catalog);

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
