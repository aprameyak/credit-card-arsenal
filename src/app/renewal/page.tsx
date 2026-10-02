"use client";

import {
  Badge,
  EmptyState,
  PageHeader,
  Panel,
} from "@/components/ui";
import { analyzeFeeRenewals } from "@/lib/engines/renewal";
import { useArsenalStore } from "@/lib/store";
import type { FeeRenewalAction } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const ACTION_LABEL: Record<FeeRenewalAction, string> = {
  keep: "Keep — value looks reasonable",
  investigate_downgrade: "Investigate downgrade",
  compare_alternatives: "Compare alternatives",
  reassess_usage: "Reassess usage & credits",
};

const ACTION_TONE: Record<
  FeeRenewalAction,
  "signal" | "amber" | "default" | "danger"
> = {
  keep: "signal",
  investigate_downgrade: "amber",
  compare_alternatives: "amber",
  reassess_usage: "default",
};

export default function RenewalPage() {
  const profile = useArsenalStore((s) => s.profile);
  const catalog = useArsenalStore((s) => s.catalog);
  const analyses = analyzeFeeRenewals(profile, catalog);

  return (
    <div>
      <PageHeader
        eyebrow="Renewal"
        title="Annual fee reviews"
        description="Investigation prompts only — not advice to close or product-change."
      />

      {analyses.length === 0 ? (
        <EmptyState
          title="No annual-fee cards"
          description="Fee reviews apply to owned cards with a positive annual fee."
        />
      ) : (
        <div className="space-y-6 animate-rise">
          {analyses.map((a) => (
            <Panel key={a.cardId}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="font-display text-lg font-semibold text-bone">
                  {a.cardName}
                </h3>
                <Badge tone={ACTION_TONE[a.renewalAction]}>
                  {ACTION_LABEL[a.renewalAction]}
                </Badge>
              </div>

              <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                <div>
                  <dt className="text-xs text-bone-dim">Annual fee</dt>
                  <dd>{formatCurrency(a.annualFee)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-bone-dim">Est. rewards (routing)</dt>
                  <dd className="text-signal">
                    {formatCurrency(a.rewardsValue)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-bone-dim">Credits (face)</dt>
                  <dd>{formatCurrency(a.creditsValue)}</dd>
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

              <p className="mt-3 text-xs text-bone-dim">
                First-year incl. welcome (est.):{" "}
                {formatCurrency(a.firstYear.netValue)}
              </p>

              <ul className="mt-4 list-disc space-y-1 pl-4 text-sm text-bone-muted">
                {a.renewalNotes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
