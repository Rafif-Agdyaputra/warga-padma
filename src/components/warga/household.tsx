"use client";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { useStore } from "@/lib/store";
import { Button, Field, Select, Textarea } from "@/components/ui";
import { relationLabel } from "./registration";

type History = { id: number; house_label: string; relation: keyof typeof relationLabel; started_at: string; ended_at: string | null };
type Request = { id: string; house_id: string; relation: keyof typeof relationLabel; status: string; review_note: string | null; created_at: string };
type Member = { full_name: string; relation: keyof typeof relationLabel };
export function Household() {
  const { user, profile, data } = useStore();
  const [history, setHistory] = useState<History[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [shared, setShared] = useState(false);
  const [mapShared, setMapShared] = useState(false);
  const [house, setHouse] = useState("");
  const [relation, setRelation] = useState("keluarga");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError("");
    const sb = getSupabase();
    const [h, r, m, p] = await Promise.all([
      sb.from("house_membership_history").select("id,house_label,relation,started_at,ended_at").eq("user_id", user.id).order("started_at", { ascending: false }),
      sb.from("house_move_requests").select("id,house_id,relation,status,review_note,created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
      sb.rpc("my_household"), sb.from("warga_profiles").select("share_household,share_denah").eq("user_id", user.id).single(),
    ]);
    if ([h,r,m,p].some((x) => x.error)) setError("Data rumah tidak dapat dimuat. Coba lagi.");
    else { setHistory(h.data as History[]); setRequests(r.data as Request[]); setMembers(m.data as Member[]); setShared(!!p.data?.share_household); setMapShared(!!p.data?.share_denah); }
    setLoading(false);
  }, [user]);
  useEffect(() => { void load(); }, [load]);
  if (profile?.status !== "approved") return null;
  const pending = requests.find((r) => r.status === "pending");
  return <section className="card space-y-4 p-6"><h2 className="text-lg font-semibold">Penghuni dan rumah</h2>
    {loading && <p role="status" className="text-sm">Memuat data rumah…</p>}
    {error && <p role="alert" className="text-sm text-maroon-700">{error} <button className="underline" onClick={() => void load()}>Coba lagi</button></p>}
    {!loading && !error && <>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={shared} disabled={busy} onChange={async (e) => { setBusy(true); const value = e.target.checked; const { error } = await getSupabase().rpc("set_household_sharing", { p_share: value }); if (error) setError("Pilihan privasi gagal disimpan."); else setShared(value); setBusy(false); }} /> Izinkan nama dan hubungan saya dilihat oleh warga terverifikasi di rumah yang sama.</label>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={mapShared} disabled={busy} onChange={async (e) => { setBusy(true); const value = e.target.checked; const { error } = await getSupabase().rpc("set_denah_sharing", { p_share: value }); if (error) setError("Pilihan denah gagal disimpan."); else setMapShared(value); setBusy(false); }} /> Izinkan nama dan nomor HP saya ditampilkan pada denah kepada semua warga terverifikasi jika saya terdaftar sebagai pemilik rumah.</label>
      <div><h3 className="font-semibold">Anggota rumah yang berbagi profil</h3>{members.length ? <ul className="mt-2 space-y-1 text-sm text-concrete-600">{members.map((m, i) => <li key={i}>{m.full_name} · {relationLabel[m.relation]}</li>)}</ul> : <p className="mt-1 text-sm text-concrete-500">Belum ada anggota lain yang membagikan profil.</p>}</div>
      <div><h3 className="font-semibold">Riwayat rumah</h3><p className="text-xs text-concrete-500">Riwayat dimulai saat fitur ini diaktifkan.</p>{history.length ? <ul className="mt-2 space-y-1 text-sm text-concrete-600">{history.map((h) => <li key={h.id}>{h.house_label} · {relationLabel[h.relation]} · {new Date(h.started_at).toLocaleDateString("id-ID")} {h.ended_at ? `– ${new Date(h.ended_at).toLocaleDateString("id-ID")}` : "– sekarang"}</li>)}</ul> : <p className="text-sm text-concrete-500">Belum ada riwayat.</p>}</div>
      {pending ? <p className="rounded-xl bg-amber-50 p-3 text-sm">Pengajuan perubahan rumah sedang ditinjau pengurus.</p> : <form className="space-y-3 border-t border-concrete-100 pt-4" onSubmit={async (e) => { e.preventDefault(); setBusy(true); const { error } = await getSupabase().rpc("request_house_move", { p_house_id: house, p_relation: relation, p_note: note }); setBusy(false); if (error) setError(error.message); else { setHouse(""); setNote(""); await load(); } }}><h3 className="font-semibold">Ajukan perubahan rumah atau hubungan</h3><p className="text-xs text-concrete-500">Pengurus akan memverifikasi pengajuan Anda.</p><Field label="Rumah tujuan"><Select required value={house} onChange={(e) => setHouse(e.target.value)}><option value="">Pilih rumah</option>{data.houses.map((h) => <option key={h.id} value={h.id}>{h.label || `${h.blok}-${h.nomor}`}</option>)}</Select></Field><Field label="Hubungan dengan rumah"><Select value={relation} onChange={(e) => setRelation(e.target.value)}>{Object.entries(relationLabel).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</Select></Field><Field label="Keterangan (opsional)"><Textarea maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} /></Field><Button type="submit" disabled={busy}>Kirim pengajuan</Button></form>}
      {requests.length > 0 && <div><h3 className="font-semibold">Pengajuan terakhir</h3><p className="mt-1 text-sm text-concrete-600">{requests[0].status === "approved" ? "Disetujui" : requests[0].status === "rejected" ? "Ditolak" : "Menunggu"}{requests[0].review_note && ` · ${requests[0].review_note}`}</p></div>}
    </>}
  </section>;
}
