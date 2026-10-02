"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  EmptyState,
  PageHeader,
  Panel,
  Stat,
} from "@/components/ui";
import { simulateWalletChange } from "@/lib/engines/simulator";
import { useArsenalStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import type { SpendCategory } from "@/lib/types";
import { CATEGORY_LABELS, PRIMARY_CATEGORIES } from "@/lib/utils";

export default function SimulatePage() {
  const profile = useArsenalStore((s) => s.profile);
  const catalog = useArsenalStore((s) => s.catalog);
  const toggleOwnedCard = useArsenalStore((s) => s.toggleOwnedCard);

  const ownedIds = useMemo(
    () => new Set(profile.ownedCards.map((o) => o.cardId)),
    [profile.ownedCards]
  );

  const [simAdd, setSimAdd] = useState<string[]>([]);
  const [simRemove, setSimRemove] = useState<string[]>([]);
  const [spendTweak, setSpendTweak] = useState<SpendCategory | "">("");
  const [spendAmount, setSpendAmount] = useState(0);

  const spendingOverrides =
    spendTweak && spendAmount > 0
      ? { [spendTweak]: spendAmount }
      : undefined;

  const diff = simulateWalletChange(profile, catalog, {
    addCardIds: simAdd,
    removeCardIds: simRemove,
    spendingOverrides,
  });

  const candidates = catalog.filter((c) => c.active);

  function toggleSimAdd(id: string) {
    setSimAdd((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setSimRemove((prev) => prev.filter((x) => x !== id));
  }

  function toggleSimRemove(id: string) {
    if (!ownedIds.has(id)) return;
    setSimRemove((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setSimAdd((prev) => prev.filter((x) => x !== id));
  }

  return (
    <div>
      <PageHeader
        eyebrow="What if"
        title="Wallet simulator"
        description="Toggle cards and optional spend tweaks — compare net value, fees, ecosystems, and complexity before you apply."
      />

      {profile.ownedCards.length === 0 && simAdd.length === 0 ? (
        <EmptyState
          title="Start from an empty wallet"
          description="Add cards below or load demo data from Settings."
        />
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 animate-rise">
        <Stat label="Before (net)" value={formatCurrency(diff.beforeNet)} />
        <Stat
          label="After (net)"
          value={formatCurrency(diff.afterNet)}
          tone="signal"
        />
        <Stat
          label="Incremental net"
          value={formatCurrency(diff.incrementalNet)}
          tone={diff.incrementalNet >= 0 ? "signal" : "danger"}
        />
        <Stat label="Fee delta" value={formatCurrency(diff.feeDelta)} />
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3 animate-rise">
        <Stat
          label="Cards"
          value={`${diff.cardCountBefore} → ${diff.cardCountAfter}`}
        />
        <Stat
          label="Complexity"
          value={`${diff.complexityBefore.label} → ${diff.complexityAfter.label}`}
          hint={diff.complexityAfter.factors.slice(0, 2).join(" · ")}
        />
        <Panel className="!p-4">
          <p className="text-xs uppercase tracking-wider text-bone-dim">
            Ecosystems
          </p>
          <p className="mt-1 text-sm text-bone-muted">
            {diff.ecosystemsAfter.join(", ") || "—"}
          </p>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 animate-rise">
        <Panel title="Optional spend tweak" subtitle="Overrides one category for this simulation only.">
          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              className="field flex-1"
              value={spendTweak}
              onChange={(e) =>
                setSpendTweak(e.target.value as SpendCategory | "")
              }
            >
              <option value="">No tweak</option>
              {PRIMARY_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              className="field w-full sm:w-32"
              placeholder="Amount"
              value={spendAmount || ""}
              onChange={(e) => setSpendAmount(Number(e.target.value) || 0)}
            />
          </div>
        </Panel>

        <Panel title="Your wallet" subtitle="Simulate remove (does not delete until you save).">
          <ul className="max-h-48 space-y-2 overflow-y-auto">
            {candidates
              .filter((c) => ownedIds.has(c.id))
              .map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="text-bone">{c.cardName}</span>
                  <button
                    type="button"
                    onClick={() => toggleSimRemove(c.id)}
                    className={
                      simRemove.includes(c.id)
                        ? "text-danger text-xs font-medium"
                        : "text-bone-dim text-xs hover:text-danger"
                    }
                  >
                    {simRemove.includes(c.id) ? "Removing" : "Sim remove"}
                  </button>
                </li>
              ))}
          </ul>
        </Panel>
      </div>

      <Panel
        className="mt-6 animate-rise"
        title="Catalog — simulate add"
        subtitle="Tap to add to simulation; use toggle on dashboard to persist ownership."
      >
        <ul className="grid gap-2 sm:grid-cols-2">
          {candidates.slice(0, 24).map((c) => {
            const owned = ownedIds.has(c.id);
            const adding = simAdd.includes(c.id);
            return (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-md border border-line px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-bone">
                    {c.cardName}
                  </p>
                  <p className="text-xs text-bone-dim">
                    {formatCurrency(c.annualFee)}/yr
                  </p>
                </div>
                {owned ? (
                  <Badge tone="default">Owned</Badge>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleSimAdd(c.id)}
                    className={
                      adding
                        ? "text-xs font-medium text-signal"
                        : "text-xs text-bone-muted hover:text-signal"
                    }
                  >
                    {adding ? "In sim" : "Sim add"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-xs text-bone-dim">
          To add a card to your real wallet, use Discover or toggle from Coverage.
          <button
            type="button"
            className="ml-1 text-signal hover:underline"
            onClick={() => {
              for (const id of simAdd) toggleOwnedCard(id);
              setSimAdd([]);
            }}
          >
            Apply sim adds to wallet
          </button>
        </p>
      </Panel>
    </div>
  );
}
