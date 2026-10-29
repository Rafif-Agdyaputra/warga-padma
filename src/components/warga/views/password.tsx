"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Mail, MailCheck } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button, Field, Input, Spinner } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { PasswordInput } from "../auth";
import { AuthCard, passwordIssue } from "../registration";

export function LupaPasswordView() {
  const { requestPasswordReset } = useStore();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  return (
    <AuthCard eyebrow="Akun Warga" title="Lupa Password" subtitle="Masukkan email akun Anda. Kami kirimkan link untuk membuat password baru.">
      {sent ? (
        <div className="flex flex-col items-center py-2 text-center">
          <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-sage-50 text-sage-600"><MailCheck className="size-6" /></span>
          <p className="text-sm text-concrete-600">Jika <b>{email}</b> terdaftar, link atur ulang password sudah dikirim. Buka link tersebut di browser ini.</p>
          <Link href="/warga/akun" className="mt-4 text-sm font-semibold text-maroon-600">Kembali ke halaman masuk</Link>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setErr("");
            const msg = await requestPasswordReset(email);
            setBusy(false);
            // selalu tampilkan pesan sama agar tidak membocorkan email terdaftar
            if (msg && /terlalu banyak/i.test(msg)) setErr(msg);
            else setSent(true);
          }}
        >
          <Field label="Email">
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-concrete-400" />
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" autoCapitalize="none" autoComplete="email" />
            </div>
          </Field>
          {err && <p className="rounded-xl bg-maroon-50 px-3.5 py-2.5 text-sm text-maroon-700">{err}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "Mengirim…" : "Kirim Link"}</Button>
        </form>
      )}
    </AuthCard>
  );
}

export function AturPasswordView() {
  const { ready, user, updatePassword } = useStore();
  const router = useRouter();
  const toast = useToast();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (!ready) return <div className="grid min-h-[40vh] place-items-center"><Spinner /></div>;

  if (!user)
    return (
      <AuthCard eyebrow="Akun Warga" title="Link tidak berlaku" subtitle="Link atur ulang password sudah kedaluwarsa atau dibuka di browser lain.">
        <Link href="/warga/lupa-password" className="inline-flex h-11 items-center rounded-xl bg-brand px-5 text-sm font-semibold text-white">Minta link baru</Link>
      </AuthCard>
    );

  return (
    <AuthCard eyebrow="Akun Warga" title="Buat Password Baru" subtitle={`Untuk akun ${user.email}`}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setErr("");
          const issue = passwordIssue(pw);
          if (issue) return setErr(`Password: ${issue.toLowerCase()}.`);
          if (pw !== confirm) return setErr("Konfirmasi password tidak sama.");
          setBusy(true);
          const msg = await updatePassword(pw);
          setBusy(false);
          if (msg) return setErr(msg);
          toast("Password berhasil diperbarui");
          router.replace("/warga/akun");
        }}
      >
        <Field label="Password baru" hint="Min. 8 karakter, huruf & angka"><PasswordInput value={pw} onChange={setPw} autoComplete="new-password" /></Field>
        <Field label="Ulangi password baru"><PasswordInput value={confirm} onChange={setConfirm} autoComplete="new-password" /></Field>
        {err && <p className="rounded-xl bg-maroon-50 px-3.5 py-2.5 text-sm text-maroon-700">{err}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "Menyimpan…" : "Simpan Password"}</Button>
      </form>
    </AuthCard>
  );
}
