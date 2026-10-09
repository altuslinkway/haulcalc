import type { Material } from "./types";

// A fixed list of item types, so corrections from many owners can be pooled:
// "sectional" means the same thing on every job. The AI tags each line with
// one, and the starting sizes below are the reference guide it's given until
// owners' corrections teach it better ones.

export interface ItemCategory {
  id: string;
  label: string;
  /**
   * "each": a countable item, sized per piece.
   * "pile": measured by volume (loose junk, debris), so only a size bias is learned.
   */
  unit: "each" | "pile";
  /** Typical trailer space, as loaded: per piece, or the low end of a typical pile. */
  cubicYards: [number, number];
  /** Per piece, or per cubic yard for piles. */
  lbs: number;
  material: Material;
}

export const ITEM_CATEGORIES = [
  { id: "sofa", label: "Sofa", unit: "each", cubicYards: [2, 2.5], lbs: 150, material: "household" },
  { id: "sectional", label: "Sectional sofa", unit: "each", cubicYards: [3, 4], lbs: 250, material: "household" },
  { id: "loveseat", label: "Loveseat", unit: "each", cubicYards: [1.5, 1.5], lbs: 100, material: "household" },
  { id: "armchair", label: "Recliner or armchair", unit: "each", cubicYards: [1, 1], lbs: 80, material: "household" },
  { id: "mattress", label: "Mattress or box spring", unit: "each", cubicYards: [0.5, 1], lbs: 80, material: "household" },
  { id: "bed_frame", label: "Bed frame or headboard", unit: "each", cubicYards: [0.5, 1], lbs: 60, material: "household" },
  { id: "dresser", label: "Dresser or chest", unit: "each", cubicYards: [1, 1.5], lbs: 120, material: "household" },
  { id: "table", label: "Table", unit: "each", cubicYards: [1, 1.5], lbs: 80, material: "household" },
  { id: "chair", label: "Chair", unit: "each", cubicYards: [0.25, 0.25], lbs: 15, material: "household" },
  { id: "desk", label: "Desk", unit: "each", cubicYards: [1, 1.5], lbs: 100, material: "household" },
  { id: "shelving", label: "Bookcase or shelving", unit: "each", cubicYards: [0.5, 1], lbs: 60, material: "household" },
  { id: "cabinet", label: "Cabinet or entertainment center", unit: "each", cubicYards: [1, 2], lbs: 150, material: "household" },
  { id: "refrigerator", label: "Refrigerator or freezer", unit: "each", cubicYards: [1.5, 2], lbs: 250, material: "household" },
  { id: "washer_dryer", label: "Washer or dryer", unit: "each", cubicYards: [1, 1], lbs: 150, material: "household" },
  { id: "stove", label: "Stove or oven", unit: "each", cubicYards: [1, 1], lbs: 150, material: "household" },
  { id: "dishwasher", label: "Dishwasher", unit: "each", cubicYards: [0.5, 0.5], lbs: 80, material: "household" },
  { id: "water_heater", label: "Water heater", unit: "each", cubicYards: [0.75, 0.75], lbs: 120, material: "household" },
  { id: "small_appliance", label: "Microwave or small appliance", unit: "each", cubicYards: [0.1, 0.2], lbs: 25, material: "household" },
  { id: "tv", label: "TV or monitor", unit: "each", cubicYards: [0.25, 0.5], lbs: 50, material: "household" },
  { id: "exercise", label: "Treadmill or exercise machine", unit: "each", cubicYards: [1, 1.5], lbs: 250, material: "household" },
  { id: "piano", label: "Piano", unit: "each", cubicYards: [2, 3], lbs: 600, material: "household" },
  { id: "hot_tub", label: "Hot tub", unit: "each", cubicYards: [6, 8], lbs: 700, material: "household" },
  { id: "grill_patio", label: "Grill or patio furniture", unit: "each", cubicYards: [0.5, 1], lbs: 60, material: "household" },
  { id: "bike_toys", label: "Bike or large toy", unit: "each", cubicYards: [0.5, 0.5], lbs: 30, material: "household" },
  { id: "boxes", label: "Moving box", unit: "each", cubicYards: [0.1, 0.1], lbs: 20, material: "household" },
  { id: "bags", label: "Trash bag", unit: "each", cubicYards: [0.07, 0.15], lbs: 20, material: "household" },
  { id: "carpet", label: "Carpet or rug (rolled)", unit: "each", cubicYards: [0.3, 0.75], lbs: 80, material: "household" },
  { id: "mixed_pile", label: "Loose mixed junk", unit: "pile", cubicYards: [1, 1], lbs: 200, material: "household" },
  { id: "yard_waste", label: "Yard waste", unit: "pile", cubicYards: [1, 1], lbs: 300, material: "yard" },
  { id: "construction", label: "Construction debris", unit: "pile", cubicYards: [1, 1], lbs: 500, material: "construction" },
  { id: "dense", label: "Concrete, dirt, brick or rock", unit: "pile", cubicYards: [1, 1], lbs: 2000, material: "dense" },
  { id: "other", label: "Something else", unit: "pile", cubicYards: [1, 1], lbs: 200, material: "household" },
] as const satisfies readonly ItemCategory[];

export type ItemCategoryId = (typeof ITEM_CATEGORIES)[number]["id"];

export const CATEGORY_IDS = ITEM_CATEGORIES.map((c) => c.id) as [ItemCategoryId, ...ItemCategoryId[]];

export function categoryById(id: string): ItemCategory {
  return ITEM_CATEGORIES.find((c) => c.id === id) ?? ITEM_CATEGORIES[ITEM_CATEGORIES.length - 1];
}

export const isCategoryId = (id: string): id is ItemCategoryId => ITEM_CATEGORIES.some((c) => c.id === id);

// Words owners use for their flat-rate items, so a hand-added "Couch" line
// takes up a couch's space in the trailer.
const NAME_HINTS: [RegExp, ItemCategoryId][] = [
  [/sectional/i, "sectional"],
  [/couch|sofa|futon/i, "sofa"],
  [/loveseat/i, "loveseat"],
  [/recliner|arm ?chair/i, "armchair"],
  [/mattress|box ?spring/i, "mattress"],
  [/fridge|refrigerator|freezer/i, "refrigerator"],
  [/dishwasher/i, "dishwasher"],
  [/water heater/i, "water_heater"],
  [/microwave|toaster|small appliance/i, "small_appliance"],
  [/washer|dryer|appliance/i, "washer_dryer"],
  [/stove|oven|range/i, "stove"],
  [/\btvs?\b|television|monitor/i, "tv"],
  [/treadmill|elliptical|exercise|gym/i, "exercise"],
  [/piano/i, "piano"],
  [/hot ?tub|spa\b|jacuzzi/i, "hot_tub"],
  [/grill|patio/i, "grill_patio"],
  [/carpet|rug/i, "carpet"],
  [/dresser|chest|armoire/i, "dresser"],
  [/bed ?frame|headboard/i, "bed_frame"],
  [/bookcase|bookshelf|shelv/i, "shelving"],
  [/entertainment|cabinet|hutch/i, "cabinet"],
  [/desk/i, "desk"],
  [/table/i, "table"],
  [/chair/i, "chair"],
  [/concrete|dirt|brick|rock|gravel|soil/i, "dense"],
  [/tire/i, "other"],
];

/** The item type a name most likely refers to, or "other". */
export function guessCategory(name: string): ItemCategoryId {
  return NAME_HINTS.find(([re]) => re.test(name))?.[1] ?? "other";
}
