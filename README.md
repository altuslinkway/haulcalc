# HaulCalc

Quote junk removal jobs from customer photos in seconds. Built for independent haulers: the customer texts you pictures, you drop them into HaulCalc on your phone, and you get a price from **your** rates plus a message you can text right back.

## How it works

1. **Ask for the right photos.** The quote screen has a ready-made text asking the customer for wide shots with something for scale, close-ups of heavy items, the path to the truck, and your standard questions (other rooms, stairs, parking, what's in the boxes).
2. **The AI lists the job; it doesn't set the price.** Claude looks at the photos and returns one line per item or pile: how many, how much trailer space, and how heavy. It tags items on your flat-rate list, flags anything you won't take, and suggests questions for the customer.
3. **You fix it in a tap.** The 1/4, 1/2, 3/4 and Full buttons set the load to exactly that size and price it at exactly your price for it (no range on top, and shared learning records your size as the right answer). Any item can be removed, recounted, or switched between the load and a flat-rate item.
4. **Your rates set the price.** Plain code (`src/lib/pricing/engine.ts`) prices it from a few numbers:
   - **Four load prices** (1/4, 1/2, 3/4, full trailer). Sizes in between are priced in between, starting from your **minimum charge**, so a 3/8 load lands halfway between the 1/4 and 1/2 prices. Bigger than one trailer is full loads plus the rest. A bigger load never costs less, even if prices are typed out of order.
   - **Flat-rate items**, as many as you like ($50 for a TV, $170 for a fridge). Charged their price on top of the load; their space counts toward trips but is never billed twice.
   - **Extras:** travel past your free miles, stairs per flight, and a per-ton charge for loads heavier than normal junk (concrete, dirt, shingles), never less than twice your dump fee.
   - **A range, not a guess.** It spreads around what's visible by how sure the AI is, leaves 10% room for what the photos don't show (20% for multi-room jobs or unclear photos), and applies any learned correction. The owner doesn't set any of this.
   - Never below the **minimum charge**; otherwise rounded to $5.
5. **What you'd keep.** Dump fees by weight, gas for the drive and dump run, and helper pay come out of the price, with a heads-up when costs eat most of it.
6. **Send it.** Copy, share, or text the quote, and it's saved under **Jobs**.
7. **It gets smarter with every job** (see below).

## How estimates improve over time

The AI model itself isn't retrained. What improves is what HaulCalc tells it and how HaulCalc corrects its numbers, using feedback from every owner:

- **Corrections when quoting.** Every line the AI returns is tagged with an item type from a fixed list (`src/lib/pricing/categories.ts`). When an owner changes a size and sends the quote, the AI's guess and the owner's number are recorded side by side.
- **One tap after the job.** On the Jobs page, each sent quote asks "How did the job compare to the estimate?" (much smaller … much bigger).
- **Pooling across owners** (`src/lib/learning/`). Feedback goes to a shared Postgres table. It's aggregated as the median of each owner's median, so one careless or malicious account can't drag the numbers. Nothing is used until at least 3 different owners agree. Each owner's vote uses their latest jobs, so corrections keep up as the AI's guesses improve. Ratings are read against the quote the owner actually saw, so an applied correction doesn't undo itself.
- **Feeding it back:**
  - Learned item sizes (e.g. "sectional: about 4.2 yd³ each, confirmed by 9 owners") are added to the AI's instructions on every quote.
  - A whole-job correction for each kind of job (single items, one room, multi-room cleanouts) adjusts the price range. Quotes show it ("+8% learned from all owners' past jobs").
- **Each owner's own correction.** Jobs also shows how an owner's own jobs compare. They can apply their own correction instead of the shared one.
- **Privacy.** Only item types, sizes, weights and ratings are shared. Never photos, descriptions, names, addresses or prices. Owners can switch sharing off, or stop using shared learning, under My rates → Getting smarter.

To turn shared learning on, set `DATABASE_URL` to any Postgres database (on Vercel: Storage → create a Postgres/Neon database, and it sets the variable for you). The table is created automatically. Without it, everything still works and learning stays on each device.

Defaults come from market research on US independents. See [`reports/Junk removal cost drivers.md`](reports/Junk%20removal%20cost%20drivers.md), with the underlying notes in `research_notes/`. Everything is editable under **My rates**: owners type in their four load prices, minimum and flat-rate items, or **upload a photo of their rate card** to fill them in. Sizes a card doesn't list are filled in from the ones it does.

## Running it

```bash
npm install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY
npm run dev                  # website at http://localhost:3000, the app at /quote
```

No API key yet? `npm run demo` runs the full app with sample AI answers.

On a phone, open `/quote` and use "Add to Home Screen". It opens straight into the app.

```bash
npm test          # pricing engine, estimate edits, learning (incl. real Postgres via PGlite), AI mapping, rate card import
npm run typecheck
npm run lint
```

## Project layout

| Path | What's there |
| --- | --- |
| `src/lib/pricing/` | Data model, default rates, pricing engine, estimate edits, quote and photo-request messages, rate-card import, calibration. No AI and no UI, fully unit-tested. |
| `src/lib/ai/` | Claude prompts, structured-output schemas, API calls, demo data. |
| `src/lib/learning/` | Shared learning: feedback store (Postgres or a local file), aggregation across owners. |
| `src/lib/client/` | Browser storage for settings and jobs, photo resizing, sending feedback. |
| `src/app/api/analyze` | Photos → itemized job estimate. |
| `src/app/api/rate-card` | Rate card photos → rates for the owner to review. |
| `src/app/api/feedback`, `src/app/api/learning` | Owners' corrections in; what's been learned out. |
| `src/app/(marketing)/` | The public website at `/`. |
| `src/app/(app)/` | The app: `/quote`, `/jobs`, `/settings`, with the bottom tab bar. |
| `src/components/` | Quote screen and item editor, Jobs, My rates, app shell, shared UI. |

The AI model defaults to Claude Opus 5.5 at medium effort (`HAULCALC_MODEL`, `HAULCALC_EFFORT` to change). Requests opt into Anthropic's server-side fallback, so a rare safety decline retries on another model instead of failing.

## Current limits / next steps

- **Settings and jobs are stored in the browser** (one owner, one device). Accounts come next, so rates and job history sync across phones and crew.
- **No login yet.** Anyone with the site's link can run photo analyses on your API key and send feedback. The one-vote-per-device math limits how much a bad actor can skew learning, but accounts are the real fix before opening it up widely.
- **Photos aren't kept**, so learning works from numbers only. Storing photos (with owner consent) would allow showing the AI similar past jobs as examples, and an accuracy test set for every prompt change.
- **Customer upload link.** Let customers upload photos directly from a link the owner texts them, instead of forwarding pictures.
- **Earnings tracking.** Log finished jobs and see what you made each month (next up).
- **Fixed behind the scenes:** the range spread, the room left for unseen items, loading time per trailer and dump-run time are set in `engine.ts` from the research, so owners don't have to think about them. Owners' logged jobs could tune them later.
- Deploying to Vercel works out of the box. Photos are shrunk on the phone before upload to stay under request size limits.
