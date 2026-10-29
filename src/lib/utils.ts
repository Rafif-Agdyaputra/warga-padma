import { clsx, type ClassValue } from "clsx";
import type { Akun, Transaksi } from "./types";

export const cn = (...v: ClassValue[]) => clsx(v);

export const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

export const tanggal = (iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) =>
  new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).toLocaleDateString("id-ID", opts);

export const uid = (p = "") => p + Math.random().toString(36).slice(2, 9);

export const today = () => new Date().toISOString().slice(0, 10);

export function saldo(list: Transaksi[], akun: Akun) {
  return list
    .filter((t) => t.akun === akun)
    .reduce((s, t) => s + (t.type === "masuk" ? t.amount : -t.amount), 0);
}

export function totals(list: Transaksi[], akun: Akun) {
  const items = list.filter((t) => t.akun === akun && t.category !== "Saldo Awal");
  return {
    masuk: items.filter((t) => t.type === "masuk").reduce((s, t) => s + t.amount, 0),
    keluar: items.filter((t) => t.type === "keluar").reduce((s, t) => s + t.amount, 0),
  };
}

export function readImage(file: File, max = 900): Promise<string> {
  // kompres gambar ke dataurl agar muat di localStorage
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = img.width * scale;
        c.height = img.height * scale;
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.78));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export const waLink = (phone: string) => {
  const d = phone.replace(/\D/g, "");
  return `https://wa.me/${d.startsWith("0") ? "62" + d.slice(1) : d}`;
};
