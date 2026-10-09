import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HaulCalc",
    short_name: "HaulCalc",
    description: "Price junk removal jobs from customer photos in seconds.",
    start_url: "/quote",
    display: "standalone",
    background_color: "#f2f3f1",
    theme_color: "#111413",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
