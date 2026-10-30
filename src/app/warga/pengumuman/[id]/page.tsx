import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { tanggal } from "@/lib/utils";
import { ShareWhatsApp } from "@/components/warga/share-whatsapp";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const sb = await createSupabaseServer();
  const { data, error } = await sb.from("pengumuman").select("id,title,content,category,date,author").eq("id", id).eq("status", "published").maybeSingle();
  if (error || !data) notFound();
  return <article className="card mx-auto max-w-3xl p-6 md:p-8"><Link href="/warga/pengumuman" className="text-sm font-semibold text-maroon-700 underline">← Semua pengumuman</Link><p className="mt-6 text-xs font-semibold text-maroon-700">{data.category} · {tanggal(data.date)}</p><h1 className="mt-2 text-2xl font-semibold">{data.title}</h1><p className="mt-5 whitespace-pre-line leading-relaxed text-concrete-700">{data.content}</p><p className="mt-5 text-sm text-concrete-500">Diterbitkan oleh {data.author}</p><div className="mt-6"><ShareWhatsApp title={data.title} path={`/warga/pengumuman/${data.id}`} /></div></article>;
}
