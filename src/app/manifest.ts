import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Outsole Inventory Management",
    short_name: "Inventory",
    description: "Outsole inventory management system with QR scanning for warehouse operations",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f172a",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
