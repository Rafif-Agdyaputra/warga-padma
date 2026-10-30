"use client";
import { useEffect, useState } from "react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
export function InstallApp() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  useEffect(() => {
    if ('serviceWorker' in navigator && window.isSecureContext) void navigator.serviceWorker.register('/sw.js').catch(console.error);
    const listener = (e: Event) => { e.preventDefault(); setEvent(e as InstallEvent); };
    window.addEventListener('beforeinstallprompt', listener);
    const installed = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone);
    setIos(!installed && /iPad|iPhone|iPod/.test(navigator.userAgent));
    return () => window.removeEventListener('beforeinstallprompt', listener);
  }, []);
  if (!event && !ios) return null;
  return <div className="card mt-5 p-4 text-sm"><p className="font-semibold">Pasang Warga Padma di layar utama</p>{ios ? <p className="mt-1 text-concrete-600">Di menu Bagikan browser, pilih Tambahkan ke Layar Utama. Buka aplikasi dari layar utama untuk mengaktifkan notifikasi.</p> : <button className="mt-2 font-semibold text-maroon-700 underline" onClick={async () => { if (!event) return; await event.prompt(); await event.userChoice; setEvent(null); }}>Pasang aplikasi</button>}</div>;
}
