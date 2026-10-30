"use client";

import { useMemo, useState } from "react";
import { MapPin, MessageCircle, Pencil, Plus, Search, Store, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn, today, uid, waLink } from "@/lib/utils";
import type { BusinessStatus, CatalogItem, Umkm } from "@/lib/types";
import { Badge, Button, Cover, EmptyState, Field, ImageInput, Input, Modal, PageHeader, Select, StatusBadge, Tabs, Textarea } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import {
  CatalogEditor, CatalogList, HoursLine, LinkChips, LinksEditor, OpenBadge, businessStatusLabel, cleanUmkm, hoursText,
  isInactive, openState, useNow, formatPrice, priceDigits,
} from "@/components/umkm/parts";
import { DraftNotice } from "../draft-notice";
import { useRequireLogin } from "../auth";

const categories: Umkm["category"][] = ["Makanan", "Minuman", "Jasa", "Fashion", "Kebutuhan Rumah", "Lainnya"];

type Form = Pick<Umkm, "name" | "owner" | "category" | "description" | "price" | "image" | "blokRumah" | "phone" | "openTime" | "closeTime" | "businessStatus" | "statusNote" | "catalog" | "links">;

const empty: Form = {
  name: "", owner: "", category: "Makanan", description: "", price: "", image: undefined, blokRumah: "", phone: "",
  openTime: "", closeTime: "", businessStatus: "aktif", statusNote: "", catalog: [], links: {},
};

const pickForm = (u: Umkm): Form => ({
  name: u.name, owner: u.owner, category: u.category, description: u.description, price: u.price, image: u.image,
  blokRumah: u.blokRumah, phone: u.phone, openTime: u.openTime ?? "", closeTime: u.closeTime ?? "",
  businessStatus: u.businessStatus ?? "aktif", statusNote: u.statusNote ?? "", catalog: u.catalog ?? [], links: u.links ?? {},
});

export function UmkmView() {
  const { data, user, add, update, remove, setUmkmStatus } = useStore();
  const toast = useToast();
  const requireLogin = useRequireLogin();
  const now = useNow();
  const [saving, setSaving] = useState(false);
  const [cat, setCat] = useState<string>("Semua");
  const [q, setQ] = useState("");
  const [openNow, setOpenNow] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = data.umkm.find((u) => u.id === detailId) ?? null;

  const isMine = cat === "Saya";
  const list = useMemo(() => {
    const l = data.umkm.filter((u) =>
      isMine
        ? u.mine
        : u.status === "published" &&
          (cat === "Semua" || u.category === cat) &&
          (!q || (u.name + u.description + u.owner + (u.catalog ?? []).map((c) => c.name).join(" ")).toLowerCase().includes(q.toLowerCase())) &&
          (!openNow || openState(u, now)?.key === "buka"),
    );
    // usaha yang libur / tidak aktif tetap tampil, tapi di urutan belakang
    return isMine ? l : [...l].sort((a, b) => Number(isInactive(a)) - Number(isInactive(b)));
  }, [data.umkm, isMine, cat, q, openNow, now]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((form.openTime && !form.closeTime) || (!form.openTime && form.closeTime)) {
      toast("Isi jam buka dan jam tutup sekaligus, atau kosongkan keduanya", "warning");
      return;
    }
    setSaving(true);
    const payload = cleanUmkm(form);
    const ok = editing
      ? await update("umkm", editing, { ...payload, status: "draft" })
      : await add("umkm", { ...payload, id: uid("u"), status: "draft", createdAt: today(), mine: true } as Umkm);
    setSaving(false);
    if (!ok) return;
    toast(editing ? "Perubahan dikirim untuk direview" : "Promosi terkirim — menunggu persetujuan admin", editing ? "info" : "success");
    if (!editing) setCat("Saya");
    setOpen(false);
  };

  const changeStatus = async (u: Umkm, status: BusinessStatus) => {
    const note = status === "aktif" ? undefined : prompt(status === "libur" ? "Keterangan libur (opsional), mis. \"Libur sampai 3 Nov\"" : "Keterangan (opsional)", u.statusNote ?? "") ?? undefined;
    if (await setUmkmStatus(u.id, status, note)) toast(`Status usaha: ${businessStatusLabel[status]}`);
  };

  return (
    <>
      <PageHeader
        index="07"
        eyebrow="Ekonomi Warga"
        title="UMKM & Jasa Warga"
        description="Dukung usaha tetangga sendiri. Lihat jam buka, menu atau daftar jasa, dan toko online warga Padma."
        action={<Button icon={Plus} onClick={() => requireLogin(() => { setForm(empty); setEditing(null); setOpen(true); }, "Masuk dulu untuk mempromosikan usaha")}>Promosikan Usaha</Button>}
      />

      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs value={cat} onChange={setCat} items={[...["Semua", ...categories].map((c) => ({ value: c, label: c })), { value: "Saya", label: "Usaha Saya", count: data.umkm.filter((u) => u.mine).length }]} />
        {!isMine && (
          <div className="flex gap-2">
            <button
              onClick={() => setOpenNow((v) => !v)}
              className={cn("h-11 shrink-0 rounded-xl px-3.5 text-[13px] font-medium ring-1 ring-inset transition", openNow ? "bg-sage-500 text-white ring-sage-500" : "bg-white text-concrete-600 ring-concrete-200")}
            >
              Buka sekarang
            </button>
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-concrete-400" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari produk, menu, jasa" className="pl-10" />
            </div>
          </div>
        )}
      </div>

      {list.length === 0 ? (
        <EmptyState icon={Store} title={isMine ? (user ? "Belum ada usaha yang dipromosikan" : "Masuk untuk melihat usaha Anda") : "Belum ada usaha"} />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
          {list.map((u, i) => {
            const off = isInactive(u);
            return (
              <article key={u.id} className="card group flex animate-rise flex-col overflow-hidden" style={{ animationDelay: `${i * 40}ms` }}>
                <button onClick={() => setDetailId(u.id)} className="flex flex-1 flex-col text-left">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Cover src={u.image} seed={u.id} icon={Store} className={cn("transition duration-500 group-hover:scale-105", off && "grayscale")} />
                    <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
                      {u.mine && <StatusBadge status={u.status} />}
                      <OpenBadge u={u} now={now} className="bg-white/95 backdrop-blur" />
                    </div>
                  </div>
                  <div className={cn("flex flex-1 flex-col p-3.5 md:p-4", off && "opacity-70")}>
                    <Badge tone="sage" className="self-start">{u.category}</Badge>
                    <h3 className="mt-2 line-clamp-1 text-sm font-semibold text-concrete-900 md:text-base">{u.name}</h3>
                    <p className="mt-1 line-clamp-2 text-xs text-concrete-500 md:text-[13px]">{off && u.statusNote ? u.statusNote : u.description}</p>
                    <div className="mt-auto space-y-1 pt-3">
                      <div className="font-mono text-[13px] font-semibold text-maroon-700">{formatPrice(u.price)}</div>
                      <HoursLine u={u} />
                      <div className="flex items-center gap-1 text-[11px] text-concrete-500"><MapPin className="size-3" />Rumah {u.blokRumah}</div>
                    </div>
                  </div>
                </button>
                {u.mine && (
                  <div className="space-y-2 border-t border-concrete-100 p-2.5">
                    {u.status === "published" && (
                      <Select className="h-8 text-xs" value={u.businessStatus ?? "aktif"} onChange={(e) => changeStatus(u, e.target.value as BusinessStatus)} aria-label="Status usaha">
                        <option value="aktif">Status: Aktif</option>
                        <option value="libur">Status: Sedang libur</option>
                        <option value="tidak_aktif">Status: Tidak aktif</option>
                      </Select>
                    )}
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" icon={Pencil} className="flex-1" onClick={() => { setForm(pickForm(u)); setEditing(u.id); setOpen(true); }}>Edit</Button>
                      <Button size="sm" variant="danger" icon={Trash2} onClick={async () => { if (confirm("Hapus promosi ini?") && (await remove("umkm", u.id))) toast("Promosi dihapus", "info"); }} aria-label="Hapus" />
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <Modal open={!!detail} onClose={() => setDetailId(null)} title={detail?.name ?? ""} subtitle={detail ? `${detail.category} · oleh ${detail.owner}` : ""} size="lg">
        {detail && (
          <div className="space-y-5">
            <div className="-mx-5 -mt-5 aspect-[16/9] md:-mx-6"><Cover src={detail.image} seed={detail.id} icon={Store} className={isInactive(detail) ? "grayscale" : undefined} /></div>
            {isInactive(detail) && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-concrete-700">
                <b>{businessStatusLabel[detail.businessStatus!]}</b>{detail.statusNote ? ` — ${detail.statusNote}` : ". Pesanan mungkin belum bisa dilayani."}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <div className="font-mono text-lg font-semibold text-maroon-700">{formatPrice(detail.price)}</div>
              <OpenBadge u={detail} now={now} />
              {hoursText(detail) && <HoursLine u={detail} className="text-sm" />}
            </div>
            <p className="text-[15px] leading-relaxed text-concrete-700">{detail.description}</p>
            <CatalogList u={detail} />
            <LinkChips u={detail} />
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex items-center gap-2.5 rounded-xl bg-concrete-50 p-3.5 text-sm"><MapPin className="size-4 text-maroon-600" />Perumahan Padma, Rumah <b>{detail.blokRumah}</b></div>
              <a href={waLink(detail.phone)} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-sage-500 p-3.5 text-sm font-semibold text-white hover:bg-sage-600">
                <MessageCircle className="size-4" /> Pesan via WhatsApp
              </a>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Promosi" : "Promosikan Usaha"}
        subtitle="Tampil setelah disetujui admin"
        size="lg"
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Batal</Button><Button type="submit" form="form-umkm" disabled={saving}>{saving ? "Mengirim…" : "Kirim untuk Review"}</Button></>}
      >
        <form id="form-umkm" onSubmit={submit} className="space-y-4">
          <DraftNotice />
          <Field label="Foto produk / jasa"><ImageInput value={form.image} onChange={(image) => setForm({ ...form, image })} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama usaha"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Kategori">
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Umkm["category"] })}>
                {categories.map((c) => <option key={c}>{c}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Deskripsi"><Textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Produk unggulan, area layanan, cara pesan" /></Field>
          <Field label="Harga (Rp)" hint="Masukkan angka saja, misalnya 15000."><Input required inputMode="numeric" pattern="[0-9]+" value={form.price} onChange={(e) => setForm({ ...form, price: priceDigits(e.target.value) })} placeholder="15000" /></Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Jam buka"><Input type="time" value={form.openTime ?? ""} onChange={(e) => setForm({ ...form, openTime: e.target.value })} /></Field>
            <Field label="Jam tutup"><Input type="time" value={form.closeTime ?? ""} onChange={(e) => setForm({ ...form, closeTime: e.target.value })} /></Field>
            <Field label="Status usaha">
              <Select value={form.businessStatus} onChange={(e) => setForm({ ...form, businessStatus: e.target.value as BusinessStatus })}>
                <option value="aktif">Aktif</option>
                <option value="libur">Sedang libur</option>
                <option value="tidak_aktif">Tidak aktif</option>
              </Select>
            </Field>
          </div>
          {form.businessStatus !== "aktif" && (
            <Field label="Keterangan status" hint="Tetap tampil di website dengan tanda libur / tidak aktif.">
              <Input value={form.statusNote ?? ""} onChange={(e) => setForm({ ...form, statusNote: e.target.value })} placeholder="mis. Libur sampai 3 November" />
            </Field>
          )}

          <CatalogEditor category={form.category} value={form.catalog} onChange={(catalog: CatalogItem[]) => setForm({ ...form, catalog })} />
          <LinksEditor value={form.links} onChange={(links) => setForm({ ...form, links })} />

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Nama pemilik"><Input required value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} /></Field>
            <Field label="Alamat rumah"><Input required value={form.blokRumah} onChange={(e) => setForm({ ...form, blokRumah: e.target.value.toUpperCase() })} placeholder="mis. B-6" /></Field>
            <Field label="No. WhatsApp"><Input required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="08xx" /></Field>
          </div>
        </form>
      </Modal>
    </>
  );
}
