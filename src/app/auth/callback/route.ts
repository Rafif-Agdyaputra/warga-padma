import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

// tujuan link magic email: tukar code jadi sesi lalu kembali ke halaman asal
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/warga";
  const target = next.startsWith("/") && !next.startsWith("//") ? next : "/warga";

  if (code) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${target}`);
  }
  return NextResponse.redirect(`${origin}/warga?login=gagal`);
}
