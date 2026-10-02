import type { Card, OptimizationResult, UserProfile } from "../types";
import { VALUATION_ASSUMPTIONS } from "./valuation";
import {
  analyzeArsenal,
  computeRouting,
  gapCategories,
  incrementalValueOfCard,
  proposeTargetWallets,
} from "./arsenal";
import { buildPathways, checkEligibility } from "./pathway";
import { scoreWalletComplexity } from "./complexity";
import { getOwnedCardObjects } from "./spending";
import { analyzeRenewals } from "./fees";
import { explainCandidateCard, explainGap } from "./explain";

const COMPLEXITY_PENALTY: Record<string, number> = {
  low: 0,
  moderate: 25,
  high: 60,
  very_high: 100,
};

function firstYearWelcomeTotal(profile: UserProfile, catalog: Card[]): number {
  return getOwnedCardObjects(profile.ownedCards, catalog).reduce(
    (sum, { card, owned }) => {
      if (owned.welcomeBonusCompleted) return sum;
      return sum + (card.welcomeOffer?.estimatedValue ?? 0);
    },
    0
  );
}

export function runOptimization(
  profile: UserProfile,
  catalog: Card[]
): OptimizationResult {
  const analysis = analyzeArsenal(profile, catalog);
  const gaps = gapCategories(analysis.coverage);
  const ownedIds = new Set(profile.ownedCards.map((o) => o.cardId));

  const candidates = catalog
    .filter((c) => c.active && !ownedIds.has(c.id))
    .map((card) => {
      const { eligible, reasons } = checkEligibility(card, profile, catalog);
      const incremental = incrementalValueOfCard(card, profile, catalog);
      const welcomeValue = card.welcomeOffer?.estimatedValue ?? 0;
      const firstYearIncremental = incremental + (eligible ? welcomeValue : 0);
      return {
        cardId: card.id,
        cardName: card.cardName,
        incrementalValue: incremental,
        firstYearIncremental,
        ongoingIncremental: incremental,
        eligible,
        eligibilityNotes: reasons,
      };
    })
    .sort((a, b) => b.firstYearIncremental - a.firstYearIncremental);

  const wallets = proposeTargetWallets(profile, catalog);
  const pathways = buildPathways(profile, catalog);

  const ownedCards = getOwnedCardObjects(profile.ownedCards, catalog).map(
    (p) => p.card
  );
  const complexityScore = scoreWalletComplexity(ownedCards);

  const renewals = analyzeRenewals(profile, catalog);
  const ongoingNet = analysis.netOptimizedValue;
  const welcomeBoost = firstYearWelcomeTotal(profile, catalog);
  const firstYearNet = ongoingNet + welcomeBoost;

  const penalty = COMPLEXITY_PENALTY[complexityScore.label] ?? 0;
  const adjustedFirstYear = firstYearNet - penalty * 0.1;
  const adjustedOngoing = ongoingNet - penalty * 0.15;

  const warnings: string[] = [];
  if (complexityScore.label === "high" || complexityScore.label === "very_high") {
    warnings.push(
      "Wallet complexity is elevated — marginal cards may not justify tracking overhead."
    );
  }
  for (const r of renewals) {
    if (r.ongoing.netValue < 0) {
      warnings.push(
        `${r.cardName} ongoing net is negative at current assumptions — see renewal review.`
      );
    }
  }

  const assumptions = [
    VALUATION_ASSUMPTIONS,
    "Incremental candidate values include fees and catalog credits.",
    `Complexity label "${complexityScore.label}" applies a small scoring penalty (display nets: first year ~$${Math.round(adjustedFirstYear)}, ongoing ~$${Math.round(adjustedOngoing)}).`,
  ];

  const explanations = [
    ...gaps.slice(0, 3).map((g) => explainGap(profile, catalog, g)),
    ...candidates
      .slice(0, 2)
      .flatMap((c) => {
        const card = catalog.find((x) => x.id === c.cardId);
        return card ? explainCandidateCard(profile, catalog, card) : [];
      })
      .slice(0, 4),
  ];

  return {
    currentWalletValue: analysis.netOptimizedValue,
    optimizedSpendingAllocation: computeRouting(profile, catalog),
    coverageGaps: gaps,
    candidateCards: candidates.slice(0, 12),
    possibleTargetWallets: wallets,
    possiblePathways: pathways,
    warnings,
    assumptions,
    firstYearNet: adjustedFirstYear,
    ongoingNet: adjustedOngoing,
    complexityScore,
    explanations,
  };
}
