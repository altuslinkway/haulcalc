import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/AppShell";

// The public website. Everything links into the app at /quote.

const Check = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12l5 5L20 7" />
  </svg>
);

const Arrow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const Icon = ({ children, size = 26 }: { children: ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const Eyebrow = ({ children, dark = false }: { children: ReactNode; dark?: boolean }) => (
  <span className={`text-sm font-bold tracking-[0.08em] uppercase ${dark ? "text-stone-400" : "text-stone-500"}`}>{children}</span>
);

const H2 = ({ id, children }: { id: string; children: ReactNode }) => (
  <h2 id={id} className="m-0 font-display text-[clamp(34px,4.5vw,56px)] leading-none font-bold tracking-[-0.015em]">
    {children}
  </h2>
);

const steps = [
  {
    n: "01",
    title: "Drop in their photos",
    text: "Add the pictures your customer texted. HaulCalc lists every item, how much trailer space it takes, how heavy it is, and anything you won't haul.",
    icon: (
      <>
        <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
        <circle cx="12" cy="13" r="3.5" />
      </>
    ),
  },
  {
    n: "02",
    title: "Fix anything in a tap",
    text: "Wrong size? Missed the dresser? Change it, add it, or move a fridge to its flat rate. The price updates as you go.",
    icon: (
      <>
        <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
        <circle cx="16" cy="7" r="2" />
        <circle cx="10" cy="17" r="2" />
      </>
    ),
  },
  {
    n: "03",
    title: "Send the price",
    text: "A ready-made text with the price, what's included and what to set aside. Edit it if you like, then send it from your own phone.",
    icon: <path d="M4 12l16-8-6 16-3-7-7-1z" />,
    accent: true,
  },
];

const features = [
  {
    title: "Your rate card, imported",
    text: "Snap a photo of your price sheet or trailer sign. Your four load prices, flat-rate items and no-go list fill themselves in for you to check.",
    icon: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </>
    ),
  },
  {
    title: "Flat rates, never double charged",
    text: "Set your own: $50 for a TV, $170 for a fridge. They're charged on top of the load, and their space is never billed twice.",
    icon: (
      <>
        <rect x="6" y="3" width="12" height="18" rx="2" />
        <path d="M6 10h12M9 6.5v1M9 13v3" />
      </>
    ),
  },
  {
    title: "Know what you made",
    text: "Mark a job booked, then done. HaulCalc adds up what you made each month and what you kept after dump fees and gas.",
    icon: <path d="M4 19V5M4 19h16M8 15l4-4 3 3 5-6" />,
  },
  {
    title: "On the phone? Quick quote",
    text: "No photos needed. Tap the load size and the items, and your price is ready to text while they're still on the line.",
    icon: (
      <>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M8 7h8M8 12h2M12 12h2M8 16h2M12 16h2" />
      </>
    ),
  },
  {
    title: "Ranges that hold up on site",
    text: "Quotes lean toward what the photos can't show, so the price you text is the price you charge, with no awkward surprises at the door.",
    icon: <path d="M3 12h4l3-7 4 14 3-7h4" />,
  },
  {
    title: "Gets smarter every job",
    text: "One tap after each job tells HaulCalc how big it really was. Estimates improve for you, and for every hauler using it.",
    icon: <path d="M4 17l5-5 4 4 7-8M15 8h5v5" />,
    dark: true,
  },
];

const breakdown = [
  { label: "3/4 load", detail: "8.6–10.4 yd³, with room for what the photos don't show", amount: "$490 – $575" },
  { label: "Refrigerator", detail: "$170 each", amount: "$170" },
  { label: "Mattress ×2", detail: "$60 each", amount: "$120" },
];

const ratings = ["Much smaller", "Smaller", "About right", "Bigger", "Much bigger"];

const faqs = [
  {
    q: "Does the AI decide my prices?",
    a: "No. It only sizes up the job: what's there, how much space and how heavy. Your load prices, flat-rate items and extra charges set every price, the same way every time.",
  },
  {
    q: "What if the photos miss something?",
    a: "Quotes come as a range that leans up for what isn't in the picture, and the message says you'll confirm the final price on site before you start.",
  },
  {
    q: "Do my customers need to download anything?",
    a: "No. They text you photos like they already do, and you send back a normal text message.",
  },
  {
    q: "I don't have a rate card. Can I still use it?",
    a: "Yes. It starts with typical prices from independent haulers' published rates. Change any of them as you go.",
  },
  {
    q: "What gets shared when it learns?",
    a: "Item types, sizes, weights and how jobs turned out. Never photos, names, addresses or prices. You can turn sharing off any time.",
  },
];

const primaryButton =
  "inline-flex min-h-14 items-center gap-2.5 rounded-[14px] bg-accent px-6 text-[17px] font-extrabold text-stone-900 no-underline hover:brightness-95";

export default function HomePage() {
  return (
    <div className="overflow-x-hidden bg-stone-100 text-stone-900">
      <header className="border-b border-stone-200">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-6 py-3.5">
          <Link href="/" className="flex min-h-11 items-center text-stone-900 no-underline">
            <Logo />
          </Link>
          <nav aria-label="Main" className="flex flex-wrap gap-7 text-[15px] font-medium">
            <a href="#how" className="hover:text-stone-600">How it works</a>
            <a href="#features" className="hover:text-stone-600">Features</a>
            <a href="#smarter" className="hover:text-stone-600">Gets smarter</a>
            <a href="#faq" className="hover:text-stone-600">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/quote" className="inline-flex min-h-11 items-center rounded-xl bg-stone-900 px-[18px] text-[15px] font-bold text-stone-100">
              Open the app
            </Link>
          </div>
        </div>
      </header>

      <section aria-labelledby="hero-title" className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-14 px-6 pt-[72px] pb-24">
        <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-7">
          <span className="self-start rounded-full border border-stone-300 bg-white px-3.5 py-1.5 text-sm font-semibold">
            For independent junk haulers
          </span>
          <h1 id="hero-title" className="m-0 font-display text-[clamp(48px,7vw,92px)] leading-[0.95] font-bold tracking-[-0.015em]">
            Photos in.
            <br />
            Price out.
          </h1>
          <p className="m-0 max-w-[34em] text-xl leading-normal text-stone-600">
            Your customer texts a few pictures. HaulCalc sizes up the load, prices it on your rates, and writes the text back. You
            check it, tap send, and the quote is out in minutes, not an hour.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/quote" className={primaryButton}>
              Try it free
              <Arrow />
            </Link>
            <a href="#how" className="inline-flex min-h-14 items-center rounded-[14px] border-[1.5px] border-stone-900 px-6 text-[17px] font-bold">
              See how it works
            </a>
          </div>
          <ul className="m-0 flex list-none flex-wrap gap-x-6 gap-y-2.5 p-0 text-[15px] font-medium text-stone-700">
            {["Uses your rate card", "Tracks what you make", "Your customers need no app"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Check />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex min-w-0 flex-[0_1_400px] justify-center">
          <div className="w-full max-w-[380px] rounded-[44px] bg-stone-900 p-3 shadow-[0_40px_80px_-30px_rgba(17,20,19,0.45)]">
            <div className="flex flex-col gap-3 rounded-[34px] bg-stone-100 px-4 pt-5 pb-4">
              <div className="flex flex-col gap-1.5 rounded-[22px] bg-stone-900 p-[18px] text-stone-100">
                <div className="flex items-center justify-between text-[13px] text-stone-400">
                  <span>Quote for Dana</span>
                  <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-bold text-stone-900">Medium confidence</span>
                </div>
                <div className="text-[34px] font-bold tracking-tight tabular-nums">$655 – $775</div>
                <div className="text-[13px] text-stone-400">3/4 load, middle of the range $715</div>
                <div className="relative mt-2 h-2.5 overflow-hidden rounded-full bg-stone-700" aria-hidden="true">
                  <div className="absolute inset-y-0 left-0 w-[85%] bg-accent/45" />
                  <div className="absolute inset-y-0 left-0 w-[66%] bg-accent" />
                </div>
                <div className="text-xs text-stone-400">Trailer space 66–85%</div>
              </div>
              <div className="rounded-[18px] border border-stone-200 bg-white px-3.5 py-1.5">
                <div className="pt-2 pb-1 text-[11px] font-bold tracking-[0.08em] text-stone-500 uppercase">By the load</div>
                {[
                  ["Sectional sofa", "3.5 yd³"],
                  ["2× Mattress set", "1.5 yd³"],
                  ["14× Boxes and bags", "1.8 yd³"],
                ].map(([item, size]) => (
                  <div key={item} className="flex justify-between border-b border-stone-100 py-2 text-[15px] last:border-b-0">
                    <span>{item}</span>
                    <span className="text-stone-500 tabular-nums">{size}</span>
                  </div>
                ))}
                <div className="border-t border-stone-100 pt-2.5 pb-1 text-[11px] font-bold tracking-[0.08em] text-stone-500 uppercase">
                  Flat rate
                </div>
                <div className="flex justify-between py-2 text-[15px]">
                  <span>Refrigerator</span>
                  <span className="text-stone-500 tabular-nums">$120</span>
                </div>
              </div>
              <div className="flex min-h-[52px] items-center justify-center gap-2 rounded-[14px] bg-accent text-base font-extrabold text-stone-900">
                <Icon size={18}>
                  <path d="M4 12l16-8-6 16-3-7-7-1z" />
                </Icon>
                Text quote to Dana
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how" aria-labelledby="how-title" className="border-y border-stone-200 bg-white">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-12 px-6 py-24">
          <div className="flex max-w-[720px] flex-col gap-3.5">
            <Eyebrow>How it works</Eyebrow>
            <H2 id="how-title">Three taps from their text to your price.</H2>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5">
            {steps.map((s) => (
              <div key={s.n} className="flex flex-col gap-4 rounded-3xl border border-stone-200 bg-stone-100 p-7">
                <span className="text-[15px] font-semibold text-stone-500 tabular-nums">{s.n}</span>
                <div
                  className={`flex h-[52px] w-[52px] items-center justify-center rounded-[14px] ${
                    s.accent ? "bg-accent text-stone-900" : "bg-stone-900 text-stone-100"
                  }`}
                >
                  <Icon>{s.icon}</Icon>
                </div>
                <h3 className="m-0 font-display text-2xl font-bold">{s.title}</h3>
                <p className="m-0 text-base leading-relaxed text-stone-600">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" aria-labelledby="features-title" className="mx-auto flex max-w-[1200px] flex-col gap-12 px-6 py-24">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex max-w-[680px] flex-col gap-3.5">
            <Eyebrow>Features</Eyebrow>
            <H2 id="features-title">The AI sizes the job. Your numbers set the price.</H2>
          </div>
          <p className="m-0 max-w-[26em] text-[17px] leading-relaxed text-stone-600">
            The same job always prices the same way, because the math is yours: four load prices, your flat-rate items, a
            minimum and a few extras.
          </p>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className={`flex flex-col gap-3 rounded-3xl p-7 ${
                f.dark ? "bg-stone-900 text-stone-100" : "border border-stone-200 bg-white"
              }`}
            >
              <Icon size={28}>{f.icon}</Icon>
              <h3 className="m-0 font-display text-[21px] font-bold">{f.title}</h3>
              <p className={`m-0 text-base leading-relaxed ${f.dark ? "text-stone-300" : "text-stone-600"}`}>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="example-title" className="bg-stone-900 text-stone-100">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-12 px-6 py-24">
          <div className="flex max-w-[720px] flex-col gap-3.5">
            <Eyebrow dark>An example job</Eyebrow>
            <H2 id="example-title">Every dollar explained. Every text written for you.</H2>
          </div>
          <div className="flex flex-wrap items-stretch gap-6">
            <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-1 rounded-3xl bg-white p-7 text-stone-900">
              <div className="flex items-baseline justify-between gap-3 pb-3.5">
                <h3 className="m-0 font-display text-xl font-bold">Price breakdown</h3>
                <span className="text-sm text-stone-500">Garage cleanout</span>
              </div>
              {breakdown.map((b) => (
                <div key={b.label} className="flex justify-between gap-4 border-t border-stone-100 py-3">
                  <div>
                    <div className="text-base font-semibold">{b.label}</div>
                    <div className="text-[13px] text-stone-500">{b.detail}</div>
                  </div>
                  <span className="text-base whitespace-nowrap tabular-nums">{b.amount}</span>
                </div>
              ))}
              <div className="flex justify-between gap-4 border-t-2 border-stone-900 pt-4 pb-2 text-lg font-extrabold">
                <span>Total</span>
                <span className="tabular-nums">$780 – $865</span>
              </div>
              <div className="mt-3 flex flex-wrap justify-between gap-3 rounded-2xl bg-stone-100 p-4">
                {[
                  ["Dump, gas and helper", "$150 – $170"],
                  ["You keep", "$630 – $695"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div className="text-[13px] text-stone-500">{label}</div>
                    <div className="text-[17px] font-bold tabular-nums">{value}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-4 rounded-3xl border border-stone-700 p-7">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-700 font-bold">D</span>
                <div>
                  <div className="font-bold">Dana</div>
                  <div className="text-[13px] text-stone-400">Text message</div>
                </div>
              </div>
              <div className="max-w-[80%] self-start rounded-[20px_20px_20px_6px] bg-stone-700 px-4 py-3 text-[15px] leading-snug">
                Hi! Can you take everything in the garage? Pics attached.
              </div>
              <div className="flex max-w-[88%] flex-col gap-2.5 self-end rounded-[20px_20px_6px_20px] bg-accent px-4 py-3.5 text-[15px] leading-normal text-stone-900">
                <span>Hi Dana! This is [your business]. Thanks for sending the photos.</span>
                <span>
                  Based on what we can see (about a 3/4 load), your price is $780–$865, including labor, loading, hauling and
                  disposal.
                </span>
                <span>Heads up: we can&apos;t take the two paint cans, so please set those aside.</span>
                <span>We&apos;ll confirm the final price on site before we start. Want to get on the schedule?</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="smarter" aria-labelledby="smarter-title" className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-14 px-6 py-24">
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-6">
          <Eyebrow>Gets smarter</Eyebrow>
          <H2 id="smarter-title">Every job makes the next quote closer.</H2>
          <ol className="m-0 flex list-none flex-col gap-5 p-0">
            {[
              ["You fix a size, it's noted", "Whatever you change before sending is kept next to what the AI guessed."],
              ["One tap after the job", "Bigger, smaller, or about right. That's all it asks."],
              ["Everyone's quotes improve", "Once several haulers agree, HaulCalc teaches the AI the real sizes and adjusts future ranges."],
            ].map(([title, text], i) => (
              <li key={title} className="flex gap-4">
                <span
                  className={`flex h-8 w-8 flex-none items-center justify-center rounded-full text-sm font-bold tabular-nums ${
                    i === 2 ? "bg-accent text-stone-900" : "bg-stone-900 text-stone-100"
                  }`}
                >
                  {i + 1}
                </span>
                <div>
                  <div className="text-lg font-bold">{title}</div>
                  <div className="text-base leading-relaxed text-stone-600">{text}</div>
                </div>
              </li>
            ))}
          </ol>
          <p className="m-0 text-sm leading-normal text-stone-500">
            Only item types, sizes, weights and ratings are shared. Never photos, names, addresses or prices, and you can switch it
            off.
          </p>
        </div>
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-4">
          <div className="flex flex-col gap-3.5 rounded-3xl border border-stone-200 bg-white p-6">
            <div className="flex justify-between gap-3">
              <div>
                <div className="font-bold">Dana&apos;s garage cleanout</div>
                <div className="text-sm text-stone-500">Quoted $655 – $775</div>
              </div>
              <span className="text-[13px] font-bold text-accent-deep">Needs feedback</span>
            </div>
            <div className="text-sm font-semibold text-stone-700">How did the job compare to the estimate?</div>
            <div className="grid grid-cols-5 gap-1.5" aria-hidden="true">
              {ratings.map((r) => (
                <span
                  key={r}
                  className={`flex min-h-12 items-center justify-center rounded-xl border px-1 text-center text-[13px] leading-tight font-semibold ${
                    r === "Bigger" ? "border-stone-900 bg-stone-900 text-stone-100" : "border-stone-300 bg-white"
                  }`}
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2.5 rounded-3xl bg-stone-900 p-6 text-stone-100">
            <div className="flex items-baseline justify-between gap-3">
              <div className="font-display text-lg font-bold">Learned from all haulers</div>
              <span className="text-xs text-stone-400">Example</span>
            </div>
            {[
              ["Sectional sofa", "4.4 yd³ each, AI was 25% low", false],
              ["Loose garage junk", "AI was 15% low", false],
              ["One-room jobs", "+8% on ranges", true],
            ].map(([label, value, hot]) => (
              <div key={label as string} className="flex justify-between gap-3 border-t border-stone-700 py-2.5 text-[15px]">
                <span>{label}</span>
                <span className={`tabular-nums ${hot ? "text-accent" : "text-stone-300"}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" aria-labelledby="faq-title" className="border-t border-stone-200 bg-white">
        <div className="mx-auto flex max-w-[880px] flex-col gap-8 px-6 py-24">
          <H2 id="faq-title">Questions haulers ask</H2>
          <div className="flex flex-col border-t border-stone-300">
            {faqs.map((f) => (
              <details key={f.q} className="border-b border-stone-300 py-5">
                <summary className="cursor-pointer text-[19px] font-bold">{f.q}</summary>
                <p className="mt-3 mb-0 text-base leading-relaxed text-stone-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="cta-title" className="bg-white px-6 pb-24">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-8 rounded-[32px] bg-accent px-10 py-16 text-stone-900">
          <h2 id="cta-title" className="m-0 flex-[1_1_520px] font-display text-[clamp(32px,4vw,52px)] leading-none font-bold tracking-[-0.015em]">
            Get your next quote out before you&apos;re back in the truck.
          </h2>
          <Link href="/quote" className="inline-flex min-h-[60px] items-center gap-2.5 rounded-2xl bg-stone-900 px-[30px] text-lg font-extrabold text-stone-100">
            Try it free
            <Arrow />
          </Link>
        </div>
      </section>

      <footer className="border-t border-stone-200">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-stone-600">
          <Logo size="sm" />
          <Link href="/quote" className="font-semibold text-stone-900">
            Open the app
          </Link>
        </div>
      </footer>
    </div>
  );
}
