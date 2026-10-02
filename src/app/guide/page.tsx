"use client";

import {
  Badge,
  EmptyState,
  PageHeader,
  Panel,
} from "@/components/ui";
import { computeRouting } from "@/lib/engines/arsenal";
import { estimateRewardsForCategory } from "@/lib/engines/spending";
import { useArsenalStore } from "@/lib/store";
import {
  ALL_CATEGORIES,
  CATEGORY_LABELS,
  annualize,
  formatCurrency,
  formatPercent,
} from "@/lib/utils";

export default function GuidePage() {
  const profile = useArsenalStore((s) => s.profile);
  const catalog = useArsenalStore((s) => s.catalog);
  const routing = computeRouting(profile, catalog);

  const rows = ALL_CATEGORIES.map((category) => {
    const annualSpend = annualize(
      profile.spending.amounts[category],
      profile.spending.mode
    );
    const route = routing.find((r) => r.category === category);
    const card = route
      ? catalog.find((c) => c.id === route.cardId)
      : null;
    let capNote = "";
    if (card && annualSpend > 0) {
      const { assumptions } = estimateRewardsForCategory(
        card,
        category,
        annualSpend,
        profile.valuations
      );
      capNote = assumptions.join(" · ");
    }
    return {
      category,
      annualSpend,
      route,
      capNote,
    };
  }).filter((r) => r.annualSpend > 0 || r.route);

  if (profile.ownedCards.length === 0) {
    return (
      <div>
        <PageHeader title="Spending guide" description="Category → best card in your wallet." />
        <EmptyState title="Add cards first" description="Routing needs at least one card." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Guide"
        title="Optimal spending patterns"
        description="Best card per category at your spend levels — caps and restrictions noted where modeled."
      />

      <Panel className="animate-rise">
        <ul className="divide-y divide-line">
          {rows.map(({ category, annualSpend, route, capNote }) => (
            <li key={category} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-display font-semibold text-bone">
                    {CATEGORY_LABELS[category]}
                  </p>
                  <p className="text-xs text-bone-dim">
                    {formatCurrency(annualSpend)}/yr spend
                  </p>
                </div>
                {route ? (
                  <div className="text-right sm:max-w-md">
                    <p className="text-sm font-medium text-signal">
                      {route.cardName}
                    </p>
                    <p className="text-xs text-bone-muted">
                      {formatPercent(route.effectiveRate)} · est.{" "}
                      {formatCurrency(route.annualRewards)}/yr
                    </p>
                    {capNote && (
                      <p className="mt-1 text-[11px] text-amber">{capNote}</p>
                    )}
                  </div>
                ) : (
                  <Badge tone="amber">No spend</Badge>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
