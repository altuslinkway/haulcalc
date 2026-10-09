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
  discountPct = 0,
): string {
  const greeting = details.customerName.trim() ? `Hi ${details.customerName.trim()}!` : "Hi!";
  const from = settings.businessName.trim() ? ` This is ${settings.businessName.trim()}.` : "";

  const single = style === "single" || quote.total.low === quote.total.high;
  // A typed single price only counts while "single price" is chosen.
  const one = style === "single" ? (price ?? quote.suggested) : quote.suggested;
  const priceText = single ? money(one) : `${money(quote.total.low)}–${money(quote.total.high)}`;

  const label = quote.volume.sizeLabel.toLowerCase();
  const size = label ? ` (about ${label.endsWith("loads") ? "" : "a "}${label})` : "";
  const parts = [
    `${greeting}${from} Thanks for sending the photos.`,
    `Based on what we can see${size}, your price${forWhat(details)} is ${priceText}${off(discountPct)}, including ${included(details)}.`,
  ];

  const prohibited = estimate.prohibitedItems.map((p) => midSentence(p.name));
  if (prohibited.length > 0) {
    parts.push(`Heads up: we can't take ${joinList(prohibited)}, so please set those aside.`);
  }

  if (estimate.questionsForCustomer.length > 0) {
    parts.push(`A quick question so we get it right: ${estimate.questionsForCustomer[0]}`);
  }

  parts.push(
    `That covers what's in the photos. We'll confirm the final price on site before we start, and it won't go over ${single ? "that" : "the top of that range"} unless there's more to take. Want to get on the schedule?`,
  );
  return parts.join("\n\n");
}

/** What to text a customer who asks for a quote, so the photos are usable. */
export function buildPhotoRequestMessage(settings: Settings): string {
  const from = settings.businessName.trim() ? ` from ${settings.businessName.trim()}` : "";
  const questions = settings.standardQuestions.filter((q) => q.trim());
  return [
    `Hi! Thanks for reaching out${from}. To get you an accurate price fast, please text us:`,
    [
      "• 2 wide photos of each pile from different angles, with a door or trash can in the shot for scale",
      "• Close-ups of any appliances, mattresses, TVs, hot tubs or heavy items",
      "• A photo of the path from the street or driveway to the items",
    ].join("\n"),
    questions.length > 0 ? `And let us know:\n${questions.map((q) => `• ${q}`).join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

/** "Two paint cans" reads wrong mid-sentence; "PCBs" should stay as is. */
function midSentence(name: string): string {
  return /^[A-Z][a-z]/.test(name) ? name[0].toLowerCase() + name.slice(1) : name;
}

/** A text-message link that opens the phone's messages app, addressed to the customer when there's a number. */
export function smsHref(phone: string, body: string): string {
  const to = phone.replace(/[^\d+]/g, "");
  return `sms:${to}?&body=${encodeURIComponent(body)}`;
}

const forWhat = (details: JobDetails) => (details.curbside ? " for curbside pickup" : "");
const included = (details: JobDetails) =>
  details.curbside ? "loading from the curb, hauling and disposal" : "labor, loading, hauling and disposal";
const off = (pct: number) => (pct > 0 ? ` (${Math.round(pct)}% off)` : "");

/** The quote text for a quick quote, priced without photos. */
export function buildQuickQuoteMessage(
  settings: Settings,
  details: JobDetails,
  what: string,
  price: number,
  discountPct = 0,
): string {
  const greeting = details.customerName.trim() ? `Hi ${details.customerName.trim()}!` : "Hi!";
  const from = settings.businessName.trim() ? ` This is ${settings.businessName.trim()}.` : "";
  return [
    `${greeting}${from} Thanks for reaching out.`,
    `For ${what}${forWhat(details)}, your price is ${money(price)}${off(discountPct)}, including ${included(details)}.`,
    "We'll confirm the final price on site before we start, and it won't go over that unless there's more to take. Want to get on the schedule?",
  ].join("\n\n");
}

/** Sent after the job: thanks, the total, and how to pay if they haven't yet. */
export function buildThankYouMessage(
  settings: Settings,
  customerName: string,
  total: number,
  paid: boolean,
): string {
  const name = customerName.trim();
  const pay = settings.paymentInfo.trim();
  const review = settings.reviewLink.trim();
  const sign = settings.businessName.trim() ? `\n\n${settings.businessName.trim()}` : "";
  return [
    `Thanks${name ? `, ${name}` : ""}! It was great working with you, and everything's gone.`,
    paid
      ? `Got your payment of ${money(total)}. Thank you!`
      : `Your total is ${money(total)}.${pay ? ` You can pay with ${pay}.` : ""}`,
    review ? `If you have a minute, a quick review would mean a lot: ${review}` : "",
    `If you know anyone who needs junk hauled, we'd love the referral.${sign}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
