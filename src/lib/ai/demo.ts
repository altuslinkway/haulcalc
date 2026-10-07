import type { JobEstimate } from "@/lib/pricing/types";
import type { RateCard } from "./schemas";

// Canned answers for HAULCALC_DEMO=1, so the app can be tried end to end
// without an Anthropic API key. Real photos are ignored in demo mode.

export const DEMO_ESTIMATE: JobEstimate = {
  summary:
    "Garage cleanout: a worn sectional, a queen mattress and box spring, an old fridge, about a dozen boxes and bags, plus a couple of paint cans on the shelf.",
  items: [
    { description: "Sectional sofa", quantity: 1, cubicYards: 3.5 },
    { description: "Queen mattress and box spring", quantity: 2, cubicYards: 1.5 },
    { description: "Refrigerator", quantity: 1, cubicYards: 1.75 },
    { description: "Moving boxes and contractor bags", quantity: 14, cubicYards: 1.75 },
    { description: "Loose garage clutter (bikes, shelving, lumber scraps)", quantity: 1, cubicYards: 1.5 },
  ],
  feeItems: [
    { itemId: "couch", quantity: 1, note: "Large L-shaped sectional" },
    { itemId: "mattress", quantity: 2, note: "Queen mattress and box spring" },
    { itemId: "appliance", quantity: 1, note: "Top-freezer refrigerator" },
    { itemId: "freon", quantity: 1, note: "Refrigerator holds refrigerant" },
  ],
  volumeCubicYardsLow: 9,
  volumeCubicYardsHigh: 11,
  weightLbsLow: 1500,
  weightLbsHigh: 2100,
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
    { name: "Mattress", price_low: 45, price_high: 45, on_site_quote: false, hint: "Each mattress or box spring." },
    { name: "Tires", price_low: 15, price_high: 15, on_site_quote: false, hint: "Each car or truck tire." },
  ],
  prohibited_items: ["Paint", "Chemicals", "Propane tanks"],
  minimum_charge: 95,
  notes: ["Demo mode: this is sample data, not your card."],
};

export const isDemoMode = () => process.env.HAULCALC_DEMO === "1";

export const demoDelay = () => new Promise((r) => setTimeout(r, 1200));
