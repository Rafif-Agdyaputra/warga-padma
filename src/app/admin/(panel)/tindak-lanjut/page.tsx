"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, RefreshCw } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { Button, Field, Input, Modal, PageHeader, Select, Textarea } from "@/components/ui";

type Progress = "diterima" | "diproses" | "selesai";
type Complaint = { id: string; title: string; category: string; reporter: string; blok_rumah: string; status: string; progress: Progress; response: string | null; created_at: string };
type Assignment = { pengaduan_id: string; penanggung_jawab: string; catatan_internal: string };
const labels: Record<Progress, string> = { diterima: "Diterima", diproses: "Diproses", selesai: "Selesai" };
const PAGE = 20;

export default function FollowUpPage() {
  const [rows, setRows] = useState<Complaint[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("aktif");
  const [search, setSearch] = useState("");
  const [age, setAge] = useState("all");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Complaint | null>(null);
  const [person, setPerson] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const sb = getSupabase();
      const complaints: Complaint[] = [], followUps: Assignment[] = [];
      for (let start = 0; ; start += 100) {
        const { data, error } = await sb.from("pengaduan").select("id,title,category,reporter,blok_rumah,status,progress,response,created_at").order("created_at", { ascending: false }).order("id").range(start, start + 99);
        if (error) throw error;
        complaints.push(...(data ?? []) as Complaint[]);
        if ((data?.length ?? 0) < 100) break;
      }
      for (let start = 0; ; start += 100) {
        const { data, error } = await sb.from("pengaduan_tindak_lanjut").select("pengaduan_id,penanggung_jawab,catatan_internal").order("pengaduan_id").range(start, start + 99);
        if (error) throw error;
        followUps.push(...(data ?? []) as Assignment[]);
        if ((data?.length ?? 0) < 100) break;
      }
      setRows(complaints); setAssignments(followUps);
    } catch { setError("Data pengaduan tidak dapat dimuat. Periksa koneksi dan coba lagi."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const byId = useMemo(() => new Map(assignments.map((a) => [a.pengaduan_id, a])), [assignments]);
  const active = rows.filter((r) => r.status !== "rejected");
  const older = (r: Complaint) => r.progress !== "selesai" && Date.now() - new Date(r.created_at).getTime() >= 7 * 86400000;
  const filtered = active.filter((r) => (progress === "aktif" ? r.progress !== "selesai" : progress === "all" || r.progress === progress) && (age === "all" || older(r)) && `${r.title} ${r.reporter} ${r.blok_rumah} ${r.category} ${byId.get(r.id)?.penanggung_jawab ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const currentPage = Math.min(page, pages - 1);
  const select = (r: Complaint) => { setEditing(r); const a = byId.get(r.id); setPerson(a?.penanggung_jawab ?? ""); setNote(a?.catatan_internal ?? ""); };
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editing) return;
    setBusy(true); setError("");
    const sb = getSupabase();
    const { data: auth, error: authError } = await sb.auth.getUser();
    if (authError || !auth.user) { setBusy(false); setError("Sesi berakhir. Silakan masuk kembali."); return; }
    const { error } = await sb.from("pengaduan_tindak_lanjut").upsert({ pengaduan_id: editing.id, penanggung_jawab: person.trim(), catatan_internal: note.trim(), updated_at: new Date().toISOString(), updated_by: auth.user.id });
    setBusy(false);
    if (error) { setError("Penugasan gagal disimpan. Coba lagi."); return; }
    setEditing(null); await load();
  };
  return <><PageHeader eyebrow="Layanan Warga" title="Tindak Lanjut Pengaduan" description="Pantau penanganan dan penugasan pengaduan. Laporan ditolak tidak termasuk dalam ringkasan." action={<Button variant="outline" icon={RefreshCw} onClick={() => void load()}>Muat ulang</Button>} />
    {error && <div role="alert" className="mb-4 rounded-xl bg-maroon-50 p-4 text-sm text-maroon-700">{error} <button className="underline" onClick={() => void load()}>Coba lagi</button></div>}
    {loading ? <p role="status">Memuat pengaduan…</p> : <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[{ label: "Belum selesai", value: active.filter((r) => r.progress !== "selesai").length }, { label: "Diproses", value: active.filter((r) => r.progress === "diproses").length }, { label: "Selesai", value: active.filter((r) => r.progress === "selesai").length }, { label: "Belum selesai ≥ 7 hari", value: active.filter(older).length }].map((v) => <div className="card p-4" key={v.label}><p className="text-xs text-concrete-500">{v.label}</p><p className="mt-2 text-2xl font-semibold">{v.value}</p></div>)}</div>
      <p className="mt-3 text-xs text-concrete-500">Usia dihitung sejak laporan dibuat, bukan sejak pembaruan terakhir. Draft yang belum ditolak juga dihitung.</p>
      <div className="card mt-5 p-4"><div className="grid gap-3 md:grid-cols-3"><Field label="Progres"><Select value={progress} onChange={(e) => { setProgress(e.target.value); setPage(0); }}><option value="aktif">Belum selesai</option><option value="all">Semua progres</option>{Object.entries(labels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</Select></Field><Field label="Usia laporan"><Select value={age} onChange={(e) => { setAge(e.target.value); setPage(0); }}><option value="all">Semua usia</option><option value="old">Belum selesai ≥ 7 hari</option></Select></Field><Field label="Cari laporan atau penanggung jawab"><Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Judul, nama, lokasi…" /></Field></div></div>
      {filtered.length === 0 ? <div className="card mt-4 p-8 text-center text-sm text-concrete-500"><ClipboardList className="mx-auto mb-2 size-6" />Tidak ada pengaduan yang cocok.</div> : <div className="mt-4 space-y-3">{filtered.slice(currentPage * PAGE, (currentPage + 1) * PAGE).map((r) => { const a = byId.get(r.id); const days = Math.max(0, Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000)); return <article className="card p-4 md:p-5" key={r.id}><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-semibold text-maroon-700">{r.category} · {labels[r.progress]} · {r.status === "draft" ? "Menunggu moderasi" : "Tayang"}</p><h2 className="mt-1 font-semibold">{r.title}</h2><p className="mt-1 text-sm text-concrete-600">{r.reporter} · {r.blok_rumah} · {days} hari sejak dibuat</p><p className="mt-1 text-sm text-concrete-600">Penanggung jawab: {a?.penanggung_jawab || "Belum ditetapkan"}</p>{older(r) && <p className="mt-2 text-xs font-semibold text-amber-600">Belum selesai selama 7 hari atau lebih</p>}</div><Button size="sm" variant="outline" onClick={() => select(r)}>Atur tindak lanjut</Button></div></article>; })}</div>}
      {pages > 1 && <div className="mt-4 flex items-center justify-center gap-3"><Button size="sm" variant="outline" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Sebelumnya</Button><span className="text-sm">{currentPage + 1} / {pages}</span><Button size="sm" variant="outline" disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}>Berikutnya</Button></div>}
    </>}
    <Modal open={!!editing} onClose={() => setEditing(null)} title="Penugasan pengaduan" subtitle={editing?.title} footer={<><Button variant="ghost" onClick={() => setEditing(null)}>Batal</Button><Button type="submit" form="follow-up" disabled={busy}>Simpan</Button></>}><form id="follow-up" onSubmit={save} className="space-y-4"><Field label="Penanggung jawab" hint="Nama petugas atau bagian yang menangani."><Input maxLength={100} value={person} onChange={(e) => setPerson(e.target.value)} /></Field><Field label="Catatan internal" hint="Hanya dapat dilihat admin; tidak dikirim kepada pelapor."><Textarea maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} /></Field><p className="text-sm text-concrete-500">Untuk mengubah progres atau tanggapan yang terlihat warga, <Link href="/admin/pengaduan" className="font-semibold text-maroon-700 underline">buka menu Pengaduan</Link> dan edit laporan tersebut.</p>{error && <p role="alert" className="text-sm text-maroon-700">{error}</p>}</form></Modal>
  </>;
}
