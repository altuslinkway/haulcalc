import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Header } from "@/components/Header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HaulCalc",
  description: "Price junk removal jobs from customer photos in seconds.",
  appleWebApp: { capable: true, title: "HaulCalc", statusBarStyle: "black" },
};

export const viewport: Viewport = {
  themeColor: "#1c1917",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-stone-100 text-stone-900">
        <Header />
        <main className="mx-auto w-full max-w-xl flex-1 px-4 pt-4 pb-16">{children}</main>
      </body>
    </html>
  );
}
