import {
  Home, Map, CalendarDays, Megaphone, Users, MessageSquareWarning, Phone, Store, Wallet, HandCoins, BookOpen, type LucideIcon,
} from "lucide-react";

export interface NavItem { href: string; label: string; icon: LucideIcon; desc: string }

export const wargaNav: NavItem[] = [
  { href: "/warga", label: "Beranda", icon: Home, desc: "Ringkasan informasi" },
  { href: "/warga/denah", label: "Denah", icon: Map, desc: "Peta rumah & pemilik" },
  { href: "/warga/kegiatan", label: "Kegiatan", icon: CalendarDays, desc: "Agenda & dokumentasi" },
  { href: "/warga/pengumuman", label: "Pengumuman", icon: Megaphone, desc: "Info resmi pengurus" },
  { href: "/warga/umkm", label: "UMKM", icon: Store, desc: "Usaha & jasa warga" },
  { href: "/warga/keuangan", label: "Kas", icon: Wallet, desc: "Saldo kas warga & mushala" },
  { href: "/warga/transparansi", label: "Transparansi", icon: HandCoins, desc: "Kebutuhan warga & mushala" },
  { href: "/warga/pengurus", label: "Pengurus", icon: Users, desc: "Struktur pengurus harian" },
  { href: "/warga/pengaduan", label: "Pengaduan", icon: MessageSquareWarning, desc: "Keluhan & laporan" },
  { href: "/warga/kontak", label: "Kontak", icon: Phone, desc: "Nomor telepon penting" },
  { href: "/warga/panduan", label: "Panduan & Privasi", icon: BookOpen, desc: "Cara menggunakan dan privasi data" },
];

export const isActive = (pathname: string, href: string) =>
  href === "/warga" ? pathname === href : pathname.startsWith(href);
