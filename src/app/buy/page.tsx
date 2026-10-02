"use client";

import { useState } from "react";
import {
  PageHeader,
  Panel,
  Stat,
} from "@/components/ui";
import {
  getOwnedCardObjects,
  routePurchase,
} from "@/lib/engines/spending";
import { useArsenalStore } from "@/lib/store";
import type { SpendCategory } from "@/lib/types";
import { CATEGORY_LABELS, PRIMARY_CATEGORIES, formatCurrency, formatPercent } from "@/lib/utils";

export default function BuyPage() {
  const profile = useArsenalStore((s) => s.profile);
  const catalog = useArsenalStore((s) => s.catalog);
  const [category, setCategory] = useState<SpendCategory>("online");
  const [amount, setAmount] = useState(120);

  const cards = getOwnedCardObjects(profile.ownedCards, catalog).map(
    (p) => p.card
  );
  const route = routePurchase(category, cards, profile.valuations, amount);
  const discretionary = profile.discretionaryMonthlyTarget;
  const monthlyMode = profile.spending.mode === "monthly";
  const categoryMonthly = monthlyMode
    ? profile.spending.amounts[category]
    : profile.spending.amounts[category] / 12;
  const overTarget =
    discretionary != null &&
    discretionary > 0 &&
    categoryMonthly + amount > discretionary * 1.25;

  return (
    <div className="mx-auto max-w-lg lg:max-w-2xl">
      <PageHeader
        eyebrow="Purchase"
        title="Should I buy this?"
        description="Payment optimization first — spending context second. Rewards never justify overspending."
      />

      <Panel className="mb-6 space-y-4 animate-rise">
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-bone-dim">
            Category
          </span>
          <select
            className="field mt-2 text-base"
            value={category}
            onChange={(e) => setCategory(e.target.value as SpendCategory)}
          >
            {PRIMARY_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-bone-dim">
            Purchase amount ($)
          </span>
          <input
            type="number"
            min={0}
            className="field mt-2 font-display text-2xl"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value) || 0)}
          />
        </label>
      </Panel>

      <Panel
        title="A — Payment optimization"
        subtitle="Best card you already hold for this purchase."
        className="mb-6 animate-rise"
      >
        {route ? (
          <>
            <p className="font-display text-xl font-semibold text-signal">
              {route.cardName}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Stat
                label="Est. reward"
                value={formatCurrency(route.annualRewards, 2)}
                tone="signal"
              />
              <Stat
                label="Effective rate"
                value={formatPercent(route.effectiveRate)}
              />
            </div>
            {route.assumptions.length > 0 && (
              <p className="mt-3 text-xs text-bone-dim">
                {route.assumptions.join(" · ")}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-bone-muted">
            Add cards to your wallet for a recommendation.
          </p>
        )}
      </Panel>

      <Panel
        title="B — Spending context"
        subtitle="Compare to your discretionary guardrail if set."
        className="animate-rise"
      >
        {discretionary == null || discretionary <= 0 ? (
          <p className="text-sm text-bone-muted">
            Set a discretionary monthly target in Settings to see pacing context.
            Whether this purchase fits your budget is separate from card rewards.
          </p>
        ) : (
          <>
            <p className="text-sm text-bone-muted">
              Discretionary target:{" "}
              <span className="text-bone">
                {formatCurrency(discretionary)}/mo
              </span>
              . This category averages about{" "}
              {formatCurrency(categoryMonthly)}/mo in your profile.
            </p>
            {overTarget && (
              <p className="mt-3 rounded-md border border-amber/40 bg-amber/10 px-3 py-2 text-sm text-amber">
                This purchase would push {CATEGORY_LABELS[category]} well above
                your discretionary target. Pay with the best card if you were
                already planning to buy — do not spend extra for points.
              </p>
            )}
            {!overTarget && (
              <p className="mt-3 text-sm text-bone-dim">
                Within a reasonable band vs your target. Still only buy if you
                need the item — estimated reward is{" "}
                {route ? formatCurrency(route.annualRewards, 2) : "—"}, not a
                reason to inflate spend.
              </p>
            )}
          </>
        )}
        {profile.paysInFull === false && (
          <p className="mt-4 text-sm text-danger">
            You indicated you may carry a balance — interest can erase rewards
            quickly. Pay in full when possible.
          </p>
        )}
      </Panel>
    </div>
  );
}
