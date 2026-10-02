import { describe, expect, it } from "vitest";
import type { Card, PointValuation, SpendingProfile } from "../../types";
import {
  estimateCategoryRewards,
  optimizeSpending,
} from "../spending";
import { DEFAULT_VALUATIONS } from "../valuation";

const valuations: PointValuation[] = [...DEFAULT_VALUATIONS];

function fixtureCashbackFlat(): Card {
  return {
    id: "test-flat-2",
    issuer: "Test",
    cardName: "Test 2% Flat",
    cardNetwork: "visa",
    annualFee: 0,
    foreignTransactionFee: 0,
    baseRewardRate: 2,
    rewardCurrency: "USD",
    rewardProgram: "Cash",
    welcomeOffer: null,
    categoryRewards: [],
    credits: [],
    benefits: [],
    transferPartners: [],
    applicationRules: [],
    productFamily: "test",
    businessOrPersonal: "personal",
    complexity: "simple",
    hasLounge: false,
    hasHotelBenefits: false,
    hasAirlineBenefits: false,
    tags: ["cashback"],
    lastVerifiedAt: "2025-01-01",
    sourceReferences: [],
    active: true,
  };
}

function fixtureDining5Cap(): Card {
  return {
    ...fixtureCashbackFlat(),
    id: "test-dining-5-cap",
    cardName: "Test 5% Dining Cap",
    baseRewardRate: 1,
    categoryRewards: [
      {
        category: "dining",
        multiplier: 5,
        rewardType: "cashback",
        cap: 1500,
        period: "quarterly",
        effectiveFrom: "2024-01-01",
        effectiveTo: null,
        lastVerifiedAt: "2025-01-01",
      },
    ],
  };
}

function fixturePointsTravel(): Card {
  return {
    ...fixtureCashbackFlat(),
    id: "test-ur-travel",
    cardName: "Test UR Travel",
    baseRewardRate: 1,
    rewardCurrency: "Ultimate Rewards",
    rewardProgram: "Ultimate Rewards",
    tags: ["travel", "flexible_points"],
    categoryRewards: [
      {
        category: "travel",
        multiplier: 3,
        rewardType: "points",
        cap: null,
        period: "permanent",
        effectiveFrom: "2024-01-01",
        effectiveTo: null,
        lastVerifiedAt: "2025-01-01",
      },
    ],
  };
}

describe("spending engine", () => {
  it("calculates flat cashback", () => {
    const card = fixtureCashbackFlat();
    const rewards = estimateCategoryRewards(
      card,
      "other",
      10_000,
      valuations
    );
    expect(rewards).toBe(200);
  });

  it("respects quarterly caps on elevated earn", () => {
    const card = fixtureDining5Cap();
    const annual = 10_000;
    const rewards = estimateCategoryRewards(
      card,
      "dining",
      annual,
      valuations
    );
    const cappedElevated = 1500 * 4 * 0.05;
    const remainder = (annual - 1500 * 4) * 0.01;
    expect(rewards).toBeCloseTo(cappedElevated + remainder, 2);
  });

  it("values points with user valuations", () => {
    const card = fixturePointsTravel();
    const rewards = estimateCategoryRewards(
      card,
      "travel",
      1000,
      valuations
    );
    expect(rewards).toBe(45);
  });

  it("picks optimal card per category", () => {
    const flat = fixtureCashbackFlat();
    const dining = fixtureDining5Cap();
    const spend: SpendingProfile = {
      mode: "annual",
      amounts: {
        dining: 5000,
        groceries: 0,
        gas: 0,
        travel: 0,
        flights: 0,
        hotels: 0,
        transit: 0,
        streaming: 0,
        online: 0,
        drugstores: 0,
        utilities: 0,
        rent: 0,
        mobile_wallet: 0,
        other: 0,
      },
    };
    const { routing, totalRewards } = optimizeSpending(
      [flat, dining],
      spend,
      valuations
    );
    expect(routing.find((r) => r.category === "dining")?.cardId).toBe(
      dining.id
    );
    expect(totalRewards).toBeGreaterThan(5000 * 0.02);
  });
});
