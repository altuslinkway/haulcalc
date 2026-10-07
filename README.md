# HaulCalc

Quote junk removal jobs from customer photos in seconds. Built for independent haulers: the customer texts you pictures, you drop them into HaulCalc on your phone, and you get a price from **your** rates plus a message you can text right back.

## How it works

1. **The AI sizes up the job; it doesn't set the price.** Claude looks at the photos and returns a structured estimate: what's there, how many cubic yards it takes in the trailer (as a low–high range), roughly how much it weighs, which of your per-item fees apply (mattresses, couches, appliances…), anything on your prohibited list, stairs, and questions worth asking the customer.
2. **Your rates set the price.** Plain code (`src/lib/pricing/engine.ts`) turns that estimate into dollars:
   - **Load price** from your rate card. Tiers are read as a curve: with 1/4 = $125–$200 and 1/2 = $200–$350, a 3/8 load is $275. Bigger than one trailer? Each full load is charged at the top price and the rest goes on the curve.
   - **Item fees** (low and high ends), with "on-site quote" items flagged instead of priced.
   - **Travel** past your free radius, **stairs** per flight, and a **heavy material** charge when estimated weight is over what a load includes.
   - **Minimum charge**, then the total is rounded to $5.
3. **Profit check.** Your costs (dump fees by ton or yard, crew wages including drive time, truck cost per mile, item disposal, overhead) are estimated for the same job, so you see profit and margin before you quote. No rate card? Switch to **costs + margin** pricing.
4. **Adjust and send.** Fix anything the AI got wrong (load size, weight, item counts, stairs) and the price updates instantly. Copy, share, or text the ready-made quote.

Rates live under **My rates**. Defaults come from a real rate card (1/8 load $75–$125 through full load $500–$765, plus mattress, couch, electronics, appliance + freon and construction-debris fees). Owners can type in their own numbers or **upload a photo of their rate card** and have it filled in for them to review.

## Running it

```bash
npm install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
```

No API key yet? `npm run demo` runs the full app with sample AI answers.

On a phone, open the site and use "Add to Home Screen". It runs like an app.

```bash
npm test          # pricing engine + rate card import tests
npm run typecheck
npm run lint
```

## Project layout

| Path | What's there |
| --- | --- |
| `src/lib/pricing/` | Data model, default rates, pricing engine, quote message, rate-card import. No AI and no UI, fully unit-tested. |
| `src/lib/ai/` | Claude prompts, structured-output schemas, API calls, demo data. |
| `src/app/api/analyze` | Photos → job estimate. |
| `src/app/api/rate-card` | Rate card photos → rates for the owner to review. |
| `src/components/` | Quote screen, settings screen, shared UI. |

The AI model defaults to Claude Opus 5.5 at medium effort (`HAULCALC_MODEL`, `HAULCALC_EFFORT` to change). Requests opt into Anthropic's server-side fallback, so a rare safety decline retries on another model instead of failing.

## Current limits / next steps

- **Settings are stored in the browser** (one owner, one device). Accounts and a database come next, so rates sync across phones and crew.
- **Customer upload link.** Let customers upload photos directly from a link the owner texts them, instead of the owner forwarding pictures.
- **Quote history** and accepted/declined tracking to tune pricing over time.
- **Calibration.** Compare AI volume estimates with what actually went in the trailer and tune the prompt's reference volumes.
- Deploying to Vercel works out of the box. Photos are shrunk on the phone before upload to stay under request size limits.
