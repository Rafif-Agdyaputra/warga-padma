"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Ban, Clock, Eye, EyeOff, Lock, Mail, ShieldAlert, ShieldCheck, UserPlus } from "lucide-react";
import { useStore } from "@/lib/store";
import type { WargaProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button, Field, Input, Modal } from "@/components/ui";
import { useToast } from "@/components/ui/toast";

type Prompt = (reason?: string) => void;
interface Ctx { login: Prompt; status: () => void }
const AuthCtx = createContext<Ctx>({ login: () => {}, status: () => {} });

export function PasswordInput({ value, onChange, autoComplete = "current-password", placeholder }: { value: string; onChange: (v: string) => void; autoComplete?: string; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-concrete-400" />
      <Input type={show ? "text" : "password"} required value={value} onChange={(e) => onChange(e.target.value)} className="px-10" autoComplete={autoComplete} placeholder={placeholder} />
      <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-concrete-400 hover:text-concrete-700" aria-label={show ? "Sembunyikan password" : "Tampilkan password"}>
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function LoginForm({ onDone, compact }: { onDone?: () => void; compact?: boolean }) {
  const { loginWarga } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr("");
        const msg = await loginWarga(email, password);
        setBusy(false);
        if (msg) setErr(msg);
        else onDone?.();
      }}
    >
      <Field label="Email">
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-concrete-400" />
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" placeholder="nama@email.com" autoCapitalize="none" autoComplete="email" />
        </div>
      </Field>
      <Field label="Password">
        <PasswordInput value={password} onChange={setPassword} />
      </Field>
      <div className="-mt-1 text-right">
        <Link href="/warga/lupa-password" onClick={onDone} className="text-xs font-medium text-maroon-600 hover:text-maroon-700">Lupa password?</Link>
      </div>
      {err && (
        <div className="rounded-xl bg-maroon-50 px-3.5 py-2.5 text-sm text-maroon-700">
          {err}
          {/tidak terdaftar/.test(err) && (
            <> Akun yang dihapus pengurus harus{" "}<Link href="/warga/daftar" onClick={onDone} className="font-semibold underline">daftar ulang</Link>.</>
          )}
        </div>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "Memeriksa…" : "Masuk"}</Button>
      <p className={cn("text-center text-sm text-concrete-500", compact && "pt-1")}>
        Belum punya akun?{" "}
        <Link href="/warga/daftar" onClick={onDone} className="font-semibold text-maroon-600 hover:text-maroon-700">Daftar sebagai warga</Link>
      </p>
    </form>
  );
}

export const wargaStatusMeta = {
  pending: { label: "Menunggu verifikasi", tone: "amber", icon: Clock, text: "Data Anda sedang diperiksa pengurus RT. Setelah disetujui, Anda bisa mengirim kegiatan, pengaduan, dan promosi UMKM." },
  approved: { label: "Terverifikasi", tone: "sage", icon: ShieldCheck, text: "Akun Anda sudah diverifikasi sebagai warga Padma." },
  rejected: { label: "Ditolak", tone: "maroon", icon: ShieldAlert, text: "Registrasi Anda belum disetujui. Periksa catatan pengurus lalu ajukan ulang dengan data yang benar." },
  suspended: { label: "Dinonaktifkan", tone: "neutral", icon: Ban, text: "Akun Anda dinonaktifkan sementara oleh pengurus. Hubungi pengurus RT untuk informasi lebih lanjut." },
} as const;

export function AccountStatusCard({ profile }: { profile: WargaProfile | null }) {
  if (!profile)
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-center gap-2 font-semibold text-concrete-900"><UserPlus className="size-4 text-amber-600" />Data registrasi belum lengkap</div>
        <p className="mt-1 text-sm text-concrete-600">Lengkapi nama, nomor HP, dan nomor rumah agar pengurus dapat memverifikasi akun Anda.</p>
        <Link href="/warga/daftar" className="mt-3 inline-flex h-9 items-center rounded-xl bg-amber-400 px-4 text-sm font-semibold text-concrete-900 hover:bg-amber-500">Lengkapi data</Link>
      </div>
    );
  const m = wargaStatusMeta[profile.status];
  const tone = {
    amber: "border-amber-200 bg-amber-50 text-amber-600",
    sage: "border-sage-100 bg-sage-50 text-sage-600",
    maroon: "border-maroon-100 bg-maroon-50 text-maroon-700",
    neutral: "border-concrete-200 bg-concrete-100 text-concrete-600",
  }[m.tone];
  return (
    <div className={cn("rounded-2xl border p-4", tone)}>
      <div className="flex items-center gap-2 font-semibold"><m.icon className="size-4" />{m.label}</div>
      <p className="mt-1 text-sm text-concrete-600">{m.text}</p>
      {profile.adminNote && (
        <p className="mt-2 rounded-xl bg-white/70 px-3 py-2 text-sm text-concrete-700"><b>Catatan pengurus:</b> {profile.adminNote}</p>
      )}
    </div>
  );
}

export function LoginPromptProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useStore();
  const toast = useToast();
  const [loginOpen, setLoginOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [reason, setReason] = useState<string>();

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("login") === "gagal")
      toast("Link tidak valid atau kedaluwarsa. Jika Anda baru memverifikasi email, silakan masuk dengan email & password.", "warning");
  }, [toast]);

  useEffect(() => {
    if (user) setLoginOpen(false);
  }, [user]);

  const login = useCallback<Prompt>((r) => {
    setReason(r);
    setLoginOpen(true);
  }, []);
  const status = useCallback(() => setStatusOpen(true), []);

  return (
    <AuthCtx.Provider value={{ login, status }}>
      {children}
      <Modal open={loginOpen} onClose={() => setLoginOpen(false)} title="Masuk sebagai Warga" subtitle={reason ?? "Khusus warga Padma yang sudah terdaftar"}>
        <LoginForm compact onDone={() => setLoginOpen(false)} />
      </Modal>
      <Modal open={statusOpen} onClose={() => setStatusOpen(false)} title="Akun belum bisa digunakan" subtitle="Fitur ini khusus warga terverifikasi">
        <div className="space-y-4">
          <AccountStatusCard profile={profile} />
          <Link href="/warga/akun" onClick={() => setStatusOpen(false)} className="block text-center text-sm font-semibold text-maroon-600">Lihat halaman akun</Link>
        </div>
      </Modal>
    </AuthCtx.Provider>
  );
}

export const useLoginPrompt = () => useContext(AuthCtx).login;

// aksi hanya untuk warga terverifikasi: belum login -> form masuk, belum diverifikasi -> info status
export function useRequireLogin() {
  const { user, isVerified } = useStore();
  const { login, status } = useContext(AuthCtx);
  return useCallback(
    (action: () => void, reason?: string) => (!user ? login(reason) : isVerified ? action() : status()),
    [user, isVerified, login, status],
  );
}
