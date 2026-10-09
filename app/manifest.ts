import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pith",
    short_name: "Pith",
    description: "Notification intelligence for your inbox. Only what needs you.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f766e",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
