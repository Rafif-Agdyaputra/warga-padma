export type ModerationStatus = "draft" | "published" | "rejected";

export type HouseStatus = "dihuni" | "kosong" | "disewakan";

export interface House {
  id: string;
  blok: string;
  nomor: number;
  owner: string;
  phone: string;
  status: HouseStatus;
  penghuni: number;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
  label?: string;
}

export type MapItemKind = "jalan" | "hijau" | "fasilitas" | "label";

export interface MapItem {
  id: string;
  kind: MapItemKind;
  label?: string;
  sublabel?: string;
  tone: "netral" | "aksen" | "hijau";
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  z: number;
}

export interface MapSettings {
  id: number;
  width: number;
  height: number;
  backgroundUrl?: string;
  backgroundOpacity: number;
  showBackground: boolean;
}

export interface Kegiatan {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string;
  image?: string;
  author: string;
  blokRumah: string;
  status: ModerationStatus;
  createdAt: string;
  mine?: boolean;
  userId?: string;
}

export interface Pengumuman {
  id: string;
  title: string;
  content: string;
  category: "Umum" | "Keamanan" | "Kebersihan" | "Keuangan" | "Ibadah";
  priority: "normal" | "penting";
  date: string;
  author: string;
  status: ModerationStatus;
}

export interface Pengaduan {
  id: string;
  title: string;
  content: string;
  category: "Keamanan" | "Kebersihan" | "Fasilitas" | "Lingkungan" | "Lainnya";
  reporter: string;
  blokRumah: string;
  anonymous: boolean;
  image?: string;
  status: ModerationStatus;
  progress: "diterima" | "diproses" | "selesai";
  response?: string;
  createdAt: string;
  mine?: boolean;
  userId?: string;
}

export type UmkmLinkKey = "instagram" | "tiktok" | "facebook" | "shopee" | "tokopedia";
export type BusinessStatus = "aktif" | "libur" | "tidak_aktif";

export interface CatalogItem {
  name: string;
  price?: string;
  note?: string;
  fashionCategory?: string;
  sizeChart?: string;
  image?: string;
  sizeChartImage?: string;
}

export interface Umkm {
  id: string;
  name: string;
  owner: string;
  category: "Makanan" | "Minuman" | "Jasa" | "Fashion" | "Kebutuhan Rumah" | "Lainnya";
  description: string;
  price: string;
  image?: string;
  blokRumah: string;
  phone: string;
  openTime?: string;
  closeTime?: string;
  businessStatus?: BusinessStatus;
  statusNote?: string;
  catalog?: CatalogItem[];
  links?: Partial<Record<UmkmLinkKey, string>>;
  status: ModerationStatus;
  createdAt: string;
  mine?: boolean;
  userId?: string;
}

export interface Pengurus {
  id: string;
  name: string;
  role: string;
  phone: string;
  blokRumah: string;
  periode: string;
  urutan?: number;
}

export interface Kontak {
  id: string;
  name: string;
  group: "Pengurus RT" | "Keamanan" | "Darurat" | "Layanan";
  phone: string;
  note?: string;
}

export type Akun = "warga" | "mushala";

export interface Transaksi {
  id: string;
  akun: Akun;
  type: "masuk" | "keluar";
  amount: number;
  category: string;
  note: string;
  date: string;
}

export interface Kebutuhan {
  id: string;
  akun: Akun;
  title: string;
  description: string;
  target: number;
  terkumpul: number;
  deadline: string;
  status: "berjalan" | "terpenuhi";
}

export interface StoreData {
  houses: House[];
  kegiatan: Kegiatan[];
  pengumuman: Pengumuman[];
  pengaduan: Pengaduan[];
  umkm: Umkm[];
  pengurus: Pengurus[];
  kontak: Kontak[];
  transaksi: Transaksi[];
  kebutuhan: Kebutuhan[];
  mapItems: MapItem[];
  mapSettings: MapSettings[];
}

export type WargaStatus = "pending" | "approved" | "rejected" | "suspended";
export type WargaRelation = "pemilik" | "penyewa" | "keluarga";

export interface WargaProfile {
  userId: string;
  fullName: string;
  phone: string;
  houseId?: string;
  blokRumah: string;
  relation: WargaRelation;
  status: WargaStatus;
  adminNote?: string;
  createdAt: string;
  reviewedAt?: string;
  email?: string;
  emailConfirmed?: boolean;
}

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  houseId: string;
  relation: WargaRelation;
}
