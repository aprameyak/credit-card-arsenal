"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  EmptyState,
  PageHeader,
  Panel,
  VerifiedAt,
} from "@/components/ui";
import { useArsenalStore } from "@/lib/store";
import type { Card } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export default function DiscoverPage() {
  const profile = useArsenalStore((s) => s.profile);
  const catalog = useArsenalStore((s) => s.catalog);
  const owned = new Set(profile.ownedCards.map((o) => o.cardId));

  const [noFeeOnly, setNoFeeOnly] = useState(profile.feeTolerance === "none");
  const [travel, setTravel] = useState(
    profile.goals.some((g) =>
      ["travel_rewards", "flights", "hotels", "premium_travel"].includes(g)
    )
  );
  const [simple, setSimple] = useState(profile.desiredComplexity === "simple");

  const results = useMemo(() => {
    return catalog
      .filter((c) => c.active && !owned.has(c.id))
      .filter((c) => (noFeeOnly ? c.annualFee === 0 : true))
      .filter((c) =>
        travel
          ? c.hasAirlineBenefits ||
            c.hasHotelBenefits ||
            c.tags.includes("travel") ||
            c.tags.includes("premium_travel")
          : true
      )
      .filter((c) => (simple ? c.complexity !== "advanced" : true))
      .sort((a, b) => scoreCard(b, profile.goals) - scoreCard(a, profile.goals));
  }, [catalog, owned, noFeeOnly, travel, simple, profile.goals]);

  return (
    <div>
      <PageHeader
        eyebrow="Discover"
        title="Personalized catalog"
        description="Filtered by your goals and fee tolerance — offers shown with verification dates."
      />

      <Panel className="mb-6 animate-rise" title="Filters">
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2 text-bone-muted">
            <input
              type="checkbox"
              checked={noFeeOnly}
              onChange={(e) => setNoFeeOnly(e.target.checked)}
            />
            No annual fee
          </label>
          <label className="flex items-center gap-2 text-bone-muted">
            <input
              type="checkbox"
              checked={travel}
              onChange={(e) => setTravel(e.target.checked)}
            />
            Travel tilt
          </label>
          <label className="flex items-center gap-2 text-bone-muted">
            <input
              type="checkbox"
              checked={simple}
              onChange={(e) => setSimple(e.target.checked)}
            />
            Hide advanced complexity
          </label>
        </div>
      </Panel>

      {results.length === 0 ? (
        <EmptyState
          title="No matches"
          description="Relax filters or remove cards you already own from consideration."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 animate-rise">
          {results.map((c) => (
            <CardTile key={c.id} card={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function scoreCard(card: Card, goals: string[]): number {
  let s = 0;
  if (goals.includes("no_annual_fees") && card.annualFee === 0) s += 3;
  if (goals.includes("travel_rewards") && card.tags.includes("travel")) s += 2;
  if (goals.includes("signup_bonuses") && card.welcomeOffer) s += 2;
  if (card.welcomeOffer) s += card.welcomeOffer.estimatedValue / 500;
  return s;
}

function CardTile({ card }: { card: Card }) {
  return (
    <Panel>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-base font-semibold text-bone">
            {card.issuer} {card.cardName}
          </h3>
          <VerifiedAt date={card.lastVerifiedAt} />
        </div>
        <Badge tone={card.annualFee === 0 ? "signal" : "default"}>
          {card.annualFee === 0 ? "No fee" : formatCurrency(card.annualFee)}
        </Badge>
      </div>
      {card.welcomeOffer && (
        <p className="mt-3 text-sm text-bone-muted">
          {card.welcomeOffer.description}{" "}
          <span className="text-signal">
            (~{formatCurrency(card.welcomeOffer.estimatedValue)} est.)
          </span>
        </p>
      )}
      <p className="mt-2 text-xs text-bone-dim capitalize">
        {card.complexity} · {card.rewardProgram}
      </p>
    </Panel>
  );
}
