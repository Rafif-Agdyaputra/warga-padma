"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Clock, MapPin, Pencil, Plus, Trash2, User } from "lucide-react";
import { useStore } from "@/lib/store";
import { tanggal, today, uid } from "@/lib/utils";
import type { Kegiatan } from "@/lib/types";
import { Button, Cover, EmptyState, Field, ImageInput, Input, Modal, PageHeader, StatusBadge, Tabs, Textarea } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { DraftNotice } from "../draft-notice";
import { useRequireLogin } from "../auth";

const empty = { title: "", date: "", location: "", description: "", author: "", blokRumah: "", image: undefined as string | undefined };

export function KegiatanView() {
  const { data, user, add, update, remove } = useStore();
  const toast = useToast();
  const requireLogin = useRequireLogin();
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"upcoming" | "past" | "mine">("upcoming");
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Kegiatan | null>(null);

  const now = today();
  const published = data.kegiatan.filter((k) => k.status === "published");
  const lists = useMemo(
    () => ({
      upcoming: published.filter((k) => k.date >= now).sort((a, b) => a.date.localeCompare(b.date)),
      past: published.filter((k) => k.date < now).sort((a, b) => b.date.localeCompare(a.date)),
      mine: data.kegiatan.filter((k) => k.mine),
    }),
    [published, data.kegiatan, now],
  );

  const openNew = () => requireLogin(() => { setForm(empty); setEditing(null); setOpen(true); }, "Masuk dulu untuk mengunggah kegiatan");
  const openEdit = (k: Kegiatan) => {
    setForm({ title: k.title, date: k.date, location: k.location, description: k.description, author: k.author, blokRumah: k.blokRumah, image: k.image });
    setEditing(k.id);
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const ok = editing
      ? await update("kegiatan", editing, { ...form, status: "draft" })
      : await add("kegiatan", { ...form, id: uid("k"), status: "draft", createdAt: now, mine: true });
    setSaving(false);
    if (!ok) return;
    toast(editing ? "Perubahan dikirim ulang untuk direview admin" : "Kegiatan terkirim — menunggu persetujuan admin", editing ? "info" : "success");
    if (!editing) setTab("mine");
    setOpen(false);
  };

  const list = lists[tab];

  return (
    <>
      <PageHeader
        index="02"
        eyebrow="Agenda Warga"
        title="Kegiatan Warga"
        description="Agenda dan dokumentasi kegiatan lingkungan. Setiap kegiatan yang diunggah warga akan direview admin sebelum tayang."
        action={<Button icon={Plus} onClick={openNew}>Unggah Kegiatan</Button>}
      />

      <div className="mb-5">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: "upcoming", label: "Akan Datang", count: lists.upcoming.length },
            { value: "past", label: "Sudah Lewat", count: lists.past.length },
            { value: "mine", label: "Kiriman Saya", count: lists.mine.length },
          ]}
        />
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={tab === "mine" ? (user ? "Belum ada kiriman" : "Masuk untuk melihat kiriman Anda") : "Belum ada kegiatan"}
          text={tab === "mine" ? "Kegiatan yang Anda unggah akan muncul di sini beserta status reviewnya." : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((k, i) => {
            const d = new Date(k.date + "T00:00:00");
            return (
              <article key={k.id} className="card group animate-rise overflow-hidden" style={{ animationDelay: `${i * 50}ms` }}>
                <button onClick={() => setDetail(k)} className="block w-full text-left">
                  <div className="relative h-44 overflow-hidden">
                    <Cover src={k.image} seed={k.id} icon={CalendarDays} className="transition duration-500 group-hover:scale-105" />
                    <div className="absolute left-4 top-4 rounded-2xl bg-white/95 px-3 py-2 text-center shadow-soft backdrop-blur">
                      <div className="font-display text-2xl font-semibold leading-none text-maroon-700">{d.getDate()}</div>
                      <div className="mt-0.5 font-mono text-[9.5px] uppercase tracking-wider text-concrete-500">{d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" })}</div>
                    </div>
                    {k.mine && <div className="absolute right-3 top-3"><StatusBadge status={k.status} /></div>}
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold leading-snug text-concrete-900 transition group-hover:text-maroon-700">{k.title}</h3>
                    <p className="mt-1.5 line-clamp-2 text-sm text-concrete-500">{k.description}</p>
                    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-concrete-500">
                      <span className="flex items-center gap-1"><MapPin className="size-3.5" />{k.location}</span>
                      <span className="flex items-center gap-1"><User className="size-3.5" />{k.author}</span>
                    </div>
                  </div>
                </button>
                {k.mine && (
                  <div className="flex gap-2 border-t border-concrete-100 px-5 py-3">
                    <Button size="sm" variant="outline" icon={Pencil} onClick={() => openEdit(k)}>Edit</Button>
                    <Button
                      size="sm"
                      variant="danger"
                      icon={Trash2}
                      onClick={async () => { if (confirm("Hapus kegiatan ini?") && (await remove("kegiatan", k.id))) toast("Kegiatan dihapus", "info"); }}
                    >
                      Hapus
                    </Button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* form */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Kegiatan" : "Unggah Kegiatan"}
        subtitle="Akan tayang setelah disetujui admin"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" form="form-kegiatan" disabled={saving}>{saving ? "Mengirim…" : editing ? "Kirim Ulang" : "Kirim untuk Review"}</Button>
          </>
        }
      >
        <form id="form-kegiatan" onSubmit={submit} className="space-y-4">
          <DraftNotice />
          <Field label="Judul kegiatan"><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="mis. Kerja bakti bulanan" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tanggal"><Input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="Lokasi"><Input required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="mis. Balai Warga" /></Field>
          </div>
          <Field label="Deskripsi"><Textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Jelaskan kegiatan, waktu, dan hal yang perlu dibawa" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama pengunggah"><Input required value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} /></Field>
            <Field label="Nomor rumah"><Input required value={form.blokRumah} onChange={(e) => setForm({ ...form, blokRumah: e.target.value.toUpperCase() })} placeholder="mis. A-5" /></Field>
          </div>
          <Field label="Foto kegiatan (opsional)"><ImageInput value={form.image} onChange={(image) => setForm({ ...form, image })} /></Field>
        </form>
      </Modal>

      {/* detail */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.title ?? ""} size="lg">
        {detail && (
          <div>
            <div className="-mx-5 -mt-5 mb-5 h-56 md:-mx-6"><Cover src={detail.image} seed={detail.id} icon={CalendarDays} /></div>
            <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl bg-concrete-50 p-3"><div className="label-mono mb-1 flex items-center gap-1"><Clock className="size-3" />Tanggal</div>{tanggal(detail.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
              <div className="rounded-xl bg-concrete-50 p-3"><div className="label-mono mb-1 flex items-center gap-1"><MapPin className="size-3" />Lokasi</div>{detail.location}</div>
            </div>
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-concrete-700">{detail.description}</p>
            <p className="mt-5 text-xs text-concrete-500">Diunggah oleh {detail.author} ({detail.blokRumah}) · {tanggal(detail.createdAt)}</p>
          </div>
        )}
      </Modal>
    </>
  );
}
