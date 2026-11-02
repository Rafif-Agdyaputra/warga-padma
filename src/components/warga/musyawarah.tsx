"use client";
import { useCallback, useEffect, useState } from "react";
import { Button, Field, Input, PageHeader, Textarea } from "@/components/ui";
import { getSupabase } from "@/lib/supabase/client";
import { useStore } from "@/lib/store";
import { useRequireLogin } from "./auth";

type Proposal = { id: string; title: string; content: string; status: string; mine: boolean; created_at: string };
type Poll = { id: string; title: string; description: string; options: string[]; closes_at: string; published: boolean };
type Result = { option_index: number; total: number; mine: boolean };
export function MusyawarahView() {
 const [proposals,setProposals] = useState<Proposal[]>([]), [polls,setPolls] = useState<Poll[]>([]);
 const [title,setTitle] = useState(""), [content,setContent] = useState("");
 const [loading,setLoading] = useState(true), [busy,setBusy] = useState(false), [error,setError] = useState(""), [message,setMessage] = useState("");
 const requireLogin = useRequireLogin();
 const { user } = useStore();
 const load = useCallback(async () => {
  setLoading(true); setError("");
  const sb = getSupabase();
  const [u,p] = await Promise.all([sb.rpc("daftar_usulan"),sb.from("jajak_pendapat").select("id,title,description,options,closes_at,published").eq("published",true).order("created_at",{ascending:false}).limit(100)]);
  if (u.error || p.error) setError("Data tidak dapat dimuat. Silakan coba lagi."); else { setProposals(u.data as Proposal[]); setPolls(p.data as Poll[]); }
  setLoading(false);
 }, []);
 useEffect(() => { void load(); }, [load, user]);
 const submit = async () => {
  if (title.trim().length < 3 || content.trim().length < 10) { setError("Judul minimal 3 karakter dan isi minimal 10 karakter."); return; }
  setBusy(true); setError(""); setMessage("");
  const sb = getSupabase(); const { data: { user } } = await sb.auth.getUser();
  if (!user) { setBusy(false); setError("Sesi berakhir, silakan masuk lagi."); return; }
  const { error } = await sb.from("usulan_warga").insert({ user_id: user.id, title: title.trim(), content: content.trim() });
  setBusy(false); if (error) setError("Usulan gagal dikirim. Periksa koneksi dan status akun Anda."); else { setTitle(""); setContent(""); await load(); setMessage("Usulan dikirim untuk ditinjau pengurus."); }
 };
 return <><PageHeader eyebrow="Suara Warga" title="Usulan & Jajak Pendapat" description="Sampaikan ide dan ikuti jajak pendapat lingkungan." />
  {error && <p role="alert" className="mb-4 rounded-xl bg-maroon-50 p-3 text-sm text-maroon-700">{error} <button className="underline" onClick={() => void load()}>Muat ulang</button></p>}{message && <p role="status" className="mb-4 rounded-xl bg-sage-50 p-3 text-sm text-sage-700">{message}</p>}
  <form className="card mb-6 space-y-3 p-5" onSubmit={(e) => { e.preventDefault(); requireLogin(() => void submit(), "Masuk untuk mengirim usulan"); }}><h2 className="font-semibold">Kirim usulan</h2><p className="text-sm text-concrete-600">Pengurus meninjau usulan sebelum ditampilkan. Jangan mencantumkan informasi pribadi yang tidak ingin dipublikasikan.</p><Field label="Judul"><Input required minLength={3} maxLength={150} value={title} onChange={(e) => setTitle(e.target.value)} /></Field><Field label="Isi usulan"><Textarea required minLength={10} maxLength={3000} value={content} onChange={(e) => setContent(e.target.value)} /></Field><Button type="submit" disabled={busy}>Kirim usulan</Button></form>
  {loading ? <p role="status">Memuat…</p> : <><section className="mb-6"><h2 className="mb-3 text-lg font-semibold">Jajak pendapat</h2>{polls.length ? <div className="grid gap-3 lg:grid-cols-2">{polls.map((p) => <PollCard key={p.id} poll={p} />)}</div> : <p className="card p-5 text-sm text-concrete-500">Belum ada jajak pendapat.</p>}</section>
  <section><h2 className="mb-3 text-lg font-semibold">Usulan warga</h2><p className="mb-3 text-xs text-concrete-500">Menampilkan hingga 200 usulan terbaru yang tayang atau milik Anda.</p>{proposals.length ? <div className="space-y-3">{proposals.map((p) => <article key={p.id} className="card p-5"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{p.title}</h3>{p.mine && <span className="text-xs text-maroon-700">Usulan saya · {p.status === "draft" ? "Menunggu tinjauan" : p.status === "rejected" ? "Ditolak" : "Tayang"}</span>}</div><p className="mt-2 whitespace-pre-wrap break-words text-sm text-concrete-600">{p.content}</p></article>)}</div> : <p className="card p-5 text-sm text-concrete-500">Belum ada usulan.</p>}</section></>}
 </>;
}
function PollCard({ poll }: { poll: Poll }) {
 const [results,setResults] = useState<Result[]>([]), [selected,setSelected] = useState<number | null>(null);
 const [loading,setLoading] = useState(true), [busy,setBusy] = useState(false), [error,setError] = useState("");
 const requireLogin = useRequireLogin();
 const { user } = useStore();
 const load = useCallback(async () => { setLoading(true); const {data,error} = await getSupabase().rpc("hasil_jajak",{p_poll_id:poll.id}); if (error) setError("Hasil gagal dimuat."); else {setResults(data as Result[]); setError("");} setLoading(false); },[poll.id]);
 useEffect(() => { void load(); },[load, user]);
 const voted = results.some((r) => r.mine), closed = new Date(poll.closes_at).getTime() <= Date.now();
 const send = async () => { if (selected === null) return; setBusy(true); const {error} = await getSupabase().rpc("kirim_suara",{p_poll_id:poll.id,p_option:selected}); setBusy(false); if (error) { await load(); setError(error.message); } else await load(); };
 return <article className="card p-5"><h3 className="font-semibold">{poll.title}</h3>{poll.description && <p className="mt-1 whitespace-pre-wrap text-sm text-concrete-600">{poll.description}</p>}<p className="mt-2 text-xs text-concrete-500">Tutup: {new Intl.DateTimeFormat("id-ID",{dateStyle:"long",timeStyle:"short",timeZone:"Asia/Jakarta"}).format(new Date(poll.closes_at))} WIB · {closed ? "Ditutup" : "Terbuka"}</p><p className="mt-1 text-xs text-concrete-500">Satu suara per akun terverifikasi; pilihan tidak dapat diubah. Hasil bersifat agregat dan bukan pemungutan suara rahasia formal.</p>
  {error && <p role="alert" className="mt-2 text-sm text-maroon-700">{error} <button className="underline" onClick={() => void load()}>Coba lagi</button></p>}{loading ? <p className="mt-3 text-sm">Memuat hasil…</p> : <><div className="mt-3 space-y-2">{poll.options.map((option,i) => { const r = results.find((x) => x.option_index === i); return <label key={i} className="flex items-start gap-2 rounded-xl bg-concrete-50 p-3 text-sm"><input type="radio" name={`poll-${poll.id}`} checked={selected === i} disabled={closed || voted || busy} onChange={() => setSelected(i)} /><span className="min-w-0 flex-1 break-words">{option}{r?.mine && " (pilihan Anda)"}</span><span className="shrink-0 text-concrete-500">{r?.total ?? 0} suara</span></label>; })}</div>{!closed && !voted && <Button className="mt-3" size="sm" disabled={busy || selected === null} onClick={() => requireLogin(() => void send(), "Masuk untuk mengikuti jajak pendapat")}>Kirim suara</Button>}{voted && <p className="mt-3 text-sm text-sage-600">Suara Anda sudah tercatat.</p>}</>}
 </article>;
}
