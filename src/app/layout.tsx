import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Semi_Condensed } from "next/font/google";
import "./globals.css";

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const barlowCondensed = Barlow_Semi_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "HaulCalc: quote junk jobs from photos",
  description: "Your customer texts photos. HaulCalc sizes up the load, prices it on your rates, and writes the text back.",
  appleWebApp: { capable: true, title: "HaulCalc", statusBarStyle: "black" },
};

export const viewport: Viewport = {
  themeColor: "#0f1623",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${barlow.variable} ${barlowCondensed.variable} h-full antialiased`}>
      <body className="min-h-full bg-stone-100 font-sans text-stone-900">{children}</body>
    </html>
  );
}
