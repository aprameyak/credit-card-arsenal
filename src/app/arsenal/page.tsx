"use client";

import Link from "next/link";
import {
  Badge,
  Button,
  EmptyState,
  PageHeader,
  Panel,
  Stat,
} from "@/components/ui";
import { analyzeArsenal, computeRouting, gapCategories } from "@/lib/engines/arsenal";
import { analyzeAllWelcomeBonuses } from "@/lib/engines/welcome";
import { getOwnedCardObjects } from "@/lib/engines/spending";
import { VALUATION_ASSUMPTIONS } from "@/lib/engines/valuation";
import { useArsenalStore } from "@/lib/store";
import {
  CATEGORY_LABELS,
  PRIMARY_CATEGORIES,
  formatCurrency,
  formatPercent,
} from "@/lib/utils";

export default function ArsenalDashboardPage() {
  const profile = useArsenalStore((s) => s.profile);
  const catalog = useArsenalStore((s) => s.catalog);
  const analysis = analyzeArsenal(profile, catalog);
  const pairs = getOwnedCardObjects(profile.ownedCards, catalog);
  const gaps = gapCategories(analysis.coverage);
  const routing = computeRouting(profile, catalog);
  const welcome = analyzeAllWelcomeBonuses(profile, catalog).filter((w) => !w.completed);

  if (profile.ownedCards.length === 0) {
    return (
      <div>
        <PageHeader title="Your arsenal" description="Dashboard for roles, coverage, and net value." />
        <EmptyState
          title="No cards in your wallet yet"
          description="Complete onboarding or load the demo to see insights."
          action={
            <Link
              href="/onboarding"
              className="text-sm font-medium text-signal hover:underline"
            >
              Go to onboarding →
            </Link>
          }
        />
      </div>
    );
  }

  const credits = pairs.reduce(
    (s, p) => s + p.card.credits.reduce((a, c) => a + c.annualValue, 0),
    0
  );

  const creditTeaser = pairs
    .flatMap(({ card }) =>
      card.credits.map((cr) => ({ card: card.cardName, ...cr }))
    )
    .slice(0, 3);

  const nextStep =
    gaps.length > 0
      ? `Fill ${CATEGORY_LABELS[gaps[0]!.category]} gap via Pathway`
      : analysis.insights.find((i) => i.severity === "opportunity")?.title ??
        "Review Simulate for next card";

  const miniGuide = PRIMARY_CATEGORIES.map((cat) => {
    const r = routing.find((x) => x.category === cat);
    return r ? { cat, name: r.cardName, rate: r.effectiveRate } : null;
  }).filter(Boolean);

  return (
    <div>
      <PageHeader
        eyebrow="Dashboard"
        title="Your arsenal"
        description="Roles inferred from routing; edit spend and valuations to refine estimates."
        action={
          <Button variant="secondary" href="/pathway">
            Next: Pathway
          </Button>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5 animate-rise">
        <Stat label="Cards" value={pairs.length} />
        <Stat
          label="Ongoing value (rewards)"
          value={formatCurrency(analysis.optimizedAnnualRewards)}
          tone="signal"
        />
        <Stat label="Annual fees" value={formatCurrency(analysis.annualFees)} />
        <Stat label="Credits (face value)" value={formatCurrency(credits)} tone="amber" />
        <Stat
          label="Net (est.)"
          value={formatCurrency(analysis.netOptimizedValue)}
          hint="Rewards + credits − fees"
          tone={analysis.netOptimizedValue >= 0 ? "signal" : "danger"}
        />
      </div>

      <Panel className="mb-6 animate-rise" title="Next strategy step">
        <p className="text-sm text-bone-muted">{nextStep}</p>
        <Button href="/pathway" className="mt-4">
          Open pathway
        </Button>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2 animate-rise">
        <Panel title="This month — credits & welcome">
          {creditTeaser.length === 0 && welcome.length === 0 ? (
            <p className="text-sm text-bone-muted">No fee credits or open bonuses modeled.</p>
          ) : (
            <ul className="space-y-2 text-sm text-bone-muted">
              {creditTeaser.map((cr) => (
                <li key={cr.id}>
                  <span className="text-bone">{cr.name}</span> on {cr.card} —{" "}
                  {formatCurrency(cr.annualValue)}/yr face
                </li>
              ))}
              {welcome.slice(0, 2).map((w) => (
                <li key={w.cardId}>
                  <Link href="/welcome" className="text-signal hover:underline">
                    Welcome bonus in progress
                  </Link>
                  — {formatCurrency(w.spendRemaining)} remaining
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Mini spending guide">
          <ul className="space-y-2 text-sm">
            {miniGuide.slice(0, 6).map((g) =>
              g ? (
                <li
                  key={g.cat}
                  className="flex justify-between text-bone-muted"
                >
                  <span>{CATEGORY_LABELS[g.cat]}</span>
                  <span>
                    {g.name}{" "}
                    <span className="text-bone-dim">
                      ({formatPercent(g.rate)})
                    </span>
                  </span>
                </li>
              ) : null
            )}
          </ul>
          <Link
            href="/guide"
            className="mt-3 inline-block text-xs text-signal hover:underline"
          >
            Full guide →
          </Link>
        </Panel>

        <Panel title="Card roles">
          <ul className="space-y-3">
            {pairs.map(({ owned, card }) => {
              const roleLabel =
                owned.assignedRole === "catchall"
                  ? "Catch-all"
                  : owned.assignedRole
                    ? owned.assignedRole
                    : Object.entries(analysis.roles).find(([, name]) =>
                        name.includes(card.cardName)
                      )?.[0] ?? "Multi-category";
              return (
                <li
                  key={card.id}
                  className="flex items-center justify-between rounded-md border border-line px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-bone">
                      {card.issuer} {card.cardName}
                    </p>
                    <p className="text-xs capitalize text-bone-dim">{roleLabel}</p>
                  </div>
                  <Badge tone="signal">{formatCurrency(card.annualFee)}/yr</Badge>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel title="Insights">
          {analysis.insights.length === 0 && gaps.length === 0 ? (
            <p className="text-sm text-bone-muted">
              No major category gaps detected at current spend levels.
            </p>
          ) : (
            <ul className="space-y-3">
              {analysis.insights.map((i) => (
                <li key={i.id} className="text-sm text-bone-muted">
                  <span
                    className={
                      i.severity === "warning"
                        ? "text-amber"
                        : i.severity === "opportunity"
                          ? "text-signal"
                          : "text-bone"
                    }
                  >
                    {i.title}
                  </span>{" "}
                  — {i.body}
                </li>
              ))}
              {gaps.slice(0, 2).map((g) => (
                <li key={g.category} className="text-sm text-bone-muted">
                  <span className="text-amber capitalize">{g.category}</span> —{" "}
                  {g.gapReason}{" "}
                  <span className="text-bone-dim">
                    ({formatPercent(g.effectiveRate)} effective)
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-bone-dim">{VALUATION_ASSUMPTIONS}</p>
        </Panel>
      </div>
    </div>
  );
}
