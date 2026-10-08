import type { Metadata } from "next";
import { JobsList } from "@/components/JobsList";

export const metadata: Metadata = { title: "Jobs · HaulCalc" };

export default function JobsPage() {
  return <JobsList />;
}
