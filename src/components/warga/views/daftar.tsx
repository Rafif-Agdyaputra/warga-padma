"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Mail, MailCheck } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button, Field, Input } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { PasswordInput } from "../auth";
import { AuthCard, RegistrationFields, passwordIssue, phoneOk, type RegFields } from "../registration";

export function DaftarView() {
  const { ready, user, profile, isAdmin, registerWarga, submitRegistration } = useStore();
  const router = useRouter();
  const toast = useToast();
  const [reg, setReg] = useState<RegFields>({ fullName: "", phone: "", houseId: "", relation: "pemilik" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);

  // sudah punya profil / admin: tidak perlu daftar lagi
  useEffect(() => {
    if (ready && user && (profile || isAdmin)) router.replace("/warga/akun");
  }, [ready, user, profile, isAdmin, router]);

  const completing = !!user && !profile;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!phoneOk(reg.phone)) return setErr("Nomor HP tidak valid.");
    if (!reg.houseId) return setErr("Pilih nomor rumah Anda.");
    if (!completing) {
      const pw = passwordIssue(password);
      if (pw) return setErr(`Password: ${pw.toLowerCase()}.`);
      if (password !== confirm) return setErr("Konfirmasi password tidak sama.");
    }
    if (!agree) return setErr("Centang pernyataan kebenaran data.");

    setBusy(true);
    if (completing) {
      const msg = await submitRegistration(reg);
      setBusy(false);
      if (msg) return setErr(msg);
      toast("Data terkirim — menunggu verifikasi pengurus");
      router.replace("/warga/akun");
      return;
    }
    const res = await registerWarga({ ...reg, email, password });
    setBusy(false);
    if (res.error) return setErr(res.error);
    if (res.needsConfirm) setSentTo(email.trim().toLowerCase());
    else router.replace("/warga/akun");
  };

  if (sentTo)
    return (
      <AuthCard eyebrow="Registrasi" title="Cek email Anda">
        <div className="flex flex-col items-center py-2 text-center">
          <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-sage-50 text-sage-600"><MailCheck className="size-6" /></span>
          <p className="text-sm text-concrete-600">
            Link verifikasi sudah dikirim ke <b className="text-concrete-900">{sentTo}</b>. Setelah email diverifikasi, pengurus RT akan memeriksa data Anda.
            Akun bisa dipakai untuk mengirim kegiatan, pengaduan, dan UMKM setelah disetujui.
          </p>
          <ol className="mt-5 w-full space-y-2 text-left text-sm">
            {["Buka link verifikasi di email", "Pengurus memeriksa data & nomor rumah", "Akun aktif — status bisa dicek di halaman Akun"].map((t, i) => (
              <li key={t} className="flex items-center gap-3 rounded-xl bg-concrete-50 px-3.5 py-2.5">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-concrete-900 font-mono text-[11px] text-white">{i + 1}</span>{t}
              </li>
            ))}
          </ol>
          <Link href="/warga" className="mt-5 text-sm font-semibold text-maroon-600">Kembali ke beranda</Link>
        </div>
      </AuthCard>
    );

  return (
    <AuthCard
      eyebrow="Registrasi Warga"
      title={completing ? "Lengkapi Data Warga" : "Daftar Akun Warga"}
      subtitle="Khusus warga Perumahan Padma. Setiap pendaftaran diverifikasi pengurus RT sebelum akun bisa digunakan."
    >
      <form onSubmit={submit} className="space-y-4" noValidate={false}>
        {!completing && (
          <Field label="Email">
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-concrete-400" />
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" autoComplete="email" autoCapitalize="none" placeholder="nama@email.com" />
            </div>
          </Field>
        )}
        <RegistrationFields value={reg} onChange={setReg} />
        {!completing && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Password" hint={password ? passwordIssue(password) ?? "Password kuat" : "Min. 8 karakter, huruf & angka"}>
              <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
            </Field>
            <Field label="Ulangi password" hint={confirm && confirm !== password ? "Belum sama" : undefined}>
              <PasswordInput value={confirm} onChange={setConfirm} autoComplete="new-password" />
            </Field>
          </div>
        )}
        <label className="flex items-start gap-2.5 rounded-xl border border-maroon-100 bg-maroon-50/50 p-3.5 text-[13px] text-concrete-700">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 size-4 accent-maroon-600" />
          Saya menyatakan data di atas benar dan saya adalah warga Perumahan Padma. Data digunakan pengurus untuk verifikasi dan tidak ditampilkan ke publik.
        </label>
        {err && <p className="rounded-xl bg-maroon-50 px-3.5 py-2.5 text-sm text-maroon-700">{err}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "Mengirim…" : completing ? "Kirim Data" : "Daftar"}</Button>
        {!completing && (
          <p className="text-center text-sm text-concrete-500">
            Sudah punya akun? <Link href="/warga/akun" className="font-semibold text-maroon-600">Masuk</Link>
          </p>
        )}
      </form>
    </AuthCard>
  );
}
