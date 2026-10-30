import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return new Response(null, { status: 404, headers });
  const sb = await createSupabaseServer();
  const { data: { user }, error: authError } = await sb.auth.getUser();
  if (authError || !user) return new Response(null, { status: 401, headers });
  const { data: doc, error } = await sb.from("dokumen_warga").select("file_path").eq("id", id).maybeSingle();
  if (error || !doc) return new Response(null, { status: 404, headers });
  const { data: file, error: fileError } = await sb.storage.from("dokumen-warga").download(doc.file_path);
  if (fileError || !file) return new Response(null, { status: 404, headers });
  return new Response(file, { headers: { ...headers, "Content-Type": "application/pdf", "Content-Disposition": "inline" } });
}
