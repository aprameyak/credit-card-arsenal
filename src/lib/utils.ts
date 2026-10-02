import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { SpendCategory } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const CATEGORY_LABELS: Record<SpendCategory, string> = {
  dining: "Dining",
  groceries: "Groceries",
  gas: "Gas",
  travel: "Travel",
  flights: "Flights",
  hotels: "Hotels",
  transit: "Transit",
  streaming: "Streaming",
  online: "Online Shopping",
  drugstores: "Drugstores",
  utilities: "Utilities",
  rent: "Rent",
  mobile_wallet: "Mobile Wallet",
  other: "Everything Else",
};

export const ALL_CATEGORIES: SpendCategory[] = [
  "dining",
  "groceries",
  "gas",
  "travel",
  "flights",
  "hotels",
  "transit",
  "streaming",
  "online",
  "drugstores",
  "utilities",
  "rent",
  "mobile_wallet",
  "other",
];

export const PRIMARY_CATEGORIES: SpendCategory[] = [
  "dining",
  "groceries",
  "gas",
  "travel",
  "online",
  "streaming",
  "transit",
  "other",
];

export function formatCurrency(n: number, digits = 0): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(n);
}

export function formatPercent(rate: number, digits = 1): string {
  return `${(rate * 100).toFixed(digits)}%`;
}

export function annualize(
  amount: number,
  mode: "monthly" | "annual"
): number {
  return mode === "monthly" ? amount * 12 : amount;
}

export function monthsBetween(a: string, b: Date = new Date()): number {
  const d = new Date(a);
  return (
    (b.getFullYear() - d.getFullYear()) * 12 + (b.getMonth() - d.getMonth())
  );
}

export function daysAgo(iso: string): number {
  return Math.floor(
    (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24)
  );
}
