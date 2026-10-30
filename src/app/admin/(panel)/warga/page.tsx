"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, Check, Home, MailCheck, MailWarning, Pencil, Phone, Trash2, RefreshCw, RotateCcw, Search, UserCheck, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { getSupabase } from "@/lib/supabase/client";
import { tanggal, waLink } from "@/lib/utils";
import type { WargaStatus } from "@/lib/types";
import { Badge, Button, EmptyState, Input, Modal, PageHeader, Spinner, Tabs } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { wargaStatusMeta } from "@/components/warga/auth";
import { RegistrationFields, phoneOk, relationLabel, useHouseName, type RegFields } from "@/components/warga/registration";

interface Row {
  user_id: string; email: string; email_confirmed: boolean; full_name: string; phone: string; house_id: string | null;
  blok_rumah: string; relation: keyof typeof relationLabel; status: WargaStatus; admin_note: string | null; created_at: string; reviewed_at: string | null;
}

export default function Page() {
  const { data, setPendingWarga } = useStore();
  const houseName = useHouseName();
  const toast = useToast();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [tab, setTab] = useState<WargaStatus | "all">("pending");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ row: Row; form: RegFields } | null>(null);
  const [editErr, setEditErr] = useState("");
  const [del, setDel] = useState<{ row: Row; content: boolean } | null>(null);

  const load = useCallback(async () => {
    const { data: res, error } = await getSupabase().rpc("admin_list_warga");
    if (error) {
      toast(`Gagal memuat data warga: ${error.message}`, "warning");
      setRows([]);
      return;
    }
    setRows(res as Row[]);
    setPendingWarga((res as Row[]).filter((r) => r.status === "pending").length);
  }, [toast, setPendingWarga]);

  useEffect(() => { load(); }, [load]);

  const review = async (r: Row, status: WargaStatus) => {
    let note: string | null = null;
    if (status === "rejected" || status === "suspended") {
      const v = prompt(status === "rejected" ? "Alasan penolakan (ditampilkan ke warga):" : "Alasan penonaktifan (ditampilkan ke warga):", r.admin_note ?? "");
      if (v === null) return;
      note = v;
    }
    setBusy(r.user_id);
    const { error } = await getSupabase().rpc("review_warga", { p_user_id: r.user_id, p_status: status, p_note: note });
    setBusy(null);
    if (error) return toast(`Gagal: ${error.message}`, "warning");
    toast(`${r.full_name}: ${wargaStatusMeta[status].label}`, status === "approved" ? "success" : "info");
    load();
  };

  // koreksi data pendaftar (salah pilih rumah, typo nama/hp); status verifikasi tidak berubah
  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    const f = edit.form;
    setEditErr("");
    if (f.fullName.trim().length < 3) return setEditErr("Nama minimal 3 karakter.");
    if (!phoneOk(f.phone)) return setEditErr("Nomor HP tidak valid.");
    if (!f.houseId) return setEditErr("Pilih nomor rumah.");
    setBusy(edit.row.user_id);
    const { error } = await getSupabase()
      .from("warga_profiles")
      .update({ full_name: f.fullName.trim(), phone: f.phone.trim(), house_id: f.houseId, blok_rumah: houseName(f.houseId), relation: f.relation })
      .eq("user_id", edit.row.user_id);
    setBusy(null);
    if (error) return setEditErr(error.message);
    toast(`Data ${f.fullName.trim()} diperbarui`);
    setEdit(null);
    load();
  };

  const deleteAccount = async () => {
    if (!del) return;
    setBusy(del.row.user_id);
    const { error } = await getSupabase().rpc("admin_delete_warga", { p_user_id: del.row.user_id, p_delete_content: del.content });
    setBusy(null);
    if (error) return toast(`Gagal menghapus: ${error.message}`, "warning");
    toast(`Akun ${del.row.full_name} dihapus`, "info");
    setDel(null);
    load();
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows?.length ?? 0 };
    rows?.forEach((r) => { c[r.status] = (c[r.status] ?? 0) + 1; });
    return c;
  }, [rows]);

  const list = (rows ?? []).filter((r) =>
    (tab === "all" || r.status === tab) &&
    (!q || `${r.full_name} ${r.email} ${r.phone} ${houseName(r.house_id, r.blok_rumah)}`.toLowerCase().includes(q.toLowerCase())),
  );

  const houseOf = (id: string | null) => (id ? data.houses.find((h) => h.id === id) : undefined);
  const sameHouse = (r: Row) => (rows ?? []).filter((x) => x.house_id && x.house_id === r.house_id && x.user_id !== r.user_id && x.status === "approved").length;

  return (
    <>
      <PageHeader
        index="00"
        eyebrow="Keamanan Akun"
        title="Verifikasi Warga"
        description="Setujui pendaftar yang benar warga Padma. Hanya akun terverifikasi yang bisa mengirim kegiatan, pengaduan, dan promosi UMKM."
        action={<Button variant="outline" icon={RefreshCw} onClick={load}>Muat ulang</Button>}
      />

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-concrete-100 p-4 md:flex-row md:items-center md:justify-between">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: "pending", label: "Menunggu", count: counts.pending ?? 0 },
              { value: "approved", label: "Terverifikasi", count: counts.approved ?? 0 },
              { value: "rejected", label: "Ditolak", count: counts.rejected ?? 0 },
              { value: "suspended", label: "Dinonaktifkan", count: counts.suspended ?? 0 },
              { value: "all", label: "Semua", count: counts.all },
            ]}
          />
          <div className="relative md:w-64">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-concrete-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama, email, rumah" className="h-10 pl-10" />
          </div>
        </div>

        {rows === null ? (
          <div className="grid place-items-center p-14"><Spinner /></div>
        ) : list.length === 0 ? (
          <div className="p-4"><EmptyState icon={UserCheck} title={tab === "pending" ? "Tidak ada pendaftar baru" : "Tidak ada data"} /></div>
        ) : (
          <ul className="divide-y divide-concrete-100">
            {list.map((r) => {
              const m = wargaStatusMeta[r.status];
              const h = houseOf(r.house_id);
              const dup = sameHouse(r);
              return (
                <li key={r.user_id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center md:px-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-concrete-900">{r.full_name}</span>
                      <Badge tone={m.tone} dot>{m.label}</Badge>
                      <Badge>{relationLabel[r.relation]}</Badge>
                      {r.email_confirmed
                        ? <span className="flex items-center gap-1 text-[11px] text-sage-600"><MailCheck className="size-3.5" />email terverifikasi</span>
                        : <span className="flex items-center gap-1 text-[11px] text-amber-600"><MailWarning className="size-3.5" />email belum diverifikasi</span>}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-concrete-600">
                      <span>{r.email}</span>
                      <a href={waLink(r.phone)} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-sage-600"><Phone className="size-3.5" />{r.phone}</a>
                      <span className="flex items-center gap-1 font-mono"><Home className="size-3.5" />{r.house_id ? houseName(r.house_id) : `${r.blok_rumah} (tidak cocok denah)`}</span>
                      <span className="text-concrete-400">Daftar {tanggal(r.created_at.slice(0, 10))}</span>
                    </div>
                    {r.status === "pending" && (
                      <div className="mt-2 rounded-xl bg-concrete-50 px-3 py-2 text-xs text-concrete-600">
                        Data denah rumah {houseName(r.house_id)}: <b>{h ? `${h.owner} · ${h.status}` : "rumah tidak ditemukan"}</b>
                        {dup > 0 && <> · <span className="text-amber-600">{dup} akun terverifikasi lain di rumah ini</span></>}
                      </div>
                    )}
                    {r.admin_note && <p className="mt-2 text-xs text-concrete-500">Catatan: {r.admin_note}</p>}
                  </div>
                  <div className="flex flex-wrap gap-1.5 md:justify-end">
                    <Button
                      size="sm" variant="ghost" icon={Pencil} disabled={busy === r.user_id}
                      onClick={() => { setEditErr(""); setEdit({ row: r, form: { fullName: r.full_name, phone: r.phone, houseId: r.house_id ?? "", relation: r.relation } }); }}
                    >
                      Edit
                    </Button>
                    {r.status !== "approved" && r.status !== "suspended" && (
                      <Button size="sm" variant="secondary" icon={Check} disabled={busy === r.user_id} onClick={() => review(r, "approved")}>Setujui</Button>
                    )}
                    {r.status === "pending" && (
                      <Button size="sm" variant="outline" icon={X} disabled={busy === r.user_id} onClick={() => review(r, "rejected")}>Tolak</Button>
                    )}
                    {r.status === "approved" && (
                      <Button size="sm" variant="danger" icon={Ban} disabled={busy === r.user_id} onClick={() => review(r, "suspended")}>Nonaktifkan</Button>
                    )}
                    {r.status === "suspended" && (
                      <Button size="sm" variant="outline" icon={RotateCcw} disabled={busy === r.user_id} onClick={() => review(r, "approved")}>Aktifkan lagi</Button>
                    )}
                    <Button size="sm" variant="danger" icon={Trash2} disabled={busy === r.user_id} onClick={() => setDel({ row: r, content: false })} aria-label="Hapus akun">Hapus</Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Modal
        open={!!del}
        onClose={() => setDel(null)}
        title="Hapus Akun Warga"
        subtitle="Tindakan ini permanen dan tidak bisa dibatalkan"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDel(null)}>Batal</Button>
            <Button variant="primary" icon={Trash2} disabled={busy === del?.row.user_id} onClick={deleteAccount}>{busy === del?.row.user_id ? "Menghapus…" : "Hapus akun"}</Button>
          </>
        }
      >
        {del && (
          <div className="space-y-4 text-sm text-concrete-700">
            <div className="rounded-xl bg-concrete-50 p-3.5">
              <div className="font-semibold text-concrete-900">{del.row.full_name}</div>
              <div className="text-concrete-500">{del.row.email} · Rumah {houseName(del.row.house_id, del.row.blok_rumah)}</div>
            </div>
            <ul className="list-disc space-y-1 pl-5 text-[13px] text-concrete-600">
              <li>Warga langsung tidak bisa masuk lagi dengan akun ini.</li>
              <li>Email ini bisa dipakai untuk daftar ulang dan harus diverifikasi lagi oleh pengurus.</li>
              <li>Data penghuni di denah tidak ikut berubah.</li>
            </ul>
            <label className="flex items-start gap-2.5 rounded-xl border border-maroon-100 bg-maroon-50/50 p-3.5 text-[13px]">
              <input type="checkbox" checked={del.content} onChange={(e) => setDel({ ...del, content: e.target.checked })} className="mt-0.5 size-4 accent-maroon-600" />
              Hapus juga semua kiriman warga ini (kegiatan, UMKM, pengaduan). Jika tidak dicentang, kiriman tetap tampil tanpa pemilik.
            </label>
          </div>
        )}
      </Modal>

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title="Edit Data Warga"
        subtitle={edit ? `${edit.row.email} · perubahan rumah memerlukan verifikasi ulang` : ""}
        footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Batal</Button><Button type="submit" form="edit-warga" disabled={busy === edit?.row.user_id}>Simpan</Button></>}
      >
        {edit && (
          <form id="edit-warga" onSubmit={saveEdit} className="space-y-4">
            <RegistrationFields value={edit.form} onChange={(form) => setEdit({ ...edit, form })} />
            {editErr && <p className="rounded-xl bg-maroon-50 px-3.5 py-2.5 text-sm text-maroon-700">{editErr}</p>}
          </form>
        )}
      </Modal>
    </>
  );
}
