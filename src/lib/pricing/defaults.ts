import type { Settings } from "./types";

// Starting point for a new owner. Load tiers, item fees and prohibited items
// come from a real junk-removal rate card; the cost numbers are typical
// placeholders the owner is expected to replace with their own.
export const DEFAULT_SETTINGS: Settings = {
  businessName: "",
  pricingMethod: "rate_card",

  trailer: {
    name: "7×14 dump trailer",
    cubicYards: 15,
  },

  loadTiers: [
    { id: "eighth", label: "1/8 Load", fraction: 0.125, description: "Small pickup load", priceLow: 75, priceHigh: 125 },
    { id: "quarter", label: "1/4 Load", fraction: 0.25, description: "Mattress / boxes", priceLow: 125, priceHigh: 200 },
    { id: "half", label: "1/2 Load", fraction: 0.5, description: "Furniture / appliances", priceLow: 200, priceHigh: 350 },
    { id: "three-quarter", label: "3/4 Load", fraction: 0.75, description: "Garage cleanouts", priceLow: 350, priceHigh: 500 },
    { id: "full", label: "Full Load", fraction: 1, description: "Full trailer", priceLow: 500, priceHigh: 765 },
  ],

  itemFees: [
    {
      id: "mattress",
      name: "Mattress / Box Spring",
      priceLow: 60,
      priceHigh: 60,
      onSiteQuote: false,
      disposalCost: 20,
      hint: "Each mattress, box spring, or futon mattress counts separately.",
    },
    {
      id: "couch",
      name: "Couch / Sectional",
      priceLow: 75,
      priceHigh: 150,
      onSiteQuote: false,
      disposalCost: 0,
      hint: "Sofas, loveseats, sleeper sofas. A sectional counts as one.",
    },
    {
      id: "electronics",
      name: "Electronics",
      priceLow: 40,
      priceHigh: 140,
      onSiteQuote: false,
      disposalCost: 10,
      hint: "TVs, monitors, computers, printers, stereo equipment.",
    },
    {
      id: "appliance",
      name: "Appliance",
      priceLow: 120,
      priceHigh: 120,
      onSiteQuote: false,
      disposalCost: 0,
      hint: "Washers, dryers, fridges, freezers, stoves, dishwashers, water heaters, window AC units.",
    },
    {
      id: "freon",
      name: "Freon Removal",
      priceLow: 50,
      priceHigh: 50,
      onSiteQuote: false,
      disposalCost: 25,
      hint: "Add one for every appliance that holds refrigerant: fridges, freezers, AC units, dehumidifiers.",
    },
    {
      id: "construction-debris",
      name: "Construction Debris",
      priceLow: 0,
      priceHigh: 0,
      onSiteQuote: true,
      disposalCost: 0,
      hint: "Drywall, lumber, tile, shingles, concrete, brick, renovation waste.",
    },
  ],

  prohibitedItems: [
    "Explosives",
    "PCBs",
    "Radioactive materials",
    "Compressed gas cylinders",
    "Other hazardous materials",
    "Food waste",
    "Any liquid or flammable items",
  ],

  charges: {
    minimumCharge: 75,
    freeTravelMiles: 15,
    travelFeePerMile: 2,
    stairsFeePerFlight: 25,
    includedLbsPerFullLoad: 3000,
    overweightFeePerTon: 100,
  },

  costs: {
    dumpFeeMethod: "per_ton",
    dumpFeePerTon: 65,
    dumpFeePerCubicYard: 8,
    dumpMinimumPerTrip: 40,
    laborWagePerHour: 20,
    crewSize: 2,
    hoursPerFullLoad: 2,
    vehicleCostPerMile: 0.75,
    overheadPerJob: 25,
    targetMarginPct: 50,
  },
};
