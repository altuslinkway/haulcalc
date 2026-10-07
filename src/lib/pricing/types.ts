// Core data model shared by the pricing engine, the AI layer, and the UI.

/** One row of a rate card's load pricing, e.g. "1/2 load: $200–$350". */
export interface LoadTier {
  id: string;
  label: string;
  /** Share of a full trailer this tier tops out at (0–1], e.g. 0.5 for a half load. */
  fraction: number;
  description: string;
  priceLow: number;
  priceHigh: number;
}

/** A per-item charge, e.g. "Mattress / box spring: $60 each". */
export interface ItemFee {
  id: string;
  name: string;
  priceLow: number;
  priceHigh: number;
  /** The rate card says "on-site quote" — flag it instead of pricing it. */
  onSiteQuote: boolean;
  /** What it costs you to get rid of one (recycling fee, freon recovery, etc). */
  disposalCost: number;
  /** Plain-language hint for the AI about what counts as this item. */
  hint: string;
}

export type PricingMethod = "rate_card" | "cost_plus";
export type DumpFeeMethod = "per_ton" | "per_cubic_yard";

export interface Settings {
  businessName: string;
  pricingMethod: PricingMethod;

  trailer: {
    name: string;
    cubicYards: number;
  };

  loadTiers: LoadTier[];
  itemFees: ItemFee[];
  prohibitedItems: string[];

  /** Charges added to the customer's price. */
  charges: {
    minimumCharge: number;
    /** Miles (one way) included before the travel fee kicks in. */
    freeTravelMiles: number;
    travelFeePerMile: number;
    stairsFeePerFlight: number;
    /** Weight a full trailer load includes; heavier jobs pay the overweight rate. */
    includedLbsPerFullLoad: number;
    overweightFeePerTon: number;
  };

  /** What a job actually costs you — drives the profit check and cost-plus pricing. */
  costs: {
    dumpFeeMethod: DumpFeeMethod;
    dumpFeePerTon: number;
    dumpFeePerCubicYard: number;
    /** Most transfer stations charge a minimum per visit. */
    dumpMinimumPerTrip: number;
    laborWagePerHour: number;
    crewSize: number;
    /** Crew hours on site to load a full trailer of typical junk. */
    hoursPerFullLoad: number;
    vehicleCostPerMile: number;
    overheadPerJob: number;
    /** Margin you aim for; cost-plus pricing uses it and the profit check warns below it. */
    targetMarginPct: number;
  };
}

export type Confidence = "low" | "medium" | "high";

/** What the AI (or the owner, after editing) believes is in the job. */
export interface JobEstimate {
  summary: string;
  items: { description: string; quantity: number; cubicYards: number }[];
  /** Matches against Settings.itemFees by id. */
  feeItems: { itemId: string; quantity: number; note: string }[];
  volumeCubicYardsLow: number;
  volumeCubicYardsHigh: number;
  weightLbsLow: number;
  weightLbsHigh: number;
  prohibitedItems: { name: string; reason: string }[];
  stairsFlights: number;
  accessNotes: string;
  confidence: Confidence;
  questionsForCustomer: string[];
}

/** Details the owner knows that photos can't show. */
export interface JobDetails {
  customerName: string;
  /** One-way miles from base to the job. */
  distanceMiles: number;
  /** Overrides the AI's guess when set. */
  stairsFlights: number | null;
}

export interface Range {
  low: number;
  high: number;
}

export interface QuoteLine {
  label: string;
  detail: string;
  amount: Range;
}

export interface Quote {
  volume: {
    cubicYards: Range;
    trailerFraction: Range;
    tierLabel: string;
    loads: number;
  };
  lines: QuoteLine[];
  subtotal: Range;
  minimumApplied: boolean;
  total: Range;
  /** Midpoint rounded to $5 — a single number to quote if the owner prefers. */
  suggested: number;
  cost: {
    dump: Range;
    labor: Range;
    vehicle: number;
    disposal: Range;
    overhead: number;
    total: Range;
  };
  /** Profit at the low and high end of the quote (low price vs high cost, etc). */
  profit: Range;
  margin: Range;
  warnings: string[];
}
