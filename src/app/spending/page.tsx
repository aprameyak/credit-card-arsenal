"use client";

import { PageHeader, Panel } from "@/components/ui";
import {
  getOwnedCardObjects,
  optimizeSpending,
} from "@/lib/engines/spending";
import {
  DEFAULT_VALUATIONS,
  mergeValuations,
  VALUATION_ASSUMPTIONS,
} from "@/lib/engines/valuation";
import { useArsenalStore } from "@/lib/store";
import {
  CATEGORY_LABELS,
  PRIMARY_CATEGORIES,
  annualize,
  formatCurrency,
} from "@/lib/utils";

export default function SpendingPage() {
  const profile = useArsenalStore((s) => s.profile);
  const catalog = useArsenalStore((s) => s.catalog);
  const setSpendingMode = useArsenalStore((s) => s.setSpendingMode);
  const setSpendingAmount = useArsenalStore((s) => s.setSpendingAmount);
  const updateValuation = useArsenalStore((s) => s.updateValuation);

  const valuations = mergeValuations(profile.valuations);
  const cards = getOwnedCardObjects(profile.ownedCards, catalog).map(
    (p) => p.card
  );
  const { routing } = optimizeSpending(
    cards,
    profile.spending,
    profile.valuations
  );

  const total = PRIMARY_CATEGORIES.reduce(
    (s, cat) => s + annualize(profile.spending.amounts[cat], profile.spending.mode),
    0
  );

  return (
    <div>
      <PageHeader
        eyebrow="Spending"
        title="Spend & valuations"
        description="Your inputs drive every reward estimate. Adjust cents-per-point to match how you redeem."
      />

      <Panel className="mb-6 animate-rise" title="Spending inputs">
        <div className="mb-4 flex gap-2">
          {(["monthly", "annual"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setSpendingMode(mode)}
              className={`rounded-md px-3 py-1.5 text-xs uppercase tracking-wider ${
                profile.spending.mode === mode
                  ? "bg-signal/15 text-signal"
                  : "text-bone-dim"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PRIMARY_CATEGORIES.map((cat) => (
            <label key={cat} className="text-sm">
              <span className="text-xs text-bone-dim">{CATEGORY_LABELS[cat]}</span>
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
        <p className="mt-4 text-sm text-bone-muted">
          Total annualized spend (primary categories):{" "}
          <span className="font-medium text-signal">{formatCurrency(total)}</span>
        </p>
      </Panel>

      <Panel className="mb-6 animate-rise" title="Point valuations (¢ / point)">
        <p className="mb-4 text-xs text-bone-dim">{VALUATION_ASSUMPTIONS}</p>
        <div className="space-y-3">
          {valuations.map((v) => (
            <label
              key={v.currency}
              className="flex flex-wrap items-center gap-3 text-sm"
            >
              <span className="min-w-[10rem] text-bone-muted">{v.label}</span>
              <input
                type="number"
                step={0.05}
                min={0}
                className="field w-28"
                value={v.centsPerPoint}
                onChange={(e) =>
                  updateValuation(v.currency, Number(e.target.value) || 0)
                }
              />
              {v.isUserDefined && (
                <span className="text-xs text-signal">Custom</span>
              )}
            </label>
          ))}
        </div>
        <p className="mt-4 text-xs text-bone-dim">
          Cash back currencies use 100 = $1. Defaults ship with{" "}
          {DEFAULT_VALUATIONS.length} program baselines.
        </p>
      </Panel>

      <Panel title="Routing preview" className="animate-rise">
        {routing.length === 0 ? (
          <p className="text-sm text-bone-muted">
            Add cards and non-zero spend to see category routing valuations.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            {routing.map((r) => (
              <li
                key={r.category}
                className="flex flex-wrap justify-between gap-2 py-3 text-sm"
              >
                <span className="text-bone">{CATEGORY_LABELS[r.category]}</span>
                <span className="text-bone-muted">{r.cardName}</span>
                <span className="text-signal">
                  {formatCurrency(r.annualRewards)}/yr
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
