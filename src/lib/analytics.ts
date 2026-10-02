export const AnalyticsEvents = {
  ONBOARDING_COMPLETE: "onboarding_complete",
  CARD_ADDED: "card_added",
  CARD_REMOVED: "card_removed",
  SPENDING_UPDATED: "spending_updated",
  VALUATION_UPDATED: "valuation_updated",
  PROFILE_EXPORT: "profile_export",
  PROFILE_IMPORT: "profile_import",
  DATA_DELETED: "data_deleted",
  DEMO_LOADED: "demo_loaded",
} as const;

export type AnalyticsEventName =
  (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

const LOG_KEY = "arsenal-analytics-log";
const MAX_EVENTS = 500;

export interface AnalyticsEventRecord {
  name: AnalyticsEventName | string;
  props?: Record<string, string | number | boolean | null>;
  at: string;
}

function isDev(): boolean {
  return process.env.NODE_ENV === "development";
}

function readLog(): AnalyticsEventRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AnalyticsEventRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLog(events: AnalyticsEventRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch {}
}

export function trackEvent(
  name: AnalyticsEventName | string,
  props?: Record<string, string | number | boolean | null>
): void {
  const record: AnalyticsEventRecord = {
    name,
    props,
    at: new Date().toISOString(),
  };
  if (isDev()) {
    console.info("[analytics]", record.name, record.props ?? {});
  }
  const next = [...readLog(), record];
  writeLog(next);
}
