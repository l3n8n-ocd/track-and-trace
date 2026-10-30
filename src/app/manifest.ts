import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Track-and-Trace – BulSU Lost and Found",
    short_name: "Track-and-Trace",
    description: "Report, search, match, and claim lost items at Bulacan State University – Main Campus.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f5f5ed",
    theme_color: "#670001",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
