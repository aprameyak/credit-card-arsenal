"use client";

import { useState } from "react";
import { useArsenalStore } from "@/lib/store";
import type { Card } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Badge, Button, PageHeader, Panel, VerifiedAt } from "@/components/ui";

export default function AdminPage() {
  const catalog = useArsenalStore((s) => s.catalog);
  const updateCatalogCard = useArsenalStore((s) => s.updateCatalogCard);
  const resetCatalog = useArsenalStore((s) => s.resetCatalog);
  const [selectedId, setSelectedId] = useState(catalog[0]?.id ?? "");
  const card = catalog.find((c) => c.id === selectedId);

  function patch(partial: Partial<Card>) {
    if (!card) return;
    const next: Card = {
      ...card,
      ...partial,
      lastVerifiedAt: new Date().toISOString().slice(0, 10),
    };
    updateCatalogCard(next);
  }

  function patchWelcomeEstimatedValue(value: number) {
    if (!card?.welcomeOffer) return;
    patch({
      welcomeOffer: {
        ...card.welcomeOffer,
        estimatedValue: value,
        lastVerifiedAt: new Date().toISOString().slice(0, 10),
      },
    });
  }

  function patchCategoryMultiplier(index: number, multiplier: number) {
    if (!card) return;
    const categoryRewards = card.categoryRewards.map((r, i) =>
      i === index
        ? {
            ...r,
            multiplier,
            lastVerifiedAt: new Date().toISOString().slice(0, 10),
          }
        : r
    );
    patch({ categoryRewards });
  }

  return (
    <div>
      <PageHeader
        eyebrow="Content Admin"
        title="Card data freshness"
        description="Update fees, offers, multipliers, and availability here — never hard-code live terms into UI components. Users see last-verified dates."
        action={
          <Button variant="secondary" onClick={resetCatalog}>
            Reset catalog
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3 animate-rise">
        <Panel className="lg:col-span-1 max-h-[70vh] overflow-y-auto">
          <p className="text-xs uppercase tracking-wider text-bone-dim mb-3">
            Catalog ({catalog.length})
          </p>
          <div className="space-y-1">
            {catalog.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${
                  c.id === selectedId
                    ? "bg-signal/15 text-signal"
                    : "text-bone-muted hover:bg-panel-hover"
                }`}
              >
                <span className="block truncate">
                  {c.issuer} {c.cardName}
                </span>
                {!c.active && <Badge tone="danger">Inactive</Badge>}
              </button>
            ))}
          </div>
        </Panel>

        {card && (
          <Panel className="lg:col-span-2 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-xl font-semibold text-bone">
                  {card.issuer} {card.cardName}
                </h2>
                <VerifiedAt date={card.lastVerifiedAt} />
              </div>
              <label className="flex items-center gap-2 text-sm text-bone-muted">
                <input
                  type="checkbox"
                  checked={card.active}
                  onChange={(e) => patch({ active: e.target.checked })}
                />
                Active / available
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-xs text-bone-dim uppercase tracking-wider">
                  Annual fee
                </span>
                <input
                  type="number"
                  value={card.annualFee}
                  onChange={(e) =>
                    patch({ annualFee: Number(e.target.value) || 0 })
                  }
                  className="mt-1 w-full rounded-md border border-line-strong bg-ink-elevated px-3 py-2 text-bone"
                />
              </label>
              <label className="block text-sm">
                <span className="text-xs text-bone-dim uppercase tracking-wider">
                  Foreign transaction fee %
                </span>
                <input
                  type="number"
                  step={0.1}
                  value={card.foreignTransactionFee}
                  onChange={(e) =>
                    patch({
                      foreignTransactionFee: Number(e.target.value) || 0,
                    })
                  }
                  className="mt-1 w-full rounded-md border border-line-strong bg-ink-elevated px-3 py-2 text-bone"
                />
              </label>
            </div>

            {card.welcomeOffer && (
              <div className="rounded-md border border-line p-4">
                <p className="text-xs uppercase tracking-wider text-signal mb-2">
                  Welcome offer
                </p>
                <p className="text-sm text-bone-muted mb-3">
                  {card.welcomeOffer.description}
                </p>
                <label className="block text-sm">
                  <span className="text-xs text-bone-dim">
                    Estimated value ({formatCurrency(card.welcomeOffer.estimatedValue)})
                  </span>
                  <input
                    type="number"
                    value={card.welcomeOffer.estimatedValue}
                    onChange={(e) =>
                      patchWelcomeEstimatedValue(Number(e.target.value) || 0)
                    }
                    className="mt-1 w-full rounded-md border border-line-strong bg-ink-elevated px-3 py-2 text-bone"
                  />
                </label>
                <VerifiedAt date={card.welcomeOffer.lastVerifiedAt} />
              </div>
            )}

            <div>
              <p className="text-xs uppercase tracking-wider text-bone-dim mb-3">
                Category multipliers
              </p>
              <div className="space-y-2">
                {card.categoryRewards.map((r, i) => (
                  <div
                    key={`${r.category}-${i}`}
                    className="flex flex-wrap items-center gap-3 rounded-md border border-line px-3 py-2"
                  >
                    <span className="text-sm text-bone w-28 capitalize">
                      {r.category}
                    </span>
                    <input
                      type="number"
                      step={0.5}
                      value={r.multiplier}
                      onChange={(e) =>
                        patchCategoryMultiplier(i, Number(e.target.value) || 0)
                      }
                      className="w-20 rounded-md border border-line-strong bg-ink-elevated px-2 py-1 text-sm text-bone"
                    />
                    <span className="text-xs text-bone-dim">
                      {r.rewardType}
                      {r.cap != null ? ` · cap $${r.cap} ${r.period}` : ""}
                    </span>
                    <VerifiedAt date={r.lastVerifiedAt} />
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-bone-dim leading-relaxed">
              Strategy engines and UI read from this catalog. Saving bumps
              lastVerifiedAt so users never silently trust stale hard-coded terms.
            </p>
          </Panel>
        )}
      </div>
    </div>
  );
}
