"use client";

import { useEffect, useState } from "react";
import { Clock, ExternalLink, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BusinessStatus, CatalogItem, Umkm, UmkmLinkKey } from "@/lib/types";
import { Badge, Field, ImageInput, Input, Select, Textarea } from "@/components/ui";

export const priceDigits = (value: string) => value.replace(/[^0-9]/g, "");
export const formatPrice = (value?: string) => {
  const price = value?.trim() ?? "";
  return /^\d+$/.test(price) ? `Rp ${price.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}` : price;
};

export const businessStatusLabel: Record<BusinessStatus, string> = { aktif: "Aktif", libur: "Sedang libur", tidak_aktif: "Tidak aktif" };

export function catalogTitle(category: Umkm["category"]) {
  if (category === "Makanan" || category === "Minuman") return { title: "Daftar Menu", item: "Nama menu", add: "Tambah menu" };
  if (category === "Fashion") return { title: "Katalog Fashion", item: "Nama produk", add: "Tambah produk" };
  if (category === "Jasa") return { title: "Daftar Jasa & Harga", item: "Nama jasa", add: "Tambah jasa" };
  return null;
}

export const linkMeta: Record<UmkmLinkKey, { label: string; short: string; color: string; placeholder: string; base: string }> = {
  instagram: { label: "Instagram", short: "IG", color: "bg-[#c13584]", placeholder: "@namatoko atau link profil", base: "https://instagram.com/" },
  tiktok: { label: "TikTok", short: "TT", color: "bg-[#111111]", placeholder: "@namatoko atau link profil", base: "https://www.tiktok.com/@" },
  facebook: { label: "Facebook", short: "FB", color: "bg-[#1877f2]", placeholder: "nama halaman atau link", base: "https://facebook.com/" },
  shopee: { label: "Shopee", short: "SP", color: "bg-[#ee4d2d]", placeholder: "link toko Shopee", base: "https://shopee.co.id/" },
  tokopedia: { label: "Tokopedia", short: "TP", color: "bg-[#03ac0e]", placeholder: "link toko Tokopedia", base: "https://www.tokopedia.com/" },
};
export const linkKeys = Object.keys(linkMeta) as UmkmLinkKey[];

// terima link lengkap, www., atau @username lalu jadikan url
export function toLinkUrl(key: UmkmLinkKey, raw?: string) {
  const v = raw?.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (/^www\./i.test(v) || /\.[a-z]{2,}\//i.test(v)) return `https://${v}`;
  return linkMeta[key].base + v.replace(/^@/, "");
}

const toMin = (t?: string) => {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return Number.isFinite(h) ? h * 60 + (m || 0) : null;
};

// status tampil: libur / tidak aktif menang, selain itu dihitung dari jam buka
export function openState(u: Pick<Umkm, "businessStatus" | "openTime" | "closeTime">, now = new Date()) {
  if (u.businessStatus === "libur") return { key: "libur", label: "Libur", tone: "amber" as const };
  if (u.businessStatus === "tidak_aktif") return { key: "tidak_aktif", label: "Tidak aktif", tone: "neutral" as const };
  const o = toMin(u.openTime);
  const c = toMin(u.closeTime);
  if (o === null || c === null) return null;
  const n = now.getHours() * 60 + now.getMinutes();
  const isOpen = o === c ? true : o < c ? n >= o && n < c : n >= o || n < c;
  return isOpen ? { key: "buka", label: "Buka", tone: "sage" as const } : { key: "tutup", label: "Tutup", tone: "maroon" as const };
}

export const hoursText = (u: Pick<Umkm, "openTime" | "closeTime">) =>
  u.openTime && u.closeTime ? (u.openTime === u.closeTime ? "Buka 24 jam" : `${u.openTime} – ${u.closeTime}`) : null;

export const isInactive = (u: Pick<Umkm, "businessStatus">) => u.businessStatus === "libur" || u.businessStatus === "tidak_aktif";

// re-render tiap menit agar status buka/tutup ikut berubah
export function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function OpenBadge({ u, now, className }: { u: Umkm; now?: Date; className?: string }) {
  const st = openState(u, now);
  if (!st) return null;
  return <Badge tone={st.tone} dot className={className}>{st.label}</Badge>;
}

export function HoursLine({ u, className }: { u: Umkm; className?: string }) {
  const h = hoursText(u);
  if (!h) return null;
  return <span className={cn("flex items-center gap-1 text-[11px] text-concrete-500", className)}><Clock className="size-3" />{h}</span>;
}

const fashionCategories = ["Pakaian wanita", "Pakaian pria", "Baju anak", "Sepatu", "Tas", "Perhiasan"] as const;

export function CatalogList({ u }: { u: Umkm }) {
  const meta = catalogTitle(u.category);
  const items = (u.catalog ?? []).filter((i) => i.name?.trim());
  if (!meta || !items.length) return null;
  return (
    <div>
      <div className="label-mono mb-2">{meta.title}</div>
      <ul className="divide-y divide-dashed divide-concrete-200 rounded-xl border border-concrete-200">
        {items.map((it, i) => (
          <li key={i} className="flex flex-wrap items-start justify-between gap-3 px-3.5 py-3">
            {u.category === "Fashion" && it.image && <img src={it.image} alt={`Foto ${it.name}`} className="size-20 shrink-0 rounded-xl object-cover" />}
            <div className="min-w-0">
              <div className="text-sm font-medium text-concrete-800">{it.name}</div>
              {u.category === "Fashion" && it.fashionCategory && <div className="mt-1 text-xs text-concrete-500">{it.fashionCategory}</div>}
              {it.note && <div className="text-xs text-concrete-500">{it.note}</div>}
              {u.category === "Fashion" && it.sizeChart && <div className="mt-2 whitespace-pre-line text-xs text-concrete-600"><b>Panduan ukuran:</b> {it.sizeChart}</div>}
              {u.category === "Fashion" && it.sizeChartImage && <a href={it.sizeChartImage} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-maroon-700 underline">Lihat foto panduan ukuran</a>}
            </div>
            {it.price && <div className="shrink-0 font-mono text-sm font-semibold text-maroon-700">{formatPrice(it.price)}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LinkChips({ u }: { u: Umkm }) {
  const links = linkKeys.map((k) => ({ k, url: toLinkUrl(k, u.links?.[k]) })).filter((l) => l.url);
  if (!links.length) return null;
  return (
    <div>
      <div className="label-mono mb-2">Toko online & media sosial</div>
      <div className="flex flex-wrap gap-2">
        {links.map(({ k, url }) => (
          <a
            key={k}
            href={url!}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="flex items-center gap-2 rounded-full border border-concrete-200 bg-white py-1 pl-1 pr-3 text-[13px] font-medium text-concrete-700 transition hover:border-concrete-300 hover:shadow-soft"
          >
            <span className={cn("grid size-6 place-items-center rounded-full text-[9.5px] font-bold text-white", linkMeta[k].color)}>{linkMeta[k].short}</span>
            {linkMeta[k].label}
            <ExternalLink className="size-3 text-concrete-400" />
          </a>
        ))}
      </div>
    </div>
  );
}

/* ---------- editor ---------- */

export function CatalogEditor({ category, value, onChange }: { category: Umkm["category"]; value?: CatalogItem[]; onChange: (v: CatalogItem[]) => void }) {
  const meta = catalogTitle(category);
  if (!meta) return null;
  const list = value ?? [];
  const set = (i: number, patch: Partial<CatalogItem>) => onChange(list.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  return (
    <div className="rounded-2xl border border-concrete-200 p-3.5">
      <div className="mb-2.5 flex items-center justify-between">
        <div>
          <div className="text-[13px] font-medium text-concrete-700">{meta.title}</div>
          <div className="text-xs text-concrete-400">Opsional — boleh dikosongkan</div>
        </div>
        <button type="button" disabled={list.length >= 100} onClick={() => onChange([...list, { name: "", price: "" }])} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-maroon-600 hover:bg-maroon-50">
          <Plus className="size-3.5" />{meta.add}
        </button>
      </div>
      {list.length === 0 ? (
        <p className="rounded-xl bg-concrete-50 px-3 py-4 text-center text-xs text-concrete-400">Belum ada item.</p>
      ) : (
        <div className="space-y-2">
          {list.map((it, i) => (
            <div key={i} className="space-y-3 rounded-xl bg-concrete-50 p-3">
              <div className="flex gap-2"><Input className="h-10 min-w-0 flex-[2]" placeholder={meta.item} value={it.name} onChange={(e) => set(i, { name: e.target.value })} /><Input className="h-10 min-w-0 flex-1" placeholder="Harga (angka)" inputMode="numeric" pattern="[0-9]*" value={it.price ?? ""} onChange={(e) => set(i, { price: priceDigits(e.target.value) })} /><button type="button" onClick={() => onChange(list.filter((_, j) => j !== i))} className="grid size-10 shrink-0 place-items-center rounded-xl text-concrete-400 hover:bg-maroon-50 hover:text-maroon-700" aria-label="Hapus item"><Trash2 className="size-4" /></button></div>
              {category === "Fashion" && <div className="space-y-3"><Field label="Jenis produk"><Select value={it.fashionCategory ?? ""} onChange={(e) => set(i, { fashionCategory: e.target.value })}><option value="">Pilih jenis produk</option>{fashionCategories.map((c) => <option key={c}>{c}</option>)}</Select></Field><Field label="Panduan ukuran (opsional)"><Textarea value={it.sizeChart ?? ""} onChange={(e) => set(i, { sizeChart: e.target.value })} placeholder="Mis. M: lingkar dada 96 cm, panjang 65 cm" /></Field><Field label="Foto produk (opsional)"><ImageInput value={it.image} onChange={(image) => set(i, { image })} /></Field><Field label="Foto panduan ukuran (opsional)"><ImageInput value={it.sizeChartImage} onChange={(sizeChartImage) => set(i, { sizeChartImage })} /></Field></div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function LinksEditor({ value, onChange }: { value?: Umkm["links"]; onChange: (v: NonNullable<Umkm["links"]>) => void }) {
  const v = value ?? {};
  return (
    <div className="rounded-2xl border border-concrete-200 p-3.5">
      <div className="mb-2.5">
        <div className="text-[13px] font-medium text-concrete-700">Toko online & media sosial</div>
        <div className="text-xs text-concrete-400">Opsional — isi link atau @username</div>
      </div>
      <div className="space-y-2">
        {linkKeys.map((k) => (
          <div key={k} className="flex items-center gap-2">
            <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl text-[10px] font-bold text-white", linkMeta[k].color)} title={linkMeta[k].label}>{linkMeta[k].short}</span>
            <Input className="h-10" placeholder={`${linkMeta[k].label}: ${linkMeta[k].placeholder}`} value={v[k] ?? ""} onChange={(e) => onChange({ ...v, [k]: e.target.value })} />
          </div>
        ))}
      </div>
    </div>
  );
}

// rapikan sebelum disimpan: buang baris kosong, katalog hanya untuk kategori yang relevan
export function cleanUmkm<T extends Partial<Umkm>>(u: T): T {
  const catalog = catalogTitle(u.category ?? "Lainnya")
    ? (u.catalog ?? []).map((i) => ({ name: i.name.trim(), price: i.price?.trim() || undefined, note: i.note?.trim() || undefined, ...(u.category === "Fashion" ? { fashionCategory: i.fashionCategory || undefined, sizeChart: i.sizeChart?.trim() || undefined, image: i.image || undefined, sizeChartImage: i.sizeChartImage || undefined } : {}) })).filter((i) => i.name)
    : [];
  const links = Object.fromEntries(Object.entries(u.links ?? {}).map(([k, val]) => [k, val?.trim()]).filter(([, val]) => val));
  return { ...u, catalog, links, statusNote: u.businessStatus && u.businessStatus !== "aktif" ? u.statusNote : undefined };
}
