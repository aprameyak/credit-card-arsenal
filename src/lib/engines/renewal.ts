import type { FeeAnalysis, UserProfile } from "../types";
import { analyzeRenewals } from "./fees";

/** Fee-bearing cards only — same valuation rules as the fees engine. */
export function analyzeFeeRenewals(
  profile: UserProfile,
  catalog: import("../types").Card[]
): FeeAnalysis[] {
  return analyzeRenewals(profile, catalog).filter((a) => a.annualFee > 0);
}
