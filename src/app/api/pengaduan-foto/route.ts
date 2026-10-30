import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get("path") ?? "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f-]+\.jpg$/.test(path)) {
    return new Response(null, { status: 404 });
  }
  const supabase = await createSupabaseServer();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return new Response(null, { status: 401, headers: { "Cache-Control": "private, no-store" } });
  const { data, error } = await supabase.storage.from("pengaduan-private").download(path);
  if (error || !data) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  return new Response(data, { headers: { "Content-Type": data.type || "image/jpeg", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
