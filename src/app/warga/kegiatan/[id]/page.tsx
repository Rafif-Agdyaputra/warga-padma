import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { tanggal } from "@/lib/utils";
import { ShareWhatsApp } from "@/components/warga/share-whatsapp";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const sb = await createSupabaseServer();
  const { data, error } = await sb.from("kegiatan").select("id,title,description,date,location,author").eq("id", id).eq("status", "published").maybeSingle();
  if (error || !data) notFound();
  return <article className="card mx-auto max-w-3xl p-6 md:p-8"><Link href="/warga/kegiatan" className="text-sm font-semibold text-maroon-700 underline">← Semua kegiatan</Link><p className="mt-6 text-xs font-semibold text-maroon-700">{tanggal(data.date)} · {data.location}</p><h1 className="mt-2 text-2xl font-semibold">{data.title}</h1><p className="mt-5 whitespace-pre-line leading-relaxed text-concrete-700">{data.description}</p><p className="mt-5 text-sm text-concrete-500">Diunggah oleh {data.author}</p><div className="mt-6"><ShareWhatsApp title={data.title} path={`/warga/kegiatan/${data.id}`} /></div></article>;
}
