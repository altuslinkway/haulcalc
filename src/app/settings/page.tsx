import type { Metadata } from "next";
import { SettingsForm } from "@/components/SettingsForm";

export const metadata: Metadata = { title: "My rates · HaulCalc" };

export default function SettingsPage() {
  return <SettingsForm />;
}
