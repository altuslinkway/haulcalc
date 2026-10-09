import type { JobDetails, Settings, TrailerPreset } from "./types";

// Starting point for a new owner. Load prices follow published independent
// rate cards (see reports/Junk removal cost drivers.md): small loads cost
// more per yard because every trip costs about the same to run.

export const TRAILERS: { id: TrailerPreset; label: string; cubicYards: number; payloadLbs: number }[] = [
  { id: "pickup", label: "Pickup truck bed", cubicYards: 2.5, payloadLbs: 1500 },
  { id: "6x12", label: "6×12 dump trailer", cubicYards: 8, payloadLbs: 7000 },
  { id: "7x14", label: "7×14 dump trailer", cubicYards: 14.5, payloadLbs: 9500 },
  { id: "7x16", label: "7×16 dump trailer", cubicYards: 16.5, payloadLbs: 10000 },
  { id: "box15", label: "Box truck, about 15 yd", cubicYards: 15, payloadLbs: 6000 },
];

export const DEFAULT_SETTINGS: Settings = {
  businessName: "",

  trailer: { preset: "7x14", cubicYards: 14.5, payloadLbs: 9500 },

  loadPrices: { quarter: 255, half: 430, threeQuarter: 595, full: 765 },
  minimumCharge: 99,

  flatItems: [
    { id: "mattress", name: "Mattress", price: 60 },
    { id: "couch", name: "Couch", price: 100 },
    { id: "tv", name: "TV", price: 50 },
    { id: "appliance", name: "Appliance", price: 120 },
    { id: "fridge", name: "Fridge or freezer", price: 170 },
    { id: "hot-tub", name: "Hot tub", price: 400 },
  ],

  extras: { freeMiles: 25, perMile: 4, stairsPerFlight: 25, heavyPerTon: 150 },

  costs: { dumpFeePerTon: 65, gasPerMile: 0.75, helpers: 1, helperPerHour: 20 },

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
    "Where can we park the truck, and how far is it to the items?",
    "What's inside the boxes and bags: light stuff, or books, tools and paper?",
    "When would you like it gone?",
  ],

  paymentInfo: "",

  learning: { shareData: true, useNetwork: true },
  calibrationPct: null,
};

export const DEFAULT_DETAILS: JobDetails = {
  customerName: "",
  customerPhone: "",
  distanceMiles: 0,
  stairsFlights: null,
};
