"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Lock, Mail } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button, Field, Input } from "@/components/ui";
import { Logo } from "@/components/logo";

export default function LoginPage() {
  const { loginAdmin, isAdmin, ready } = useStore();
  const router = useRouter();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && isAdmin) router.replace("/admin");
  }, [ready, isAdmin, router]);

  return (
    <div className="grid min-h-dvh bg-concrete-50 lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-concrete-900 p-12 text-white lg:flex lg:flex-col">
        <div className="bg-blueprint-dark absolute inset-0" />
        <div className="bg-brand absolute -right-32 top-1/4 size-[420px] rounded-full opacity-50 blur-3xl" />
        <div className="absolute -bottom-20 left-10 size-72 rounded-full bg-sage-500 opacity-25 blur-3xl" />
        <div className="relative"><Logo light sub="Panel Admin" /></div>
        <div className="relative mt-auto max-w-md">
          <div className="hairline-stripe mb-6 h-1.5 w-20 rounded-full" />
          <h1 className="text-4xl font-semibold leading-tight text-white">Kelola informasi warga dengan rapi dan transparan.</h1>
          <p className="mt-4 text-white/60">Review draft kiriman warga, perbarui data rumah, dan catat keuangan kas dalam satu panel.</p>
        </div>
      </div>

      <div className="flex flex-col p-6 md:p-12">
        <Link href="/warga" className="flex items-center gap-2 self-start text-sm text-concrete-500 hover:text-concrete-800">
          <ArrowLeft className="size-4" /> Kembali ke situs warga
        </Link>
        <div className="m-auto w-full max-w-sm animate-rise py-10">
          <div className="mb-8 lg:hidden"><Logo sub="Panel Admin" /></div>
          <div className="label-mono">/admin/login</div>
          <h2 className="mt-2 text-2xl font-semibold">Masuk sebagai Admin</h2>
          <p className="mt-1 text-sm text-concrete-500">Khusus pengurus RT yang berwenang.</p>

          <form
            className="mt-8 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setErr("");
              const msg = await loginAdmin(u, p);
              setBusy(false);
              if (msg) setErr(msg);
              else router.replace("/admin");
            }}
          >
            <Field label="Email">
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-concrete-400" />
                <Input type="email" value={u} onChange={(e) => setU(e.target.value)} className="pl-10" autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} required />
              </div>
            </Field>
            <Field label="Password">
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-concrete-400" />
                <Input type="password" value={p} onChange={(e) => setP(e.target.value)} className="pl-10" autoComplete="current-password" required />
              </div>
            </Field>
            {err && <p className="rounded-xl bg-maroon-50 px-3.5 py-2.5 text-sm text-maroon-700">{err}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "Memeriksa…" : "Masuk"}</Button>
          </form>
          <p className="mt-6 text-xs text-concrete-500">Akun admin dibuat di dashboard Supabase (Authentication → Users) dan didaftarkan ke tabel <code className="font-mono">admins</code>.</p>
        </div>
      </div>
    </div>
  );
}
