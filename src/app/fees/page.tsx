"use client";

import {
  EmptyState,
  PageHeader,
  Panel,
  Stat,
} from "@/components/ui";
import { analyzeArsenal } from "@/lib/engines/arsenal";
import { analyzeRenewals } from "@/lib/engines/fees";
import { useArsenalStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";

export default function FeesPage() {
  const profile = useArsenalStore((s) => s.profile);
  const catalog = useArsenalStore((s) => s.catalog);
  const analysis = analyzeArsenal(profile, catalog);
  const renewals = analyzeRenewals(profile, catalog);

  return (
    <div>
      <PageHeader
        eyebrow="Fees"
        title="Fee justification"
        description="Compare annual fees to wallet-routed earn and credit values — we do not recommend closing accounts."
      />

      {renewals.length === 0 ? (
        <EmptyState title="No cards in wallet" description="Add cards to analyze fee drag." />
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
            {renewals.map((a) => (
              <Panel key={a.cardId}>
                <h3 className="font-display text-lg font-semibold text-bone">
                  {a.cardName}
                </h3>
                <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
                  <div>
                    <dt className="text-xs text-bone-dim">Annual fee</dt>
                    <dd>{formatCurrency(a.annualFee)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-bone-dim">Credits (tracked)</dt>
                    <dd className="text-amber">{formatCurrency(a.creditsValue)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-bone-dim">
                      Est. rewards (wallet routing)
                    </dt>
                    <dd className="text-signal">
                      {formatCurrency(a.rewardsValue)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-bone-dim">Ongoing net (est.)</dt>
                    <dd
                      className={
                        a.ongoing.netValue >= 0 ? "text-signal" : "text-danger"
                      }
                    >
                      {formatCurrency(a.ongoing.netValue)}
                    </dd>
                  </div>
                </dl>
                <p className="mt-4 text-xs leading-relaxed text-bone-dim">
                  Rewards are the share routed to this card in your current wallet, not
                  solo-card earn. Keeping or product-changing depends on issuer rules and
                  your goals — Arsenal does not advise closures.
                </p>
              </Panel>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
