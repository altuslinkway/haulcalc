import { describe, expect, it } from "vitest";
import { DEFAULT_DETAILS, DEFAULT_SETTINGS } from "./defaults";
import { computeQuote } from "./engine";
import { buildQuickQuoteMessage, buildThankYouMessage, smsHref } from "./message";
import { quickEstimate, quickSummary } from "./quick";

const s = DEFAULT_SETTINGS;
const price = (fraction: number, items: Record<string, number> = {}, distanceMiles = 0) =>
  computeQuote(s, quickEstimate(s, { fraction, items }), { ...DEFAULT_DETAILS, distanceMiles }).total;

describe("quick quote", () => {
  it("charges exactly the load price plus the items, as one price", () => {
    expect(price(0.5)).toEqual({ low: 430, high: 430 });
    expect(price(0.5, { tv: 1, mattress: 2 })).toEqual({ low: 430 + 50 + 120, high: 430 + 50 + 120 });
    expect(price(1, { couch: 1 }, 35)).toEqual({ low: 765 + 100 + 40, high: 765 + 100 + 40 });
  });

  it("prices a 1/8 load between the minimum and the 1/4 price, and several full loads", () => {
    expect(price(0.125)).toEqual({ low: 175, high: 175 });
    expect(price(2)).toEqual({ low: 765 * 2, high: 765 * 2 });
    expect(quickSummary(s, { fraction: 2, items: {} })).toBe("2 full loads");
    expect(quickSummary(s, { fraction: 1, items: {} })).toBe("a full load");
    expect(quickSummary(s, { fraction: 0.125, items: {} })).toBe("a 1/8 load");
  });

  it("charges concrete or dirt by the pickup bed as a flat-rate item", () => {
    expect(price(0, { "heavy-bed": 2 })).toEqual({ low: 300, high: 300 });
  });

  it("never goes under the minimum for small item-only jobs", () => {
    expect(price(0, { tv: 1 })).toEqual({ low: 99, high: 99 });
  });

  it("describes the job in plain words", () => {
    expect(quickSummary(s, { fraction: 0.5, items: { tv: 1, mattress: 2, appliance: 1 } })).toBe(
      "a 1/2 load, mattress ×2, a TV and an appliance",
    );
    expect(quickSummary(s, { fraction: 0, items: {} })).toBe("");
  });

  it("writes the quote text", () => {
    const msg = buildQuickQuoteMessage({ ...s, businessName: "Joe's" }, { ...DEFAULT_DETAILS, customerName: "Dana" }, "a 1/2 load", 430);
    expect(msg).toContain("Hi Dana! This is Joe's.");
    expect(msg).toContain("For a 1/2 load, your price is $430,");
  });

  it("mentions curbside pickup and a discount in the text", () => {
    const msg = buildQuickQuoteMessage(s, { ...DEFAULT_DETAILS, curbside: true }, "a 1/2 load", 290, 10);
    expect(msg).toContain("For a 1/2 load for curbside pickup, your price is $290 (10% off), including loading from the curb");
  });
});

describe("after the job", () => {
  it("asks for payment with the owner's payment info, or thanks them for paying", () => {
    const owed = buildThankYouMessage({ ...s, paymentInfo: "Venmo @joes-hauling", businessName: "Joe's" }, "Dana", 450, false);
    expect(owed).toContain("Thanks, Dana!");
    expect(owed).toContain("Your total is $450. You can pay with Venmo @joes-hauling.");
    expect(owed.endsWith("Joe's")).toBe(true);
    expect(buildThankYouMessage(s, "", 450, true)).toContain("Got your payment of $450.");
    expect(buildThankYouMessage(s, "", 450, true)).not.toContain("review");
    expect(buildThankYouMessage({ ...s, reviewLink: "https://g.page/r/joes" }, "", 450, true)).toContain(
      "a quick review would mean a lot: https://g.page/r/joes",
    );
  });

  it("addresses texts to the customer's number", () => {
    expect(smsHref("(555) 201-4477", "Hi there")).toBe("sms:5552014477?&body=Hi%20there");
    expect(smsHref("", "Hi")).toBe("sms:?&body=Hi");
  });
});
