import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function authorized(value: string | null, secret: string) {
  const actual = Buffer.from(value ?? ""); const expected = Buffer.from(`Bearer ${secret}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
function allowedEndpoint(endpoint: string) {
  try { const u = new URL(endpoint); return u.protocol === "https:" && (u.hostname === "fcm.googleapis.com" || u.hostname === "updates.push.services.mozilla.com" || u.hostname.endsWith(".push.apple.com")); } catch { return false; }
}
export async function GET(request: Request) {
  const secret = process.env.PUSH_CRON_SECRET;
  if (!secret || !authorized(request.headers.get("authorization"), secret)) return new Response("Unauthorized", { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, privateKey = process.env.VAPID_PRIVATE_KEY, subject = process.env.VAPID_SUBJECT;
  if (!url || !key || !publicKey || !privateKey || !subject) return new Response("Push configuration missing", { status: 503 });
  webpush.setVapidDetails(subject, publicKey, privateKey);
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data: jobs, error } = await db.rpc("claim_push_queue");
  if (error) return new Response("Queue unavailable", { status: 500 });
  let failed = 0;
  for (const job of jobs ?? []) {
    let ok = true;
    const { data: notification, error: nError } = await db.from("notifikasi").select("user_id,target,read_at").eq("id", job.notification_id).maybeSingle();
    if (nError) ok = false;
    if (notification && !notification.read_at && ok) {
      const { data: subscriptions, error: sError } = await db.from("push_subscriptions").select("id,endpoint,p256dh,auth_key").eq("user_id", notification.user_id);
      if (sError) ok = false;
      for (const sub of subscriptions ?? []) {
        if (!allowedEndpoint(sub.endpoint)) { ok = false; continue; }
        try { await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } }, JSON.stringify({ target: notification.target }), { TTL: 86400 }); }
        catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) { const { error } = await db.from("push_subscriptions").delete().eq("id", sub.id); if (error) ok = false; }
          else ok = false;
        }
      }
    }
    if (!ok) failed++;
    const { error: updateError } = await db.from("push_queue").update({ status: ok ? "done" : "pending", locked_at: null }).eq("id", job.id);
    if (updateError) failed++;
  }
  return Response.json({ processed: jobs?.length ?? 0, failed }, { status: failed ? 500 : 200 });
}
