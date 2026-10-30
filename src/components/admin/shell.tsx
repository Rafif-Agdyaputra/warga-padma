"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Inbox, PenTool, UserCheck, CalendarDays, Megaphone, MessageSquareWarning, Store, Map, Users, Phone, Wallet, HandCoins,
  LogOut, Menu, X, ExternalLink,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";

const groups = [
  { title: "Utama", items: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/moderasi", label: "Moderasi Draft", icon: Inbox, badge: undefined },
    { href: "/admin/warga", label: "Verifikasi Warga", icon: UserCheck, badge: "warga" },
  ] },
  { title: "Konten Warga", items: [
    { href: "/admin/kegiatan", label: "Kegiatan", icon: CalendarDays },
    { href: "/admin/pengumuman", label: "Pengumuman", icon: Megaphone },
    { href: "/admin/pengaduan", label: "Pengaduan", icon: MessageSquareWarning },
    { href: "/admin/umkm", label: "UMKM & Jasa", icon: Store },
  ] },
  { title: "Data Lingkungan", items: [
    { href: "/admin/denah", label: "Editor Denah", icon: PenTool },
    { href: "/admin/rumah", label: "Data Rumah", icon: Map },
    { href: "/admin/pengurus", label: "Pengurus", icon: Users },
    { href: "/admin/kontak", label: "Nomor Penting", icon: Phone },
  ] },
  { title: "Keuangan", items: [
    { href: "/admin/keuangan", label: "Kas & Transaksi", icon: Wallet },
    { href: "/admin/kebutuhan", label: "Kebutuhan", icon: HandCoins },
  ] },
];

const active = (p: string, h: string) => (h === "/admin" ? p === h : p.startsWith(h));

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { ready, isAdmin, user, logout, pendingWarga } = useStore();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (ready && !isAdmin) router.replace("/admin/login");
  }, [ready, isAdmin, router]);



  const current = groups.flatMap((g) => g.items).find((i) => active(pathname, i.href));

  if (!ready || !isAdmin) {
    return <div className="grid min-h-dvh place-items-center bg-concrete-100"><div className="size-8 animate-spin rounded-full border-2 border-concrete-300 border-t-maroon-600" /></div>;
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between px-5">
        <Logo light sub="Panel Admin" />
        <button onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-full text-white/60 hover:bg-white/10 lg:hidden"><X className="size-4" /></button>
      </div>
      <nav className="no-scrollbar flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {groups.map((g) => (
          <div key={g.title}>
            <div className="mb-2 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">{g.title}</div>
            <div className="space-y-0.5">
              {g.items.map((it) => {
                const on = active(pathname, it.href);
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-all",
                      on ? "bg-white text-concrete-900 shadow-soft" : "text-white/65 hover:bg-white/[0.07] hover:text-white",
                    )}
                  >
                    <it.icon className={cn("size-[18px]", on ? "text-maroon-600" : "")} />
                    {it.label}
                    {"badge" in it && (() => {
                      const n = it.badge === "warga" ? pendingWarga : 0;
                      return n > 0 ? <span className={cn("ml-auto rounded-full px-2 py-0.5 text-[10.5px] font-bold", on ? "bg-maroon-600 text-white" : "bg-amber-400 text-concrete-900")}>{n}</span> : null;
                    })()}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="space-y-1 border-t border-white/10 p-3">
        <Link href="/warga" target="_blank" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-white/65 hover:bg-white/[0.07] hover:text-white">
          <ExternalLink className="size-4" /> Lihat Situs Warga
        </Link>
        <button onClick={async () => { await logout(); router.replace("/admin/login"); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-white/65 hover:bg-maroon-600/30 hover:text-white">
          <LogOut className="size-4" /> Keluar
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-concrete-100/70">
      {/* sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 overflow-hidden bg-concrete-900 lg:block">
        <div className="bg-blueprint-dark pointer-events-none absolute inset-0" />
        <div className="bg-brand pointer-events-none absolute -bottom-24 -left-24 size-64 rounded-full opacity-30 blur-3xl" />
        <div className="relative h-full">{sidebar}</div>
      </aside>

      {/* drawer mobile */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 animate-fade bg-concrete-900/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 animate-[rise_.3s_ease] overflow-hidden bg-concrete-900">
            <div className="bg-blueprint-dark pointer-events-none absolute inset-0" />
            <div className="relative h-full">{sidebar}</div>
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-concrete-200/80 bg-concrete-50/85 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4 md:px-8">
            <button onClick={() => setOpen(true)} className="grid size-10 place-items-center rounded-xl border border-concrete-200 bg-white lg:hidden" aria-label="Menu"><Menu className="size-4" /></button>
            <div className="min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-concrete-400">/admin{pathname.replace("/admin", "") || ""}</div>
              <div className="truncate font-display text-[15px] font-semibold text-concrete-900">{current?.label ?? "Admin"}</div>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="hidden text-right md:block">
                <div className="text-sm font-medium text-concrete-800">Administrator</div>
                <div className="max-w-48 truncate text-xs text-concrete-500">{user?.email ?? "Pengurus RT 05"}</div>
              </div>
              <div className="bg-brand grid size-10 place-items-center rounded-xl font-display text-sm font-semibold text-white">{(user?.email ?? "AD").slice(0, 2).toUpperCase()}</div>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
