import type { Metadata, Viewport } from "next";
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/jetbrains-mono";
import { StoreProvider } from "@/lib/store";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Warga Padma", template: "%s · Warga Padma" },
  description: "Portal informasi warga Perumahan Padma — denah, kegiatan, pengumuman, UMKM, dan transparansi kas.",
};

export const viewport: Viewport = {
  themeColor: "#801818",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <ToastProvider>
          <StoreProvider>{children}</StoreProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
