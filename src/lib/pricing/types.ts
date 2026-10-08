// Core data model shared by the pricing engine, the AI layer, and the UI.

import type { ItemCategoryId } from "./categories";

/** One row of a rate card's load pricing, e.g. "1/2 load: $255–$430". */
export interface LoadTier {
  id: string;
  label: string;
  /** Share of a full trailer this tier tops out at (0–1], e.g. 0.5 for a half load. */
  fraction: number;
  description: string;
  priceLow: number;
  priceHigh: number;
}

/**
 * How an item on the owner's list is charged:
 * - flat: one price covers the item, and its space isn't charged on the load (fridge, hot tub).
 * - addon: a disposal fee on top; the item still counts toward the load (mattress, freon, tires).
 * - onsite: flagged for an on-site quote instead of priced.
 */
export type ItemPricing = "flat" | "addon" | "onsite";

export interface ItemFee {
  id: string;
  name: string;
  pricing: ItemPricing;
  priceLow: number;
  priceHigh: number;
  /** What it costs you to get rid of one (recycling fee, freon recovery, etc). */
  disposalCost: number;
  /** Typical trailer space and weight of one, for flat items (counts toward trips, not price). */
  cubicYardsEach: number;
  lbsEach: number;
  /** Plain-language hint for the AI about what counts as this item. */
  hint: string;
}

export type Material = "household" | "construction" | "yard" | "dense";
export const MATERIALS: Material[] = ["household", "construction", "yard", "dense"];

/** What to do with concrete, dirt, brick and other dense loads. */
export type DensePolicy = "quote" | "review" | "decline";

export type PricingMethod = "rate_card" | "cost_plus";
export type DumpFeeMethod = "per_ton" | "per_cubic_yard";

export interface Settings {
  businessName: string;
  pricingMethod: PricingMethod;

  trailer: {
    name: string;
    /** Inside dimensions in feet; capacity is length × width × side height ÷ 27. */
    lengthFt: number;
    widthFt: number;
    sideHeightFt: number;
    /** Most weight the trailer can carry (GVWR minus empty weight). */
    payloadLbs: number;
  };

  loadTiers: LoadTier[];
  itemFees: ItemFee[];
  prohibitedItems: string[];
  /** Asked on every job, in the photo request you send customers. */
  standardQuestions: string[];

  /** How the photo estimate becomes a low–high range. */
  estimate: {
    /** ± spread on what's visible, by AI confidence. */
    spreadPct: Record<"high" | "medium" | "low", number>;
    /** Added to the high end for things not in the photos. */
    unseenPct: number;
    /** Used instead for multi-room jobs, cleanouts and low-confidence estimates. */
    unseenHighRiskPct: number;
    /**
     * Your own correction from your finished jobs: +10 means the AI tends to
     * guess 10% small. Null means use what HaulCalc learned across all owners.
     */
    calibrationPct: number | null;
  };

  /** Pooling anonymous corrections across owners so estimates improve for everyone. */
  learning: {
    /** Send item sizes, corrections and job outcomes (no photos, names, addresses or prices). */
    shareData: boolean;
    /** Apply what's been learned from all owners' jobs. */
    useNetwork: boolean;
  };

  /** Charges added to the customer's price. */
  charges: {
    minimumCharge: number;
    /** Miles (one way) included before the travel fee kicks in. */
    freeTravelMiles: number;
    travelFeePerMile: number;
    /** Per flight; doubled when the load is over half a trailer. */
    stairsFeePerFlight: number;
    freeCarryFeet: number;
    longCarryFeePer50Ft: number;
    /** Weight the load price includes; heavier loads pay the heavy-material rate. */
    includedLbsPerCubicYard: number;
    heavyFeePerTon: number;
    densePolicy: DensePolicy;
    sameDayFee: number;
    afterHoursPct: number;
    hoarderPct: number;
  };

  /** What a job actually costs you — drives the profit check and cost-plus pricing. */
  costs: {
    dumpFeeMethod: DumpFeeMethod;
    dumpFeePerTon: number;
    dumpFeePerCubicYard: number;
    /** Most transfer stations charge a minimum per visit. */
    dumpMinimumPerTrip: number;
    /** Dump rate for each material relative to household junk (1 = same rate). */
    materialRateFactor: Record<Material, number>;
    /** Detour to the dump, wait in line and unload, per trip. */
    dumpTripMinutes: number;
    dumpTripMiles: number;
    laborWagePerHour: number;
    /** Payroll taxes and workers' comp on top of wages. */
    payrollBurdenPct: number;
    crewSize: number;
    /** On-site hours for the crew to load a full trailer of typical junk. */
    hoursPerFullLoad: number;
    /** Fuel and wear. Truck payments and insurance belong in overhead. */
    vehicleCostPerMile: number;
    overheadPerJob: number;
    /** Cost of a booked job from paid leads (Google, Thumbtack, Angi). */
    marketingPerPaidLead: number;
    cardFeePct: number;
    targetMarginPct: number;
    targetRevenuePerTruckHour: number;
  };
}

export type Confidence = "low" | "medium" | "high";
export type JobScope = "few_items" | "single_area" | "multi_area";

/** One thing being hauled. The owner can edit, delete, add, or re-price lines. */
export interface EstimateLine {
  id: string;
  description: string;
  quantity: number;
  /** Trailer space for the whole line, as loaded. */
  cubicYards: number;
  weightLbs: number;
  material: Material;
  /** What kind of item this is, so corrections can be pooled across jobs. */
  category: ItemCategoryId;
  /** Set when the line is priced as a flat-rate or on-site item instead of by the load. */
  itemId: string | null;
}

/** What the AI (or the owner, after editing) believes is in the job. */
export interface JobEstimate {
  summary: string;
  lines: EstimateLine[];
  /** Add-on fees for items that are part of the load (mattresses, freon, tires). */
  addOns: { itemId: string; quantity: number }[];
  scope: JobScope;
  prohibitedItems: { name: string; reason: string }[];
  stairsFlights: number;
  accessNotes: string;
  confidence: Confidence;
  questionsForCustomer: string[];
  /** How far off similar jobs have been across all owners: +8 means they ran 8% bigger. */
  networkCalibrationPct: number;
}

/** Details the owner knows that photos can't show. */
export interface JobDetails {
  customerName: string;
  /** One-way miles from base to the job. */
  distanceMiles: number;
  /** Overrides the AI's guess when set. */
  stairsFlights: number | null;
  /** Distance from where the truck parks to the items. */
  carryFeet: number;
  sameDay: boolean;
  afterHours: boolean;
  hoarder: boolean;
  /** The customer came from a paid lead, so the job carries marketing cost. */
  paidLead: boolean;
  /** This job's dump trip is shared with other small jobs that day. */
  sharedDumpRun: boolean;
  /** Overrides the automatic cushion for unseen items when set. */
  unseenPct: number | null;
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
    /** Load-priced junk only (flat-rate items excluded), with the range applied. */
    cubicYards: Range;
    trailerFraction: Range;
    tierLabel: string;
    /** Everything going in the trailer, flat-rate items included. */
    totalCubicYards: Range;
    totalWeightLbs: Range;
    loads: number;
    /** Trips the weight alone would need, when that's more than the space needs. */
    weightLimited: boolean;
    unseenPct: number;
    /** Correction applied for how far off past estimates ran, and whose. */
    calibrationPct: number;
    calibrationSource: "owner" | "network" | null;
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
    vehicle: Range;
    disposal: number;
    cardFees: Range;
    overhead: number;
    marketing: number;
    total: Range;
  };
  /** Crew time door to door: on site, driving, and the dump run. */
  truckHours: Range;
  revenuePerTruckHour: Range;
  profit: Range;
  margin: Range;
  warnings: string[];
}
