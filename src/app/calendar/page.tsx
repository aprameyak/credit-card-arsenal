"use client";

import {
  EmptyState,
  PageHeader,
  Panel,
  Badge,
} from "@/components/ui";
import { buildSpendingCalendar } from "@/lib/engines/calendar";
import { useArsenalStore } from "@/lib/store";
import { CATEGORY_LABELS } from "@/lib/utils";

export default function CalendarPage() {
  const profile = useArsenalStore((s) => s.profile);
  const catalog = useArsenalStore((s) => s.catalog);
  const periods = buildSpendingCalendar(profile, catalog);

  if (profile.ownedCards.length === 0) {
    return (
      <div>
        <PageHeader title="Spending calendar" />
        <EmptyState title="No cards" description="Add cards to see routing and rotating hints." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Calendar"
        title="Quarterly & monthly guide"
        description="Rotating activation reminders plus default category routing from your wallet."
      />

      <div className="space-y-6 animate-rise">
        {periods.map((p) => (
          <Panel
            key={p.id}
            title={p.label}
            subtitle={p.kind === "quarter" ? "Quarter view" : "Month view"}
          >
            {p.rotatingHints.length > 0 && (
              <div className="mb-4 space-y-2">
                <p className="text-xs uppercase tracking-wider text-bone-dim">
                  Rotating categories
                </p>
                {p.rotatingHints.map((h) => (
                  <div
                    key={h.cardName}
                    className="rounded-md border border-amber/30 bg-amber/5 px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-bone">{h.cardName}</span>
                    <span className="text-bone-muted"> — {h.note}</span>
                  </div>
                ))}
              </div>
            )}

            <p className="mb-2 text-xs uppercase tracking-wider text-bone-dim">
              Default routing
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {p.defaultRouting.map((r) => (
                <li
                  key={r.category}
                  className="flex justify-between rounded-md border border-line px-3 py-2 text-sm"
                >
                  <span className="text-bone-muted">
                    {CATEGORY_LABELS[r.category]}
                  </span>
                  <span className="text-bone">{r.cardName}</span>
                </li>
              ))}
            </ul>
            {p.rotatingHints.length === 0 && p.kind === "month" && (
              <p className="mt-3 text-xs text-bone-dim">
                No rotating-category cards in wallet — routing stays steady.
              </p>
            )}
            {!profile.rotatingCategoriesOk && p.rotatingHints.length > 0 && (
              <Badge tone="amber" className="mt-3">
                Profile: rotating categories not preferred
              </Badge>
            )}
          </Panel>
        ))}
      </div>
    </div>
  );
}
