"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, Download, Trash2 } from "lucide-react";
import { Button, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { useStore } from "@/lib/store";
import { useLoginPrompt } from "./auth";
import { getSupabase } from "@/lib/supabase/client";

type Document = { id: string; title: string; description: string; category: string; file_path: string; created_at: string };
const categories = ["Peraturan", "Jadwal", "Formulir", "Lainnya"];

export function DokumenView({ admin = false }: { admin?: boolean }) {
  const { user } = useStore();
  const login = useLoginPrompt();
  const [items, setItems] = useState<Document[]>([]);
  const [limit, setLimit] = useState(30);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const load = useCallback(async () => {
    if (!user) { setItems([]); setLoading(false); return; }
    setLoading(true); setError("");
    const { data, error } = await getSupabase().from("dokumen_warga").select("id,title,description,category,file_path,created_at").order("created_at", { ascending: false }).order("id").range(0, limit);
    if (error) setError("Dokumen tidak dapat dimuat. Periksa koneksi dan coba lagi.");
    else { setItems((data ?? []).slice(0, limit) as Document[]); setMore((data?.length ?? 0) > limit); }
    setLoading(false);
  }, [limit, user]);
  useEffect(() => { void load(); }, [load]);
  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || file.type !== "application/pdf" || file.size > 10485760) { setError("Pilih berkas PDF dengan ukuran maksimal 10 MB."); return; }
    setBusy(true); setError("");
    const sb = getSupabase();
    const path = `${crypto.randomUUID()}.pdf`;
    const { error: uploadError } = await sb.storage.from("dokumen-warga").upload(path, file, { contentType: "application/pdf" });
    if (uploadError) { setError("Berkas gagal diunggah. Periksa koneksi dan coba lagi."); setBusy(false); return; }
    const { error: insertError } = await sb.from("dokumen_warga").insert({ title: title.trim(), description: description.trim(), category, file_path: path });
    if (insertError) {
      const { error: cleanupError } = await sb.storage.from("dokumen-warga").remove([path]);
      setError(cleanupError ? "Data gagal disimpan dan berkas belum dapat dibersihkan. Periksa Storage." : "Data gagal disimpan. Coba lagi.");
    } else { setTitle(""); setDescription(""); setFile(null); setFileKey((n) => n + 1); await load(); }
    setBusy(false);
  };
  const remove = async (doc: Document) => {
    if (!confirm(`Hapus dokumen “${doc.title}”?`)) return;
    setBusy(true); setError("");
    const sb = getSupabase();
    const { data: deleted, error: deleteError } = await sb.from("dokumen_warga").delete().eq("id", doc.id).select("id");
    if (deleteError || !deleted?.length) setError("Dokumen tidak dapat dihapus. Coba lagi.");
    else {
      const { error: storageError } = await sb.storage.from("dokumen-warga").remove([doc.file_path]);
      await load();
      if (storageError) setError("Daftar dokumen telah dihapus, tetapi berkas masih perlu dihapus dari Storage.");
    }
    setBusy(false);
  };
  return <><PageHeader eyebrow={admin ? "Pengelolaan" : "Informasi Warga"} title="Dokumen Warga" description="Peraturan lingkungan, jadwal, formulir, dan dokumen lainnya." />
    {!user ? <div className="card p-6 text-center"><p className="font-semibold">Masuk untuk melihat dokumen warga</p><Button className="mt-4" onClick={() => login("Masuk untuk melihat dokumen warga")}>Masuk</Button></div> : <>
    {admin && <form onSubmit={upload} className="card mb-6 space-y-4 p-5"><h2 className="font-semibold">Unggah dokumen</h2><p className="text-sm text-concrete-600">Dokumen dapat diakses semua pengguna yang telah masuk. Hindari mengunggah data pribadi atau dokumen rahasia.</p><Field label="Judul"><Input required maxLength={150} value={title} onChange={(e) => setTitle(e.target.value)} /></Field><Field label="Kategori"><Select value={category} onChange={(e) => setCategory(e.target.value)}>{categories.map((c) => <option key={c}>{c}</option>)}</Select></Field><Field label="Keterangan (opsional)"><Textarea maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} /></Field><Field label="Berkas PDF (maksimal 10 MB)"><input key={fileKey} className="block w-full text-sm" type="file" accept="application/pdf,.pdf" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field><Button disabled={busy || !title.trim()} type="submit">{busy ? "Memproses…" : "Unggah"}</Button></form>}
    {error && <div role="alert" className="mb-4 rounded-xl bg-maroon-50 p-4 text-sm text-maroon-700">{error} <button className="font-semibold underline" onClick={() => void load()}>Muat ulang daftar</button></div>}
    {loading ? <p role="status" className="p-5 text-sm text-concrete-500">Memuat dokumen…</p> : !error && items.length === 0 ? <div className="card p-8 text-center text-sm text-concrete-500">Belum ada dokumen.</div> : <div className="grid gap-3 md:grid-cols-2">{items.map((doc) => <article key={doc.id} className="card flex min-w-0 gap-3 p-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-maroon-50 text-maroon-700"><FileText className="size-5" /></span><div className="min-w-0 flex-1"><span className="text-xs font-semibold text-maroon-700">{doc.category}</span><h2 className="break-words font-semibold">{doc.title}</h2>{doc.description && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-concrete-600">{doc.description}</p>}<div className="mt-3 flex flex-wrap gap-4 text-sm font-semibold"><a href={`/api/dokumen/${doc.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-maroon-700 underline"><Download className="size-4" /> Buka PDF</a>{admin && <button type="button" disabled={busy} onClick={() => void remove(doc)} className="inline-flex items-center gap-1 text-concrete-600 underline disabled:opacity-50"><Trash2 className="size-4" /> Hapus</button>}</div></div></article>)}</div>}
    {more && <Button variant="outline" className="mt-4" disabled={loading} onClick={() => setLimit((n) => n + 30)}>Muat lebih banyak</Button>}
    </>}
  </>;
}
