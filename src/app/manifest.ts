import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return { name: "Warga Padma", short_name: "Warga Padma", description: "Portal informasi warga Perumahan Padma", start_url: "/warga", scope: "/", display: "standalone", background_color: "#faf9f6", theme_color: "#801818", icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "/icon-512.png", sizes: "512x512", type: "image/png" }] };
}
