"use client";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { Button, PageHeader } from "@/components/ui";
import { relationLabel } from "@/components/warga/registration";

type Request = { id: string; user_id: string; house_id: string; relation: keyof typeof relationLabel; note: string | null; status: string; created_at: string; review_note: string | null };
type Person = { user_id: string; full_name: string; blok_rumah: string; status: string };
type House = { id: string; label: string | null; blok: string; nomor: number };
export default function Page() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    const sb = getSupabase();
    const [r, p, h] = await Promise.all([sb.from("house_move_requests").select("id,user_id,house_id,relation,note,status,created_at,review_note").order("created_at", { ascending: false }), sb.rpc("admin_list_warga"), sb.from("houses").select("id,label,blok,nomor").order("blok").order("nomor")]);
    if (r.error || p.error || h.error) setError("Gagal memuat pengajuan. Coba lagi.");
    else { setRequests(r.data as Request[]); setPeople(p.data as Person[]); setHouses(h.data as House[]); }
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const review = async (id: string, approve: boolean) => {
    const note = prompt(approve ? "Catatan persetujuan (opsional):" : "Alasan penolakan:");
    if (note === null) return;
    if (!approve && !note.trim()) { setError("Isi alasan penolakan agar warga memahami keputusan."); return; }
    setBusy(true);
    const { error } = await getSupabase().rpc("review_house_move", { p_id: id, p_approve: approve, p_note: note });
    if (error) setError(error.message); else await load();
    setBusy(false);
  };
  return <><PageHeader eyebrow="Data Lingkungan" title="Pengajuan Perubahan Rumah" description="Periksa hubungan warga dan rumah tujuan sebelum menyetujui." action={<Button variant="outline" onClick={() => void load()}>Muat ulang</Button>} />
    {error && <p role="alert" className="mb-4 rounded-xl bg-maroon-50 p-3 text-sm text-maroon-700">{error}</p>}
    {loading ? <p role="status">Memuat…</p> : requests.length === 0 ? <p className="card p-6 text-sm">Belum ada pengajuan.</p> : <div className="space-y-3">{requests.map((r) => { const person = people.find((p) => p.user_id === r.user_id); const house = houses.find((h) => h.id === r.house_id); return <article key={r.id} className="card p-5"><div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold">{person?.full_name ?? "Akun tidak tersedia"}</h2><span className="text-xs font-semibold text-maroon-700">{r.status === "pending" ? "Menunggu" : r.status === "approved" ? "Disetujui" : "Ditolak"}</span></div><p className="mt-2 text-sm text-concrete-600">Rumah saat ini: {person?.blok_rumah ?? "-"} · Tujuan: {house ? house.label || `${house.blok}-${house.nomor}` : r.house_id} · {relationLabel[r.relation]}</p>{r.note && <p className="mt-2 text-sm">Keterangan warga: {r.note}</p>}{r.review_note && <p className="mt-2 text-sm">Catatan: {r.review_note}</p>}{r.status === "pending" && <div className="mt-4 flex gap-2"><Button size="sm" variant="secondary" disabled={busy} onClick={() => void review(r.id, true)}>Setujui</Button><Button size="sm" variant="danger" disabled={busy} onClick={() => void review(r.id, false)}>Tolak</Button></div>}</article>; })}</div>}
  </>;
}
