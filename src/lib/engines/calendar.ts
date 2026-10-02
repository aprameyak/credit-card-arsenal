import type { Card, SpendCategory, UserProfile } from "../types";
import { CATEGORY_LABELS, PRIMARY_CATEGORIES } from "../utils";
import { getOwnedCardObjects, optimizeSpending } from "./spending";

export interface CalendarPeriod {
  id: string;
  label: string;
  kind: "month" | "quarter";
  rotatingHints: { cardName: string; note: string }[];
  defaultRouting: { category: SpendCategory; cardName: string }[];
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

function rotatingNotes(cards: Card[]): { cardName: string; note: string }[] {
  const hints: { cardName: string; note: string }[] = [];
  for (const card of cards) {
    if (!card.tags.includes("rotating")) continue;
    const quarterly = card.categoryRewards.filter(
      (r) => r.period === "quarterly" || r.restrictions?.some((x) => x.includes("Rotating"))
    );
    if (quarterly.length === 0) {
      hints.push({
        cardName: card.cardName,
        note: "Activate rotating categories each quarter (check issuer calendar).",
      });
    } else {
      const cats = [...new Set(quarterly.map((r) => CATEGORY_LABELS[r.category]))];
      hints.push({
        cardName: card.cardName,
        note: `Elevated earn on ${cats.join(", ")} when activated — verify current issuer list.`,
      });
    }
  }
  return hints;
}

export function buildSpendingCalendar(
  profile: UserProfile,
  catalog: Card[]
): CalendarPeriod[] {
  const cards = getOwnedCardObjects(profile.ownedCards, catalog).map(
    (p) => p.card
  );
  const { routing } = optimizeSpending(
    cards,
    profile.spending,
    profile.valuations
  );
  const defaultRouting = PRIMARY_CATEGORIES.map((category) => {
    const r = routing.find((x) => x.category === category);
    return {
      category,
      cardName: r?.cardName ?? "—",
    };
  }).filter((r) => r.cardName !== "—");

  const rotating = rotatingNotes(cards);
  const now = new Date();
  const monthIdx = now.getMonth();
  const quarterIdx = Math.floor(monthIdx / 3);

  const periods: CalendarPeriod[] = [];

  for (let i = 0; i < 3; i++) {
    const m = (monthIdx + i) % 12;
    periods.push({
      id: `m-${m}`,
      label: MONTHS[m]!,
      kind: "month",
      rotatingHints: i === 0 ? rotating : [],
      defaultRouting,
    });
  }

  for (let i = 0; i < 2; i++) {
    const qOffset = quarterIdx + i;
    const q = qOffset % 4;
    const year = now.getFullYear() + Math.floor(qOffset / 4);
    periods.push({
      id: `q-${year}-${q}`,
      label: `${QUARTERS[q]} ${year}`,
      kind: "quarter",
      rotatingHints: rotating,
      defaultRouting,
    });
  }

  return periods;
}
