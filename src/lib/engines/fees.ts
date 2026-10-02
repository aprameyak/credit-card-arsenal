import type {
  Card,
  FeeAnalysis,
  FeeRenewalAction,
  OwnedCard,
  UserProfile,
} from "../types";
import { getOwnedCardObjects, optimizeSpending } from "./spending";
import { analyzeWelcomeBonus } from "./welcome";

function userCreditValue(card: Card, owned?: OwnedCard): number {
  return card.credits.reduce((sum, cr) => {
    const used = owned?.benefitsUsed[cr.id];
    if (used != null) return sum + Math.min(used, cr.annualValue);
    const status = owned?.benefitStatuses?.[cr.id];
    if (status === "not_valuable") return sum;
    if (status === "unused") return sum;
    if (status === "partial" && owned?.benefitUserValues?.[cr.id] != null) {
      return sum + owned.benefitUserValues[cr.id]!;
    }
    if (owned?.benefitUserValues?.[cr.id] != null) {
      return sum + owned.benefitUserValues[cr.id]!;
    }
    return sum + cr.annualValue;
  }, 0);
}

function userBenefitsValue(card: Card, owned?: OwnedCard): number {
  return card.benefits.reduce((sum, b) => {
    const custom = owned?.benefitUserValues?.[b.id];
    if (custom != null) return sum + custom;
    const status = owned?.benefitStatuses?.[b.id];
    if (status === "not_valuable" || status === "unused") return sum;
    if (status === "partial" && custom != null) return sum + custom;
    return sum + b.estimatedAnnualValue;
  }, 0);
}

function renewalActionForNet(
  netOngoing: number,
  fee: number
): { action: FeeRenewalAction; notes: string[] } {
  const notes: string[] = [];
  if (netOngoing >= 0) {
    notes.push("Ongoing rewards and credits cover the annual fee at your usage assumptions.");
    return { action: "keep", notes };
  }
  const gap = Math.abs(netOngoing);
  notes.push(
    `Ongoing net is about -$${Math.round(gap)}/yr after fee — review whether credits and earn match your habits.`
  );
  if (fee >= 250) {
    notes.push("Consider a lower-tier product in the same family if perks are unused.");
    return { action: "investigate_downgrade", notes };
  }
  if (gap > fee * 0.5) {
    notes.push("Compare against a no-fee or lower-fee card for your spend mix.");
    return { action: "compare_alternatives", notes };
  }
  notes.push("Reassess benefit usage before your next renewal — adjust tracked credit values if needed.");
  return { action: "reassess_usage", notes };
}

export function analyzeCardFees(
  profile: UserProfile,
  card: Card,
  owned?: OwnedCard
): FeeAnalysis {
  const soloRewards = optimizeSpending(
    [card],
    profile.spending,
    profile.valuations
  ).totalRewards;

  const rewardsValue = soloRewards;
  const creditsValue = userCreditValue(card, owned);
  const benefitsValue = userBenefitsValue(card, owned);

  const welcome = owned
    ? analyzeWelcomeBonus(owned, profile)
    : null;
  const welcomeBonusValue =
    welcome && !welcome.completed
      ? (card.welcomeOffer?.estimatedValue ?? 0)
      : owned?.welcomeBonusValueRealized ?? 0;

  const fee = card.annualFee;
  const ongoingNet = rewardsValue + creditsValue + benefitsValue - fee;
  const firstYearNet =
    ongoingNet + (card.welcomeOffer && !owned?.welcomeBonusCompleted
      ? card.welcomeOffer.estimatedValue
      : 0);

  const { action, notes } = renewalActionForNet(ongoingNet, fee);
  notes.push("We never recommend closing accounts here — focus on product changes or usage adjustments.");

  return {
    cardId: card.id,
    cardName: card.cardName,
    annualFee: fee,
    rewardsValue,
    creditsValue,
    benefitsValue,
    firstYear: {
      netValue: firstYearNet,
      welcomeBonusValue,
    },
    ongoing: {
      netValue: ongoingNet,
    },
    renewalAction: action,
    renewalNotes: notes,
  };
}

export function analyzeRenewals(
  profile: UserProfile,
  catalog: Card[]
): FeeAnalysis[] {
  return getOwnedCardObjects(profile.ownedCards, catalog).map(({ card, owned }) =>
    analyzeCardFees(profile, card, owned)
  );
}
