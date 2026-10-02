"use client";

import {
  Badge,
  EmptyState,
  PageHeader,
  Panel,
} from "@/components/ui";
import { analyzeArsenal } from "@/lib/engines/arsenal";
import { useArsenalStore } from "@/lib/store";
import { CATEGORY_LABELS, formatCurrency, formatPercent } from "@/lib/utils";

const GAP_TONE = {
  strong: "signal",
  adequate: "default",
  gap: "amber",
  none: "default",
} as const;

export default function CoveragePage() {
  const profile = useArsenalStore((s) => s.profile);
  const catalog = useArsenalStore((s) => s.catalog);
  const rows = analyzeArsenal(profile, catalog).coverage.filter(
    (c) => c.annualSpend > 0
  );

  return (
    <div>
      <PageHeader
        eyebrow="Coverage"
        title="Category map"
        description="Where your wallet earns best — mapped to annual spend and effective rates."
      />

      {rows.length === 0 ? (
        <EmptyState
          title="No spend data yet"
          description="Add spending estimates in onboarding or on the Spending page."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 animate-rise">
          {rows.map((c) => (
            <Panel key={c.category}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-display text-base font-semibold text-bone">
                    {CATEGORY_LABELS[c.category]}
                  </h3>
                  <p className="mt-1 text-xs text-bone-dim">{c.gapReason}</p>
                </div>
                <Badge tone={GAP_TONE[c.gap]}>{c.gap}</Badge>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-xs text-bone-dim">Annual spend</dt>
                  <dd className="text-bone">{formatCurrency(c.annualSpend)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-bone-dim">Effective rate</dt>
                  <dd className="text-signal">{formatPercent(c.effectiveRate)}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-bone-dim">Best card</dt>
                  <dd className="text-bone-muted">{c.bestCardName ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-bone-dim">Est. rewards</dt>
                  <dd>{formatCurrency(c.estimatedAnnualRewards)}</dd>
                </div>
              </dl>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
