import type { JobEstimate } from "@/lib/pricing/types";
import type { RateCard } from "./schemas";

// Canned answers for HAULCALC_DEMO=1, so the app can be tried end to end
// without an Anthropic API key. Real photos are ignored in demo mode.

export const DEMO_ESTIMATE: JobEstimate = {
  summary:
    "Garage cleanout: a worn sectional, a queen mattress and box spring, an old fridge, about a dozen boxes and bags, plus a couple of paint cans on the shelf.",
  lines: [
    { id: "demo-1", description: "Sectional sofa", quantity: 1, cubicYards: 3.5, weightLbs: 250, material: "household", itemId: null },
    { id: "demo-2", description: "Queen mattress and box spring", quantity: 2, cubicYards: 1.5, weightLbs: 150, material: "household", itemId: null },
    { id: "demo-3", description: "Refrigerator", quantity: 1, cubicYards: 1.75, weightLbs: 250, material: "household", itemId: "appliance" },
    { id: "demo-4", description: "Moving boxes and contractor bags", quantity: 14, cubicYards: 1.75, weightLbs: 350, material: "household", itemId: null },
    { id: "demo-5", description: "Loose garage clutter (bikes, shelving)", quantity: 1, cubicYards: 1.5, weightLbs: 250, material: "household", itemId: null },
    { id: "demo-6", description: "Lumber scraps by the back wall", quantity: 1, cubicYards: 0.5, weightLbs: 150, material: "construction", itemId: null },
  ],
  addOns: [
    { itemId: "mattress", quantity: 2 },
    { itemId: "freon", quantity: 1 },
  ],
  scope: "single_area",
  prohibitedItems: [{ name: "Two gallon paint cans", reason: "Liquids aren't accepted" }],
  stairsFlights: 0,
  accessNotes: "Everything is in an open garage with driveway access.",
  confidence: "medium",
  questionsForCustomer: ["Is there anything on the back wall of the garage that's out of the photo?"],
};

export const DEMO_RATE_CARD: RateCard = {
  business_name: null,
  load_tiers: [
    { label: "Minimum", fraction: 0.1, description: "Single item", price_low: 95, price_high: 95 },
    { label: "1/4 Load", fraction: 0.25, description: "", price_low: 150, price_high: 225 },
    { label: "1/2 Load", fraction: 0.5, description: "", price_low: 250, price_high: 375 },
    { label: "Full Load", fraction: 1, description: "", price_low: 450, price_high: 650 },
  ],
  item_fees: [
    { name: "Mattress", pricing: "addon", price_low: 25, price_high: 25, cubic_yards_each: 0.75, lbs_each: 80, hint: "Each mattress or box spring." },
    { name: "Refrigerator", pricing: "flat", price_low: 110, price_high: 110, cubic_yards_each: 1.5, lbs_each: 250, hint: "Fridges and freezers, freon removal included." },
    { name: "Tires", pricing: "addon", price_low: 15, price_high: 15, cubic_yards_each: 0.2, lbs_each: 25, hint: "Each car or truck tire." },
  ],
  prohibited_items: ["Paint", "Chemicals", "Propane tanks"],
  minimum_charge: 95,
  notes: ["Demo mode: this is sample data, not your card."],
};

export const isDemoMode = () => process.env.HAULCALC_DEMO === "1";

export const demoDelay = () => new Promise((r) => setTimeout(r, 1200));
