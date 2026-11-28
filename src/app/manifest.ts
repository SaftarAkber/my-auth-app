import type { MetadataRoute } from "next";

// Sayt telefona "tətbiq" kimi əlavə oluna bilsin (PWA) — bildirişlər üçün, xüsusən iPhone-da lazımdır
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tworing",
    short_name: "Tworing",
    description: "Müəllim və tələbələr üçün təhsil platforması",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f5f7fa",
    theme_color: "#f5f7fa",
    lang: "az",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
