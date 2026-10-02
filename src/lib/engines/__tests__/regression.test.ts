import { describe, expect, it } from "vitest";
import { CARD_DATABASE, getCardById } from "../../cards/database";
import type { OwnedCard, SpendingProfile, UserProfile } from "../../types";
import { emptySpending } from "../spending";
import { getOwnedCardObjects, optimizeSpending } from "../spending";
import { analyzeCardFees } from "../fees";
import { checkEligibility } from "../pathway";
import { simulateWallet } from "../simulator";
import { DEFAULT_VALUATIONS } from "../valuation";

function baseProfile(partial: Partial<UserProfile> = {}): UserProfile {
  const now = new Date().toISOString();
  return {
    onboardingComplete: true,
    creditScore: "good",
    income: "prefer_not",
    goals: [],
    preferredAirlines: [],
    preferredHotels: [],
    preferredTransferAirlines: [],
    preferredTransferHotels: [],
    paysInFull: true,
    discretionaryMonthlyTarget: null,
    cashbackVsPoints: "either",
    feeTolerance: "moderate",
    desiredComplexity: "moderate",
    rotatingCategoriesOk: true,
    internationalTravel: "occasional",
    travelFrequency: "occasional",
    businessInterest: false,
    ownedCards: [],
    applicationHistory: [],
    closedCards: [],
    planningNotes: "",
    spending: emptySpending(),
    valuations: [...DEFAULT_VALUATIONS],
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

describe("catalog isolation", () => {
  it("getCardById does not resurrect deleted catalog cards", () => {
    const edited = CARD_DATABASE.filter((c) => c.id !== "chase-sapphire-preferred");
    expect(getCardById("chase-sapphire-preferred", edited)).toBeUndefined();
    expect(getCardById("chase-sapphire-preferred")).toBeDefined();
  });

  it("getOwnedCardObjects ignores owned ids missing from catalog", () => {
    const owned: OwnedCard[] = [
      {
        cardId: "chase-sapphire-preferred",
        openedAt: "2022-01-01",
        annualFeePaid: 95,
        creditLimit: null,
        benefitsUsed: {},
        welcomeBonusCompleted: true,
        welcomeBonusValueRealized: 0,
      },
    ];
    const catalog = CARD_DATABASE.filter(
      (c) => c.id !== "chase-sapphire-preferred"
    );
    expect(getOwnedCardObjects(owned, catalog)).toHaveLength(0);
  });
});

describe("optimizeSpending blended rates", () => {
  it("stores capped blended rate not face multiplier", () => {
    const dining = CARD_DATABASE.find((c) =>
      c.categoryRewards.some((r) => r.category === "dining" && r.cap != null)
    );
    // Use Freedom Flex style if present; otherwise skip with a synthetic check via fixture path
    const flex = CARD_DATABASE.find((c) => c.id === "chase-freedom-flex");
    const card = dining ?? flex;
    expect(card).toBeDefined();
    const spend: SpendingProfile = {
      mode: "annual",
      amounts: {
        ...emptySpending().amounts,
        dining: 20_000,
      },
    };
    const { routing } = optimizeSpending([card!], spend, DEFAULT_VALUATIONS);
    const row = routing.find((r) => r.category === "dining");
    expect(row).toBeDefined();
    // Face 5% would be 0.05; with annualized caps, blended must be lower on huge spend
    if (card!.categoryRewards.some((r) => r.category === "dining" && r.cap != null)) {
      expect(row!.effectiveRate).toBeLessThan(0.05);
    }
  });
});

describe("simulator spend overrides", () => {
  it("preserves monthly mode when tweaking one category", () => {
    const cfu = CARD_DATABASE.find((c) => c.id === "chase-freedom-unlimited")!;
    const profile = baseProfile({
      ownedCards: [
        {
          cardId: cfu.id,
          openedAt: "2023-01-01",
          annualFeePaid: 0,
          creditLimit: null,
          benefitsUsed: {},
          welcomeBonusCompleted: true,
          welcomeBonusValueRealized: 0,
        },
      ],
      spending: {
        mode: "monthly",
        amounts: { ...emptySpending().amounts, dining: 400, other: 800 },
      },
    });
    const before = simulateWallet(profile, CARD_DATABASE, {}).beforeNet;
    const after = simulateWallet(profile, CARD_DATABASE, {
      spendingOverrides: { dining: 500 },
    }).beforeNet;
    // Monthly 500 dining vs 400 should move net modestly, not 12× undercount
    expect(Math.abs(after - before)).toBeLessThan(200);
    expect(after).not.toEqual(before);
  });
});

describe("fee attribution", () => {
  it("attributes wallet-routed rewards not solo-card total spend", () => {
    const flat = CARD_DATABASE.find((c) => c.id === "citi-double-cash")!;
    const dining = CARD_DATABASE.find((c) => c.id === "amex-gold")!;
    const ownedFlat: OwnedCard = {
      cardId: flat.id,
      openedAt: "2023-01-01",
      annualFeePaid: 0,
      creditLimit: null,
      benefitsUsed: {},
      welcomeBonusCompleted: true,
      welcomeBonusValueRealized: 0,
    };
    const ownedDining: OwnedCard = {
      cardId: dining.id,
      openedAt: "2022-01-01",
      annualFeePaid: dining.annualFee,
      creditLimit: null,
      benefitsUsed: {},
      welcomeBonusCompleted: true,
      welcomeBonusValueRealized: 0,
    };
    const profile = baseProfile({
      ownedCards: [ownedFlat, ownedDining],
      spending: {
        mode: "annual",
        amounts: {
          ...emptySpending().amounts,
          dining: 6000,
          other: 8000,
        },
      },
    });
    const feeFlat = analyzeCardFees(profile, flat, ownedFlat, CARD_DATABASE);
    const feeDining = analyzeCardFees(profile, dining, ownedDining, CARD_DATABASE);
    const walletTotal = optimizeSpending(
      [flat, dining],
      profile.spending,
      profile.valuations
    ).totalRewards;
    const soloDining = optimizeSpending(
      [dining],
      profile.spending,
      profile.valuations
    ).totalRewards;
    expect(feeFlat.rewardsValue + feeDining.rewardsValue).toBeCloseTo(
      walletTotal,
      0
    );
    expect(feeDining.rewardsValue).toBeGreaterThan(0);
    expect(feeDining.rewardsValue).toBeLessThan(soloDining);
  });
});

describe("chase 5/24 dedupe", () => {
  it("does not double-count the same card in history and owned", () => {
    const cfu = CARD_DATABASE.find((c) => c.id === "chase-freedom-unlimited")!;
    const csp = CARD_DATABASE.find((c) => c.id === "chase-sapphire-preferred")!;
    const openedAt = new Date();
    openedAt.setMonth(openedAt.getMonth() - 6);
    const iso = openedAt.toISOString().slice(0, 10);
    const profile = baseProfile({
      ownedCards: [
        {
          cardId: cfu.id,
          openedAt: iso,
          annualFeePaid: 0,
          creditLimit: null,
          benefitsUsed: {},
          welcomeBonusCompleted: true,
          welcomeBonusValueRealized: 0,
        },
      ],
      applicationHistory: [
        {
          cardId: cfu.id,
          appliedAt: iso,
          outcome: "approved",
        },
      ],
    });
    const { reasons } = checkEligibility(csp, profile, CARD_DATABASE);
    const five24 = reasons.find((r) => r.includes("5/24"));
    expect(five24).toMatch(/1\/5/);
  });
});
