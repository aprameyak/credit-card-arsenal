import type {
  Card,
  CategoryCoverage,
  ExplanationBlock,
  UserProfile,
} from "../types";
import { formatCurrency, formatPercent, CATEGORY_LABELS } from "../utils";
import { incrementalValueOfCard } from "./arsenal";
import { analyzeWelcomeBonus } from "./welcome";
import { ecosystemSynergyNote } from "./ecosystems";
import { checkEligibility } from "./pathway";
import { categoryEffectiveRate } from "./spending";

export function explainCandidateCard(
  profile: UserProfile,
  catalog: Card[],
  card: Card
): ExplanationBlock[] {
  const blocks: ExplanationBlock[] = [];
  const incremental = incrementalValueOfCard(card, profile, catalog);
  const { eligible, reasons } = checkEligibility(card, profile, catalog);
  const welcome = card.welcomeOffer
    ? analyzeWelcomeBonus(
        {
          cardId: card.id,
          openedAt: new Date().toISOString().slice(0, 10),
          annualFeePaid: null,
          creditLimit: null,
          benefitsUsed: {},
          welcomeBonusCompleted: false,
          welcomeBonusValueRealized: 0,
        },
        profile,
        catalog
      )
    : null;

  blocks.push({
    id: `${card.id}-incremental`,
    title: "Estimated incremental value",
    body: eligible
      ? "Net change if this card joins your wallet and spend routes optimally."
      : "Eligibility issues may prevent applying; figures assume the card is in wallet.",
    figures: [
      { label: "Incremental net (ongoing est.)", value: formatCurrency(incremental) },
      { label: "Annual fee", value: formatCurrency(card.annualFee) },
    ],
    assumptions: [
      "Uses your point valuations and spending profile.",
      "Ongoing net excludes welcome bonus; see welcome block when shown.",
      "Includes catalog credit values unless you override on owned cards.",
    ],
  });

  if (welcome) {
    blocks.push({
      id: `${card.id}-welcome`,
      title: "Welcome bonus",
      body: welcome.completed
        ? "Welcome requirement appears complete."
        : `Requires $${welcome.spendRequirement} spend in ${card.welcomeOffer?.timeWindowMonths} months.`,
      figures: [
        {
          label: "Est. bonus value",
          value: formatCurrency(card.welcomeOffer?.estimatedValue ?? 0),
        },
        {
          label: "Projected natural spend",
          value: formatCurrency(welcome.projectedNaturalSpend),
        },
      ],
      assumptions: welcome.assumptions,
    });
  }

  const synergy = ecosystemSynergyNote(
    catalog,
    profile.ownedCards.map((o) => o.cardId),
    card
  );
  if (synergy) {
    blocks.push({
      id: `${card.id}-ecosystem`,
      title: "Ecosystem fit",
      body: synergy,
      figures: [],
      assumptions: [],
    });
  }

  blocks.push({
    id: `${card.id}-eligibility`,
    title: "Application notes",
    body: eligible ? "No blocking rules detected." : "Review before applying.",
    figures: [],
    assumptions: reasons,
  });

  return blocks;
}

export function explainGap(
  profile: UserProfile,
  catalog: Card[],
  gap: CategoryCoverage
): ExplanationBlock {
  const topCards = catalog
    .filter((c) => c.active)
    .map((card) => ({
      card,
      rate: categoryEffectiveRate(card, gap.category, profile.valuations),
    }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 3);

  return {
    id: `gap-${gap.category}`,
    title: `${CATEGORY_LABELS[gap.category]} coverage`,
    body: gap.gapReason,
    figures: [
      {
        label: "Your spend (annual)",
        value: formatCurrency(gap.annualSpend),
      },
      {
        label: "Best in wallet rate",
        value: formatPercent(gap.effectiveRate),
      },
      ...topCards.map(({ card, rate }) => ({
        label: `Catalog: ${card.cardName}`,
        value: formatPercent(rate),
      })),
    ],
    assumptions: [
      "Compares effective return after your point valuations.",
      gap.bestCardName
        ? `Current best owned: ${gap.bestCardName}`
        : "No owned card assigned for this category.",
    ],
  };
}
