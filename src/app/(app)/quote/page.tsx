import type { Metadata } from "next";
import { QuoteFlow } from "@/components/QuoteFlow";

export const metadata: Metadata = { title: "New quote | HaulCalc" };

export default function QuotePage() {
  return <QuoteFlow />;
}
