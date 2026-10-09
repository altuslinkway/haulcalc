import type { JobEstimate } from "@/lib/pricing/types";
import type { RateCard } from "./schemas";

// Canned answers for HAULCALC_DEMO=1, so the app can be tried end to end
// without an Anthropic API key. Real photos are ignored in demo mode.

export const DEMO_ESTIMATE: JobEstimate = {
  summary:
    "Garage cleanout: a worn sectional, a queen mattress and box spring, an old fridge, about a dozen boxes and bags, plus a couple of paint cans on the shelf.",
  lines: [
    { id: "demo-1", description: "Sectional sofa", quantity: 1, cubicYards: 3.5, weightLbs: 250, material: "household", category: "sectional", itemId: null },
    { id: "demo-2", description: "Queen mattress and box spring", quantity: 2, cubicYards: 1.5, weightLbs: 150, material: "household", category: "mattress", itemId: "mattress" },
    { id: "demo-3", description: "Refrigerator", quantity: 1, cubicYards: 1.75, weightLbs: 250, material: "household", category: "refrigerator", itemId: "fridge" },
    { id: "demo-4", description: "Moving boxes and contractor bags", quantity: 14, cubicYards: 1.75, weightLbs: 350, material: "household", category: "boxes", itemId: null },
    { id: "demo-5", description: "Loose garage clutter (bikes, shelving)", quantity: 1, cubicYards: 1.5, weightLbs: 250, material: "household", category: "mixed_pile", itemId: null },
    { id: "demo-6", description: "Lumber scraps by the back wall", quantity: 1, cubicYards: 0.5, weightLbs: 150, material: "construction", category: "construction", itemId: null },
  ],
  scope: "single_area",
  prohibitedItems: [{ name: "Two gallon paint cans", reason: "Liquids aren't accepted" }],
  stairsFlights: 0,
  accessNotes: "Everything is in an open garage with driveway access.",
  confidence: "medium",
  questionsForCustomer: ["Is there anything on the back wall of the garage that's out of the photo?"],
  networkCalibrationPct: 0,
};

export const DEMO_RATE_CARD: RateCard = {
  business_name: null,
  quarter_load: 225,
  half_load: 375,
  three_quarter_load: null,
  full_load: 650,
  minimum_charge: 95,
  items: [
    { name: "Mattress", price: 50 },
    { name: "TV", price: 40 },
    { name: "Fridge or freezer", price: 110 },
    { name: "Tires", price: 15 },
  ],
  prohibited_items: ["Paint", "Chemicals", "Propane tanks"],
  notes: ["Demo mode: this is sample data, not your card."],
};

export const isDemoMode = () => process.env.HAULCALC_DEMO === "1";

export const demoDelay = () => new Promise((r) => setTimeout(r, 1200));
