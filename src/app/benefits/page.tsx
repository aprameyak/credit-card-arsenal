"use client";

import {
  EmptyState,
  PageHeader,
  Panel,
} from "@/components/ui";
import { useArsenalStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";

export default function BenefitsPage() {
  const profile = useArsenalStore((s) => s.profile);
  const catalog = useArsenalStore((s) => s.catalog);
  const updateOwnedCard = useArsenalStore((s) => s.updateOwnedCard);

  const rows = profile.ownedCards.flatMap((oc) => {
    const card = catalog.find((c) => c.id === oc.cardId);
    if (!card) return [];
    return card.credits.map((cr) => ({
      cardId: oc.cardId,
      cardName: `${card.issuer} ${card.cardName}`,
      credit: cr,
      used: oc.benefitsUsed[cr.id] ?? 0,
      benefitsUsed: oc.benefitsUsed,
    }));
  });

  const totalFace = rows.reduce((s, r) => s + r.credit.annualValue, 0);
  const totalTracked = rows.reduce((s, r) => s + r.used, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Benefits"
        title="Credits & bonus tracker"
        description="Track statement credits and activation — face value shown, not guaranteed utilization."
      />

      {rows.length === 0 ? (
        <EmptyState
          title="No trackable credits"
          description="Cards in your wallet with credits will appear here."
        />
      ) : (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-2 animate-rise">
            <Panel>
              <p className="text-xs uppercase tracking-wider text-bone-dim">
                Total credit face value
              </p>
              <p className="font-display text-2xl font-semibold text-signal">
                {formatCurrency(totalFace)}
              </p>
            </Panel>
            <Panel>
              <p className="text-xs uppercase tracking-wider text-bone-dim">
                Tracked used (your inputs)
              </p>
              <p className="font-display text-2xl font-semibold text-bone">
                {formatCurrency(totalTracked)}
              </p>
            </Panel>
          </div>

          <div className="space-y-3 animate-rise">
            {rows.map((r) => {
              const pct =
                r.credit.annualValue > 0
                  ? Math.min(100, (r.used / r.credit.annualValue) * 100)
                  : 0;
              return (
                <Panel key={`${r.cardId}-${r.credit.id}`}>
                  <div className="flex flex-wrap justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-bone">{r.credit.name}</p>
                      <p className="text-xs text-bone-dim">{r.cardName}</p>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-bone-muted">
                      <span className="text-xs text-bone-dim">Used $</span>
                      <input
                        type="number"
                        min={0}
                        max={r.credit.annualValue}
                        className="field w-24"
                        value={r.used || ""}
                        onChange={(e) => {
                          const next = Math.max(
                            0,
                            Math.min(
                              r.credit.annualValue,
                              Number(e.target.value) || 0
                            )
                          );
                          updateOwnedCard(r.cardId, {
                            benefitsUsed: {
                              ...r.benefitsUsed,
                              [r.credit.id]: next,
                            },
                          });
                        }}
                      />
                      <span>/ {formatCurrency(r.credit.annualValue)}</span>
                    </label>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-elevated">
                    <div
                      className="h-full rounded-full bg-signal transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-bone-dim">{r.credit.description}</p>
                  {r.credit.requiresActivation && (
                    <p className="mt-1 text-xs text-amber">Activation may be required</p>
                  )}
                </Panel>
              );
            })}
          </div>
        </>
      )}

      {profile.ownedCards.some((o) => o.welcomeBonusCompleted === false) && (
        <Panel className="mt-6 animate-rise" title="Welcome bonuses in progress">
          <ul className="space-y-2 text-sm text-bone-muted">
            {profile.ownedCards
              .filter((o) => !o.welcomeBonusCompleted)
              .map((o) => {
                const card = catalog.find((c) => c.id === o.cardId);
                if (!card?.welcomeOffer) return null;
                return (
                  <li key={o.cardId}>
                    {card.cardName}: {card.welcomeOffer.description}
                  </li>
                );
              })}
          </ul>
        </Panel>
      )}
    </div>
  );
}
