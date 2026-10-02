"use client";

import {
  Badge,
  EmptyState,
  PageHeader,
  Panel,
  Button,
} from "@/components/ui";
import { analyzeAllWelcomeBonuses } from "@/lib/engines/welcome";
import { useArsenalStore } from "@/lib/store";
import { getCardById } from "@/lib/cards/database";
import { formatCurrency } from "@/lib/utils";

export default function WelcomePage() {
  const profile = useArsenalStore((s) => s.profile);
  const catalog = useArsenalStore((s) => s.catalog);
  const updateOwnedCard = useArsenalStore((s) => s.updateOwnedCard);
  const analyses = analyzeAllWelcomeBonuses(profile, catalog);

  return (
    <div>
      <PageHeader
        eyebrow="Welcome"
        title="Bonus tracker & planner"
        description="Progress, deadlines, and natural spend projection — not MS encouragement."
      />

      {analyses.length === 0 ? (
        <EmptyState
          title="No active welcome offers"
          description="Owned cards without modeled bonuses, or bonuses already marked complete."
        />
      ) : (
        <div className="space-y-6 animate-rise">
          {analyses.map((a) => {
            const card = getCardById(a.cardId, catalog);
            const pct =
              a.spendRequirement > 0
                ? Math.min(
                    100,
                    (a.spendCompleted / a.spendRequirement) * 100
                  )
                : 100;
            return (
              <Panel key={a.cardId} title={card?.cardName ?? a.cardId}>
                {a.completed ? (
                  <Badge tone="signal">Complete</Badge>
                ) : (
                  <>
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-bone-dim">
                        <span>
                          {formatCurrency(a.spendCompleted)} of{" "}
                          {formatCurrency(a.spendRequirement)}
                        </span>
                        <span>{Math.round(pct)}%</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-elevated">
                        <div
                          className="h-full bg-signal transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="mt-2 text-sm text-bone-muted">
                        Remaining: {formatCurrency(a.spendRemaining)}
                      </p>
                    </div>

                    <dl className="grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs text-bone-dim">Deadline</dt>
                        <dd className="text-bone">
                          {a.deadlineIso ?? "—"}
                          {a.deadlineDays != null && (
                            <span className="text-bone-muted">
                              {" "}
                              ({a.deadlineDays} days)
                            </span>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-bone-dim">
                          Natural spend projection
                        </dt>
                        <dd>{formatCurrency(a.projectedNaturalSpend)}</dd>
                      </div>
                    </dl>

                    {a.gapVsNaturalSpend > 0 && (
                      <p className="mt-3 text-sm text-amber">
                        Gap vs natural spend:{" "}
                        {formatCurrency(a.gapVsNaturalSpend)} — plan spend
                        shifts only if they fit your budget.
                      </p>
                    )}

                    {a.warnings.map((w) => (
                      <p key={w} className="mt-2 text-sm text-amber">
                        {w}
                      </p>
                    ))}

                    <label className="mt-4 block">
                      <span className="text-xs text-bone-dim">
                        Update spend toward bonus ($)
                      </span>
                      <input
                        type="number"
                        min={0}
                        className="field mt-1 max-w-xs"
                        defaultValue={a.spendCompleted}
                        onBlur={(e) =>
                          updateOwnedCard(a.cardId, {
                            welcomeSpendCompleted:
                              Number(e.target.value) || 0,
                          })
                        }
                      />
                    </label>
                  </>
                )}
              </Panel>
            );
          })}
        </div>
      )}

      <Panel className="mt-8" title="Planner note">
        <p className="text-sm text-bone-muted">
          Track progress manually. We project natural spend from your overall
          profile — not card-specific routing. Manufactured spend carries risk;
          Arsenal does not recommend it.
        </p>
        <Button variant="secondary" href="/discover" className="mt-4">
          Browse cards with offers
        </Button>
      </Panel>
    </div>
  );
}
