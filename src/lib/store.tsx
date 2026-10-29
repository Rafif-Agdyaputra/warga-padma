"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
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

  const fail = useCallback((msg: string, err?: { message?: string; code?: string; details?: string | null; hint?: string | null } | null) => {
    // error supabase tidak enumerable, jadi dicetak per field
    console.error(msg, { message: err?.message, code: err?.code, details: err?.details, hint: err?.hint });
    const detail = err?.code === "42501" || /row-level security/i.test(err?.message ?? "")
      ? "akses ditolak database (cek migrasi & login)"
      : err?.message;
    toast(detail ? `${msg}: ${detail}` : msg, "warning");
  }, [toast]);

  // verified = admin / warga disetujui: boleh baca data penghuni rumah
  const load = useCallback(async (uid: string | null, admin: boolean, verified = admin) => {
    const q = (t: string) => supabase.from(t).select("*");
    const [houses, kegiatan, pengumuman, umkm, pengurus, kontak, transaksi, kebutuhan, aduanPublik, aduanSendiri, mapItems, mapSettings] = await Promise.all([
      verified
        ? q("houses").order("blok").order("nomor")
        : supabase.from("houses_public").select("*").order("blok").order("nomor").then(async (r) =>
            // migrasi 008 belum dijalankan: ambil kolom non-pribadi saja dari tabel lama
            r.error ? supabase.from("houses").select(PUBLIC_HOUSE_COLS).order("blok").order("nomor") : r,
          ),
      q("kegiatan").order("created_at", { ascending: false }),
      q("pengumuman").order("date", { ascending: false }),
      q("umkm").order("created_at", { ascending: false }),
      q("pengurus").order("urutan").order("name"),
      q("kontak").order("name"),
      q("transaksi").order("date", { ascending: false }),
      q("kebutuhan").order("deadline"),
      admin ? Promise.resolve({ data: [], error: null }) : q("pengaduan_publik").order("created_at", { ascending: false }),
      // admin: semua pengaduan, warga login: miliknya sendiri (dibatasi rls)
      uid ? q("pengaduan").order("created_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
      q("map_items").order("z"),
      q("map_settings"),
    ]);

    const results = { houses, kegiatan, pengumuman, umkm, pengurus, kontak, transaksi, kebutuhan, aduanPublik, aduanSendiri, mapItems, mapSettings };
    const broken = Object.entries(results).find(([, r]) => r.error);
    if (broken) fail(`Gagal memuat data ${broken[0]}`, broken[1].error);

    const map = (r: { data: Row[] | null }) => (r.data ?? []).map((x) => fromDb(x, uid));
    const own = map(aduanSendiri);
    const ownIds = new Set(own.map((x) => x.id));
    const pengaduan = [...own, ...map(aduanPublik).filter((x) => !ownIds.has(x.id)).map((x) => ({ ...x, status: "published" }))];

    setData({
      houses: map(houses),
      kegiatan: map(kegiatan),
      pengumuman: map(pengumuman),
      pengaduan,
      umkm: map(umkm),
      pengurus: map(pengurus),
      kontak: map(kontak),
      transaksi: map(transaksi),
      kebutuhan: map(kebutuhan),
      mapItems: map(mapItems),
      mapSettings: map(mapSettings),
    } as unknown as StoreData);
  }, [supabase, fail]);

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
    const { data: row } = await supabase.from("warga_profiles").select("*").eq("user_id", uid).maybeSingle();
    return row ? (fromDb(row) as unknown as WargaProfile) : null;
  }, [supabase]);

  // muat ulang data tiap kali user berganti
  useEffect(() => {
    if (!authKnown) return;
    let cancel = false;
    (async () => {
      let admin = false;
      if (user) {
        // akun yang sudah dihapus admin: sesi lama dibersihkan
        const { error: authErr } = await supabase.auth.getUser();
        if (authErr && /not exist|not found|invalid claim|jwt/i.test(authErr.message)) {
          await supabase.auth.signOut();
          toast("Akun Anda sudah tidak terdaftar. Silakan daftar ulang bila masih warga Padma.", "warning");
          return;
        }
        const { data: res } = await supabase.rpc("is_admin");
        admin = res === true;
      }
      const prof = await loadProfile(user?.id ?? null);
      if (admin) {
        const { count } = await supabase.from("warga_profiles").select("user_id", { count: "exact", head: true }).eq("status", "pending");
        if (!cancel) setPendingWarga(count ?? 0);
      }
      if (cancel) return;
      setIsAdmin(admin);
      setProfile(prof);
      await load(user?.id ?? null, admin, admin || prof?.status === "approved");
      if (!cancel) setReady(true);
    })();
    return () => { cancel = true; };
  }, [authKnown, user, supabase, load, loadProfile, toast]);

  const refreshProfile = useCallback(async () => {
    const prof = await loadProfile(user?.id ?? null);
    const nowApproved = prof?.status === "approved";
    setProfile(prof);
    // status verifikasi berubah: muat ulang agar data penghuni tampil / tersembunyi
    if (nowApproved !== (profile?.status === "approved")) await load(user?.id ?? null, isAdmin, isAdmin || nowApproved);
  }, [loadProfile, user, load, isAdmin, profile]);

  const refresh = useCallback(
    () => load(user?.id ?? null, isAdmin, isAdmin || profile?.status === "approved"),
    [load, user, isAdmin, profile],
  );

  // foto dari form berupa dataurl, diunggah dulu ke storage lalu diganti url publik
  const withUploadedImage = useCallback(async (obj: Row) => {
    const img = obj.image;
    if (typeof img !== "string" || !img.startsWith("data:")) return obj;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Silakan masuk terlebih dahulu untuk mengunggah foto");
    const blob = await (await fetch(img)).blob();
    const path = `${auth.user.id}/${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage.from("uploads").upload(path, blob, { contentType: blob.type || "image/jpeg" });
    if (error) throw error;
    return { ...obj, image: supabase.storage.from("uploads").getPublicUrl(path).data.publicUrl };
  }, [supabase]);

  const add = useCallback(async <K extends Collection>(key: K, item: Item<K>) => {
    try {
      const payload = toDb(await withUploadedImage(item as unknown as Row));
      if (key === "houses" || key === "mapSettings") payload.id = (item as { id: string }).id;
      const { data: row, error } = await supabase.from(tableOf[key]).insert(payload).select().single();
      if (error) throw error;
      setData((d) => ({ ...d, [key]: [fromDb(row, user?.id), ...d[key]] }));
      return true;
    } catch (e) {
      fail("Gagal menyimpan", e as Error);
      return false;
    }
  }, [supabase, user, withUploadedImage, fail]);

  const update = useCallback(async <K extends Collection>(key: K, id: string, patch: Partial<Item<K>>) => {
    try {
      const payload = toDb(await withUploadedImage(patch as Row));
      const { data: row, error } = await supabase.from(tableOf[key]).update(payload).eq("id", id).select().single();
      if (error) throw error;
      setData((d) => ({ ...d, [key]: (d[key] as unknown as Row[]).map((x) => (x.id === id ? fromDb(row, user?.id) : x)) }));
      return true;
    } catch (e) {
      fail("Gagal memperbarui", e as Error);
      return false;
    }
  }, [supabase, user, withUploadedImage, fail]);

  const remove = useCallback(async <K extends Collection>(key: K, id: string) => {
    const { error, count } = await supabase.from(tableOf[key]).delete({ count: "exact" }).eq("id", id);
    if (error || count === 0) {
      fail("Gagal menghapus", error ?? { message: "tidak punya akses" });
      return false;
    }
    setData((d) => ({ ...d, [key]: (d[key] as unknown as Row[]).filter((x) => x.id !== id) }));
    return true;
  }, [supabase, fail]);

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
    setProfile(await loadProfile(res.user.id));
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
    await supabase.auth.signOut();
    setIsAdmin(false);
    setProfile(null);
  }, [supabase]);

  const isVerified = isAdmin || profile?.status === "approved";

  const value = useMemo(
    () => ({
      data, ready, user, isAdmin, add, update, remove, refresh, setUmkmStatus, loginAdmin, logout,
      profile, isVerified, pendingWarga, loginWarga, registerWarga, submitRegistration, requestPasswordReset, updatePassword, refreshProfile, setPendingWarga,
    }),
    [data, ready, user, isAdmin, add, update, remove, refresh, setUmkmStatus, loginAdmin, logout,
      profile, isVerified, pendingWarga, loginWarga, registerWarga, submitRegistration, requestPasswordReset, updatePassword, refreshProfile],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
