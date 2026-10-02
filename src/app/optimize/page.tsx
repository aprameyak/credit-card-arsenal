"use client";

import {
  PageHeader,
  Panel,
  Stat,
} from "@/components/ui";
import {
  analyzeArsenal,
  diminishingReturnsNote,
  proposeTargetWallets,
} from "@/lib/engines/arsenal";
import {
  getOwnedCardObjects,
  optimizeSpending,
} from "@/lib/engines/spending";
import { useArsenalStore } from "@/lib/store";
import { CATEGORY_LABELS, formatCurrency, formatPercent } from "@/lib/utils";

export default function OptimizePage() {
  const profile = useArsenalStore((s) => s.profile);
  const catalog = useArsenalStore((s) => s.catalog);
  const cards = getOwnedCardObjects(profile.ownedCards, catalog).map(
    (p) => p.card
  );
  const { routing } = optimizeSpending(
    cards,
    profile.spending,
    profile.valuations
  );
  const wallets = proposeTargetWallets(profile, catalog);
  const analysis = analyzeArsenal(profile, catalog);
  const dimNote = diminishingReturnsNote(profile, catalog);

  return (
    <div>
      <PageHeader
        eyebrow="Optimize"
        title="Routing & target wallets"
        description="Compare your current routed wallet against modeled targets and watch fee drag."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3 animate-rise">
        <Stat
          label="Current routed rewards"
          value={formatCurrency(analysis.currentAnnualRewards)}
        />
        <Stat
          label="Optimized (owned)"
          value={formatCurrency(analysis.optimizedAnnualRewards)}
          tone="signal"
        />
        <Stat
          label="Uplift potential"
          value={formatCurrency(
            Math.max(0, analysis.optimizedAnnualRewards - analysis.currentAnnualRewards)
          )}
          tone="amber"
        />
      </div>

      <Panel className="mb-6 animate-rise" title="Category routing">
        {routing.length === 0 ? (
          <p className="text-sm text-bone-muted">Add spend and cards to generate routes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-bone-dim">
                  <th className="pb-2 pr-4">Category</th>
                  <th className="pb-2 pr-4">Card</th>
                  <th className="pb-2 pr-4">Rate</th>
                  <th className="pb-2">Rewards</th>
                </tr>
              </thead>
              <tbody>
                {routing.map((r) => (
                  <tr key={r.category} className="border-t border-line">
                    <td className="py-2 pr-4 text-bone">
                      {CATEGORY_LABELS[r.category]}
                    </td>
                    <td className="py-2 pr-4 text-bone-muted">{r.cardName}</td>
                    <td className="py-2 pr-4 text-signal">
                      {formatPercent(r.effectiveRate)}
                    </td>
                    <td className="py-2">{formatCurrency(r.annualRewards)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="mb-6 grid gap-4 lg:grid-cols-2 animate-rise">
        {wallets.map((w) => (
          <Panel key={w.id} title={w.name} subtitle={w.description}>
            <div className="mb-3 grid grid-cols-3 gap-2">
              <Stat label="Rewards" value={formatCurrency(w.estimatedAnnualRewards)} tone="signal" />
              <Stat label="Fees" value={formatCurrency(w.annualFees)} />
              <Stat label="Net" value={formatCurrency(w.netValue)} tone="signal" />
            </div>
            <p className="text-xs text-bone-dim">
              {w.cardIds.length} cards · {w.complexity} complexity
            </p>
          </Panel>
        ))}
      </div>

      <Panel title="Diminishing returns" className="animate-rise">
        <p className="text-sm leading-relaxed text-bone-muted">{dimNote}</p>
      </Panel>
    </div>
  );
}
