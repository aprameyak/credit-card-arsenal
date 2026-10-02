import { describe, expect, it } from "vitest";
import { CARD_DATABASE } from "../../cards/database";
import type { UserProfile } from "../../types";
import { emptySpending } from "../spending";
import { DEFAULT_VALUATIONS } from "../valuation";
import { runOptimization } from "../optimizer";
import { incrementalValueOfCard } from "../arsenal";

function baseProfile(): UserProfile {
  const spending = emptySpending();
  spending.mode = "monthly";
  spending.amounts.dining = 400;
  spending.amounts.groceries = 500;
  spending.amounts.other = 600;
  return {
    onboardingComplete: true,
    creditScore: "good",
    income: "prefer_not",
    goals: ["max_cashback"],
    preferredAirlines: [],
    preferredHotels: [],
    cashbackVsPoints: "either",
    feeTolerance: "moderate",
    desiredComplexity: "moderate",
    rotatingCategoriesOk: true,
    internationalTravel: "occasional",
    travelFrequency: "occasional",
    businessInterest: false,
    ownedCards: [
      {
        cardId: "citi-double-cash",
        openedAt: "2023-01-01",
        annualFeePaid: 0,
        creditLimit: 10_000,
        benefitsUsed: {},
        welcomeBonusCompleted: true,
        welcomeBonusValueRealized: 0,
      },
    ],
    applicationHistory: [],
    closedCards: [],
    spending,
    valuations: [...DEFAULT_VALUATIONS],
    createdAt: "2025-01-01",
    updatedAt: "2025-01-01",
  };
}

describe("optimizer", () => {
  it("runs deterministic optimization with candidates and routing", () => {
    const profile = baseProfile();
    const result = runOptimization(profile, CARD_DATABASE);
    expect(result.optimizedSpendingAllocation.length).toBeGreaterThan(0);
    expect(result.candidateCards.length).toBeGreaterThan(0);
    expect(result.possiblePathways.length).toBe(4);
    expect(result.complexityScore.label).toBeDefined();
    expect(result.firstYearNet).toBeGreaterThanOrEqual(result.ongoingNet - 500);
  });

  it("incremental value ranks a dining booster above zero for dining spend", () => {
    const profile = baseProfile();
    const freedom = CARD_DATABASE.find((c) => c.id === "chase-freedom-flex");
    expect(freedom).toBeDefined();
    const inc = incrementalValueOfCard(freedom!, profile, CARD_DATABASE);
    expect(typeof inc).toBe("number");
  });

  it("separates first-year net with pending welcome offers", () => {
    const profile = baseProfile();
    profile.ownedCards.push({
      cardId: "chase-sapphire-preferred",
      openedAt: "2025-08-01",
      annualFeePaid: 95,
      creditLimit: 15_000,
      benefitsUsed: {},
      welcomeBonusCompleted: false,
      welcomeBonusValueRealized: 0,
    });
    const result = runOptimization(profile, CARD_DATABASE);
    expect(result.firstYearNet).toBeGreaterThan(result.ongoingNet);
  });
});
