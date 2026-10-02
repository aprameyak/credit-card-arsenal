import type {
  Card,
  ComplexityScore,
  FeeTolerance,
  PointValuation,
  SimulationDiff,
  SpendCategory,
  SpendingProfile,
  UserProfile,
} from "../types";
import { analyzeArsenal, computeWalletStats } from "./arsenal";
import { scoreWalletComplexity } from "./complexity";
import { listEcosystemsForWallet } from "./ecosystems";
import { getOwnedCardObjects } from "./spending";

export interface SimulateWalletOptions {
  addCardIds?: string[];
  removeCardIds?: string[];
  spendingOverride?: SpendingProfile;
  spendingOverrides?: Partial<Record<SpendCategory, number>>;
  valuationsOverride?: PointValuation[];
  feeToleranceOverride?: FeeTolerance;
}

function applySpendingOverrides(
  profile: UserProfile,
  opts: SimulateWalletOptions
): SpendingProfile {
  if (opts.spendingOverride) return opts.spendingOverride;
  if (!opts.spendingOverrides) return profile.spending;
  // Preserve the profile's spend mode so monthly inputs are not treated as annual.
  return {
    ...profile.spending,
    amounts: {
      ...profile.spending.amounts,
      ...opts.spendingOverrides,
    },
  };
}

function cloneProfile(
  profile: UserProfile,
  opts: SimulateWalletOptions
): UserProfile {
  const remove = new Set(opts.removeCardIds ?? []);
  const addIds = opts.addCardIds ?? [];
  let ownedCards = profile.ownedCards.filter((o) => !remove.has(o.cardId));
  for (const id of addIds) {
    if (ownedCards.some((o) => o.cardId === id)) continue;
    ownedCards = [
      ...ownedCards,
      {
        cardId: id,
        openedAt: null,
        annualFeePaid: null,
        creditLimit: null,
        benefitsUsed: {},
        welcomeBonusCompleted: false,
        welcomeBonusValueRealized: 0,
      },
    ];
  }
  return {
    ...profile,
    ownedCards,
    spending: applySpendingOverrides(profile, opts),
    valuations: opts.valuationsOverride ?? profile.valuations,
    feeTolerance: opts.feeToleranceOverride ?? profile.feeTolerance,
  };
}

function walletNet(
  profile: UserProfile,
  catalog: import("../types").Card[]
): number {
  return computeWalletStats(profile, catalog).netValue;
}

export function simulateWallet(
  profile: UserProfile,
  catalog: Card[],
  opts: SimulateWalletOptions = {}
): SimulationDiff {
  const beforeProfile = {
    ...profile,
    spending: applySpendingOverrides(profile, opts),
    valuations: opts.valuationsOverride ?? profile.valuations,
    feeTolerance: opts.feeToleranceOverride ?? profile.feeTolerance,
  };
  const afterProfile = cloneProfile(beforeProfile, opts);

  const beforeNet = walletNet(beforeProfile, catalog);
  const afterNet = walletNet(afterProfile, catalog);

  const beforeIds = beforeProfile.ownedCards.map((o) => o.cardId);
  const afterIds = afterProfile.ownedCards.map((o) => o.cardId);

  const beforeCards = getOwnedCardObjects(beforeProfile.ownedCards, catalog).map(
    (p) => p.card
  );
  const afterCards = getOwnedCardObjects(afterProfile.ownedCards, catalog).map(
    (p) => p.card
  );

  const beforeFees = analyzeArsenal(beforeProfile, catalog).annualFees;
  const afterFees = analyzeArsenal(afterProfile, catalog).annualFees;

  const complexityBefore: ComplexityScore = scoreWalletComplexity(beforeCards);
  const complexityAfter: ComplexityScore = scoreWalletComplexity(afterCards);

  return {
    beforeNet,
    afterNet,
    incrementalNet: afterNet - beforeNet,
    feeDelta: afterFees - beforeFees,
    cardCountBefore: beforeIds.length,
    cardCountAfter: afterIds.length,
    ecosystemsBefore: listEcosystemsForWallet(catalog, beforeIds),
    ecosystemsAfter: listEcosystemsForWallet(catalog, afterIds),
    complexityBefore,
    complexityAfter,
  };
}

