import type { ItemFee, JobDetails, Settings } from "./types";

// Starting point for a new owner, from market research on US independents
// (see reports/Junk removal cost drivers.md). Every number is editable in
// My rates; dump fees and the full-load price vary most by region.

const item = (fee: Omit<ItemFee, "cubicYardsEach" | "lbsEach"> & Partial<ItemFee>): ItemFee => ({
  cubicYardsEach: 0,
  lbsEach: 0,
  ...fee,
});

export const DEFAULT_SETTINGS: Settings = {
  businessName: "",
  pricingMethod: "rate_card",

  trailer: {
    name: "7×14 dump trailer",
    lengthFt: 14,
    widthFt: 7,
    sideHeightFt: 4,
    payloadLbs: 9500,
  },

  // Front-loaded: small loads cost nearly as much to run as big ones.
  loadTiers: [
    { id: "minimum", label: "Minimum", fraction: 1 / 16, description: "Single item", priceLow: 99, priceHigh: 99 },
    { id: "eighth", label: "1/8 Load", fraction: 0.125, description: "Small pickup load", priceLow: 99, priceHigh: 150 },
    { id: "quarter", label: "1/4 Load", fraction: 0.25, description: "A few pieces of furniture", priceLow: 150, priceHigh: 255 },
    { id: "half", label: "1/2 Load", fraction: 0.5, description: "Room of furniture", priceLow: 255, priceHigh: 430 },
    { id: "three-quarter", label: "3/4 Load", fraction: 0.75, description: "Garage cleanout", priceLow: 430, priceHigh: 595 },
    { id: "full", label: "Full Load", fraction: 1, description: "Full trailer", priceLow: 595, priceHigh: 765 },
  ],

  itemFees: [
    item({
      id: "appliance",
      name: "Appliance",
      pricing: "flat",
      priceLow: 120,
      priceHigh: 120,
      disposalCost: 0,
      cubicYardsEach: 1.5,
      lbsEach: 200,
      hint: "Fridges, freezers, washers, dryers, stoves, dishwashers, water heaters. One per unit.",
    }),
    item({
      id: "hot-tub",
      name: "Hot tub",
      pricing: "flat",
      priceLow: 300,
      priceHigh: 500,
      disposalCost: 0,
      cubicYardsEach: 6,
      lbsEach: 700,
      hint: "Above-ground hot tubs and spas, cut up on site. Confirm size and access before quoting.",
    }),
    item({
      id: "piano",
      name: "Piano",
      pricing: "flat",
      priceLow: 350,
      priceHigh: 350,
      disposalCost: 0,
      cubicYardsEach: 3,
      lbsEach: 600,
      hint: "Upright pianos and organs. Grand pianos need an on-site look.",
    }),
    item({
      id: "safe",
      name: "Safe",
      pricing: "flat",
      priceLow: 150,
      priceHigh: 400,
      disposalCost: 0,
      cubicYardsEach: 0.5,
      lbsEach: 400,
      hint: "Gun safes and floor safes. Price depends on weight.",
    }),
    item({
      id: "mattress",
      name: "Mattress / box spring",
      pricing: "addon",
      priceLow: 20,
      priceHigh: 20,
      disposalCost: 15,
      hint: "Each mattress, box spring or futon mattress counts separately.",
    }),
    item({
      id: "freon",
      name: "Freon removal",
      pricing: "addon",
      priceLow: 35,
      priceHigh: 35,
      disposalCost: 25,
      hint: "One for every appliance that holds refrigerant: fridges, freezers, AC units, dehumidifiers.",
    }),
    item({
      id: "tv",
      name: "TV / monitor",
      pricing: "addon",
      priceLow: 25,
      priceHigh: 25,
      disposalCost: 10,
      hint: "Flat-screen TVs and computer monitors.",
    }),
    item({
      id: "crt-tv",
      name: "Tube (CRT) TV",
      pricing: "addon",
      priceLow: 40,
      priceHigh: 40,
      disposalCost: 30,
      hint: "Old deep tube TVs and CRT monitors.",
    }),
    item({
      id: "tire",
      name: "Tire",
      pricing: "addon",
      priceLow: 15,
      priceHigh: 15,
      disposalCost: 5,
      hint: "Car and light truck tires, each. Tires still on rims count too.",
    }),
    item({
      id: "propane",
      name: "Propane tank",
      pricing: "addon",
      priceLow: 10,
      priceHigh: 10,
      disposalCost: 5,
      hint: "Grill-size propane cylinders, if you take them.",
    }),
    item({
      id: "construction-debris",
      name: "Construction debris",
      pricing: "onsite",
      priceLow: 0,
      priceHigh: 0,
      disposalCost: 0,
      hint: "Drywall, lumber, tile, shingles, concrete, brick, renovation waste.",
    }),
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

  standardQuestions: [
    "Is there anything in other rooms, closets, the attic or garage that isn't in the photos?",
    "What floor is everything on? Any stairs or an elevator?",
    "About how far is it from where we'd park to the items?",
    "Where can we park the truck? Any HOA or building rules?",
    "What's inside the boxes and bags: light stuff, or books, tools and paper?",
    "Is anything wet, or are there any paint cans, chemicals or propane tanks?",
    "When would you like it gone?",
  ],

  estimate: {
    spreadPct: { high: 5, medium: 10, low: 20 },
    unseenPct: 10,
    unseenHighRiskPct: 20,
    calibrationPct: null,
  },

  learning: {
    shareData: true,
    useNetwork: true,
  },

  charges: {
    minimumCharge: 99,
    freeTravelMiles: 25,
    travelFeePerMile: 4,
    stairsFeePerFlight: 25,
    freeCarryFeet: 50,
    longCarryFeePer50Ft: 50,
    includedLbsPerCubicYard: 200,
    heavyFeePerTon: 150,
    densePolicy: "quote",
    sameDayFee: 50,
    afterHoursPct: 20,
    hoarderPct: 25,
  },

  costs: {
    dumpFeeMethod: "per_ton",
    dumpFeePerTon: 65,
    dumpFeePerCubicYard: 10,
    dumpMinimumPerTrip: 40,
    materialRateFactor: { household: 1, construction: 1, yard: 0.75, dense: 0.5 },
    dumpTripMinutes: 45,
    dumpTripMiles: 10,
    laborWagePerHour: 20,
    payrollBurdenPct: 20,
    crewSize: 2,
    hoursPerFullLoad: 2,
    vehicleCostPerMile: 0.75,
    overheadPerJob: 40,
    marketingPerPaidLead: 35,
    cardFeePct: 2.5,
    targetMarginPct: 30,
    targetRevenuePerTruckHour: 125,
  },
};

export const DEFAULT_DETAILS: JobDetails = {
  customerName: "",
  distanceMiles: 0,
  stairsFlights: null,
  carryFeet: 0,
  sameDay: false,
  afterHours: false,
  hoarder: false,
  paidLead: true,
  sharedDumpRun: false,
  unseenPct: null,
};

export function trailerCubicYards(t: Settings["trailer"]): number {
  return (t.lengthFt * t.widthFt * t.sideHeightFt) / 27;
}
