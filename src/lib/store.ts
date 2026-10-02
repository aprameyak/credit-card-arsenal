"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CARD_DATABASE } from "./cards/database";
import { DEFAULT_VALUATIONS } from "./engines/valuation";
import { emptySpending } from "./engines/spending";
import { AnalyticsEvents, trackEvent } from "./analytics";
import type {
  Card,
  OwnedCard,
  PointValuation,
  SpendCategory,
  UserProfile,
} from "./types";

function defaultProfile(): UserProfile {
  const now = new Date().toISOString();
  return {
    onboardingComplete: false,
    creditScore: "good",
    income: "prefer_not",
    goals: [],
    preferredAirlines: [],
    preferredHotels: [],
    preferredTransferAirlines: [],
    preferredTransferHotels: [],
    paysInFull: "unknown",
    discretionaryMonthlyTarget: null,
    cashbackVsPoints: "either",
    feeTolerance: "low",
    desiredComplexity: "simple",
    rotatingCategoriesOk: false,
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
  };
}

function cloneCatalog(): Card[] {
  return structuredClone(CARD_DATABASE);
}

export interface ArsenalState {
  profile: UserProfile;
  catalog: Card[];
  setProfile: (partial: Partial<UserProfile>) => void;
  patchProfile: (partial: Partial<UserProfile>) => void;
  toggleOwnedCard: (cardId: string) => void;
  completeOnboarding: () => void;
  addOwnedCard: (owned: OwnedCard) => void;
  removeOwnedCard: (cardId: string) => void;
  updateOwnedCard: (cardId: string, partial: Partial<OwnedCard>) => void;
  setSpendingAmount: (category: SpendCategory, amount: number) => void;
  setSpendingMode: (mode: "monthly" | "annual") => void;
  updateValuation: (currency: string, centsPerPoint: number) => void;
  updateCatalogCard: (card: Card) => void;
  resetCatalog: () => void;
  loadDemo: () => void;
  resetAll: () => void;
  exportProfile: () => string;
  importProfile: (json: string) => boolean;
  deleteAllData: () => void;
}

export const useArsenalStore = create<ArsenalState>()(
  persist(
    (set, get) => ({
      profile: defaultProfile(),
      catalog: cloneCatalog(),

      setProfile: (partial) =>
        set((s) => ({
          profile: {
            ...s.profile,
            ...partial,
            updatedAt: new Date().toISOString(),
          },
        })),

      patchProfile: (partial) => get().setProfile(partial),

      toggleOwnedCard: (cardId) => {
        const { profile } = get();
        const exists = profile.ownedCards.some((o) => o.cardId === cardId);
        if (exists) {
          get().removeOwnedCard(cardId);
          return;
        }
        get().addOwnedCard({
          cardId,
          openedAt: new Date().toISOString().slice(0, 10),
          annualFeePaid: null,
          creditLimit: null,
          benefitsUsed: {},
          welcomeBonusCompleted: false,
          welcomeBonusValueRealized: 0,
        });
      },

      completeOnboarding: () => {
        get().setProfile({ onboardingComplete: true });
        trackEvent(AnalyticsEvents.ONBOARDING_COMPLETE);
      },

      addOwnedCard: (owned) =>
        set((s) => {
          if (s.profile.ownedCards.some((o) => o.cardId === owned.cardId)) {
            return s;
          }
          trackEvent(AnalyticsEvents.CARD_ADDED, { cardId: owned.cardId });
          return {
            profile: {
              ...s.profile,
              ownedCards: [...s.profile.ownedCards, owned],
              updatedAt: new Date().toISOString(),
            },
          };
        }),

      removeOwnedCard: (cardId) =>
        set((s) => {
          trackEvent(AnalyticsEvents.CARD_REMOVED, { cardId });
          return {
            profile: {
              ...s.profile,
              ownedCards: s.profile.ownedCards.filter((o) => o.cardId !== cardId),
              updatedAt: new Date().toISOString(),
            },
          };
        }),

      updateOwnedCard: (cardId, partial) =>
        set((s) => ({
          profile: {
            ...s.profile,
            ownedCards: s.profile.ownedCards.map((o) =>
              o.cardId === cardId ? { ...o, ...partial } : o
            ),
            updatedAt: new Date().toISOString(),
          },
        })),

      setSpendingAmount: (category, amount) =>
        set((s) => {
          trackEvent(AnalyticsEvents.SPENDING_UPDATED, { category });
          return {
            profile: {
              ...s.profile,
              spending: {
                ...s.profile.spending,
                amounts: {
                  ...s.profile.spending.amounts,
                  [category]: Math.max(0, amount),
                },
              },
              updatedAt: new Date().toISOString(),
            },
          };
        }),

      setSpendingMode: (mode) =>
        set((s) => ({
          profile: {
            ...s.profile,
            spending: { ...s.profile.spending, mode },
            updatedAt: new Date().toISOString(),
          },
        })),

      updateValuation: (currency, centsPerPoint) =>
        set((s) => {
          const existing = s.profile.valuations.find(
            (v) => v.currency.toLowerCase() === currency.toLowerCase()
          );
          let valuations: PointValuation[];
          if (existing) {
            valuations = s.profile.valuations.map((v) =>
              v.currency.toLowerCase() === currency.toLowerCase()
                ? { ...v, centsPerPoint, isUserDefined: true }
                : v
            );
          } else {
            valuations = [
              ...s.profile.valuations,
              {
                currency,
                centsPerPoint,
                label: currency,
                isUserDefined: true,
              },
            ];
          }
          trackEvent(AnalyticsEvents.VALUATION_UPDATED, { currency });
          return {
            profile: {
              ...s.profile,
              valuations,
              updatedAt: new Date().toISOString(),
            },
          };
        }),

      exportProfile: () => {
        const { profile } = get();
        trackEvent(AnalyticsEvents.PROFILE_EXPORT);
        return JSON.stringify(profile, null, 2);
      },

      importProfile: (json) => {
        try {
          const parsed = JSON.parse(json) as UserProfile;
          if (!parsed || typeof parsed !== "object" || !parsed.spending) {
            return false;
          }
          get().setProfile({
            ...defaultProfile(),
            ...parsed,
            updatedAt: new Date().toISOString(),
          });
          trackEvent(AnalyticsEvents.PROFILE_IMPORT);
          return true;
        } catch {
          return false;
        }
      },

      deleteAllData: () => {
        trackEvent(AnalyticsEvents.DATA_DELETED);
        get().resetAll();
        if (typeof window !== "undefined") {
          try {
            localStorage.removeItem("arsenal-store-v1");
            localStorage.removeItem("arsenal-analytics-log");
          } catch {}
        }
      },

      updateCatalogCard: (card) =>
        set((s) => ({
          catalog: s.catalog.map((c) => (c.id === card.id ? card : c)),
        })),

      resetCatalog: () => set({ catalog: cloneCatalog() }),

      loadDemo: () => {
        const spending = emptySpending();
        spending.mode = "monthly";
        spending.amounts.dining = 450;
        spending.amounts.groceries = 600;
        spending.amounts.gas = 120;
        spending.amounts.travel = 200;
        spending.amounts.streaming = 45;
        spending.amounts.online = 300;
        spending.amounts.other = 800;

        const ownedCards: OwnedCard[] = [
          {
            cardId: "chase-freedom-unlimited",
            openedAt: "2023-06-01",
            annualFeePaid: 0,
            creditLimit: 12000,
            assignedRole: "dining",
            benefitsUsed: {},
            welcomeBonusCompleted: true,
            welcomeBonusValueRealized: 200,
          },
          {
            cardId: "chase-sapphire-preferred",
            openedAt: "2022-01-15",
            annualFeePaid: 95,
            creditLimit: 18000,
            assignedRole: "travel",
            benefitsUsed: { "csp-travel-credit": 50 },
            welcomeBonusCompleted: true,
            welcomeBonusValueRealized: 900,
          },
          {
            cardId: "citi-double-cash",
            openedAt: "2021-09-01",
            annualFeePaid: 0,
            creditLimit: 15000,
            assignedRole: "catchall",
            benefitsUsed: {},
            welcomeBonusCompleted: false,
            welcomeBonusValueRealized: 0,
          },
        ];

        trackEvent(AnalyticsEvents.DEMO_LOADED);
        set({
          profile: {
            ...defaultProfile(),
            onboardingComplete: true,
            goals: ["travel_rewards", "simple_wallet"],
            desiredComplexity: "moderate",
            feeTolerance: "moderate",
            rotatingCategoriesOk: true,
            ownedCards,
            spending,
            valuations: [...DEFAULT_VALUATIONS],
            updatedAt: new Date().toISOString(),
          },
        });
      },

      resetAll: () =>
        set({
          profile: defaultProfile(),
          catalog: cloneCatalog(),
        }),
    }),
    {
      name: "arsenal-store-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        profile: state.profile,
        catalog: state.catalog,
      }),
    }
  )
);
