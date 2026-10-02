export type SpendCategory =
  | "dining"
  | "groceries"
  | "gas"
  | "travel"
  | "flights"
  | "hotels"
  | "transit"
  | "streaming"
  | "online"
  | "drugstores"
  | "utilities"
  | "rent"
  | "mobile_wallet"
  | "other";

export type RewardType = "cashback" | "points" | "miles";
export type RewardPeriod = "permanent" | "annual" | "quarterly" | "monthly";
export type Complexity = "simple" | "moderate" | "advanced";
export type Goal =
  | "simple_cashback"
  | "max_cashback"
  | "travel_rewards"
  | "flights"
  | "hotels"
  | "flexible_points"
  | "signup_bonuses"
  | "no_annual_fees"
  | "premium_travel"
  | "build_credit"
  | "simple_wallet"
  | "advanced_wallet";

export type CreditScoreRange =
  | "fair"
  | "good"
  | "very_good"
  | "excellent"
  | "prefer_not";

export type IncomeRange =
  | "under_50k"
  | "50_100k"
  | "100_200k"
  | "200k_plus"
  | "prefer_not";

export type FeeTolerance = "none" | "low" | "moderate" | "high";
export type TravelFrequency = "rare" | "occasional" | "frequent" | "heavy";

export interface CategoryRewardRule {
  category: SpendCategory;
  multiplier: number;
  rewardType: RewardType;
  cap: number | null;
  period: RewardPeriod;
  restrictions?: string[];
  onlineOnly?: boolean;
  mobileWalletOnly?: boolean;
  directBookingOnly?: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  lastVerifiedAt: string;
}

export interface CardCredit {
  id: string;
  name: string;
  annualValue: number;
  description: string;
  requiresActivation?: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  lastVerifiedAt: string;
}

export interface CardBenefit {
  id: string;
  name: string;
  category: string;
  estimatedAnnualValue: number;
  description: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  lastVerifiedAt: string;
}

export interface WelcomeOffer {
  description: string;
  bonusAmount: number;
  bonusType: RewardType | "statement_credit" | "points" | "miles" | "cash";
  spendRequirement: number;
  timeWindowMonths: number;
  estimatedValue: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  lastVerifiedAt: string;
}

export interface TransferPartner {
  name: string;
  type: "airline" | "hotel" | "other";
  transferRatio: string;
}

export type ApplicationRuleSourceType =
  | "issuer_published"
  | "issuer_help"
  | "community_reported"
  | "unknown";

export type ApplicationRuleConfidence = "high" | "medium" | "low";

export interface ApplicationRule {
  id: string;
  issuer: string;
  description: string;
  ruleKey?:
    | "5_24"
    | "one_sapphire"
    | "product_family"
    | "welcome_once"
    | "recent_account"
    | "other";
  details?: string;
  sourceUrl?: string;
  sourceType: ApplicationRuleSourceType;
  confidence: ApplicationRuleConfidence;
  explanatoryText?: string;
  lastVerifiedAt: string;
}

export type BenefitUsageStatus =
  | "used"
  | "partial"
  | "unused"
  | "not_valuable";

export interface Card {
  id: string;
  issuer: string;
  cardName: string;
  cardNetwork: "visa" | "mastercard" | "amex" | "discover";
  annualFee: number;
  foreignTransactionFee: number;
  baseRewardRate: number;
  rewardCurrency: string;
  rewardProgram: string;
  welcomeOffer: WelcomeOffer | null;
  categoryRewards: CategoryRewardRule[];
  credits: CardCredit[];
  benefits: CardBenefit[];
  transferPartners: TransferPartner[];
  applicationRules: ApplicationRule[];
  productFamily: string;
  businessOrPersonal: "personal" | "business" | "both";
  complexity: Complexity;
  hasLounge: boolean;
  hasHotelBenefits: boolean;
  hasAirlineBenefits: boolean;
  tags: string[];
  lastVerifiedAt: string;
  sourceReferences: string[];
  active: boolean;
}

export interface OwnedCard {
  cardId: string;
  openedAt: string | null;
  annualFeePaid: number | null;
  creditLimit: number | null;
  nickname?: string;
  assignedRole?: SpendCategory | "catchall";
  benefitsUsed: Record<string, number>;
  welcomeBonusCompleted: boolean;
  welcomeBonusValueRealized: number;
  welcomeSpendCompleted?: number;
  welcomeDeadline?: string;
  benefitStatuses?: Record<string, BenefitUsageStatus>;
  benefitUserValues?: Record<string, number>;
  notes?: string;
}

export interface ApplicationHistoryEntry {
  cardId: string;
  appliedAt: string;
  outcome: "approved" | "denied" | "pending" | "unknown";
}

export interface SpendingProfile {
  mode: "monthly" | "annual";
  amounts: Record<SpendCategory, number>;
}

export interface PointValuation {
  currency: string;
  centsPerPoint: number;
  label: string;
  isUserDefined: boolean;
}

export interface UserProfile {
  onboardingComplete: boolean;
  creditScore: CreditScoreRange;
  income: IncomeRange;
  goals: Goal[];
  preferredAirlines: string[];
  preferredHotels: string[];
  preferredTransferAirlines?: string[];
  preferredTransferHotels?: string[];
  cashbackVsPoints: "cashback" | "points" | "either";
  feeTolerance: FeeTolerance;
  desiredComplexity: Complexity;
  rotatingCategoriesOk: boolean;
  internationalTravel: TravelFrequency;
  travelFrequency: TravelFrequency;
  businessInterest: boolean;
  paysInFull?: boolean | "unknown";
  discretionaryMonthlyTarget?: number | null;
  ownedCards: OwnedCard[];
  applicationHistory: ApplicationHistoryEntry[];
  closedCards: { cardId: string; closedAt: string }[];
  planningNotes: string;
  spending: SpendingProfile;
  valuations: PointValuation[];
  createdAt: string;
  updatedAt: string;
}

export interface CategoryCoverage {
  category: SpendCategory;
  bestCardId: string | null;
  bestCardName: string | null;
  effectiveRate: number;
  annualSpend: number;
  estimatedAnnualRewards: number;
  gap: "strong" | "adequate" | "gap" | "none";
  gapReason: string;
}

export interface RoutingResult {
  category: SpendCategory;
  cardId: string;
  cardName: string;
  effectiveRate: number;
  annualRewards: number;
  assumptions: string[];
}

export interface WalletConfig {
  id: string;
  name: string;
  description: string;
  cardIds: string[];
  estimatedAnnualRewards: number;
  annualFees: number;
  netValue: number;
  complexity: Complexity;
  roles: Record<string, string>;
}

export interface PathwayStep {
  cardId: string;
  cardName: string;
  reason: string;
  incrementalValue: number;
  annualFee: number;
  fillsGaps: SpendCategory[];
  timingNote?: string;
  applicationNotes: string[];
}

export interface Pathway {
  id: string;
  name: string;
  description: string;
  steps: PathwayStep[];
  targetRoles: Record<string, string>;
  estimatedNetValue: number;
  totalFees: number;
  complexity: Complexity;
}

export interface CandidateCardResult {
  cardId: string;
  cardName: string;
  incrementalValue: number;
  firstYearIncremental: number;
  ongoingIncremental: number;
  eligible: boolean;
  eligibilityNotes: string[];
}

export interface OptimizationResult {
  currentWalletValue: number;
  optimizedSpendingAllocation: RoutingResult[];
  coverageGaps: CategoryCoverage[];
  candidateCards: CandidateCardResult[];
  possibleTargetWallets: WalletConfig[];
  possiblePathways: Pathway[];
  warnings: string[];
  assumptions: string[];
  firstYearNet: number;
  ongoingNet: number;
  complexityScore: ComplexityScore;
  explanations: ExplanationBlock[];
}

export interface SimulationDiff {
  beforeNet: number;
  afterNet: number;
  incrementalNet: number;
  feeDelta: number;
  cardCountBefore: number;
  cardCountAfter: number;
  ecosystemsBefore: string[];
  ecosystemsAfter: string[];
  complexityBefore: ComplexityScore;
  complexityAfter: ComplexityScore;
}

export interface WelcomeBonusAnalysis {
  cardId: string;
  spendRequirement: number;
  spendCompleted: number;
  spendRemaining: number;
  deadlineDays: number | null;
  deadlineIso: string | null;
  completed: boolean;
  projectedNaturalSpend: number;
  gapVsNaturalSpend: number;
  warnings: string[];
  assumptions: string[];
}

export type FeeRenewalAction =
  | "keep"
  | "investigate_downgrade"
  | "compare_alternatives"
  | "reassess_usage";

export interface FeeAnalysis {
  cardId: string;
  cardName: string;
  annualFee: number;
  rewardsValue: number;
  creditsValue: number;
  benefitsValue: number;
  firstYear: {
    netValue: number;
    welcomeBonusValue: number;
  };
  ongoing: {
    netValue: number;
  };
  renewalAction: FeeRenewalAction;
  renewalNotes: string[];
}

export interface ComplexityScore {
  score: number;
  label: "low" | "moderate" | "high" | "very_high";
  factors: string[];
}

export interface ExplanationBlock {
  id: string;
  title: string;
  body: string;
  figures: { label: string; value: string }[];
  assumptions: string[];
}
