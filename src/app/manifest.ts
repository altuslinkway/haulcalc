import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HaulCalc",
    short_name: "HaulCalc",
    description: "Price junk removal jobs from customer photos in seconds.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f5f4",
    theme_color: "#1c1917",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
