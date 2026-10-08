# HaulCalc

Quote junk removal jobs from customer photos in seconds. Built for independent haulers: the customer texts you pictures, you drop them into HaulCalc on your phone, and you get a price from **your** rates plus a message you can text right back.

## How it works

1. **Ask for the right photos.** The quote screen has a ready-made text asking the customer for wide shots with something for scale, close-ups of heavy or fee items, the path to the truck, and your standard questions (other rooms, stairs, parking, what's in the boxes).
2. **The AI lists the job; it doesn't set the price.** Claude looks at the photos and returns one line per item or pile: how many, how much trailer space, how heavy, and what material (household, construction, yard, or concrete/dirt). It tags items on your flat-rate list, counts add-on items, flags anything you won't take, and suggests questions for the customer.
3. **You fix and move things around.** Every line can be edited, deleted, or added to. Each item can also be switched between **by the load** and a **flat rate**. The "It's really about…" buttons resize the load in one tap.
4. **Your rates set the price.** Plain code (`src/lib/pricing/engine.ts`) prices it:
   - **Load price** from your rate card. Tiers are read as a curve, so a 3/8 load lands between the 1/4 and 1/2 prices. Small loads cost more per yard because the trip costs the same.
   - **Flat-rate items** (fridge/appliance, hot tub, piano, safe) are charged their own price and don't count toward the load price. **Add-ons** (mattress, freon, TVs, tires, propane) are small fees on top.
   - **Range from photos.** It spreads around what's visible by AI confidence, adds a cushion on the high end for unseen items (more for multi-room or unclear jobs), and applies a correction learned from your past jobs.
   - **Travel** past your free radius, **stairs** per flight (doubled for big loads), **long carry**, and a **heavy-material** charge when weight is over what the load includes. The heavy rate is never less than twice your dump rate.
   - **Job options:** same-day, after-hours, packed rooms. Then the **minimum charge**, rounded to $5.
5. **Profit check.** Your real costs for the same job are added up and shown as profit, margin, and **revenue per truck-hour**:
   - dump fees by weight and material, with a per-trip minimum
   - trips set by space *or* payload, whichever needs more
   - crew time door to door, including the dump run, plus payroll taxes
   - truck cost per mile, disposal fees, card fees, overhead, and marketing when the job came from a paid lead
   - a **shared dump run** option that splits dump time across small jobs
6. **Send it and learn.** Copy, share, or text the quote, and it's saved under **Jobs**. After the job, log the actual load size, final price, and dump-ticket weight. After 3 jobs, HaulCalc suggests a correction for the AI's estimates.

Defaults come from market research on US independents. See [`reports/Junk removal cost drivers.md`](reports/Junk%20removal%20cost%20drivers.md), with the underlying notes in `research_notes/`. Everything is editable under **My rates**: owners can type their numbers, reorder items, change how each item is charged, or **upload a photo of their rate card** to fill it in.

## Running it

```bash
npm install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
```

No API key yet? `npm run demo` runs the full app with sample AI answers.

On a phone, open the site and use "Add to Home Screen". It runs like an app.

```bash
npm test          # pricing engine, estimate edits, calibration, AI mapping, rate card import
npm run typecheck
npm run lint
```

## Project layout

| Path | What's there |
| --- | --- |
| `src/lib/pricing/` | Data model, default rates, pricing engine, estimate edits, quote and photo-request messages, rate-card import, calibration. No AI and no UI, fully unit-tested. |
| `src/lib/ai/` | Claude prompts, structured-output schemas, API calls, demo data. |
| `src/lib/client/` | Browser storage for settings and jobs, photo resizing. |
| `src/app/api/analyze` | Photos → itemized job estimate. |
| `src/app/api/rate-card` | Rate card photos → rates for the owner to review. |
| `src/components/` | Quote screen and item editor, Jobs, My rates, shared UI. |

The AI model defaults to Claude Opus 5.5 at medium effort (`HAULCALC_MODEL`, `HAULCALC_EFFORT` to change). Requests opt into Anthropic's server-side fallback, so a rare safety decline retries on another model instead of failing.

## Current limits / next steps

- **Settings and jobs are stored in the browser** (one owner, one device). Accounts and a database come next, so rates and job history sync across phones and crew.
- **No login yet.** Anyone with the site's link can run photo analyses on your API key, so keep the link private.
- **Customer upload link.** Let customers upload photos directly from a link the owner texts them, instead of forwarding pictures.
- **Unmeasured defaults:** dump-run time, loading time per ton of heavy material, and hours to load a full trailer are placeholders until owners' logged jobs calibrate them.
- Deploying to Vercel works out of the box. Photos are shrunk on the phone before upload to stay under request size limits.
