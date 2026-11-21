import type { MetadataRoute } from "next";

// Sayt telefona "tətbiq" kimi əlavə oluna bilsin (PWA) — bildirişlər üçün, xüsusən iPhone-da lazımdır
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EduFlow",
    short_name: "EduFlow",
    description: "Müəllim və tələbələr üçün təhsil platforması",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f6f6f3",
    theme_color: "#f6f6f3",
    lang: "az",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
