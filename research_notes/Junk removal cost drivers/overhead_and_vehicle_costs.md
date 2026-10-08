# Overhead and Vehicle Costs for a Small US Junk Removal Business (1–3 trucks/trailers)

Research date: 2026-10-07/08. Scope: fixed and semi-fixed operating costs, and how to allocate them per job, to set defaults for "truck cost per mile" and "overhead per job" in a quoting app.

Method note: About 25 searches/fetch attempts. Several primary pages (MoneyGeek, Dropcurb, KMF Business Advisors, JS Hauling, Webtonic) were blocked by the network proxy for direct fetch, so some figures below come from search-engine summaries of those pages. Those are marked "(via search summary)". Many benchmark sources are vendors (marketing agencies, software, lead sellers, franchise-data sites) with an interest in the numbers. Treat them as directional. FDD figures come from secondary summaries; no FDD was read directly.

---

## 1. Vehicle and equipment costs, fuel, and cost per mile

### Takeaway
A new 7x14 14k-GVWR dump trailer costs about $10,300–$14,500 before tax and fees, and a 7x16 about $11,000–$14,200. A used cab-over dump or junk truck is roughly $40k–$48k, and a new 16' unit is about $79k. At fall-2026 fuel prices (gas about $4.15–$4.46, diesel a record $5.97–$6.53), fuel alone runs about $0.36–$0.48/mile for a gas pickup towing, and $0.49–$0.58/mile for diesel. For a quoting app, use a variable-only per-mile default of about $0.65–$0.75/mile (fuel plus wear) and put payments and insurance into overhead per job. As all-in benchmarks, the IRS rate is $0.725–$0.76/mile in 2026 and AAA puts a half-ton pickup at $0.985/mile.

### Cited Findings
**Dump trailers (new, 2026 model year, dealer asking prices, excluding tax/tag/title/fees)**
- 7x14 14k GVWR (dual 7,000 lb axles). Panther low-side (2 ft sides, about 7 yd³): $10,310 sale (Tampa), $10,495 (Orlando), payload 10,200 lb. Panther high-side (4 ft sides, about 14 yd³): $10,995, payload 9,800 lb. AMP low-side: $11,635, payload 10,000 lb. AMP buildable side: $11,950–$11,995, payload 9,600 lb. Horizon low-side: $14,495, payload 9,410 lb — [Load Runner Trailers listings](https://loadrunnertrailers.com/en/inventory/6a2ae80fe5f1b41efd94bf0e); [AMP listing](https://www.loadrunnertrailers.com/en/inventory/6941c09bde9effe9c0ee0d0e); [Horizon listing](https://loadrunnertrailers.com/en/inventory/691c92e9e79df195f4a43b48). (All from a single Florida dealer.)
- 6x12. Taylor 6x12 high-side, 12k GVWR (dual 6,000 lb axles): $8,995, payload 8,265 lb — [Load Runner Trailers](https://loadrunnertrailers.com/en/inventory/69d023fcfb812c6fa47106fd). Big Tex 90SR 6x12 tandem: 9,990 lb GVWR, payload up to 7,060 lb, call for price — [Rentz Trailers](https://www.rentztrailers.com/new-models/2026-big-tex-trailers-90sr-tandem-axle-single-ram-dump-6-x-12-29343119b).
- 7x16. Big Tex 14LP (83"x16'): $10,999, 14,000 lb GVWR, empty weight 4,811 lb, payload 9,189 lb — [TruckPaper listing](https://www.truckpaper.com/listing/for-sale/246880491/2026-big-tex-16lp-dump-trailers?print=1). PJ DLT1673 (83"x16', triple axle, 21,000 lb GVWR, about 16,120 lb payload): $14,154 — (via search summary of PJ/Rentz/TruckPaper results; [Rentz PJ DE listing](https://www.rentztrailers.com/new-models/2026-pj-trailers-de-hd-low-pro-dump-825-x-16-29340355b)). PJ DV Voyager 83x16: 15,400 lb GVWR, 10,700 lb payload — [Rentz Trailers](https://www.rentztrailers.com/new-models/2026-pj-trailers-dv-voyager-dump-83-x-16-29340367b).
- No Load Trail or Diamond C 2026 prices were found in results.

**Junk/dump trucks (cab-over)**
- Used Isuzu NPR-HD with a 14' dump body. 2014 with 137k mi: $39,995 (Miami). 2016 with 134,900 mi: $39,900 (PA). 2016 crew cab: $44,970. 2015 NPR Eco-Max chipper dump: $48,000. NPR-HD GVWR is 14,500 lb — [Comvoy 2014 NPR-HD](https://comvoy.com/work-truck/Miami-FL/used-2014-Isuzu-npr-hd-dump-truck-12680461); [Comvoy 2016 NPR](https://comvoy.com/work-truck/Homestead-FL/used-2016-Isuzu-npr-dump-truck-13162262); [Commercial Truck Trader](https://www.commercialtrucktrader.com/listing/2016-ISUZU-NPR+HD-5039454264); [TruckPaper](https://www.truckpaper.com/listing/for-sale/244028133/2015-isuzu-npr-eco-max-dump-trucks).
- New 2025 Isuzu NRR (19,500 lb GVWR) with a 16' all-steel dump body: $78,950 (West Covina dealer, listing updated Feb 2025) — (via search summary; [Construction Equipment Guide Isuzu dump listings](https://www.constructionequipmentguide.com/used-dump-trucks-for-sale/isuzu)).
- Startup-guide estimates: a used pickup costs $3,000–$8,000. A used box or dump truck costs $15,000–$25,000 with 100k–170k miles. Leasing runs $300–$800/month — [Dropcurb](https://dropcurb.com/blog/junk-removal-business-startup-cost) (via search summary).
- College Hunks' Item 7 line "Trucks, vehicle wrap, signage" is $8,000–$45,000 for leasing or buying 1–2 box trucks at launch. A separate unverified estimate puts trucks alone at $15,000–$60,000 — [Pulse RevOps (citing 2025 FDD)](https://pulserevops.com/knowledge/fr0251); [ClearValue Lending](https://clearvaluelending.com/resources/cost-to-start-college-hunks-hauling-junk-franchise).

**Fuel prices (EIA weekly retail, 2026)**
- Week of Sept 7, 2026: regular gasoline $4.157/gal (+$0.965 y/y) and diesel $5.967/gal (+$2.201 y/y) — [EIA Weekly Petroleum Status highlights, 2026-09-10](https://www.eia.gov/petroleum/supply/weekly/archive/2026/2026_09_10/pdf/highlights.pdf).
- Week of Sept 14: diesel $6.285 (first reading over $6 since the series began in 1994) and gasoline $4.319. The diesel–gas spread of about $1.97 is a record — [TheTrading.tools (citing EIA)](https://www.thetrading.tools/chart-of-the-day/2026-09-20-diesel-record-premium-over-gasoline).
- Week of Sept 21: diesel record of about $6.53, gas about $4.34. Week of Sept 28: diesel $6.38, gas $4.46 — [Kpler EIA digest](https://www.kpler.com/blog/eia-digest-retail-prices-for-transportation-fuels-keep-getting-more-expensive) (via search summary).
- Implied year-ago (Sept 2025) prices: gas about $3.19 and diesel about $3.77 (my arithmetic from the EIA y/y deltas above).

**Fuel economy when towing**
- 2024 Ford F-250 back-to-back on a 111-mi highway loop, not towing: 7.3L gas 16.6 mpg, 6.7L Power Stroke diesel 19.6 mpg — [TFLtruck](https://tfltruck.com/2023/12/video-gas-vs-diesel-mpg-battle-these-two-2024-ford-f-250s-are-unbelievably-close/).
- Owner anecdotes. A half-ton with a dump trailer gets about 18 mpg commuting but "way down to under 10" when towing. A V10 gas F-250 towed at about 10 mpg, and a 6.0 diesel at about 12 — [TractorByNet forum](https://www.tractorbynet.com/forums/threads/your-towing-rigs-and-trailers.104218/post-6120054); [iboats forum](https://forums.iboats.com/goto/post?id=1205524) (anecdotal).
- The diesel premium on HD pickups is roughly $8k–$9k, with higher upkeep (DEF, more oil). Diesel's heavier engine reduces payload. Gas is better suited to short stop-and-go trips — [TFLtruck Ask TFL](https://tfltruck.com/2019/06/ask-tfl-should-i-buy-a-gas-or-diesel-heavy-duty-truck-to-tow-10000-lbs/); [popupbackpacker](https://popupbackpacker.com/tow-vehicle-diesel-or-gas-engine/) (via search summary).

**Per-mile benchmarks**
- IRS business standard mileage rate: 70¢/mi for 2025. For 2026 it is 72.5¢/mi (Notice 2026-10, set Dec 2025), raised to 76¢/mi for miles driven July 1–Dec 31, 2026 (Announcement 2026-11) because of fuel prices — [IRS IR-2025-128](https://www.irs.gov/newsroom/irs-sets-2026-business-standard-mileage-rate-at-725-cents-per-mile-up-25-cents); [CPA Practice Advisor, Jul 2026](https://www.cpapracticeadvisor.com/2026/07/16/rising-fuel-costs-prompt-irs-to-raise-standard-mileage-rates-for-rest-of-2026/186784/); [NATP](https://www.natptax.com/news-insights/blog/irs-raises-business-mileage-rate-to-76-cents-per-mile/). (The 76¢ midyear change was confirmed by multiple tax and payroll sources. The IRS announcement text itself was not retrieved.)
- AAA "Your Driving Costs" 2025 study (15,000 mi/yr, averaged over 5 yrs/75k mi, includes depreciation, finance, insurance, fees, fuel, maintenance, tires): half-ton pickup 98.54¢/mi ($14,781/yr), the highest category. Mid-size pickup 79.11¢/mi. Small sedan 55.87¢/mi — [AAA Fact Sheet 9.2025](https://newsroom.aaa.com/wp-content/uploads/2025/09/UPDATE-AAA-Fact-Sheet-Your-Driving-Cost-9.2025-1.pdf); [AAA newsroom](https://newsroom.aaa.com/2025/09/aaa-new-vehicle-costs-drop-to-11577/). One search snippet mentioned a half-ton figure of $1.0966/mi tied to 2026 gas prices, possibly a later AAA edition. It is unverified.
- No operator-reported all-in cost per mile specific to junk removal was found.

### Inferences
- **Fuel cost per mile, from cited prices and mpg.** Gas at $4.30/gal works out to $0.48/mi at 9 mpg (loaded tow), $0.43 at 10 mpg, $0.39 at 11 mpg and $0.36 at 12 mpg (mixed loaded and empty). Diesel at $6.40/gal works out to $0.58/mi at 11 mpg, $0.53 at 12 mpg and $0.49 at 13 mpg. At Sept-2025 prices (gas about $3.19, diesel about $3.77), the same trucks were about $0.27–$0.32/mi. **In late 2026, diesel is more expensive per mile than gas** despite better mpg, because of the record spread. The app should take fuel price and mpg as user inputs, not hard-code them.
- **Recommended app default for "truck cost per mile" (variable only):** about **$0.70/mi** for a gas 3/4-ton plus a 14k dump trailer, with a reasonable range of $0.55–$0.90. This is about $0.40–$0.45 fuel plus about $0.20–$0.30 for maintenance, tires, brakes and trailer wear. The maintenance/tire split is an **unsourced assumption**: no source broke AAA's total into components for a towing rig. For a diesel box/dump truck at 2026 diesel prices, use about $0.80–$1.00/mi (mpg not sourced; see Gaps).
- **All-in alternative.** If the app does not separately charge truck payments and insurance in overhead, an all-in default of about **$1.00–$1.25/mi** is defensible. It is anchored on AAA's 98.5¢ half-ton figure, which assumes 2025 fuel, a lighter truck, no trailer and no heavy towing. The IRS 72.5–76¢ figure is a floor for passenger-type vehicles and understates a loaded towing rig.
- **Avoid double counting.** Either put vehicle payments and insurance in overhead per job and use a variable-only per-mile rate, or use an all-in per-mile rate and leave vehicle fixed costs out of overhead. Not both.
- **Financing payments (illustrative; interest rates are assumptions, not sourced).** At 8% APR over 60 months: a $35k used HD pickup is about $710/mo, a $50k newer pickup or used NPR dump about $1,014/mo, and a $12k dump trailer about $243/mo. At 11% APR, $50k is about $1,087/mo and $12k about $261/mo. A $75k new cab-over over 72 months at 8% is about $1,315/mo. So vehicle plus trailer payments for one rig are typically about **$950–$1,350/mo**, versus the $300–$800/mo lease range cited by Dropcurb.

### Gaps
- Real-world mpg for a box/cab-over junk truck (Isuzu NPR/NRR, Ford E-450/F-450 box) loaded vs. empty was not found.
- No source broke out maintenance, tires and depreciation per mile for a towing pickup or for dump trailers (trailer tires, brakes, hydraulic pump/battery). Trailer depreciation and resale values were not found.
- Current commercial-vehicle loan APRs were not researched, so the payment math uses assumed rates.
- No junk-removal operator's self-reported all-in cost per mile was found (Reddit and YouTube content was not reachable via search).
- Not researched, but important to verify: a 3/4-ton (about 10k–11.5k GVWR) towing a 14k-GVWR trailer exceeds a 26,001-lb combined rating with a trailer over 10,000 lb. Under FMCSA rules that combination may require a Class A CDL and DOT compliance for commercial use. This affects which trailer size small operators should choose.

---

## 2. Payload and weight limits for heavy materials

### Takeaway
A 7x14 or 7x16 14k-GVWR dump trailer carries about 9,200–10,300 lb, and a 6x12 (10k–12k GVWR) about 7,000–8,300 lb. A cab-over junk truck at 14,500 lb GVWR likely carries considerably less (payload not found). Weight, not volume, sets the limit on heavy debris. A 7x14 maxes out at about **4.5–5.5 yd³ of broken concrete**, **4.5 yd³ of wet excavated soil**, and roughly **7–14 yd³ of shingles**, so a "full trailer" of concrete is impossible.

### Cited Findings
- 7x14 14k GVWR payloads: 9,410–10,200 lb (Panther, AMP, Horizon). Low-side holds about 7 yd³ and 4-ft high-side about 14 yd³ — [Load Runner Trailers](https://loadrunnertrailers.com/en/inventory/6a2ae80fe5f1b41efd94bf0e).
- 7x16 14k GVWR: Big Tex 14LP payload 9,189 lb (empty 4,811 lb) — [TruckPaper](https://www.truckpaper.com/listing/for-sale/246880491/2026-big-tex-16lp-dump-trailers?print=1). Big Tex 14LX (rental) about 10,000–10,340 lb — [BigRentals](https://bigrentals.com/trailer-rentals/dump-trailers/9f30b213-c3b6-43).
- 6x12: Taylor 12k GVWR payload 8,265 lb; Big Tex 90SR 9,990 GVWR payload 7,060 lb — [Load Runner](https://loadrunnertrailers.com/en/inventory/69d023fcfb812c6fa47106fd); [Rentz](https://www.rentztrailers.com/new-models/2026-big-tex-trailers-90sr-tandem-axle-single-ram-dump-6-x-12-29343119b).
- Isuzu NPR-HD dump: 14,500 lb GVWR, with axle ratings of 6,630 lb front and 11,020 lb rear on one 2016 unit. No payload is stated in the listings. A 2022 Isuzu NQR with a 12' steel dump is listed with 10k lb payload — (via search summary of [Comvoy](https://www.comvoy.com/work-truck/miami-fl/used-2017-isuzu-npr-refrigerated-body-12639337) / [Commercial Truck Trader](https://www.commercialtrucktrader.com/listing/2016-ISUZU-NPR+HD-5039454264) listings).
- Material densities:
  - Broken concrete or asphalt in a container is about 2,025 lb/yd³; solid concrete about 4,050 lb/yd³ — [Budget Dumpster weight calculator](https://www.budgetdumpster.com/resources/dumpster-weight-calculator.php).
  - Loose concrete is 1,855 lb/yd³ (from "landfill data"). The same chart gives dirt/sand at 929 lb/yd³ and asphalt shingles at 731 lb/yd³ — [Trash Daddy Dumpsters](https://trashdaddydumpsters.com/dumpster-material-weights/).
  - Another guide gives concrete at 2,000–3,000 lb/yd³ and shingles at 750–1,500 lb/yd³ — [ASAP Marketplace](https://www.asapmarketplace.com/blog/dumpster-weight-limits-explained/) (via search summary).
  - Excavated soil is about 2,200 lb/yd³ — [Calculover](https://calculover.com/construction-diy/demolition/dumpster-size/).
  - Shingles weigh 235 lb per square (3-tab) to 400 lb per square (architectural); bundles are about 60–80 lb — [Reservety estimator](https://reservety.com/tools/dumpster-rental/concrete-shingles-weight-estimator.html) (via search summary).
  - A 10-yd dumpster may hit its weight limit with only 2–3 yd³ of broken concrete. Many haulers restrict heavy materials to 10-yd containers — [ASAP Marketplace](https://www.asapmarketplace.com/blog/dumpster-weight-limits-explained/).

### Inferences
- Maximum heavy-material volume by payload (my arithmetic, payload ÷ density):

| Material (density used) | 10,000 lb (7x14 / 7x16 14k) | 9,200 lb (heavier 7x16) | 7,000 lb (6x12 10k) |
|---|---|---|---|
| Broken concrete, 1,855–2,025 lb/yd³ | 4.9–5.4 yd³ | 4.5–5.0 yd³ | 3.5–3.8 yd³ |
| Broken concrete, conservative 3,000 lb/yd³ | 3.3 yd³ | 3.1 yd³ | 2.3 yd³ |
| Wet/excavated soil, 2,200 lb/yd³ | 4.5 yd³ | 4.2 yd³ | 3.2 yd³ |
| Dry loose dirt, 929 lb/yd³ | 10.8 yd³ | 9.9 yd³ | 7.5 yd³ |
| Shingles, 731–1,500 lb/yd³ | 6.7–13.7 yd³ | 6.1–12.6 yd³ | 4.7–9.6 yd³ |
| Shingles by roof area, 235–400 lb/square | 25–42 squares | 23–39 squares | 17–30 squares |

- A practical app rule is "heavy material = max about 4–5 yd³ per 14k trailer load". Price heavy debris by weight or by load-fraction with a heavy surcharge, and flag a second trip when estimated weight exceeds payload. The tow vehicle's GCWR, hitch rating and the CDL threshold may bind before trailer payload does.
- Cab-over junk trucks likely carry roughly half the trailer's payload. With a 14,500 GVWR and an assumed curb weight of about 8,000–9,000 lb with body (unsourced), payload is about 5,500–6,500 lb, so about 2.5–3 yd³ of concrete. This needs verification.

### Gaps
- No manufacturer-published payload for enclosed box-body junk trucks (e.g., 1-800-GOT-JUNK-style box trucks, Isuzu NPR with 14–16' junk body) was found.
- Density figures vary about 2x by source and moisture. No authoritative engineering source (e.g., EPA volume-to-weight conversion factors) was retrieved.

---

## 3. Insurance (GL, commercial auto, workers' comp, inland marine)

### Takeaway
For a small junk hauler, budget about **$300–$600/month** for GL plus commercial auto plus workers' comp. Published averages: GL about $700–$1,960/yr, commercial auto about $2,075–$2,380/yr per vehicle, workers' comp about $141–$240/mo, and a bundled average of about $448/mo (about $5,400/yr). Real quotes for a new business with a heavy pickup plus a 14k trailer are likely higher than these averages.

### Cited Findings
- General liability (annual):
  - MoneyGeek (Jan 2026 update): $1,957 ($163/mo), 2 employees — [MoneyGeek](https://www.moneygeek.com/insurance/business/junk-removal/cost). An earlier MoneyGeek page gives $1,703 ($142/mo) for 1–4 employees at $1M/$2M limits — [MoneyGeek cost page](https://www.moneygeek.com/insurance/business/cleaning/junk-removal/cost/).
  - Insureon (debris removal contractors): $1,117 ($93/mo), $1,000 deductible — [Insureon](https://www.insureon.com/construction-contracting-business-insurance/debris-removal/cost).
  - The Hartford: $810/yr (about $68/mo) stand-alone GL — [The Hartford](https://www.thehartford.com/business-insurance/junk-removal-insurance).
  - Zensurance: from about $700/yr for $1M limit (residential work) — [Zensurance](https://www.zensurance.com/contractor-insurance/junk-removal).
  - TRUiC: $450–$1,000/yr for $1M GL — [HowToStartAnLLC](https://howtostartanllc.com/business-insurance/business-insurance-for-junk-removal-businesses).
- Commercial auto: MoneyGeek about $2,381/yr ($198/mo) — [MoneyGeek](https://www.moneygeek.com/insurance/business/junk-removal/cost). Insureon about $2,075/yr ($173/mo) — [Insureon](https://www.insureon.com/construction-contracting-business-insurance/debris-removal/cost) (via search summary). Personal auto policies do not cover business-use vehicles — [MoneyGeek](https://www.moneygeek.com/insurance/business/cleaning/junk-removal/cost/).
- Bundled/all policies: about $448/mo average (over $5,300/yr). Another MoneyGeek page gives a range of $30–$322/mo by policy — [MoneyGeek](https://www.moneygeek.com/insurance/business/cleaning/junk-removal/cost/); [Dropcurb insurance](https://dropcurb.com/blog/junk-removal-business-insurance) (via search summary).
- Workers' comp: one source gives about $240/mo, another $141/mo (sources conflict) — [MoneyGeek](https://www.moneygeek.com/insurance/business/cleaning/junk-removal/cost/) / [Dropcurb](https://dropcurb.com/blog/junk-removal-business-insurance) (via search summary; exact attribution between the two not confirmed).
- Workers' comp class codes and rates:
  - 9403 covers garbage/refuse collection and hauling to dumps — [InsuranceXDate](https://www.insurancexdate.com/class/CO/09QL/refuse-ashes-or-garbage-collection-drivers). PA/DE use 0995, "Rubbish or Garbage Removal" — (via search summary). 8263 is "Junk Dealer" — [RT Specialty](https://rtspecialty.com/workers-compensation/workers-compensation-for-waste-management/).
  - 7219 (Trucking NOC) is often applied to mixed driving/loading. NY 2026 payroll table shows $6.97 per $100 (may be an assessment figure, not premium) vs $9.63 in 2023 — [NY WCB GA-3 2026](https://www.wcb.ny.gov/content/main/BoardAssessments/ga-3_payroll-class-codes_2026.pdf).
  - Ohio (monopolistic state) 7219 base rate is 4.2527 per $100 effective July 1, 2026 — [Ohio Admin Code 4123-17-06 App 3, 2026](https://codes.ohio.gov/assets/laws/administrative-code/pdfs/4123/0/17/4123-17-06_FF_A_APP3_20260526_1321.pdf).
  - A trucking-focused guide estimates $4.50–$8.00 per $100 payroll for 2025, with the experience mod able to swing premiums ±40% — [1800insurance](https://www.1800insurance.com/guides/workers-comp-for-trucking).
- Premium drivers: employee count, location, coverage type, claims history and limits — [The Hartford](https://www.thehartford.com/business-insurance/junk-removal-insurance).

### Inferences
- Default insurance overhead for the app:
  - Solo with no employees: GL about $100/mo plus auto about $200/mo, so about **$300/mo**.
  - One truck with a helper: add workers' comp (about $150–$250/mo, or about 4.5–8% of helper payroll), so about **$450–$550/mo**.
  - Each additional truck adds about $175–$250/mo of auto premium. GL and WC scale with payroll and revenue.
- Insurance is about 3–7% of revenue in operator guides (see section 8), consistent with $450/mo on $10k–$15k/month revenue.

### Gaps
- No inland marine / equipment floater (dump trailer, tools) premium figure was found.
- No hired/non-owned auto or umbrella pricing was found.
- No current state-specific 9403 manual rate was found. The averages above are not quotes for a new business with a 3/4-ton plus a 14k trailer, which is likely to price higher.

---

## 4. Marketing and lead costs

### Takeaway
Google Local Services Ads (LSA) are the benchmark channel: about **$30–$65 per lead** (one Aug-2026 average was $48.23), which works out to roughly **$45–$110 per booked job** at a 60–70% close rate. Shared-lead marketplaces (Thumbtack, Angi) look cheaper per lead but can cost $75–$640 per booked job. Plan on marketing at about **8–15% of revenue**, or about $1,000–$3,000/month per truck.

### Cited Findings
- **Google LSA cost per lead (CPL)**, from different vendors:
  - $30–$65 — [Pushleads](https://pushleads.com/junk-removal-marketing/junk-removal-cost-per-lead-2/).
  - $25–$90 — [Housecall Pro](https://www.housecallpro.com/resources/junk-removal-ads-advertising-ideas/).
  - $20–$40 in mid-size markets (Houston/Dallas), as low as $15 in small markets, $60+ in LA/Chicago — [CodeWCG](https://codewcg.com/resources/junk-removal-marketing/).
  - Average $48.23 per charged lead in Aug 2026 (typical range $30.36–$81.75) — [Webtonic](https://www.webtonic.io/blog/junk-removal-and-dumpster-rental-google-ads-statistics) (via search summary; page blocked).
- **LSA cost per booked job:** $45–$110 — [CurbWaste](https://www.curbwaste.com/blog/google-ads-for-junk-removal-and-dumpster-rental) (the formula as printed in the source is reversed; the range works as CPL ÷ close rate). A $53 exclusive LSA lead at a 25% close rate is about $212 per booked job, versus about $640 for a $40 Thumbtack lead shared with 4 others — (via search summary; vendor illustration, [Pushleads](https://pushleads.com/junk-removal-marketing/junk-removal-cost-per-lead-2/)).
- **Thumbtack:** $25–$75 typical ($8–$150+ range), shared with 4–5 pros. **Angi/HomeAdvisor:** $15–$100+ per lead plus a $300–$500 annual fee, shared with 3–4 pros — [Pushleads](https://pushleads.com/junk-removal-marketing/junk-removal-cost-per-lead-2/) (via search summary). Thumbtack does not publish prices; pros report $10–$100+ — [Housecall Pro, What is Thumbtack](https://www.housecallpro.com/resources/what-is-thumbtack-how-it-works/).
- Aggregators (Yelp/Angi/Thumbtack/Networx) cost $15–$45 per lead at 12–20% contact-to-job conversion, versus 35–50% for LSA — (via search summary of [Pushleads](https://pushleads.com/junk-removal-marketing/junk-removal-cost-per-lead-2/)). A shared $15 lead can cost $75–$150 per booked job — [Pushleads](https://pushleads.com/junk-removal-marketing/junk-removal-cost-per-lead-2/). **No Yelp-specific junk removal CPL was found.**
- **Google Search Ads:** about $20 per click and about $120 per phone call for junk removal — (via search summary; attributed to one of [Dropcurb](https://dropcurb.com/blog/is-junk-removal-a-good-business) / related roundup pages; exact source not confirmed, page blocked).
- A Phoenix moving and junk business-for-sale listing reports advertising of $2,500–$3,000/month (Google Ads plus direct mail). This is a seller's claim — [BizQuest](https://www.bizquest.com/business-for-sale/phoenix-moving-and-junk-removal-business-profitable-and-scalable/BW2399897).
- Marketing and lead generation are 8–15% of revenue in one 2026 operator guide's table — (via search summary; likely [JS Hauling](https://jshauling.com/junk-removal-business-profit/), page blocked). Franchise marketing-fund contributions are 2–4% of revenue on top of local spend — (via search summary; likely [KMF Business Advisors](https://www.kmfbusinessadvisors.com/junk-removal-business/junk-removal-business-profitability/)).
- Response speed matters: replying within 1 minute lifts win rates to 35–50%; waiting an hour drops them to single digits (vendor claim) — [Pushleads](https://pushleads.com/junk-removal-marketing/junk-removal-cost-per-lead-2/) (via search summary).

### Inferences
- **Customer acquisition cost (CAC) default for the app:** about **$75 per new booked job** from paid channels, with a reasonable range of $45–$150 (LSA-heavy is low, shared-lead-heavy is high). Repeat and referral jobs have near-zero marginal CAC. Model marketing per job as CAC × (share of jobs from paid leads), or as a flat monthly budget ÷ jobs. For a business doing 50–60 jobs/month with about 70% from paid leads at $75 CAC, that is about $2,600–$3,150/mo. This is consistent with the $2,500–$3,000/mo seller claim and with 8–15% of revenue at a $350–$500 ticket.
- **Marketing is likely the single largest controllable overhead item** for a new independent, larger than insurance or software.

### Gaps
- No Google-published LSA pricing exists; all CPL figures are from vendors. No independent WordStream/LocaliQ junk-removal-specific CPC benchmark was retrieved.
- No Yelp Ads CPL for junk removal was found.
- No operator-reported blended CAC from Reddit or YouTube was found.

---

## 5. Software and admin (CRM, phone, website, licensing, yard, dump accounts)

### Takeaway
Field-service software is a small line item, about **$30–$150/month** for 1–5 users, plus about $100/mo if you add a business phone system. Total independent monthly overhead (excluding labor and disposal) is cited at about $800–$2,500. Storage-yard, licensing and website costs were not well sourced.

### Cited Findings
- **Jobber** (2026), month-to-month / 1-yr billed monthly / prepaid annual:
  - Core (1 user): $49 / $39 / $29.
  - Connect (5 users): $139 / $119 / $99.
  - Grow (10 users): $199 / $169 / $149.
  - Plus (15 users): $499 / $439 / $399.
  - Extra seats are $29/mo. Add-ons: AI Receptionist $29, Marketing Suite $99 — [ContractorToolStack Jobber pricing](https://contractortoolstack.com/software/jobber/pricing/).
- **Housecall Pro:** $59 / $149 / $299 per month on annual billing ($79 / $189 / $329 month-to-month) for 1 / 5 / 8 users. Card processing is 2.59% (1% ACH) — [ContractorToolStack HCP pricing](https://contractortoolstack.com/software/housecall-pro/pricing/).
- **Workiz:** pricing is inconsistent across sources.
  - Apr 2026 review: Lite free (2 users), Kickstart $225, Standard $275, Pro $325.
  - Another 2026 summary: Starter $65, Team $169, Pro $299.
  - As of Sept 2026 the pricing page is "request pricing". The phone add-on is about $100/mo and the AI answering add-on about $200/mo — [Pipelineon Workiz pricing](https://pipelineon.com/blog/workiz-pricing); [Rework](https://resources.rework.com/tools/field-service/best-workiz-alternatives).
- Independent operator monthly overhead is estimated at $800–$2,500 — [Dropcurb](https://dropcurb.com/blog/is-junk-removal-a-good-business) (via search summary).
- Dump fees run $20–$55 per load in one estimate. Dumping a ton might cost $40 in some areas and exceed $100 in high-cost areas — [Dropcurb](https://dropcurb.com/blog/starting-a-junk-removal-business) / [HomeGuide](https://homeguide.com/articles/how-to-start-a-junk-removal-business) (via search summary). (Disposal is a per-job variable cost and is covered by other research notes.)
- Credit card fees are about 2% of revenue — [Junk Removal Authority](https://junkremovalauthority.com/how-much-money-are-you-making-on-each-junk-removal-job/) (via search summary; data about 5 years old).

### Inferences
- App default for "software + phone + web" overhead: about **$150–$250/mo** for a 1–3 truck operation. That covers CRM about $50–$150, phone about $30–$100, and website hosting and domain about $20–$50 (the hosting figure is unsourced).
- Card processing (2–2.6%) should be modeled as a percent of the ticket, not as fixed overhead.
- Admin/misc (bookkeeping, licensing, registration, tolls, cell phones, uniforms, small tools, parking/yard) is unsourced. A placeholder of about $300–$600/mo per business is reasonable, and the user should override it.

### Gaps
- No sourced figures for storage-yard/parking rent, local business license or hauler permits, waste-hauler registration, vehicle registration for a 14k trailer, or website/SEO retainers.
- Municipal hauler-permit fees vary by city and were not researched.

---

## 6. Labor overhead (payroll taxes, workers' comp, helper wages)

### Takeaway
Junk removal helpers earn about **$16–$20/hr base** in 2026 (BLS median for hand laborers and material movers is about $18–$19). Employer burden (FICA 7.65%, FUTA/SUTA, workers' comp at about 4.5–8% of payroll) adds roughly **14–20%**, for a loaded cost of about **$19–$24/hr** per helper.

### Cited Findings
- BLS: median annual pay for hand laborers and material movers was $37,680 (May 2024) — [BLS OOH](https://www.bls.gov/ooh/transportation-and-material-moving/hand-laborers-and-material-movers.htm). The OEWS hourly distribution for 53-7062 is: 10th percentile $14.18, 25th $16.36, median $18.10, 75th $21.61, 90th $24.17 — [BLS OEWS 53-7062](https://www.bls.gov/Oes/current/oes537062.htm). WageDex reports a May 2025 median of $40,240 (about $19.35/hr) — [WageDex](https://wagedex.com/jobs/laborers-and-freight-stock-and-material-movers-hand) (third party, unverified).
- ZipRecruiter "junk" jobs average $17.52/hr (Jun 2026), with most between $15.38 and $19.23 — [ZipRecruiter](https://www.ziprecruiter.com/Jobs/Junk/3). Garbage helper averages $17.55/hr (Aug 2026) — [ZipRecruiter](https://www.ziprecruiter.com/Salaries/Garbage-Helper-Salary).
- Regional postings:
  - Junkluggers NY/Long Island: $19–$20/hr starting base, $23–$28 with tips and bonuses — [Junkluggers careers](https://junkluggers-careers.careerplug.com/jobs/1866785).
  - 1-800-GOT-JUNK Honolulu: $16/hr base, up to $25 with profit share and tips — (via search summary).
- Workers' comp rates are about $4.50–$8.00 per $100 of payroll (trucking estimate); Ohio 7219 is 4.2527 per $100 (2026) — [1800insurance](https://www.1800insurance.com/guides/workers-comp-for-trucking); [Ohio 4123-17-06](https://codes.ohio.gov/assets/laws/administrative-code/pdfs/4123/0/17/4123-17-06_FF_A_APP3_20260526_1321.pdf).
- Employer FICA is 6.2% Social Security (up to the wage base) plus 1.45% Medicare, so 7.65% — [IRS Topic 751](https://www.irs.gov/taxtopics/tc751). FUTA is 6.0% on the first $7,000 of wages, less up to a 5.4% state credit, so a net 0.6% (about $42 per employee per year) — [IRS Topic 759](https://www.irs.gov/taxtopics/tc759). (These are standard statutory rates; the IRS pages were not re-fetched this session.)
- Customer-side pricing for comparison: TaskRabbit reports junk removal costs customers about $42/hr — [TaskRabbit](https://www.taskrabbit.com/blog/what-is-the-cost-of-junk-removal/). That is a price, not a wage.

### Inferences
- **Loaded labor rate default:** base $18/hr × (1 + 7.65% FICA + about 1–3% SUTA/FUTA + about 6% WC) ≈ 1.15–1.17 multiplier, so about **$21/hr**. Use $19/hr (low-cost regions) to $24/hr (NY/CA metros). An owner-operator's own time should be a separate "owner wage" input, not hidden in overhead.
- Labor is best treated as a **per-job variable cost** (crew size × job hours × loaded rate, plus a minimum billable block), not as overhead. Only non-billable labor (dispatch/office, shop time, drive time between jobs if not quoted per mile) belongs in overhead.

### Gaps
- State unemployment (SUTA) new-employer rates by state were not researched.
- No current state-specific 9403 WC premium rates were found.
- No source quantified tips/bonus share or overtime patterns for junk crews beyond individual postings.

---

## 7. Utilization and how to divide overhead into a per-job figure

### Takeaway
Small operators typically run **2–5 jobs per truck-day**, about 20–22 billable days per month. Average tickets cluster around **$250–$600**, revenue per truck-day around **$800–$1,500**, and annual revenue per truck around **$200k–$375k**. Divide monthly fixed overhead by *realistic* jobs per month (trucks × billable days × jobs/day × about 75% utilization). For an established one-truck operation this gives a default of roughly **$60–$100 overhead per job**, plus marketing. Startups at low volume should use $100–$150+.

### Cited Findings
- **Jobs per day:**
  - 2–5 jobs per day, which works out to $700–$3,000 daily revenue and $14,000–$60,000 monthly — [Jobber Academy](https://www.getjobber.com/academy/junk-removal/how-to-start-a-junk-removal-business/).
  - Target of 5+ jobs per truck per day — [Pulse RevOps KPIs](https://pulserevops.com/knowledge/ik0440).
  - 4–6 jobs per crew-day — [Financial Models Lab](https://financialmodelslab.com/products/junk-removal-service-kpi-metrics).
  - 4–8 per day per truck (pay-per-call vendor) — [CallScaler](https://callscaler.com/marketplace/junk-removal).
- **Average ticket:**
  - Angi survey of more than 30k customers: $241 (most between $133 and $372) — (via search summary; Angi data cited by [Pushleads](https://pushleads.com/junk-removal-marketing/junk-removal-cost-per-lead-2/)).
  - $209.10 national average — [Plyrium](https://www.plyrium.com/academy/junk-removal/how-to-start-from-scratch).
  - $250–$600 national, with full-load jobs at $800–$1,200 — [Beancount](https://beancount.io/blog/2026/06/01/junk-removal-dumpster-rental-business-bookkeeping-roll-off-day-rate-tipping-fees-asc-606-overage-tonnage-section-179-hooklift-truck-form-2290-fmcsa-dot-authority-stops-per-truck-day-kpi-guide).
  - $475–$650 target — [Pulse RevOps](https://pulserevops.com/knowledge/ik0440).
  - Half-load to full-load $300–$600 — [CT Acquisitions](https://ctacquisitions.com/?p=56845).
- **Revenue per truck:**
  - $800–$1,500 per truck-day is the market band; under $800 signals weak booking density, underpricing or idle trucks — [CT Acquisitions](https://ctacquisitions.com/?p=56845); [Pulse RevOps](https://pulserevops.com/knowledge/ik0440).
  - A truck at 3 jobs/day vs 5 jobs/day is the difference between a $200k/yr and a $350k/yr asset — [Pulse RevOps](https://pulserevops.com/knowledge/ik0440).
  - 1-800-GOT-JUNK is about $350k per truck (unverified, not from the FDD) — [Pulse RevOps](https://pulserevops.com/knowledge/ik0440).
- **Annual revenue scale for small operators:**
  - Solo pickup operator $150k–$300k; 2-truck crew $700k–$1.2M; multi-truck $1.5M–$3M+ — (via search summary; likely [KMF Business Advisors](https://www.kmfbusinessadvisors.com/junk-removal-business/junk-removal-business-profitability/)).
  - Monthly revenue of $8k–$50k — [StartCosts](https://startcosts.com/junk-removal).
  - A struggling new operator at $2,500/mo revenue after 8 months (Reddit r/sweatystartup, secondhand) — [Dropcurb](https://dropcurb.com/blog/is-junk-removal-a-good-business) (via search summary).
  - Solo operator example: $15k revenue against $8k expenses per month. One truck with crew: $30k revenue against $20k expenses — [Small Business Manager](https://smallbusinessmgr.com/is-a-junk-removal-business-profitable/) (via search summary).
- **Broker break-even example (monthly):** 60 jobs × $750 = $45,000 revenue against $48,000 expenses. Expenses were payroll $18k, dump $8k, fuel $4k, insurance $4k, truck payments $4k, marketing $4k, admin $3k, misc $3k. Raising the ticket to $900 gives $54k revenue and $6k profit — (via search summary; likely [KMF Business Advisors](https://www.kmfbusinessadvisors.com/junk-removal-business/junk-removal-business-profitability/)).
- Bookkeeping guidance treats the truck as overhead spread across the stops a crew completes in a day — [Beancount](https://beancount.io/blog/2026/06/01/junk-removal-dumpster-rental-business-bookkeeping-roll-off-day-rate-tipping-fees-asc-606-overage-tonnage-section-179-hooklift-truck-form-2290-fmcsa-dot-authority-stops-per-truck-day-kpi-guide).

### Inferences
- **Allocation formula (recommended for the app):**
  - `overhead_per_job = monthly_fixed_overhead ÷ expected_jobs_per_month`
  - `expected_jobs_per_month = trucks × billable_days (≈21) × jobs_per_truck_day × utilization (≈0.70–0.80)`
  - Better for mixed job sizes: allocate per **truck-hour**. `overhead_per_hour = monthly_fixed ÷ (trucks × billable_days × productive_hours/day ≈ 6–7)`, then multiply by estimated job hours including drive and dump time. Keep a minimum per-job floor, since small single-item jobs still consume dispatch, a stop and marketing.
- **Illustrative scenarios** (built from the cited inputs above; payment math uses assumed 8% APR):

| Monthly fixed overhead | A: Solo, 1 rig, lean | B: 1 rig + helper | C: 3 rigs |
|---|---|---|---|
| Vehicle + trailer payments | ~$950 | ~$1,250 | ~$3,750 |
| Insurance (GL+auto[+WC]) | ~$300 | ~$500 | ~$1,300 |
| Software/phone/web | ~$100 | ~$200 | ~$350 |
| Admin/misc/yard (assumed) | ~$250 | ~$400 | ~$1,200 |
| **Fixed subtotal** | **~$1,600** | **~$2,350** | **~$6,600** |
| Marketing (budget) | ~$1,000 | ~$2,500 | ~$6,000 |
| **Total overhead** | **~$2,600** | **~$4,850** | **~$12,600** |
| Jobs/month (days × jobs/day × util.) | 21×2.5×0.8 ≈ 42 | 21×3.5×0.8 ≈ 59 | 3×21×3.5×0.8 ≈ 176 |
| **Fixed overhead per job** | **~$38** | **~$40** | **~$38** |
| **Total overhead incl. marketing per job** | **~$62** | **~$82** | **~$72** |

  At a $350–$450 ticket, scenario B overhead is about 18–23% of revenue. That is consistent with insurance 3–7% plus marketing 8–15% plus vehicle payments of a few percent in the operator guides.
- **Startup/low-volume caution:** at 20 jobs/month, scenario B's overhead is about $240/job. Volume is the dominant lever. The app should show overhead per job as a function of jobs/month, not a constant.
- **Suggested app defaults:**
  - overhead_per_job **$75**, editable, with a range of $40–$150. Optionally split it into fixed about $40 plus marketing CAC about $35–$75.
  - truck cost per mile **$0.70** (variable only, gas rig, 2026 fuel).
  - jobs per truck-day **3**, billable days **21**, utilization **75–80%**.
- The broker example of $367/job of non-labor, non-disposal overhead (60 jobs) shows how badly overhead per job balloons when fixed costs are sized for more volume than is booked.

### Gaps
- Miles driven per job and per day (needed to convert per-mile cost into per-job vehicle cost) were not found.
- Seasonality (winter slowdown, spring/summer peaks) and the share of billable days lost to weather and repairs were not found.
- No operator-shared actual jobs/day distributions from Reddit or YouTube were retrieved.

---

## 8. Typical P&L breakdown (franchise vs independent)

### Takeaway
Operator guides put a junk removal P&L at roughly: **disposal 8–25%**, **labor 20–30%**, **fuel 5–10%**, **vehicle maintenance 3–8%**, **insurance/licensing 3–7%**, **marketing 8–15%**, **card fees about 2%**, and **net margin about 15–35%**. Smaller and solo operators report higher margins, and franchises give up another 8–14% in royalties and brand fund. Franchise Item 19 averages are about $1.3M–$3M per *territory*, not per truck. Most figures are from vendor or broker blogs, not audited data.

### Cited Findings
- **Expense table (% of revenue):** disposal 15–25%, labor/payroll 20–30%, fuel 5–10%, insurance and licensing 3–7%, marketing and lead gen 8–15%, vehicle maintenance 5–8% — (via search summary; likely [JS Hauling 2026 guide](https://jshauling.com/junk-removal-business-profit/); the table's midpoints total about 75%).
- **Older Junk Removal Authority breakdown (about 5 years old, about 2020–21):** fuel 5–7%, labor about 20%, disposal 8–11%, auto expense about 3%, credit card about 2%, for a total gross expense of 41%. Gross margins of about 60%; example profit 34% in Year 1, 39% in Year 2, 44% in Year 3 (gross, before overhead) — [Junk Removal Authority](https://junkremovalauthority.com/how-much-money-are-you-making-on-each-junk-removal-job/).
- Dump fees are 8–11% of revenue (KPI benchmark) — [Pulse RevOps](https://pulserevops.com/knowledge/ik0440).
- **Net margin by size:** solo pickup 25–40%, 2-truck crew 18–30%, multi-truck 20–32% — (via search summary; likely [KMF Business Advisors](https://www.kmfbusinessadvisors.com/junk-removal-business/junk-removal-business-profitability/)). Other estimates: 25–35% after vehicle, disposal, insurance and marketing — [Dropcurb](https://dropcurb.com/blog/is-junk-removal-a-good-business) (via search summary). 20–40% — (via search summary, [Jobber Academy](https://www.getjobber.com/academy/junk-removal/how-to-start-a-junk-removal-business/) or similar). Aim for at least 15% after landfill fees, travel time and taxes — [HomeGuide](https://homeguide.com/articles/how-to-start-a-junk-removal-business).
- **Franchise fees:** 6–10% royalty, 2–4% marketing contribution, and an initial franchise fee of $40k–$75k+. Independents keep higher gross margins but must build their own marketing — (via search summary; likely [KMF Business Advisors](https://www.kmfbusinessadvisors.com/junk-removal-business/junk-removal-business-profitability/)).
- **1-800-GOT-JUNK Item 19:**
  - 2024 FDD (FY2023 data): average revenue $1,684,203 and median $1,413,257 across 213 franchisee-operated businesses — [Coleman Report 2025 example report](https://colemanreport.com/wp-content/uploads/2025/06/1-800-Got-Junk_Example_Report_2025.pdf).
  - 2025 FDD (FY2024, 174 reporting): average $2.95M, median $2,032,678, bottom quartile $650k–$1.1M — [Pulse RevOps](https://pulserevops.com/knowledge/fr0252); [Peersense](https://peersense.com/franchise/1-800-got-junk).
  - Franzy lists $3.44M (2024) — [Franzy](https://franzy.com/franchises/1800gotjunk).
  - The brand requires a minimum purchase of 8 subterritories, so these are multi-truck territories. The sources conflict by about 75%, and no FDD was read directly.
- **College Hunks Hauling Junk & Moving:**
  - Item 7 total investment $258,100–$480,500, of which $150k–$250k is 6 months of additional funds — [Sharpsheets](https://sharpsheets.io/blog/college-hunks-franchise-fdd-profits-costs/); [Franzy](https://franzy.com/franchises/college-hunks-hauling-junk). The company page gives $158,700–$288,500, with a franchise fee of $45k–$65k, and recommends $300k–$350k all-in because of rising gas and insurance — [College Hunks investment info](https://collegehunkshaulingjunk.com/franchising/investment-info).
  - Item 19 average gross is about $1.28M (2023, $1,284,036) — [LoopNet listing](https://loopnet.ca/biz/franchise-for-sale/college-hunks-hauling-junk-and-college-hunks-moving-home-service-business-opportunity). It is $1,456,154 for 2024 across 190 units — [BizBuySell listing](https://images.bizbuysell.com/franchise-for-sale/college-hunks-hauling-junk-and-college-hunks-moving-home-service-business-opportunity). The figure includes moving revenue. Rural units should expect 40–60% of the system average — [Pulse RevOps](https://pulserevops.com/knowledge/fr0251).

### Inferences
- **Independent, 1–3 trucks, reasonable P&L template:**

| Line | % of revenue |
|---|---|
| Disposal | 10–20% |
| Crew labor (loaded) | 20–30% |
| Fuel | 6–10% (higher in late 2026 given record fuel prices) |
| Vehicle payments + maintenance | 5–10% |
| Insurance | 3–7% |
| Marketing | 8–15% |
| Software/admin/card fees | 3–5% |
| Net to owner (before owner salary, if the owner works the truck) | about 15–30% |

- **Franchise template:** the same lines, plus 8–14% royalty and brand fund. Franchises typically run higher tickets and bundle moving revenue (College Hunks).
- **Overhead items that matter most, in rough order of $ impact per job:**
  1. Marketing/CAC.
  2. Vehicle payments and depreciation, which are highly sensitive to jobs/month.
  3. Insurance (auto in particular).
  4. Fuel, which is volatile in 2026 and treated per mile.
  5. Admin, software and phone, which are small.
- Disposal and crew labor are bigger than any overhead line but are per-job variable costs.

### Gaps
- No IBISWorld or other paid industry report P&L was accessed.
- Junk King and JDog FDD Item 7/19 figures were not researched (tool-call budget).
- No full owner-shared P&L from Reddit (r/junkremoval, r/sweatystartup) or YouTube was retrieved. Search results surfaced only secondhand mentions.
- Several key broker and operator-guide pages (KMF, JS Hauling, Dropcurb, MoneyGeek) could not be fetched directly. Their figures come from search-engine summaries, and attribution to the specific page is marked "likely".
