"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Home, KeyRound, LogOut, Mail, Phone, RefreshCw, ShieldCheck, User } from "lucide-react";
import { useStore } from "@/lib/store";
import { tanggal } from "@/lib/utils";
import { Badge, Button, Field, Spinner } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { AccountStatusCard, LoginForm, PasswordInput, wargaStatusMeta } from "../auth";
import { AuthCard, RegistrationFields, passwordIssue, phoneOk, relationLabel, useHouseName, type RegFields } from "../registration";

export function AkunView() {
  const { ready, user, profile, isAdmin, logout, submitRegistration, updatePassword, refreshProfile } = useStore();
  const toast = useToast();
  const houseName = useHouseName();
  const [resubmit, setResubmit] = useState<RegFields | null>(null);
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // status bisa berubah saat admin memverifikasi
  useEffect(() => {
    if (!user) return;
    const onFocus = () => refreshProfile();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user, refreshProfile]);

  if (!ready) return <div className="grid min-h-[40vh] place-items-center"><Spinner /></div>;

  if (!user)
    return (
      <AuthCard eyebrow="Akun Warga" title="Masuk" subtitle="Masuk dengan email dan password yang Anda daftarkan.">
        <LoginForm />
      </AuthCard>
    );

  const house = profile?.houseId ? houseName(profile.houseId, profile.blokRumah) : undefined;
  const meta = profile ? wargaStatusMeta[profile.status] : null;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="card rivets overflow-hidden">
        <div className="hairline-stripe h-1.5" />
        <div className="p-6 pt-8 md:p-8 md:pt-10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="label-mono">Akun Warga</div>
              <h1 className="mt-1.5 text-2xl font-semibold">{profile?.fullName ?? "Akun saya"}</h1>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && <Badge tone="maroon" dot>Admin</Badge>}
              {meta && <Badge tone={meta.tone} dot>{meta.label}</Badge>}
              <button onClick={() => refreshProfile()} className="grid size-8 place-items-center rounded-full text-concrete-500 hover:bg-concrete-100" aria-label="Muat ulang status"><RefreshCw className="size-4" /></button>
            </div>
          </div>

          <dl className="mt-5 divide-y divide-concrete-100 rounded-2xl border border-concrete-200">
            {[
              { k: "Email", v: user.email, icon: Mail },
              { k: "No. HP", v: profile?.phone, icon: Phone },
              { k: "Rumah", v: house ?? profile?.blokRumah, icon: Home },
              { k: "Status di rumah", v: profile ? relationLabel[profile.relation] : undefined, icon: User },
              { k: "Terdaftar", v: profile ? tanggal(profile.createdAt.slice(0, 10)) : undefined, icon: ShieldCheck },
            ].filter((r) => r.v).map((r) => (
              <div key={r.k} className="flex items-center gap-3 px-4 py-3">
                <r.icon className="size-4 text-concrete-400" />
                <dt className="text-sm text-concrete-500">{r.k}</dt>
                <dd className="ml-auto truncate pl-3 text-right text-sm font-semibold text-concrete-800">{r.v}</dd>
              </div>
            ))}
          </dl>

          {!isAdmin && <div className="mt-5"><AccountStatusCard profile={profile} /></div>}
          {isAdmin && (
            <Link href="/admin" className="mt-5 flex items-center justify-between rounded-2xl bg-concrete-900 px-4 py-3 text-sm font-semibold text-white">
              Buka panel admin <ShieldCheck className="size-4 text-amber-400" />
            </Link>
          )}

          {(profile?.status === "rejected" || profile?.status === "pending") && !resubmit && (
            <Button className="mt-3" variant={profile.status === "rejected" ? "accent" : "outline"} onClick={() => setResubmit({ fullName: profile.fullName, phone: profile.phone, houseId: profile.houseId ?? "", relation: profile.relation })}>
              {profile.status === "rejected" ? "Perbaiki & ajukan ulang" : "Ubah data pendaftaran"}
            </Button>
          )}
          {profile?.status === "approved" && (
            <p className="mt-3 text-xs text-concrete-500">Salah data atau pindah rumah? Hubungi pengurus RT untuk memperbarui data akun Anda.</p>
          )}

          {resubmit && (
            <form
              className="mt-5 space-y-4 rounded-2xl border border-concrete-200 p-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setErr("");
                if (!phoneOk(resubmit.phone)) return setErr("Nomor HP tidak valid.");
                setBusy(true);
                const msg = await submitRegistration(resubmit);
                setBusy(false);
                if (msg) return setErr(msg);
                setResubmit(null);
                toast(profile?.status === "pending" ? "Data pendaftaran diperbarui" : "Data diajukan ulang — menunggu verifikasi");
              }}
            >
              <RegistrationFields value={resubmit} onChange={setResubmit} />
              {err && <p className="rounded-xl bg-maroon-50 px-3.5 py-2.5 text-sm text-maroon-700">{err}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setResubmit(null)}>Batal</Button>
                <Button type="submit" disabled={busy}>{busy ? "Mengirim…" : profile?.status === "pending" ? "Simpan" : "Ajukan ulang"}</Button>
              </div>
            </form>
          )}

          <div className="mt-6 flex flex-wrap gap-2 border-t border-concrete-100 pt-5">
            <Button variant="outline" icon={KeyRound} onClick={() => { setPwOpen((v) => !v); setErr(""); }}>Ubah password</Button>
            <Button variant="danger" icon={LogOut} onClick={async () => { await logout(); toast("Anda sudah keluar", "info"); }}>Keluar</Button>
          </div>

          {pwOpen && (
            <form
              className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
              onSubmit={async (e) => {
                e.preventDefault();
                const issue = passwordIssue(pw);
                if (issue) return setErr(`Password: ${issue.toLowerCase()}.`);
                setBusy(true);
                const msg = await updatePassword(pw);
                setBusy(false);
                if (msg) return setErr(msg);
                setPw("");
                setPwOpen(false);
                toast("Password diperbarui");
              }}
            >
              <Field label="Password baru" className="flex-1"><PasswordInput value={pw} onChange={setPw} autoComplete="new-password" /></Field>
              <Button type="submit" disabled={busy}>Simpan</Button>
            </form>
          )}
          {err && !resubmit && <p className="mt-3 rounded-xl bg-maroon-50 px-3.5 py-2.5 text-sm text-maroon-700">{err}</p>}
        </div>
      </div>
    </div>
  );
}
