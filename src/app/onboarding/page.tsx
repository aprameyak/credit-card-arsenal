"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  PageHeader,
  Panel,
} from "@/components/ui";
import { useArsenalStore } from "@/lib/store";
import type { Complexity, CreditScoreRange, FeeTolerance, Goal } from "@/lib/types";
import {
  CATEGORY_LABELS,
  formatCurrency,
  PRIMARY_CATEGORIES,
  annualize,
} from "@/lib/utils";

const GOAL_OPTIONS: { id: Goal; label: string }[] = [
  { id: "simple_cashback", label: "Simple cashback" },
  { id: "max_cashback", label: "Maximize rewards" },
  { id: "travel_rewards", label: "Travel rewards" },
  { id: "no_annual_fees", label: "Avoid annual fees" },
  { id: "premium_travel", label: "Premium travel" },
  { id: "signup_bonuses", label: "Welcome bonuses" },
];

const STEPS = ["Goals", "Profile", "Cards", "Spending", "Review"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const profile = useArsenalStore((s) => s.profile);
  const catalog = useArsenalStore((s) => s.catalog);
  const setProfile = useArsenalStore((s) => s.setProfile);
  const addOwnedCard = useArsenalStore((s) => s.addOwnedCard);
  const removeOwnedCard = useArsenalStore((s) => s.removeOwnedCard);
  const setSpendingMode = useArsenalStore((s) => s.setSpendingMode);
  const setSpendingAmount = useArsenalStore((s) => s.setSpendingAmount);

  const [step, setStep] = useState(0);

  function toggleGoal(goal: Goal) {
    const next = profile.goals.includes(goal)
      ? profile.goals.filter((g) => g !== goal)
      : [...profile.goals, goal];
    setProfile({ goals: next });
  }

  function toggleCard(cardId: string) {
    if (profile.ownedCards.some((o) => o.cardId === cardId)) {
      removeOwnedCard(cardId);
    } else {
      addOwnedCard({
        cardId,
        openedAt: null,
        annualFeePaid: null,
        creditLimit: null,
        benefitsUsed: {},
        welcomeBonusCompleted: false,
        welcomeBonusValueRealized: 0,
      });
    }
  }

  function finish() {
    setProfile({ onboardingComplete: true });
    router.push("/arsenal");
  }

  return (
    <div className="app-atmosphere min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <PageHeader
          eyebrow="Onboarding"
          title="Configure your wallet"
          description="Tell us your goals and spend — no sensitive account numbers required."
        />

        <div className="mb-8 flex flex-wrap gap-2">
          {STEPS.map((label, i) => (
            <Badge key={label} tone={i === step ? "signal" : "default"}>
              {i + 1}. {label}
            </Badge>
          ))}
        </div>

        {step === 0 && (
          <Panel title="What are you optimizing for?">
            <div className="flex flex-wrap gap-2">
              {GOAL_OPTIONS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggleGoal(g.id)}
                  className={`rounded-md border px-3 py-2 text-sm transition ${
                    profile.goals.includes(g.id)
                      ? "border-signal/50 bg-signal/15 text-signal"
                      : "border-line text-bone-muted hover:border-line-strong"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </Panel>
        )}

        {step === 1 && (
          <Panel title="Profile signals" className="space-y-4">
            <label className="block text-sm">
              <span className="text-xs uppercase tracking-wider text-bone-dim">
                Credit score range
              </span>
              <select
                className="field mt-1"
                value={profile.creditScore}
                onChange={(e) =>
                  setProfile({
                    creditScore: e.target.value as CreditScoreRange,
                  })
                }
              >
                <option value="fair">Fair</option>
                <option value="good">Good</option>
                <option value="very_good">Very good</option>
                <option value="excellent">Excellent</option>
                <option value="prefer_not">Prefer not to say</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-xs uppercase tracking-wider text-bone-dim">
                Fee tolerance
              </span>
              <select
                className="field mt-1"
                value={profile.feeTolerance}
                onChange={(e) =>
                  setProfile({
                    feeTolerance: e.target.value as FeeTolerance,
                  })
                }
              >
                <option value="none">No annual fees</option>
                <option value="low">Low ($95 or less)</option>
                <option value="moderate">Moderate</option>
                <option value="high">Premium OK</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-xs uppercase tracking-wider text-bone-dim">
                Complexity comfort
              </span>
              <select
                className="field mt-1"
                value={profile.desiredComplexity}
                onChange={(e) =>
                  setProfile({
                    desiredComplexity: e.target.value as Complexity,
                  })
                }
              >
                <option value="simple">Simple</option>
                <option value="moderate">Moderate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
          </Panel>
        )}

        {step === 2 && (
          <Panel title="Cards you already hold">
            <p className="mb-4 text-sm text-bone-muted">
              Select from our catalog — issuer names only, never enter account numbers.
            </p>
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {catalog.filter((c) => c.active).map((c) => {
                const selected = profile.ownedCards.some(
                  (o) => o.cardId === c.id
                );
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCard(c.id)}
                    className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition ${
                      selected
                        ? "border-signal/40 bg-signal/10 text-bone"
                        : "border-line text-bone-muted hover:bg-panel-hover"
                    }`}
                  >
                    <span>
                      {c.issuer} {c.cardName}
                    </span>
                    <span className="text-xs text-bone-dim">
                      {c.annualFee === 0 ? "No fee" : formatCurrency(c.annualFee)}
                    </span>
                  </button>
                );
              })}
            </div>
          </Panel>
        )}

        {step === 3 && (
          <Panel title="Spending estimates">
            <div className="mb-4 flex gap-2">
              {(["monthly", "annual"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSpendingMode(mode)}
                  className={`rounded-md px-3 py-1.5 text-xs uppercase tracking-wider ${
                    profile.spending.mode === mode
                      ? "bg-signal/15 text-signal"
                      : "text-bone-dim hover:text-bone-muted"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {PRIMARY_CATEGORIES.map((cat) => (
                <label key={cat} className="text-sm">
                  <span className="text-xs text-bone-dim">
                    {CATEGORY_LABELS[cat]}
                  </span>
                  <input
                    type="number"
                    min={0}
                    className="field mt-1"
                    value={profile.spending.amounts[cat] || ""}
                    onChange={(e) =>
                      setSpendingAmount(cat, Number(e.target.value) || 0)
                    }
                  />
                </label>
              ))}
            </div>
          </Panel>
        )}

        {step === 4 && (
          <Panel title="Review">
            <ul className="space-y-2 text-sm text-bone-muted">
              <li>
                <span className="text-bone-dim">Goals:</span>{" "}
                {profile.goals.length
                  ? profile.goals.join(", ")
                  : "None selected"}
              </li>
              <li>
                <span className="text-bone-dim">Cards:</span>{" "}
                {profile.ownedCards.length} selected
              </li>
              <li>
                <span className="text-bone-dim">Sample annual dining:</span>{" "}
                {formatCurrency(
                  annualize(
                    profile.spending.amounts.dining,
                    profile.spending.mode
                  )
                )}
              </li>
            </ul>
            <p className="mt-4 text-xs text-bone-dim">
              Valuations use editable cents-per-point defaults shown on Spending.
            </p>
          </Panel>
        )}

        <div className="mt-8 flex justify-between">
          <Button
            variant="ghost"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)}>Continue</Button>
          ) : (
            <Button onClick={finish}>Open Arsenal</Button>
          )}
        </div>
      </div>
    </div>
  );
}
