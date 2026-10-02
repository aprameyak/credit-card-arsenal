import type { FeeAnalysis, FeeRenewalAction, UserProfile } from "../types";
import { ALL_CATEGORIES, annualize } from "../utils";
import {
  estimateCategoryRewards,
  getOwnedCardObjects,
  optimizeSpending,
} from "./spending";

function pickRenewalAction(
  netOngoing: number,
  annualFee: number,
  creditsUsedRatio: number
): FeeRenewalAction {
  if (netOngoing >= annualFee * 0.5) return "keep";
  if (netOngoing >= 0) return "reassess_usage";
  if (annualFee >= 250) return "investigate_downgrade";
  return "compare_alternatives";
}

export function analyzeFeeRenewals(
  profile: UserProfile,
  catalog: import("../types").Card[]
): FeeAnalysis[] {
  const pairs = getOwnedCardObjects(profile.ownedCards, catalog).filter(
    ({ card }) => card.annualFee > 0
  );
  const ownedCards = pairs.map((p) => p.card);
  const { routing } = optimizeSpending(
    ownedCards,
    profile.spending,
    profile.valuations
  );
  const rewardsByCard = new Map<string, number>();
  for (const r of routing) {
    rewardsByCard.set(
      r.cardId,
      (rewardsByCard.get(r.cardId) ?? 0) + r.annualRewards
    );
  }

  return pairs.map(({ owned, card }) => {
    const creditsValue = card.credits.reduce((s, c) => s + c.annualValue, 0);
    const benefitsValue = card.benefits.reduce(
      (s, b) => s + b.estimatedAnnualValue,
      0
    );
    const rewardsValue = rewardsByCard.get(card.id) ?? 0;
    const welcomeBonusValue =
      card.welcomeOffer?.estimatedValue ??
      owned.welcomeBonusValueRealized ??
      0;

    const ongoingNet =
      rewardsValue + creditsValue * 0.5 + benefitsValue * 0.3 - card.annualFee;
    const firstYearNet = ongoingNet + welcomeBonusValue;

    const creditsUsed = Object.values(owned.benefitsUsed).reduce(
      (a, b) => a + b,
      0
    );
    const creditsUsedRatio =
      creditsValue > 0 ? Math.min(1, creditsUsed / creditsValue) : 0;

    const renewalAction = pickRenewalAction(
      ongoingNet,
      card.annualFee,
      creditsUsedRatio
    );

    const renewalNotes: string[] = [
      "Investigate downgrade or product-change options with your issuer — rules vary.",
      "Compare against a no-fee card in the same ecosystem before closing.",
    ];
    if (renewalAction === "keep") {
      renewalNotes.unshift(
        "Estimated ongoing value covers a meaningful share of the fee at your spend levels."
      );
    }
    if (renewalAction === "investigate_downgrade") {
      renewalNotes.unshift(
        "Premium fee with weak net at current usage — a lower-tier card may fit better."
      );
    }

    let maxCat = 0;
    for (const cat of ALL_CATEGORIES) {
      const spend = annualize(
        profile.spending.amounts[cat],
        profile.spending.mode
      );
      maxCat = Math.max(
        maxCat,
        estimateCategoryRewards(card, cat, spend, profile.valuations)
      );
    }

    return {
      cardId: card.id,
      cardName: card.cardName,
      annualFee: card.annualFee,
      rewardsValue: rewardsValue || maxCat,
      creditsValue,
      benefitsValue,
      firstYear: { netValue: firstYearNet, welcomeBonusValue },
      ongoing: { netValue: ongoingNet },
      renewalAction,
      renewalNotes,
    };
  });
}
