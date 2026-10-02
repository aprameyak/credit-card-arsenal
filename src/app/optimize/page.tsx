"use client";

import {
  Badge,
  PageHeader,
  Panel,
  Stat,
} from "@/components/ui";
import { runOptimization } from "@/lib/engines/optimizer";
import { useArsenalStore } from "@/lib/store";
import { CATEGORY_LABELS, formatCurrency, formatPercent } from "@/lib/utils";

export default function OptimizePage() {
  const profile = useArsenalStore((s) => s.profile);
  const catalog = useArsenalStore((s) => s.catalog);
  const result = runOptimization(profile, catalog);

  return (
    <div>
      <PageHeader
        eyebrow="Optimize"
        title="Routing & target wallets"
        description="Compare routed spend, ranked candidates, and modeled target wallets."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3 animate-rise">
        <Stat
          label="Current wallet net"
          value={formatCurrency(result.currentWalletValue)}
        />
        <Stat
          label="Ongoing (complexity-adj.)"
          value={formatCurrency(result.ongoingNet)}
          tone="signal"
        />
        <Stat
          label="First year (complexity-adj.)"
          value={formatCurrency(result.firstYearNet)}
          tone="amber"
        />
      </div>

      {result.warnings.length > 0 ? (
        <Panel className="mb-6 animate-rise" title="Warnings">
          <ul className="list-disc space-y-1 pl-4 text-sm text-bone-muted">
            {result.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <Panel className="mb-6 animate-rise" title="Category routing">
        {result.optimizedSpendingAllocation.length === 0 ? (
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
                {result.optimizedSpendingAllocation.map((r) => (
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

      <Panel
        className="mb-6 animate-rise"
        title="Top candidates"
        subtitle="Ranked by first-year incremental value (eligibility-aware)."
      >
        {result.candidateCards.length === 0 ? (
          <p className="text-sm text-bone-muted">No active catalog candidates left.</p>
        ) : (
          <ul className="space-y-3">
            {result.candidateCards.slice(0, 6).map((c) => (
              <li
                key={c.cardId}
                className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 first:border-0 first:pt-0"
              >
                <div>
                  <p className="text-sm font-medium text-bone">{c.cardName}</p>
                  <p className="text-xs text-bone-dim">
                    {c.eligibilityNotes.slice(0, 1).join(" ")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={c.eligible ? "signal" : "amber"}>
                    {c.eligible ? "Eligible" : "Blocked"}
                  </Badge>
                  <span className="text-sm text-signal">
                    {formatCurrency(c.firstYearIncremental)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="mb-6 grid gap-4 lg:grid-cols-2 animate-rise">
        {result.possibleTargetWallets.map((w) => (
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

      <Panel title="Complexity" className="animate-rise">
        <p className="text-sm leading-relaxed text-bone-muted">
          Current wallet complexity: {result.complexityScore.label} (
          {result.complexityScore.factors.slice(0, 3).join(" · ") || "lean"}).
          Display nets apply a small complexity penalty.
        </p>
      </Panel>
    </div>
  );
}
