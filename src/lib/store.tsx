"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { getSupabase } from "./supabase/client";
import type { BusinessStatus, RegisterInput, StoreData, WargaProfile, WargaRelation } from "./types";
import { useToast } from "@/components/ui/toast";

type Collection = keyof StoreData;
type Item<K extends Collection> = StoreData[K][number];
type Row = Record<string, unknown>;

export interface AuthUser {
  id: string;
  email?: string;
}

interface StoreApi {
  data: StoreData;
  ready: boolean;
  pageLoading: boolean;
  loadedPage: string | null;
  pageError: string | null;
  hasMore: boolean;
  loadMore: () => void;
  retry: () => void;
  user: AuthUser | null;
  isAdmin: boolean;
  add: <K extends Collection>(key: K, item: Item<K>) => Promise<boolean>;
  update: <K extends Collection>(key: K, id: string, patch: Partial<Item<K>>) => Promise<boolean>;
  remove: <K extends Collection>(key: K, id: string) => Promise<boolean>;
  refresh: () => Promise<void>;
  setUmkmStatus: (id: string, status: BusinessStatus, note?: string) => Promise<boolean>;
  loginAdmin: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  // registrasi & verifikasi warga
  profile: WargaProfile | null;
  isVerified: boolean;
  pendingWarga: number;
  loginWarga: (email: string, password: string) => Promise<string | null>;
  registerWarga: (input: RegisterInput) => Promise<{ error: string | null; needsConfirm: boolean }>;
  submitRegistration: (input: { fullName: string; phone: string; houseId: string; relation: WargaRelation }) => Promise<string | null>;
  requestPasswordReset: (email: string) => Promise<string | null>;
  updatePassword: (password: string) => Promise<string | null>;
  refreshProfile: () => Promise<void>;
  setPendingWarga: (n: number) => void;
}

// pesan error auth supabase -> bahasa indonesia
export function authMessage(msg?: string) {
  if (!msg) return "Terjadi kesalahan, coba lagi.";
  if (/invalid login credentials/i.test(msg)) return "Email atau password salah, atau akun sudah tidak terdaftar.";
  if (/email not confirmed/i.test(msg)) return "Email belum diverifikasi. Buka link verifikasi di email Anda terlebih dahulu.";
  if (/already registered|already been registered|user already exists/i.test(msg)) return "Email ini sudah terdaftar. Silakan masuk atau gunakan Lupa password.";
  if (/password should be at least|weak password/i.test(msg)) return "Password terlalu lemah. Gunakan minimal 8 karakter, kombinasi huruf dan angka.";
  if (/rate limit|too many|security purposes/i.test(msg)) return "Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.";
  if (/same password|different from the old/i.test(msg)) return "Password baru harus berbeda dari password lama.";
  return msg;
}

const empty: StoreData = {
  houses: [], kegiatan: [], pengumuman: [], pengaduan: [], umkm: [],
  pengurus: [], kontak: [], transaksi: [], kebutuhan: [], mapItems: [], mapSettings: [],
};

// nama tabel di supabase untuk tiap koleksi
export const tableOf: Record<Collection, string> = {
  houses: "houses", kegiatan: "kegiatan", pengumuman: "pengumuman", pengaduan: "pengaduan", umkm: "umkm",
  pengurus: "pengurus", kontak: "kontak", transaksi: "transaksi", kebutuhan: "kebutuhan",
  mapItems: "map_items", mapSettings: "map_settings",
};

const PUBLIC_HOUSE_COLS = "id,blok,nomor,label,status,x,y,w,h,rotation";

// Halaman ringkasan dan denah memerlukan data lengkap untuk menghitung saldo dan menggambar peta.
const routes: Record<string, Collection[]> = {
  "/warga": ["houses", "mapItems", "mapSettings", "pengumuman", "kegiatan", "umkm", "pengurus", "kontak", "transaksi"],
  "/warga/denah": ["houses", "mapItems", "mapSettings"],
  "/warga/daftar": ["houses"], "/warga/akun": ["houses"],
  "/warga/kegiatan": ["kegiatan"], "/warga/pengumuman": ["pengumuman"],
  "/warga/pengaduan": ["pengaduan"], "/warga/umkm": ["umkm"],
  "/warga/pengurus": ["pengurus"], "/warga/kontak": ["kontak"],
  "/warga/keuangan": ["transaksi"], "/warga/transparansi": ["kebutuhan"],
  "/admin": ["houses", "kegiatan", "pengumuman", "pengaduan", "umkm", "transaksi"],
  "/admin/moderasi": ["kegiatan", "pengumuman", "pengaduan", "umkm"],
  "/admin/denah": ["houses", "mapItems", "mapSettings"],
  "/admin/rumah": ["houses"], "/admin/warga": ["houses"],
  "/admin/kegiatan": ["kegiatan"], "/admin/pengumuman": ["pengumuman"],
  "/admin/pengaduan": ["pengaduan"], "/admin/umkm": ["umkm"],
  "/admin/pengurus": ["pengurus"], "/admin/kontak": ["kontak"],
  "/admin/keuangan": ["transaksi"], "/admin/kebutuhan": ["kebutuhan"],
};
const pagedRoutes = new Set(["/warga/kegiatan", "/warga/pengumuman", "/warga/pengaduan", "/warga/umkm", "/warga/transparansi", "/admin/kegiatan", "/admin/pengumuman", "/admin/pengaduan", "/admin/umkm", "/admin/kebutuhan"]);
const PAGE_SIZE = 25;

// kolom yang tidak dikirim ke database
const skip = new Set(["id", "mine", "createdAt", "userId"]);
const toSnake = (k: string) => (k === "image" ? "image_url" : k.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase()));
const toCamel = (k: string) => (k === "image_url" ? "image" : k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()));

function toDb(obj: Row) {
  const out: Row = {};
  for (const [k, v] of Object.entries(obj)) {
    if (skip.has(k)) continue;
    const key = toSnake(k);
    // kolom time/date tidak menerima string kosong
    out[key] = v === undefined || (v === "" && /_time$|^date$|deadline/.test(key)) ? null : v;
  }
  return out;
}

function fromDb(row: Row, uid?: string | null) {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) out[toCamel(k)] = v === null ? undefined : v;
  if (uid && out.userId === uid) out.mine = true;
  for (const k of ["openTime", "closeTime"]) if (typeof out[k] === "string") out[k] = (out[k] as string).slice(0, 5);
  return out;
}

const Ctx = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const supabase = getSupabase();
  const toast = useToast();
  const [data, setData] = useState<StoreData>(empty);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authKnown, setAuthKnown] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<WargaProfile | null>(null);
  const [pendingWarga, setPendingWarga] = useState(0);
  const pathname = usePathname();
  const [loadedPage, setLoadedPage] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [retryCount, setRetryCount] = useState(0);
  const requestId = useRef(0);

  const fail = useCallback((msg: string, err?: { message?: string; code?: string; details?: string | null; hint?: string | null } | null) => {
    // error supabase tidak enumerable, jadi dicetak per field
    console.error(msg, { message: err?.message, code: err?.code, details: err?.details, hint: err?.hint });
    const detail = err?.code === "42501" || /row-level security/i.test(err?.message ?? "")
      ? "akses ditolak database (cek migrasi & login)"
      : err?.message;
    toast(detail ? `${msg}: ${detail}` : msg, "warning");
  }, [toast]);

  // Ambil hanya koleksi yang dibutuhkan halaman. Dataset yang dipakai untuk
  // perhitungan dimuat seluruhnya dalam batch agar tidak terpotong batas API.
  const load = useCallback(async (uid: string | null, admin: boolean, verified: boolean, path: string, pageLimit: number, id: number) => {
    const keys = routes[path] ?? [];
    const paged = pagedRoutes.has(path);
    const fetchRows = async (table: string, order: string, columns = "*", descending = false) => {
      const rows: Row[] = [];
      let more = false;
      for (let offset = 0; ; offset += PAGE_SIZE) {
        const size = paged ? Math.min(PAGE_SIZE, pageLimit - offset) : PAGE_SIZE;
        const { data: batch, error } = await supabase.from(table).select(columns)
          .order(order, { ascending: !descending }).order("id").range(offset, offset + size - 1);
        if (error) throw new Error(`${table}: ${error.message}`);
        rows.push(...(batch as unknown as Row[] ?? []));
        if ((batch?.length ?? 0) < size) break;
        if (paged && rows.length >= pageLimit) { more = true; break; }
      }
      return { rows, more };
    };
    const results = await Promise.all(keys.map(async (key) => {
      if (key === "pengaduan" && !admin) {
        const [pub, own] = await Promise.all([
          fetchRows("pengaduan_publik", "created_at", "*", true),
          uid ? fetchRows("pengaduan", "created_at", "*", true) : Promise.resolve({ rows: [] as Row[], more: false }),
        ]);
        const mine = own.rows.map((r) => fromDb(r, uid));
        const ids = new Set(mine.map((r) => r.id));
        return { key, rows: [...mine, ...pub.rows.filter((r) => !ids.has(r.id)).map((r) => ({ ...fromDb(r, uid), status: "published" }))], more: pub.more || own.more };
      }
      const table = key === "houses" && !verified ? "houses_public" : tableOf[key];
      const order = ({ houses: "blok", kegiatan: "created_at", pengumuman: "date", umkm: "created_at", pengaduan: "created_at", pengurus: "urutan", kontak: "name", transaksi: "date", kebutuhan: "deadline", mapItems: "z", mapSettings: "id" } as Record<Collection, string>)[key];
      let result;
      try { result = await fetchRows(table, order, "*", ["kegiatan", "pengumuman", "umkm", "pengaduan", "transaksi"].includes(key)); }
      catch (error) {
        if (key !== "houses" || verified) throw error;
        result = await fetchRows("houses", order, PUBLIC_HOUSE_COLS);
      }
      return { key, rows: result.rows.map((r) => fromDb(r, uid)), more: result.more };
    }));
    if (id !== requestId.current) return;
    setData((old) => {
      const next = { ...old };
      for (const result of results) (next as unknown as Record<string, unknown>)[result.key] = result.rows;
      return next;
    });
    setHasMore(results.some((r) => r.more));
  }, [supabase]);

  // pantau sesi login
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user;
      setUser((prev) => (prev?.id === u?.id ? prev : u ? { id: u.id, email: u.email } : null));
      setAuthKnown(true);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  const loadProfile = useCallback(async (uid: string | null) => {
    if (!uid) return null;
    const { data: row, error } = await supabase.from("warga_profiles").select("*").eq("user_id", uid).maybeSingle();
    if (error) throw error;
    return row ? (fromDb(row) as unknown as WargaProfile) : null;
  }, [supabase]);

  useEffect(() => { setLimit(PAGE_SIZE); }, [pathname, user?.id]);

  // Identitas dan data halaman dimuat bersama; respons lama tidak boleh
  // menimpa halaman atau sesi yang sudah berubah.
  useEffect(() => {
    if (!authKnown) return;
    const id = ++requestId.current;
    setPageLoading(true);
    setPageError(null);

    (async () => {
      try {
        let admin = false;
        if (user) {
          const { error: authErr } = await supabase.auth.getUser();
          if (authErr) throw authErr;
          const { data: res, error } = await supabase.rpc("is_admin");
          if (error) throw error;
          admin = res === true;
        }
        const prof = await loadProfile(user?.id ?? null);
        let pending = 0;
        if (admin) {
          const { count, error } = await supabase.from("warga_profiles").select("user_id", { count: "exact", head: true }).eq("status", "pending");
          if (error) throw error;
          pending = count ?? 0;
        }
        await load(user?.id ?? null, admin, admin || prof?.status === "approved", pathname, limit, id);
        if (id !== requestId.current) return;
        setIsAdmin(admin);
        setProfile(prof);
        setPendingWarga(pending);
        setLoadedPage(`${pathname}:${user?.id ?? "anonymous"}`);
        setReady(true);
      } catch (error) {
        if (id !== requestId.current) return;
        console.error("Gagal memuat halaman", error);
        setPageError("Data tidak dapat dimuat. Periksa koneksi dan coba lagi.");
      } finally {
        if (id === requestId.current) setPageLoading(false);
      }
    })();
    return () => { requestId.current++; };
  }, [authKnown, user, supabase, load, loadProfile, pathname, limit, retryCount]);

  const refreshProfile = useCallback(async () => {
    const prof = await loadProfile(user?.id ?? null);
    setProfile(prof);
    setRetryCount((n) => n + 1);
  }, [loadProfile, user]);

  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    try {
      await load(user?.id ?? null, isAdmin, isAdmin || profile?.status === "approved", pathname, limit, id);
    } catch (error) {
      setPageError("Data tidak dapat dimuat. Periksa koneksi dan coba lagi.");
      console.error("Gagal memperbarui data", error);
    }
  }, [load, user, isAdmin, profile, pathname, limit]);
  const loadMore = useCallback(() => setLimit((n) => n + PAGE_SIZE), []);
  const retry = useCallback(() => setRetryCount((n) => n + 1), []);

  // foto dari form berupa dataurl, diunggah dulu ke storage lalu diganti url publik
  const withUploadedImage = useCallback(async (obj: Row, key: Collection) => {
    const upload = async (img: unknown) => {
      if (typeof img !== "string" || !img.startsWith("data:")) return img;
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Silakan masuk terlebih dahulu untuk mengunggah foto");
      const blob = await (await fetch(img)).blob();
      const path = `${auth.user.id}/${crypto.randomUUID()}.jpg`;
      const bucket = key === "pengaduan" ? "pengaduan-private" : "uploads";
      const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType: blob.type || "image/jpeg" });
      if (error) throw error;
      return key === "pengaduan" ? path : supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    };
    const result = { ...obj };
    if ("image" in result) result.image = await upload(result.image);
    if (key === "umkm" && Array.isArray(result.catalog)) {
      const catalog: Row[] = [];
      for (const item of result.catalog as Row[]) {
        const next = { ...item };
        if ("image" in next) next.image = await upload(next.image);
        if ("sizeChartImage" in next) next.sizeChartImage = await upload(next.sizeChartImage);
        catalog.push(next);
      }
      result.catalog = catalog;
    }
    return result;
  }, [supabase]);

  const cleanupPhoto = useCallback(async (path: unknown) => {
    if (typeof path !== "string" || !/^[0-9a-f-]+\/[0-9a-f-]+\.jpg$/.test(path)) return;
    const { error } = await supabase.storage.from("pengaduan-private").remove([path]);
    if (error) console.error("Foto tidak dapat dibersihkan; perlu pemeriksaan admin", error);
  }, [supabase]);

  const add = useCallback(async <K extends Collection>(key: K, item: Item<K>) => {
    let uploaded: unknown;
    try {
      const original = item as unknown as Row;
      const processed = await withUploadedImage(original, key);
      if (key === "pengaduan" && processed.image !== original.image) uploaded = processed.image;
      const payload = toDb(processed);
      if (key === "houses" || key === "mapSettings") payload.id = (item as { id: string }).id;
      const { data: row, error } = await supabase.from(tableOf[key]).insert(payload).select().single();
      if (error) throw error;
      setData((d) => ({ ...d, [key]: [fromDb(row, user?.id), ...d[key]] }));
      return true;
    } catch (e) {
      await cleanupPhoto(uploaded);
      fail("Gagal menyimpan", e as Error);
      return false;
    }
  }, [supabase, user, withUploadedImage, fail, cleanupPhoto]);

  const update = useCallback(async <K extends Collection>(key: K, id: string, patch: Partial<Item<K>>) => {
    let uploaded: unknown;
    const previous = key === "pengaduan" ? data.pengaduan.find((row) => row.id === id)?.image : undefined;
    try {
      const original = patch as Row;
      const processed = await withUploadedImage(original, key);
      if (key === "pengaduan" && processed.image !== original.image) uploaded = processed.image;
      const payload = toDb(processed);
      const { data: row, error } = await supabase.from(tableOf[key]).update(payload).eq("id", id).select().single();
      if (error) throw error;
      setData((d) => ({ ...d, [key]: (d[key] as unknown as Row[]).map((x) => (x.id === id ? fromDb(row, user?.id) : x)) }));
      if (key === "pengaduan" && "image" in original && previous !== processed.image) await cleanupPhoto(previous);
      return true;
    } catch (e) {
      await cleanupPhoto(uploaded);
      fail("Gagal memperbarui", e as Error);
      return false;
    }
  }, [supabase, user, withUploadedImage, fail, cleanupPhoto, data.pengaduan]);

  const remove = useCallback(async <K extends Collection>(key: K, id: string) => {
    const { error, count } = await supabase.from(tableOf[key]).delete({ count: "exact" }).eq("id", id);
    if (error || count === 0) {
      fail("Gagal menghapus", error ?? { message: "tidak punya akses" });
      return false;
    }
    const photo = key === "pengaduan" ? data.pengaduan.find((row) => row.id === id)?.image : undefined;
    setData((d) => ({ ...d, [key]: (d[key] as unknown as Row[]).filter((x) => x.id !== id) }));
    if (photo) await cleanupPhoto(photo);
    return true;
  }, [supabase, fail, cleanupPhoto, data.pengaduan]);

  const setUmkmStatus = useCallback(async (id: string, status: BusinessStatus, note?: string) => {
    const { error } = await supabase.rpc("set_umkm_status", { p_id: id, p_status: status, p_note: note ?? null });
    if (error) {
      fail("Gagal mengubah status usaha", error);
      return false;
    }
    setData((d) => ({ ...d, umkm: d.umkm.map((u) => (u.id === id ? { ...u, businessStatus: status, statusNote: note?.trim() || undefined } : u)) }));
    return true;
  }, [supabase, fail]);

  const loginAdmin = useCallback(async (email: string, password: string) => {
    const { data: res, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return error.message === "Invalid login credentials" ? "Email atau password salah." : error.message;
    const { data: admin } = await supabase.rpc("is_admin");
    if (admin !== true) {
      await supabase.auth.signOut();
      return "Akun ini bukan admin.";
    }
    setUser({ id: res.user.id, email: res.user.email });
    setIsAdmin(true);
    return null;
  }, [supabase]);

  const loginWarga = useCallback(async (email: string, password: string) => {
    const { data: res, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) return authMessage(error.message);
    setUser({ id: res.user.id, email: res.user.email });
    return null;
  }, [supabase, loadProfile]);

  const registerWarga = useCallback(async (i: RegisterInput) => {
    const { data: res, error } = await supabase.auth.signUp({
      email: i.email.trim().toLowerCase(),
      password: i.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/warga/akun`,
        data: { full_name: i.fullName.trim(), phone: i.phone.trim(), house_id: i.houseId, relation: i.relation },
      },
    });
    if (error) return { error: authMessage(error.message), needsConfirm: false };
    // supabase mengembalikan identities kosong jika email sudah terdaftar
    if (res.user && res.user.identities?.length === 0) return { error: authMessage("already registered"), needsConfirm: false };
    return { error: null, needsConfirm: !res.session };
  }, [supabase]);

  const submitRegistration = useCallback(async (i: { fullName: string; phone: string; houseId: string; relation: WargaRelation }) => {
    const { error } = await supabase.rpc("submit_registration", { p_full_name: i.fullName, p_phone: i.phone, p_house_id: i.houseId, p_relation: i.relation });
    if (error) return /check constraint/i.test(error.message) ? "Periksa kembali nama dan nomor HP." : error.message;
    setProfile(await loadProfile(user?.id ?? null));
    return null;
  }, [supabase, loadProfile, user]);

  const requestPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/warga/atur-password`,
    });
    return error ? authMessage(error.message) : null;
  }, [supabase]);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return error ? authMessage(error.message) : null;
  }, [supabase]);

  const logout = useCallback(async () => {
    // Lepaskan perangkat ini sebelum sesi berakhir agar akun berikutnya dapat mendaftar.
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration("/sw.js");
        const sub = await reg?.pushManager?.getSubscription();
        if (sub) {
          const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          if (error) console.error("Gagal menghapus langganan push", error);
          await sub.unsubscribe();
        }
      } catch (error) { console.error("Gagal menonaktifkan push saat keluar", error); }
    }
    await supabase.auth.signOut();
    setIsAdmin(false);
    setProfile(null);
  }, [supabase]);

  const isVerified = isAdmin || profile?.status === "approved";

  const value = useMemo(
    () => ({
      data, ready, loadedPage, pageLoading, pageError, hasMore, loadMore, retry, user, isAdmin, add, update, remove, refresh, setUmkmStatus, loginAdmin, logout,
      profile, isVerified, pendingWarga, loginWarga, registerWarga, submitRegistration, requestPasswordReset, updatePassword, refreshProfile, setPendingWarga,
    }),
    [data, ready, loadedPage, pageLoading, pageError, hasMore, loadMore, retry, user, isAdmin, add, update, remove, refresh, setUmkmStatus, loginAdmin, logout,
      profile, isVerified, pendingWarga, loginWarga, registerWarga, submitRegistration, requestPasswordReset, updatePassword, refreshProfile],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
