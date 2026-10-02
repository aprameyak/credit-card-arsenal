"use client";

import {
  EmptyState,
  PageHeader,
  Panel,
  Stat,
} from "@/components/ui";
import { analyzeArsenal } from "@/lib/engines/arsenal";
import {
  estimateCategoryRewards,
  getOwnedCardObjects,
} from "@/lib/engines/spending";
import { ALL_CATEGORIES, annualize, formatCurrency } from "@/lib/utils";
import { useArsenalStore } from "@/lib/store";

export default function FeesPage() {
  const profile = useArsenalStore((s) => s.profile);
  const catalog = useArsenalStore((s) => s.catalog);
  const analysis = analyzeArsenal(profile, catalog);
  const pairs = getOwnedCardObjects(profile.ownedCards, catalog);

  return (
    <div>
      <PageHeader
        eyebrow="Fees"
        title="Fee justification"
        description="Compare annual fees to estimated earn and credit face value — we do not recommend closing accounts."
      />

      {pairs.length === 0 ? (
        <EmptyState title="No fee-bearing cards" description="Add cards to analyze fee drag." />
      ) : (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-3 animate-rise">
            <Stat label="Total fees" value={formatCurrency(analysis.annualFees)} />
            <Stat
              label="Est. rewards"
              value={formatCurrency(analysis.optimizedAnnualRewards)}
              tone="signal"
            />
            <Stat
              label="Net after fees & credits"
              value={formatCurrency(analysis.netOptimizedValue)}
              tone={analysis.netOptimizedValue >= 0 ? "signal" : "danger"}
            />
          </div>

          <div className="space-y-4 animate-rise">
            {pairs.map(({ card }) => {
              const creditTotal = card.credits.reduce(
                (s, c) => s + c.annualValue,
                0
              );
              let maxCategoryRewards = 0;
              for (const cat of ALL_CATEGORIES) {
                const spend = annualize(
                  profile.spending.amounts[cat],
                  profile.spending.mode
                );
                maxCategoryRewards = Math.max(
                  maxCategoryRewards,
                  estimateCategoryRewards(
                    card,
                    cat,
                    spend,
                    profile.valuations
                  )
                );
              }
              const net = maxCategoryRewards + creditTotal - card.annualFee;

              return (
                <Panel key={card.id}>
                  <h3 className="font-display text-lg font-semibold text-bone">
                    {card.issuer} {card.cardName}
                  </h3>
                  <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
                    <div>
                      <dt className="text-xs text-bone-dim">Annual fee</dt>
                      <dd>{formatCurrency(card.annualFee)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-bone-dim">Credits (face)</dt>
                      <dd className="text-amber">{formatCurrency(creditTotal)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-bone-dim">
                        Best single-category earn (rough)
                      </dt>
                      <dd className="text-signal">
                        {formatCurrency(maxCategoryRewards)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-bone-dim">Fee vs value snapshot</dt>
                      <dd className={net >= 0 ? "text-signal" : "text-danger"}>
                        {formatCurrency(net)}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-4 text-xs leading-relaxed text-bone-dim">
                    Snapshot uses your spend inputs and valuation assumptions. Keeping or
                    product-changing a card depends on issuer rules, credit age, and your
                    goals — evaluate tradeoffs yourself; Arsenal does not advise closures.
                  </p>
                </Panel>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
