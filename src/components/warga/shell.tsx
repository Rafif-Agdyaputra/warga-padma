"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LayoutGrid, LogIn, MessageSquareWarning, ShieldCheck, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { LoginPromptProvider, useLoginPrompt } from "./auth";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import { isActive, wargaNav } from "./nav";

const primary = wargaNav.slice(0, 6);
const more = wargaNav.slice(6);
const mobileTabs = [wargaNav[0], wargaNav[1], wargaNav[2], wargaNav[4]];

export function WargaShell({ children }: { children: React.ReactNode }) {
  return (
    <LoginPromptProvider>
      <ShellInner>{children}</ShellInner>
    </LoginPromptProvider>
  );
}

function AccountButton() {
  const { user, profile, isAdmin } = useStore();
  const prompt = useLoginPrompt();
  if (!user)
    return (
      <button
        onClick={() => prompt()}
        className="flex h-9 items-center gap-1.5 rounded-full border border-concrete-200 bg-white px-3.5 text-[13px] font-medium text-concrete-700 transition hover:border-maroon-200 hover:text-maroon-700"
      >
        <LogIn className="size-4" /> Masuk
      </button>
    );
  const st = isAdmin ? "approved" : profile?.status;
  const dot = st === "approved" ? "bg-sage-500" : st === "pending" || !st ? "bg-amber-400" : "bg-maroon-600";
  return (
    <Link
      href="/warga/akun"
      title="Akun saya"
      className="flex h-9 items-center gap-2 rounded-full border border-concrete-200 bg-white pl-1 pr-3 text-[13px] text-concrete-700 transition hover:border-maroon-200"
    >
      <span className="relative grid size-7 place-items-center rounded-full bg-sage-500 text-xs font-semibold uppercase text-white">
        {(profile?.fullName ?? user.email ?? "W")[0]}
        <span className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white ${dot}`} />
      </span>
      <span className="hidden max-w-36 truncate md:block">{profile?.fullName ?? user.email}</span>
    </Link>
  );
}

function ShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const [drop, setDrop] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMenu(false);
    setDrop(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    const onClick = (e: MouseEvent) => !dropRef.current?.contains(e.target as Node) && setDrop(false);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div className="bg-concrete-noise min-h-dvh">
      {/* header */}
      <header
        className={cn(
          "sticky top-0 z-40 transition-all duration-300",
          scrolled ? "border-b border-concrete-200/70 bg-concrete-50/85 backdrop-blur-xl" : "bg-transparent",
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:h-[72px] md:px-6">
          <Link href="/warga"><Logo /></Link>

          <nav className="hidden items-center gap-0.5 rounded-full border border-concrete-200/80 bg-white/70 p-1 shadow-soft backdrop-blur lg:flex">
            {primary.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                  isActive(pathname, n.href) ? "bg-concrete-900 text-white" : "text-concrete-600 hover:text-concrete-900",
                )}
              >
                {n.label}
              </Link>
            ))}
            <div ref={dropRef} className="relative">
              <button
                onClick={() => setDrop((v) => !v)}
                className={cn(
                  "flex items-center gap-1 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                  more.some((m) => isActive(pathname, m.href)) ? "bg-concrete-900 text-white" : "text-concrete-600 hover:text-concrete-900",
                )}
              >
                Lainnya <ChevronDown className={cn("size-3.5 transition", drop && "rotate-180")} />
              </button>
              {drop && (
                <div className="absolute right-0 top-11 w-72 animate-rise rounded-2xl border border-concrete-200 bg-white p-2 shadow-lift">
                  {more.map((m) => (
                    <Link key={m.href} href={m.href} className="flex items-center gap-3 rounded-xl p-2.5 transition hover:bg-concrete-50">
                      <span className="grid size-9 place-items-center rounded-xl bg-concrete-100 text-concrete-600"><m.icon className="size-4" /></span>
                      <span>
                        <span className="block text-sm font-medium text-concrete-800">{m.label}</span>
                        <span className="block text-xs text-concrete-500">{m.desc}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/warga/pengaduan"
              className="hidden items-center gap-2 rounded-full bg-amber-400 px-4 py-2 text-[13px] font-semibold text-concrete-900 transition hover:bg-amber-500 md:flex"
            >
              <MessageSquareWarning className="size-4" /> Lapor
            </Link>
            <AccountButton />
            <Link
              href="/admin"
              title="Halaman Admin"
              className="hidden size-9 md:grid place-items-center rounded-full border border-concrete-200 bg-white text-concrete-600 transition hover:text-maroon-700"
            >
              <ShieldCheck className="size-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-32 pt-4 md:px-6 md:pb-20 md:pt-8">{children}</main>

      {/* footer */}
      <footer className="hidden border-t border-concrete-200 bg-concrete-900 text-concrete-300 md:block">
        <div className="hairline-stripe h-1.5 opacity-90" />
        <div className="bg-blueprint-dark">
          <div className="mx-auto grid max-w-7xl grid-cols-4 gap-8 px-6 py-12">
            <div className="col-span-2">
              <Logo light />
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-concrete-400">
                Portal informasi resmi warga Perumahan Padma. Dikelola oleh pengurus RT untuk keterbukaan informasi dan kebersamaan.
              </p>
            </div>
            <div>
              <div className="label-mono mb-3 !text-concrete-500">Informasi</div>
              {wargaNav.slice(1, 5).map((n) => <Link key={n.href} href={n.href} className="block py-1 text-sm hover:text-white">{n.label}</Link>)}
            </div>
            <div>
              <div className="label-mono mb-3 !text-concrete-500">Layanan</div>
              {wargaNav.slice(5).map((n) => <Link key={n.href} href={n.href} className="block py-1 text-sm hover:text-white">{n.label}</Link>)}
            </div>
          </div>
          <div className="mx-auto flex max-w-7xl justify-between border-t border-white/10 px-6 py-5 font-mono text-[11px] uppercase tracking-widest text-concrete-500">
            <span>© 2026 Warga Padma</span>
            <span>RT 05 / RW 12</span>
          </div>
        </div>
      </footer>

      {/* mobile bottom nav */}
      <nav className="fixed inset-x-3 bottom-3 z-40 rounded-[22px] border border-concrete-200/80 bg-white/90 p-1.5 shadow-lift backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-5">
          {mobileTabs.map((n) => {
            const active = isActive(pathname, n.href);
            return (
              <Link key={n.href} href={n.href} className="flex flex-col items-center gap-0.5 py-1.5">
                <span className={cn("grid h-8 w-12 place-items-center rounded-full transition-all", active ? "bg-maroon-50 text-maroon-700" : "text-concrete-500")}>
                  <n.icon className="size-[18px]" strokeWidth={active ? 2.2 : 1.8} />
                </span>
                <span className={cn("text-[10.5px] font-medium", active ? "text-maroon-700" : "text-concrete-500")}>{n.label}</span>
              </Link>
            );
          })}
          <button onClick={() => setMenu(true)} className="flex flex-col items-center gap-0.5 py-1.5">
            <span className="grid h-8 w-12 place-items-center rounded-full text-concrete-500"><LayoutGrid className="size-[18px]" strokeWidth={1.8} /></span>
            <span className="text-[10.5px] font-medium text-concrete-500">Menu</span>
          </button>
        </div>
      </nav>

      {/* mobile menu sheet */}
      {menu && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 animate-fade bg-concrete-900/40 backdrop-blur-[2px]" onClick={() => setMenu(false)} />
          <div className="absolute inset-x-0 bottom-0 animate-sheet rounded-t-3xl bg-white p-5 pb-8 shadow-lift">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="label-mono">Navigasi</div>
                <div className="font-display text-lg font-semibold">Semua Menu</div>
              </div>
              <button onClick={() => setMenu(false)} className="grid size-9 place-items-center rounded-full bg-concrete-100"><X className="size-4" /></button>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {wargaNav.map((n) => {
                const active = isActive(pathname, n.href);
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-2xl border p-3 text-center transition",
                      active ? "border-maroon-200 bg-maroon-50 text-maroon-700" : "border-concrete-200 text-concrete-700",
                    )}
                  >
                    <n.icon className="size-5" strokeWidth={1.8} />
                    <span className="text-xs font-medium">{n.label}</span>
                  </Link>
                );
              })}
              <Link href="/admin" className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-concrete-300 p-3 text-center text-concrete-500">
                <ShieldCheck className="size-5" strokeWidth={1.8} />
                <span className="text-xs font-medium">Admin</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
