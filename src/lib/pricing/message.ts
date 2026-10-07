import type { JobDetails, JobEstimate, Quote, Settings } from "./types";

export type QuoteStyle = "range" | "single";

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/** A ready-to-text quote for the customer. The owner can edit it before sending. */
export function buildQuoteMessage(
  settings: Settings,
  estimate: JobEstimate,
  details: JobDetails,
  quote: Quote,
  style: QuoteStyle,
  price?: number,
): string {
  const greeting = details.customerName.trim() ? `Hi ${details.customerName.trim()}!` : "Hi!";
  const from = settings.businessName.trim() ? ` This is ${settings.businessName.trim()}.` : "";

  const priceText =
    style === "single" || quote.total.low === quote.total.high
      ? money(price ?? quote.suggested)
      : `${money(quote.total.low)}–${money(quote.total.high)}`;

  const parts = [
    `${greeting}${from} Thanks for sending the photos.`,
    `Based on what we can see (${quote.volume.tierLabel.toLowerCase()} of our trailer), your price is ${priceText}, including labor, loading, hauling and disposal.`,
  ];

  const prohibited = estimate.prohibitedItems.map((p) => midSentence(p.name));
  if (prohibited.length > 0) {
    parts.push(`Heads up: we can't take ${joinList(prohibited)}, so please set those aside.`);
  }

  const onSite = estimate.feeItems
    .map((f) => settings.itemFees.find((i) => i.id === f.itemId))
    .filter((fee) => fee?.onSiteQuote)
    .map((fee) => fee!.name.toLowerCase());
  if (onSite.length > 0) {
    parts.push(`The ${joinList(onSite)} will be priced on site.`);
  }

  if (estimate.questionsForCustomer.length > 0) {
    parts.push(`A quick question so we get it right: ${estimate.questionsForCustomer[0]}`);
  }

  parts.push("Final price is confirmed on site before we start. Want to get on the schedule?");
  return parts.join("\n\n");
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

/** "Two paint cans" reads wrong mid-sentence; "PCBs" should stay as is. */
function midSentence(name: string): string {
  return /^[A-Z][a-z]/.test(name) ? name[0].toLowerCase() + name.slice(1) : name;
}
