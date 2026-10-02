import type { Card, OwnedCard, UserProfile, WelcomeBonusAnalysis } from "../types";
import { getCardById } from "../cards/database";
import { getTotalAnnualSpend } from "./spending";

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function addMonths(iso: string, months: number): string {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function analyzeWelcomeBonus(
  owned: OwnedCard,
  profile: UserProfile,
  catalog?: Card[]
): WelcomeBonusAnalysis | null {
  const card = getCardById(owned.cardId, catalog);
  if (!card?.welcomeOffer) return null;
  if (owned.welcomeBonusCompleted) {
    return {
      cardId: owned.cardId,
      spendRequirement: card.welcomeOffer.spendRequirement,
      spendCompleted: card.welcomeOffer.spendRequirement,
      spendRemaining: 0,
      deadlineDays: null,
      deadlineIso: owned.welcomeDeadline ?? null,
      completed: true,
      projectedNaturalSpend: 0,
      gapVsNaturalSpend: 0,
      warnings: [],
      assumptions: ["Bonus marked complete in your profile."],
    };
  }

  const req = card.welcomeOffer.spendRequirement;
  const completed = owned.welcomeSpendCompleted ?? 0;
  const remaining = Math.max(0, req - completed);

  const opened = owned.openedAt ?? new Date().toISOString().slice(0, 10);
  const deadlineIso =
    owned.welcomeDeadline ??
    addMonths(opened, card.welcomeOffer.timeWindowMonths);
  const deadlineDays = daysUntil(deadlineIso);

  const monthsLeft =
    deadlineDays != null ? Math.max(1, deadlineDays / 30) : card.welcomeOffer.timeWindowMonths;
  const annual = getTotalAnnualSpend(profile.spending);
  const monthlyNatural = annual / 12;
  const projectedNatural = monthlyNatural * monthsLeft;

  const gap = Math.max(0, remaining - projectedNatural);
  const warnings: string[] = [];
  if (gap > 500) {
    warnings.push(
      "Projected natural spend may not reach the bonus threshold in time — avoid overspending or manufactured spend unless you already planned it."
    );
  }
  if (deadlineDays != null && deadlineDays < 14 && remaining > 0) {
    warnings.push("Deadline is within two weeks with spend still remaining.");
  }

  return {
    cardId: owned.cardId,
    spendRequirement: req,
    spendCompleted: completed,
    spendRemaining: remaining,
    deadlineDays,
    deadlineIso,
    completed: false,
    projectedNaturalSpend: projectedNatural,
    gapVsNaturalSpend: gap,
    warnings,
    assumptions: [
      "Natural spend projection uses total profile spend ÷ 12 × months left.",
      "Does not assume you will shift spend to this card.",
    ],
  };
}

export function analyzeAllWelcomeBonuses(
  profile: UserProfile,
  catalog?: Card[]
): WelcomeBonusAnalysis[] {
  return profile.ownedCards
    .map((o) => analyzeWelcomeBonus(o, profile, catalog))
    .filter((x): x is WelcomeBonusAnalysis => x != null);
}
