"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Badge,
  EmptyState,
  PageHeader,
  Panel,
} from "@/components/ui";
import { buildPathways } from "@/lib/engines/pathway";
import { useArsenalStore } from "@/lib/store";
import { CATEGORY_LABELS, formatCurrency } from "@/lib/utils";
import type { PathwayStep } from "@/lib/types";

const BRANCH_META: Record<
  string,
  { label: string; accent: string; trunk: string }
> = {
  gap_fill: {
    label: "Gap fill",
    accent: "border-signal/50",
    trunk: "from-signal/40",
  },
  cashback: {
    label: "Cashback branch",
    accent: "border-emerald-500/40",
    trunk: "from-emerald-500/30",
  },
  flexible_points: {
    label: "Flexible points",
    accent: "border-sky-500/40",
    trunk: "from-sky-500/30",
  },
  travel: {
    label: "Travel branch",
    accent: "border-violet-500/40",
    trunk: "from-violet-500/30",
  },
};

function StepNode({
  step,
  index,
  selected,
  onSelect,
}: {
  step: PathwayStep;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-lg border px-4 py-3 text-left transition ${
        selected
          ? "border-signal/60 bg-signal/10"
          : "border-line bg-ink-elevated/40 hover:border-signal/30"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-signal/20 text-xs font-bold text-signal">
          {index + 1}
        </span>
        <p className="font-display font-semibold text-bone">{step.cardName}</p>
      </div>
      <p className="mt-2 line-clamp-2 text-xs text-bone-muted">{step.reason}</p>
      <p className="mt-1 text-xs text-signal">
        +{formatCurrency(step.incrementalValue)} est.
      </p>
    </button>
  );
}

export default function PathwayPage() {
  const profile = useArsenalStore((s) => s.profile);
  const catalog = useArsenalStore((s) => s.catalog);
  const pathways = buildPathways(profile, catalog).filter(
    (p) => p.steps.length > 0
  );
  const [selected, setSelected] = useState<{
    pathwayId: string;
    stepIndex: number;
  } | null>(null);

  const detail =
    selected &&
    pathways
      .find((p) => p.id === selected.pathwayId)
      ?.steps[selected.stepIndex];

  return (
    <div>
      <PageHeader
        eyebrow="Pathway"
        title="Alternative pathways"
        description="Tree view: Cashback vs Travel branches — tap a step for details."
      />

      {pathways.length === 0 ? (
        <EmptyState title="No pathways yet" description="Add profile data to model next steps." />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_320px] animate-rise">
          <div className="space-y-10">
            {pathways.map((p) => {
              const meta = BRANCH_META[p.id] ?? BRANCH_META.gap_fill!;
              return (
                <Panel key={p.id} title={p.name} subtitle={p.description}>
                  <div className="mb-4 flex flex-wrap gap-2 text-sm text-bone-muted">
                    <span>Net est. {formatCurrency(p.estimatedNetValue)}</span>
                    <span className="text-bone-dim">·</span>
                    <span>Fees {formatCurrency(p.totalFees)}</span>
                    <Badge tone="default">{p.complexity}</Badge>
                    <Badge tone="signal" className="normal-case">
                      {meta.label}
                    </Badge>
                  </div>

                  <div className="relative">
                    <div
                      className={`absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b ${meta.trunk} to-transparent`}
                      aria-hidden
                    />
                    <ul className="space-y-4 pl-2">
                      {p.steps.map((step, si) => (
                        <motion.li
                          key={`${step.cardId}-${si}`}
                          initial={{ opacity: 0, y: 6 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: si * 0.05 }}
                          className={`relative pl-8 ${meta.accent}`}
                        >
                          <span className="absolute left-2.5 top-5 h-3 w-3 rounded-full bg-signal ring-4 ring-[var(--ink)]" />
                          <StepNode
                            step={step}
                            index={si}
                            selected={
                              selected?.pathwayId === p.id &&
                              selected.stepIndex === si
                            }
                            onSelect={() =>
                              setSelected({ pathwayId: p.id, stepIndex: si })
                            }
                          />
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                </Panel>
              );
            })}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <Panel title="Step detail">
              <AnimatePresence mode="wait">
                {detail ? (
                  <motion.div
                    key={`${selected?.pathwayId}-${selected?.stepIndex}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <p className="font-display text-lg font-semibold text-bone">
                      {detail.cardName}
                    </p>
                    <p className="mt-2 text-sm text-bone-muted">
                      {detail.reason}
                    </p>
                    <dl className="mt-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-bone-dim">Incremental</dt>
                        <dd className="text-signal">
                          {formatCurrency(detail.incrementalValue)}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-bone-dim">Annual fee</dt>
                        <dd>{formatCurrency(detail.annualFee)}</dd>
                      </div>
                    </dl>
                    {detail.fillsGaps.length > 0 && (
                      <p className="mt-3 text-xs text-bone-muted">
                        Fills:{" "}
                        {detail.fillsGaps
                          .map((g) => CATEGORY_LABELS[g])
                          .join(", ")}
                      </p>
                    )}
                    {detail.timingNote && (
                      <p className="mt-2 text-xs text-amber">
                        {detail.timingNote}
                      </p>
                    )}
                    {detail.applicationNotes.length > 0 && (
                      <ul className="mt-3 list-disc pl-4 text-xs text-bone-dim">
                        {detail.applicationNotes.map((n) => (
                          <li key={n}>{n}</li>
                        ))}
                      </ul>
                    )}
                  </motion.div>
                ) : (
                  <p className="text-sm text-bone-muted">
                    Select a step on any branch to see eligibility notes and value.
                  </p>
                )}
              </AnimatePresence>
            </Panel>
          </aside>
        </div>
      )}
    </div>
  );
}
