"use client";

import { useMemo } from "react";
import {
  Badge,
  EmptyState,
  PageHeader,
  Panel,
} from "@/components/ui";
import { checkEligibility } from "@/lib/engines/pathway";
import { getCardById } from "@/lib/cards/database";
import { useArsenalStore } from "@/lib/store";
import type { ApplicationRuleSourceType } from "@/lib/types";
import { daysAgo } from "@/lib/utils";

function sourceLabel(t: ApplicationRuleSourceType): string {
  switch (t) {
    case "issuer_published":
      return "Published issuer rule";
    case "issuer_help":
      return "Issuer help / FAQ";
    case "community_reported":
      return "Community-reported";
    default:
      return "Unknown source";
  }
}

export default function TimelinePage() {
  const profile = useArsenalStore((s) => s.profile);
  const catalog = useArsenalStore((s) => s.catalog);
  const setProfile = useArsenalStore((s) => s.setProfile);
  const notes = profile.planningNotes || "";

  const events = useMemo(() => {
    const items: {
      id: string;
      date: string;
      title: string;
      detail: string;
      kind: "open" | "apply" | "close";
    }[] = [];

    for (const o of profile.ownedCards) {
      if (o.openedAt) {
        const card = getCardById(o.cardId);
        items.push({
          id: `open-${o.cardId}`,
          date: o.openedAt,
          title: `Opened ${card?.cardName ?? o.cardId}`,
          detail: card?.issuer ?? "",
          kind: "open",
        });
      }
    }
    for (const h of profile.applicationHistory) {
      const card = getCardById(h.cardId);
      items.push({
        id: `app-${h.cardId}-${h.appliedAt}`,
        date: h.appliedAt,
        title: `Applied — ${card?.cardName ?? h.cardId}`,
        detail: `Outcome: ${h.outcome}`,
        kind: "apply",
      });
    }
    for (const c of profile.closedCards) {
      const card = getCardById(c.cardId);
      items.push({
        id: `close-${c.cardId}`,
        date: c.closedAt,
        title: `Closed ${card?.cardName ?? c.cardId}`,
        detail: "",
        kind: "close",
      });
    }

    return items.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [profile]);

  const planningCards = catalog
    .filter((c) => c.active && !profile.ownedCards.some((o) => o.cardId === c.id))
    .slice(0, 5);

  return (
    <div>
      <PageHeader
        eyebrow="Timeline"
        title="Application history"
        description="Visual timeline plus eligibility heuristics — verify before you apply."
      />

      {events.length === 0 ? (
        <EmptyState
          title="No dated history yet"
          description="Add opened dates on owned cards or log applications in onboarding."
        />
      ) : (
        <Panel className="mb-8 animate-rise" title="History">
          <ol className="relative border-l border-line pl-6">
            {events.map((e) => (
              <li key={e.id} className="mb-6 last:mb-0">
                <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-signal ring-4 ring-[var(--ink)]" />
                <time className="text-xs font-mono text-bone-dim">{e.date}</time>
                <p className="font-display font-semibold text-bone">{e.title}</p>
                {e.detail && (
                  <p className="text-sm text-bone-muted">{e.detail}</p>
                )}
                <p className="text-xs text-bone-dim">{daysAgo(e.date)} days ago</p>
              </li>
            ))}
          </ol>
        </Panel>
      )}

      <Panel title="Planning notes (eligibility heuristics)">
        <p className="mb-4 text-sm text-bone-muted">
          Sample next cards — rules are modeled from catalog metadata, not live
          issuer decisions.
        </p>
        <ul className="space-y-4">
          {planningCards.map((card) => {
            const { eligible, reasons } = checkEligibility(card, profile);
            const published = card.applicationRules.filter(
              (r) => r.sourceType === "issuer_published"
            );
            const community = card.applicationRules.filter(
              (r) => r.sourceType === "community_reported"
            );
            return (
              <li
                key={card.id}
                className="rounded-md border border-line px-4 py-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-bone">{card.cardName}</p>
                  <Badge tone={eligible ? "signal" : "amber"}>
                    {eligible ? "Likely eligible" : "Conflicts"}
                  </Badge>
                </div>
                <ul className="mt-2 list-disc pl-4 text-sm text-bone-muted">
                  {reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                {published.length > 0 && (
                  <p className="mt-2 text-xs text-bone-dim">
                    <strong className="text-bone-muted">Published:</strong>{" "}
                    {published.map((r) => r.description).join(" · ")}
                  </p>
                )}
                {community.length > 0 && (
                  <p className="mt-1 text-xs text-amber">
                    <strong>Community:</strong>{" "}
                    {community.map((r) => r.description).join(" · ")}
                  </p>
                )}
                {card.applicationRules.map((r) => (
                  <p key={r.id} className="mt-1 text-[11px] text-bone-dim">
                    {sourceLabel(r.sourceType)} · {r.confidence} confidence
                  </p>
                ))}
              </li>
            );
          })}
        </ul>

        <label className="mt-6 block">
          <span className="text-xs uppercase tracking-wider text-bone-dim">
            Your planning notes (local only)
          </span>
          <textarea
            className="field mt-2 min-h-[80px] w-full"
            value={notes}
            onChange={(e) => setProfile({ planningNotes: e.target.value })}
            placeholder="e.g. wait until 4/24 clears…"
          />
          <p className="mt-1 text-[11px] text-bone-dim">
            Saved in local browser storage with your profile.
          </p>
        </label>
      </Panel>
    </div>
  );
}
