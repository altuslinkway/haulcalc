// Core data model shared by the pricing engine, the AI layer, and the UI.
// Kept deliberately small: an owner sets four load prices, a minimum, a list
// of flat-rate items, and a handful of extras they actually know.

import type { ItemCategoryId } from "./categories";

/** One price covers the item; its trailer space isn't charged on the load. */
export interface FlatItem {
  id: string;
  name: string;
  price: number;
}

export type TrailerPreset = "pickup" | "6x12" | "7x14" | "7x16" | "box15" | "custom";

export interface Settings {
  businessName: string;

  trailer: {
    preset: TrailerPreset;
    cubicYards: number;
    /** Most weight it can carry; dense loads hit this before the trailer looks full. */
    payloadLbs: number;
  };

  /** What a 1/4, 1/2, 3/4 and full trailer cost. Sizes in between are priced in between. */
  loadPrices: { quarter: number; half: number; threeQuarter: number; full: number };
  /** The least any job costs: single items and loads smaller than a quarter. */
  minimumCharge: number;

  flatItems: FlatItem[];

  extras: {
    /** Miles (one way) included before the travel fee starts. */
    freeMiles: number;
    perMile: number;
    stairsPerFlight: number;
    /** For concrete, dirt, shingles and other loads heavier than normal junk. */
    heavyPerTon: number;
  };

  /** Rough costs, so the quote can show what you'd keep. */
  costs: {
    dumpFeePerTon: number;
    gasPerMile: number;
    /** Helpers you pay (not counting yourself). */
    helpers: number;
    helperPerHour: number;
  };

  prohibitedItems: string[];
  /** Asked on every job, in the photo request you send customers. */
  standardQuestions: string[];
  /** How customers can pay you (a Venmo, Cash App or Zelle name), for the thank-you text. */
  paymentInfo: string;

  /** Pooling anonymous corrections across owners so estimates improve for everyone. */
  learning: {
    /** Send item sizes, corrections and job outcomes (no photos, names, addresses or prices). */
    shareData: boolean;
    /** Apply what's been learned from all owners' jobs. */
    useNetwork: boolean;
  };

  /**
   * Your own correction from your finished jobs: +10 means the AI tends to
   * guess 10% small. Null means use what HaulCalc learned across all owners.
   */
  calibrationPct: number | null;
}

export type Material = "household" | "construction" | "yard" | "dense";
export const MATERIALS: Material[] = ["household", "construction", "yard", "dense"];

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
  /** Set when the line is charged as one of the owner's flat-rate items instead of by the load. */
  itemId: string | null;
}

/** What the AI (or the owner, after editing) believes is in the job. */
export interface JobEstimate {
  summary: string;
  lines: EstimateLine[];
  scope: JobScope;
  prohibitedItems: { name: string; reason: string }[];
  stairsFlights: number;
  accessNotes: string;
  confidence: Confidence;
  questionsForCustomer: string[];
  /** How far off similar jobs have been across all owners: +8 means they ran 8% bigger. */
  networkCalibrationPct: number;
  /** The owner tapped a load size, so the load is that size: no range or correction on top. */
  sizedByOwner?: boolean;
}

/** Details the owner knows that photos can't show. */
export interface JobDetails {
  customerName: string;
  /** For texting the quote straight to them. */
  customerPhone: string;
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
    /** Load-priced junk only (flat-rate items excluded), with the range applied. */
    cubicYards: Range;
    trailerFraction: Range;
    /** "1/2 load", "1/4 to 1/2 load", "2 loads"; empty when there's nothing priced by the load. */
    sizeLabel: string;
    /** Everything going in the trailer, flat-rate items included. */
    totalCubicYards: Range;
    loads: number;
    /** The weight needs more trips than the space does. */
    weightLimited: boolean;
    unseenPct: number;
    calibrationPct: number;
    calibrationSource: "owner" | "network" | null;
  };
  lines: QuoteLine[];
  minimumApplied: boolean;
  total: Range;
  /** Midpoint rounded to $5: a single number to quote if the owner prefers. */
  suggested: number;
  costs: { dump: Range; gas: Range; helpers: Range; total: Range };
  /** What's left after dump fees, gas and helpers. */
  keep: Range;
  warnings: string[];
}
