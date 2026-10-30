// Jalankan tanpa --apply untuk audit; lihat README sebelum memindahkan foto lama.
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi.");
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const apply = process.argv.includes("--apply");
const origin = new URL(url).origin;
const prefix = "/storage/v1/object/public/uploads/";
const rows = [];
for (let offset = 0; ; offset += 500) {
  const { data, error } = await client.from("pengaduan").select("id,user_id,image_url").not("image_url", "is", null).order("id").range(offset, offset + 499);
  if (error) throw error;
  rows.push(...data);
  if (data.length < 500) break;
}
let failures = 0;
for (const row of rows) {
  if (!/^https?:\/\//i.test(row.image_url)) continue;
  let old;
  try {
    const parsed = new URL(row.image_url);
    if (parsed.origin !== origin || !parsed.pathname.startsWith(prefix)) throw new Error("bukan URL bucket uploads proyek ini");
    old = decodeURIComponent(parsed.pathname.slice(prefix.length));
    if (!old || old.includes("..")) throw new Error("path tidak valid");
  } catch (error) {
    console.error(`Pengaduan ${row.id}: ${error.message}; perlu penanganan manual.`);
    failures++;
    continue;
  }
  console.log(`Pengaduan ${row.id}: ${apply ? "memindahkan salinan" : "perlu dipindahkan"}`);
  if (!apply) continue;
  const target = `${row.user_id ?? "00000000-0000-0000-0000-000000000000"}/${randomUUID()}.jpg`;
  try {
    const { data: blob, error: downloadError } = await client.storage.from("uploads").download(old);
    if (downloadError || !blob) throw downloadError ?? new Error("foto tidak ditemukan");
    const { error: uploadError } = await client.storage.from("pengaduan-private").upload(target, blob, { contentType: blob.type || "image/jpeg" });
    if (uploadError) throw uploadError;
    const { data: changed, error: updateError } = await client.from("pengaduan").update({ image_url: target }).eq("id", row.id).eq("image_url", row.image_url).select("id");
    if (updateError || !changed?.length) {
      await client.storage.from("pengaduan-private").remove([target]);
      throw updateError ?? new Error("laporan berubah selama migrasi; ulangi audit");
    }
    // Jangan hapus objek publik otomatis: mungkin masih dipakai konten lain.
    console.log(`Salinan privat tersimpan. Periksa dan hapus objek lama melalui Storage API bila tidak dipakai lagi: ${old}`);
  } catch (error) {
    failures++;
    console.error(`Pengaduan ${row.id}: ${error.message}`);
  }
}
console.log(`${apply ? "Migrasi" : "Audit"} selesai; ${failures} foto perlu penanganan manual.`);
if (failures) process.exitCode = 1;
