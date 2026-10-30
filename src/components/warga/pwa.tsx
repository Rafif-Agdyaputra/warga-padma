"use client";
import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
export function InstallApp() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [platform, setPlatform] = useState<"ios" | "android" | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [instructions, setInstructions] = useState(false);
  useEffect(() => {
    if ("serviceWorker" in navigator && window.isSecureContext) void navigator.serviceWorker.register("/sw.js").catch(console.error);
    const listener = (e: Event) => { e.preventDefault(); setEvent(e as InstallEvent); };
    const installedListener = () => { setEvent(null); setPlatform(null); };
    window.addEventListener("beforeinstallprompt", listener);
    window.addEventListener("appinstalled", installedListener);
    const installed = window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone);
    if (!installed) {
      const ua = navigator.userAgent;
      if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) setPlatform("ios");
      else if (/Android/i.test(ua)) setPlatform("android");
    }
    return () => { window.removeEventListener("beforeinstallprompt", listener); window.removeEventListener("appinstalled", installedListener); };
  }, []);
  if (dismissed || (!event && !platform)) return null;
  return <div className="mx-auto max-w-7xl px-4 pt-2 md:px-6"><div className="flex items-start gap-3 rounded-2xl border border-maroon-100 bg-maroon-50 px-4 py-3 text-sm text-concrete-800"><Download className="mt-0.5 size-4 shrink-0 text-maroon-700" /><div className="min-w-0 flex-1"><p className="font-semibold">Pasang Warga Padma di layar utama</p><button type="button" className="mt-1 font-semibold text-maroon-700 underline" onClick={async () => { if (event) { try { await event.prompt(); await event.userChoice; setEvent(null); } catch { setInstructions(true); } } else setInstructions((v) => !v); }}>{event ? "Pasang aplikasi" : "Lihat cara memasang"}</button>{instructions && <p className="mt-2 text-xs leading-relaxed text-concrete-600">{platform === "ios" ? "Buka di Safari, tekan tombol Bagikan, lalu pilih Tambahkan ke Layar Utama. Jika tersedia, pilih Buka sebagai App, lalu Tambah." : "Buka di Chrome, tekan menu titik tiga, lalu pilih Instal aplikasi atau Tambahkan ke layar utama. Nama menu dapat berbeda pada tiap perangkat."}</p>}</div><button type="button" onClick={() => setDismissed(true)} aria-label="Tutup petunjuk pemasangan" className="grid size-7 shrink-0 place-items-center rounded-lg text-concrete-500 hover:bg-white"><X className="size-4" /></button></div></div>;
}
