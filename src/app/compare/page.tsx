"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  EmptyState,
  PageHeader,
  Panel,
  Stat,
} from "@/components/ui";
import {
  cardEcosystemLabel,
  compareTwoCards,
} from "@/lib/engines/compare";
import { useArsenalStore } from "@/lib/store";
import { CATEGORY_LABELS, formatCurrency } from "@/lib/utils";

export default function ComparePage() {
  const profile = useArsenalStore((s) => s.profile);
  const catalog = useArsenalStore((s) => s.catalog);
  const active = useMemo(
    () => catalog.filter((c) => c.active),
    [catalog]
  );

  const [idA, setIdA] = useState(active[0]?.id ?? "");
  const [idB, setIdB] = useState(active[1]?.id ?? "");

  const cardA = catalog.find((c) => c.id === idA);
  const cardB = catalog.find((c) => c.id === idB);

  const result =
    cardA && cardB && cardA.id !== cardB.id
      ? compareTwoCards(cardA, cardB, profile, catalog)
      : null;

  return (
    <div>
      <PageHeader
        eyebrow="Compare"
        title="Two-card comparison"
        description="Incremental effect on your wallet — not a generic feature table."
      />

      <Panel className="mb-6 animate-rise">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-bone-dim">
              Card A
            </span>
            <select
              className="field mt-2"
              value={idA}
              onChange={(e) => setIdA(e.target.value)}
            >
              {active.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.cardName}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-bone-dim">
              Card B
            </span>
            <select
              className="field mt-2"
              value={idB}
              onChange={(e) => setIdB(e.target.value)}
            >
              {active.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.cardName}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Panel>

      {!result ? (
        <EmptyState title="Pick two different cards" />
      ) : (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-2 animate-rise">
            <Stat
              label={`${result.cardA.cardName} — incremental net`}
              value={formatCurrency(result.incrementalIfAddA)}
              tone="signal"
            />
            <Stat
              label={`${result.cardB.cardName} — incremental net`}
              value={formatCurrency(result.incrementalIfAddB)}
              tone="signal"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2 animate-rise">
            <Panel title="Coverage adds">
              <div className="space-y-4 text-sm">
                <div>
                  <p className="font-medium text-bone">{result.cardA.cardName}</p>
                  <p className="mt-1 text-bone-muted">
                    {result.coverageAddsA.length
                      ? result.coverageAddsA
                          .map((c) => CATEGORY_LABELS[c])
                          .join(", ")
                      : "No clear wins vs current routing"}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-bone">{result.cardB.cardName}</p>
                  <p className="mt-1 text-bone-muted">
                    {result.coverageAddsB.length
                      ? result.coverageAddsB
                          .map((c) => CATEGORY_LABELS[c])
                          .join(", ")
                      : "No clear wins vs current routing"}
                  </p>
                </div>
                {result.overlaps.length > 0 && (
                  <p className="text-xs text-amber">
                    Overlap on:{" "}
                    {result.overlaps.map((c) => CATEGORY_LABELS[c]).join(", ")}
                  </p>
                )}
              </div>
            </Panel>

            <Panel title="Ecosystem">
              <ul className="space-y-2 text-sm text-bone-muted">
                <li>
                  {result.cardA.cardName}: {cardEcosystemLabel(result.cardA)}
                  {result.ecosystemIntroA && (
                    <Badge tone="signal" className="ml-2">
                      New: {result.ecosystemIntroA}
                    </Badge>
                  )}
                </li>
                <li>
                  {result.cardB.cardName}: {cardEcosystemLabel(result.cardB)}
                  {result.ecosystemIntroB && (
                    <Badge tone="signal" className="ml-2">
                      New: {result.ecosystemIntroB}
                    </Badge>
                  )}
                </li>
              </ul>
            </Panel>
          </div>

          <Panel className="mt-6 animate-rise" title="Category deltas (your spend)">
            <ul className="divide-y divide-line text-sm">
              {result.categoryDeltas.slice(0, 12).map((d) => (
                <li
                  key={d.category}
                  className="flex justify-between py-2 text-bone-muted"
                >
                  <span>{CATEGORY_LABELS[d.category]}</span>
                  <span>
                    {d.winner === "A" && (
                      <span className="text-signal">A +{formatCurrency(Math.abs(d.deltaDollars))}</span>
                    )}
                    {d.winner === "B" && (
                      <span className="text-signal">B +{formatCurrency(Math.abs(d.deltaDollars))}</span>
                    )}
                    {d.winner === "tie" && (
                      <span className="text-bone-dim">Even</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </>
      )}
    </div>
  );
}
