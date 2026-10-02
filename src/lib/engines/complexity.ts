import type { Card, Complexity, ComplexityScore } from "../types";

const RANK: Record<Complexity, number> = {
  simple: 0,
  moderate: 1,
  advanced: 2,
};

function countRotatingCategories(cards: Card[]): number {
  return cards.reduce(
    (n, c) =>
      n +
      c.categoryRewards.filter(
        (r) => r.period === "quarterly" || r.period === "monthly"
      ).length +
      (c.tags.includes("rotating") ? 1 : 0),
    0
  );
}

function countCappedCategories(cards: Card[]): number {
  return cards.reduce(
    (n, c) => n + c.categoryRewards.filter((r) => r.cap != null).length,
    0
  );
}

function countActivationCredits(cards: Card[]): number {
  return cards.reduce(
    (n, c) => n + c.credits.filter((cr) => cr.requiresActivation).length,
    0
  );
}

export function scoreWalletComplexity(cards: Card[]): ComplexityScore {
  if (cards.length === 0) {
    return { score: 0, label: "low", factors: ["Empty wallet"] };
  }

  const factors: string[] = [];
  let score = cards.length * 4;
  factors.push(`${cards.length} cards in wallet`);

  const programs = [...new Set(cards.map((c) => c.rewardProgram).filter(Boolean))];
  score += programs.length * 6;
  if (programs.length > 1) {
    factors.push(`${programs.length} reward programs`);
  }

  const maxCx = cards.reduce<Complexity>(
    (m, c) => (RANK[c.complexity] > RANK[m] ? c.complexity : m),
    "simple"
  );
  score += RANK[maxCx] * 12;
  if (maxCx !== "simple") factors.push(`${maxCx} card complexity`);

  const rotating = countRotatingCategories(cards);
  score += rotating * 5;
  if (rotating > 0) factors.push(`${rotating} rotating category rule(s)`);

  const monthlyCredits = cards.reduce(
    (acc, c) =>
      acc +
      c.credits.filter((cr) => cr.name.toLowerCase().includes("monthly")).length,
    0
  );
  score += monthlyCredits * 4;
  if (monthlyCredits > 0) {
    factors.push(`${monthlyCredits} monthly credit(s) to track`);
  }

  const caps = countCappedCategories(cards);
  score += caps * 2;
  if (caps > 0) factors.push(`${caps} spend cap(s)`);

  const portals = cards.filter((c) =>
    c.tags.some((t) => t.includes("portal") || t === "travel_portal")
  ).length;
  score += portals * 3;
  if (portals > 0) factors.push("Portal booking rules on some cards");

  const activation = countActivationCredits(cards);
  score += activation * 3;
  if (activation > 0) {
    factors.push(`${activation} credit(s) requiring activation`);
  }

  let label: ComplexityScore["label"] = "low";
  if (score >= 70) label = "very_high";
  else if (score >= 45) label = "high";
  else if (score >= 25) label = "moderate";

  return { score, label, factors };
}

export function ecosystemLabels(cards: Card[]): string[] {
  const set = new Set<string>();
  for (const c of cards) {
    set.add(c.rewardProgram || c.issuer);
  }
  return [...set].sort();
}
