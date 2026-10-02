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

export default function RouterPage() {
  const profile = useArsenalStore((s) => s.profile);
  const catalog = useArsenalStore((s) => s.catalog);
  const [category, setCategory] = useState<SpendCategory>("dining");
  const [amount, setAmount] = useState(75);

  const cards = getOwnedCardObjects(profile.ownedCards, catalog).map(
    (p) => p.card
  );
  const result = routePurchase(
    category,
    cards,
    profile.valuations,
    amount
  );

  return (
    <div className="mx-auto max-w-lg lg:max-w-none">
      <PageHeader
        eyebrow="Router"
        title="Purchase router"
        description="Mobile-first: pick a category and amount before you tap to pay."
      />

      <Panel className="animate-rise space-y-5">
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
            Purchase amount
          </span>
          <input
            type="number"
            min={0}
            step={1}
            className="field mt-2 font-display text-2xl"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value) || 0)}
          />
        </label>

        {result ? (
          <div className="rounded-lg border border-signal/30 bg-signal/10 p-4">
            <p className="text-xs uppercase tracking-wider text-signal">Use this card</p>
            <p className="mt-2 font-display text-xl font-semibold text-bone">
              {result.cardName}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Stat
                label="Effective rate"
                value={formatPercent(result.effectiveRate)}
                tone="signal"
              />
              <Stat
                label="Est. reward"
                value={formatCurrency(result.annualRewards, 2)}
              />
            </div>
            <p className="mt-4 text-xs text-bone-dim">
              Based on your valuation assumptions and category multipliers in the catalog.
            </p>
          </div>
        ) : (
          <p className="text-sm text-bone-muted">
            Add cards to your wallet to get a recommendation.
          </p>
        )}
      </Panel>
    </div>
  );
}
