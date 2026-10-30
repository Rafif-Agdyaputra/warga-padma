"use client";

import { useState } from "react";
import { CheckCircle2, CircleDot, Loader2, MessageSquareReply, MessageSquareWarning, Pencil, Plus, Trash2 } from "lucide-react";
import { pengaduanPhotoUrl } from "@/lib/pengaduan-photo";
import { useStore } from "@/lib/store";
import { cn, tanggal, today, uid } from "@/lib/utils";
import type { Pengaduan } from "@/lib/types";
import { Badge, Button, EmptyState, Field, ImageInput, Input, Modal, PageHeader, Select, StatusBadge, Tabs, Textarea } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { DraftNotice, HoaxWarning } from "../draft-notice";
import { useRequireLogin } from "../auth";

const categories: Pengaduan["category"][] = ["Keamanan", "Kebersihan", "Fasilitas", "Lingkungan", "Lainnya"];
const progressMap = {
  diterima: { label: "Diterima", icon: CircleDot, tone: "neutral" as const },
  diproses: { label: "Diproses", icon: Loader2, tone: "amber" as const },
  selesai: { label: "Selesai", icon: CheckCircle2, tone: "sage" as const },
};

const empty = { title: "", content: "", category: "Fasilitas" as Pengaduan["category"], reporter: "", blokRumah: "", anonymous: false, image: undefined as string | undefined, agree: false };

export function PengaduanView() {
  const { data, user, add, update, remove } = useStore();
  const toast = useToast();
  const requireLogin = useRequireLogin();
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"public" | "mine">("public");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);

  const lists = {
    public: data.pengaduan.filter((p) => p.status === "published"),
    mine: data.pengaduan.filter((p) => p.mine),
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { agree, ...payload } = form;
    if (!agree) return;
    setSaving(true);
    const ok = editing
      ? await update("pengaduan", editing, { ...payload, status: "draft" })
      : await add("pengaduan", { ...payload, id: uid("a"), status: "draft", progress: "diterima", createdAt: today(), mine: true });
    setSaving(false);
    if (!ok) return;
    toast(editing ? "Pengaduan diperbarui & dikirim ulang" : "Pengaduan terkirim — menunggu verifikasi admin", editing ? "info" : "success");
    if (!editing) setTab("mine");
    setOpen(false);
  };

  const openEdit = (p: Pengaduan) => {
    setForm({ title: p.title, content: p.content, category: p.category, reporter: p.reporter, blokRumah: p.blokRumah, anonymous: p.anonymous, image: p.image, agree: false });
    setEditing(p.id);
    setOpen(true);
  };

  return (
    <>
      <PageHeader
        index="05"
        eyebrow="Suara Warga"
        title="Pengaduan & Keluhan"
        description="Sampaikan keluhan lingkungan secara bertanggung jawab. Setiap laporan diverifikasi admin sebelum ditampilkan."
        action={<Button icon={Plus} onClick={() => requireLogin(() => { setForm(empty); setEditing(null); setOpen(true); }, "Masuk dulu untuk membuat pengaduan")}>Buat Pengaduan</Button>}
      />

      <div className="mb-5"><HoaxWarning /></div>

      <div className="mb-5">
        <Tabs value={tab} onChange={setTab} items={[{ value: "public", label: "Pengaduan Warga", count: lists.public.length }, { value: "mine", label: "Laporan Saya", count: lists.mine.length }]} />
      </div>

      {lists[tab].length === 0 ? (
        <EmptyState icon={MessageSquareWarning} title={tab === "mine" ? (user ? "Belum ada laporan" : "Masuk untuk melihat laporan Anda") : "Belum ada pengaduan"} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {lists[tab].map((p, i) => {
            const pr = progressMap[p.progress];
            return (
              <article key={p.id} className="card animate-rise p-5" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="maroon">{p.category}</Badge>
                  {p.mine ? <StatusBadge status={p.status} /> : <Badge tone={pr.tone}><pr.icon className="size-3" />{pr.label}</Badge>}
                  <span className="ml-auto font-mono text-[11px] uppercase tracking-wider text-concrete-400">{tanggal(p.createdAt)}</span>
                </div>
                <h3 className="mt-3 font-semibold text-concrete-900">{p.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-concrete-600">{p.content}</p>
                <div className="mt-2 text-xs text-concrete-500">Pelapor: {p.anonymous ? "Anonim" : p.reporter} · Lokasi {p.blokRumah}</div>

                {p.mine && p.image && pengaduanPhotoUrl(p.image) && <a className="mt-3 inline-block text-sm font-semibold text-maroon-700 underline" href={pengaduanPhotoUrl(p.image)} target="_blank" rel="noreferrer">Lihat foto bukti</a>}

                {/* tahapan */}
                <div className="mt-4 flex items-center gap-1.5">
                  {(["diterima", "diproses", "selesai"] as const).map((s, idx, arr) => {
                    const reached = arr.indexOf(p.progress) >= idx;
                    return (
                      <div key={s} className="flex flex-1 items-center gap-1.5">
                        <span className={cn("h-1.5 flex-1 rounded-full", reached ? (p.progress === "selesai" ? "bg-sage-500" : "bg-amber-400") : "bg-concrete-100")} />
                        <span className={cn("font-mono text-[9.5px] uppercase tracking-wider", reached ? "text-concrete-700" : "text-concrete-400")}>{progressMap[s].label}</span>
                      </div>
                    );
                  })}
                </div>

                {p.response && (
                  <div className="mt-4 flex gap-2.5 rounded-xl bg-sage-50 p-3.5 text-[13px] text-sage-700">
                    <MessageSquareReply className="mt-0.5 size-4 shrink-0" />
                    <div><b>Tanggapan pengurus:</b> {p.response}</div>
                  </div>
                )}

                {p.mine && p.status !== "published" && (
                  <div className="mt-4 flex gap-2 border-t border-concrete-100 pt-3">
                    <Button size="sm" variant="outline" icon={Pencil} onClick={() => openEdit(p)}>Edit</Button>
                    <Button size="sm" variant="danger" icon={Trash2} onClick={async () => { if (confirm("Hapus laporan ini?") && (await remove("pengaduan", p.id))) toast("Laporan dihapus", "info"); }}>Hapus</Button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Pengaduan" : "Buat Pengaduan"}
        subtitle="Diverifikasi admin sebelum ditampilkan"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" form="form-aduan" disabled={!form.agree || saving}>{saving ? "Mengirim…" : "Kirim Pengaduan"}</Button>
          </>
        }
      >
        <form id="form-aduan" onSubmit={submit} className="space-y-4">
          <HoaxWarning />
          <Field label="Judul pengaduan"><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ringkas dan jelas" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kategori">
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Pengaduan["category"] })}>
                {categories.map((c) => <option key={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Lokasi / nomor rumah"><Input required value={form.blokRumah} onChange={(e) => setForm({ ...form, blokRumah: e.target.value.toUpperCase() })} placeholder="mis. C-4" /></Field>
          </div>
          <Field label="Isi pengaduan"><Textarea required value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Ceritakan kejadian secara faktual: apa, di mana, kapan" /></Field>
          <Field label="Nama pelapor" hint="Nama dan lokasi tetap diketahui admin; isi laporan yang diterbitkan bisa mengungkap identitas.">
            <Input required value={form.reporter} onChange={(e) => setForm({ ...form, reporter: e.target.value })} />
          </Field>
          <label className="flex items-center gap-2.5 text-sm text-concrete-700">
            <input type="checkbox" checked={form.anonymous} onChange={(e) => setForm({ ...form, anonymous: e.target.checked })} className="size-4 accent-maroon-600" />
            Sembunyikan nama dan lokasi dari publik
          </label>
          <Field label="Foto bukti (opsional)"><ImageInput value={form.image} preview={pengaduanPhotoUrl} onChange={(image) => setForm({ ...form, image })} /></Field>
          <p className="text-sm text-concrete-600">Foto bukti hanya dapat dilihat Anda dan admin, termasuk setelah laporan tayang. Hindari mencantumkan identitas pada judul atau isi jika ingin anonim. Laporan dan foto disimpan sampai dihapus oleh Anda (sebelum tayang) atau admin.</p>
          <DraftNotice text="Pengaduan akan diverifikasi admin terlebih dahulu." />
          <label className="flex items-start gap-2.5 rounded-xl border border-maroon-100 bg-maroon-50/50 p-3.5 text-[13px] text-concrete-700">
            <input type="checkbox" required checked={form.agree} onChange={(e) => setForm({ ...form, agree: e.target.checked })} className="mt-0.5 size-4 accent-maroon-600" />
            Saya menyatakan pengaduan ini benar, tidak mengandung fitnah, dan bersedia dimintai keterangan oleh pengurus.
          </label>
        </form>
      </Modal>
    </>
  );
}
