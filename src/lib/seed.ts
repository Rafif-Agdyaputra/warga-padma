import type { House, HouseStatus, StoreData } from "./types";

const names = [
  "Budi Santoso", "Siti Rahmawati", "Agus Wijaya", "Dewi Lestari", "Hendra Gunawan",
  "Rina Marlina", "Joko Prasetyo", "Lina Kartika", "Bambang Sutrisno", "Maya Anggraini",
  "Rudi Hartono", "Fitri Handayani", "Andi Saputra", "Yuni Astuti", "Eko Purnomo",
  "Sri Wahyuni", "Dedi Kurniawan", "Nur Aisyah", "Wahyu Hidayat", "Ratna Sari",
  "Fajar Ramadhan", "Indah Permata", "Gede Artha", "Putu Ayu", "Made Wirawan",
  "Kadek Sinta", "Arif Rahman", "Desi Natalia", "Teguh Santika", "Wulan Dari",
  "Irfan Maulana", "Citra Kirana",
];

// layout denah: 4 blok, tiap blok 2 baris x 8 rumah
const blocks = [
  { blok: "A", ox: 60, oy: 70 },
  { blok: "B", ox: 540, oy: 70 },
  { blok: "C", ox: 60, oy: 390 },
  { blok: "D", ox: 540, oy: 390 },
];

const statusCycle: HouseStatus[] = ["dihuni", "dihuni", "dihuni", "disewakan", "dihuni", "kosong", "dihuni", "dihuni"];

function buildHouses(): House[] {
  const list: House[] = [];
  let n = 0;
  for (const b of blocks) {
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 8; col++) {
        const nomor = row * 8 + col + 1;
        const status = statusCycle[(n + row) % statusCycle.length];
        list.push({
          id: `${b.blok}-${nomor}`,
          blok: b.blok,
          nomor,
          owner: status === "kosong" ? "Belum berpenghuni" : names[n % names.length],
          phone: status === "kosong" ? "-" : `0812-${String(3000 + n * 37).padStart(4, "0")}-${String(1000 + n * 53).slice(-4)}`,
          status,
          penghuni: status === "kosong" ? 0 : 2 + (n % 4),
          x: b.ox + col * 50,
          y: b.oy + row * 130,
          w: 44,
          h: 90,
        });
        n++;
      }
    }
  }
  return list;
}

export const seed: StoreData = {
  houses: buildHouses(),
  kegiatan: [
    {
      id: "k1", title: "Kerja Bakti Bersih Saluran Air", date: "2026-10-26", location: "Jalan Utama Blok A–B",
      description: "Kerja bakti rutin bulanan membersihkan saluran air menjelang musim hujan. Warga diharapkan membawa cangkul dan karung.",
      author: "Budi Santoso", blokRumah: "A-1", status: "published", createdAt: "2026-10-18",
    },
    {
      id: "k2", title: "Senam Pagi Ibu-ibu PKK", date: "2026-10-25", location: "Taman Padma",
      description: "Senam sehat setiap Sabtu pagi pukul 06.30. Terbuka untuk semua warga.",
      author: "Siti Rahmawati", blokRumah: "A-2", status: "published", createdAt: "2026-10-15",
    },
    {
      id: "k3", title: "Pengajian Rutin Mushala Al-Padma", date: "2026-10-30", location: "Mushala Al-Padma",
      description: "Pengajian bulanan bersama Ustadz Ahmad. Dilanjutkan makan malam bersama.",
      author: "Arif Rahman", blokRumah: "C-5", status: "published", createdAt: "2026-10-12",
    },
    {
      id: "k4", title: "Lomba Mewarnai Anak", date: "2026-11-08", location: "Balai Warga",
      description: "Lomba mewarnai untuk anak usia 4–10 tahun. Pendaftaran gratis ke pengurus.",
      author: "Maya Anggraini", blokRumah: "B-3", status: "draft", createdAt: "2026-10-21",
    },
  ],
  pengumuman: [
    {
      id: "p1", title: "Iuran Bulan November Dibuka", category: "Keuangan", priority: "penting", date: "2026-10-22",
      content: "Pembayaran iuran keamanan & kebersihan bulan November dapat dilakukan mulai 1–10 November melalui bendahara atau transfer.",
      author: "Bendahara RT", status: "published",
    },
    {
      id: "p2", title: "Pemadaman Listrik Terjadwal", category: "Umum", priority: "penting", date: "2026-10-20",
      content: "PLN akan melakukan pemeliharaan jaringan pada Selasa, 28 Oktober pukul 09.00–14.00 WIB.",
      author: "Ketua RT", status: "published",
    },
    {
      id: "p3", title: "Jadwal Ronda Malam Diperbarui", category: "Keamanan", priority: "normal", date: "2026-10-17",
      content: "Jadwal ronda periode November sudah dibagikan di grup warga dan papan pengumuman pos satpam.",
      author: "Seksi Keamanan", status: "published",
    },
    {
      id: "p4", title: "Pengangkutan Sampah Hari Libur", category: "Kebersihan", priority: "normal", date: "2026-10-21",
      content: "Selama libur nasional, pengangkutan sampah dimajukan menjadi Kamis pagi.",
      author: "Seksi Kebersihan", status: "draft",
    },
  ],
  pengaduan: [
    {
      id: "a1", title: "Lampu jalan Blok C mati", category: "Fasilitas", reporter: "Dedi Kurniawan", blokRumah: "C-4",
      anonymous: false, content: "Lampu jalan di depan C-4 sampai C-6 mati sejak 3 hari lalu, kondisi gelap di malam hari.",
      status: "published", progress: "diproses", response: "Sudah dilaporkan ke teknisi, dijadwalkan perbaikan Senin.", createdAt: "2026-10-19",
    },
    {
      id: "a2", title: "Sampah menumpuk di ujung Blok D", category: "Kebersihan", reporter: "Warga", blokRumah: "D-8",
      anonymous: true, content: "Ada tumpukan sampah liar di lahan kosong ujung Blok D.",
      status: "published", progress: "selesai", response: "Sudah dibersihkan bersama petugas kebersihan.", createdAt: "2026-10-10",
    },
    {
      id: "a3", title: "Parkir mobil menghalangi jalan", category: "Lingkungan", reporter: "Fajar Ramadhan", blokRumah: "B-6",
      anonymous: false, content: "Mohon diingatkan agar tidak parkir di badan jalan karena menyulitkan kendaraan lewat.",
      status: "draft", progress: "diterima", createdAt: "2026-10-22",
    },
  ],
  umkm: [
    {
      id: "u1", name: "Nasi Uduk Bu Siti", owner: "Siti Rahmawati", category: "Makanan", price: "Rp12.000 – Rp20.000",
      description: "Nasi uduk lengkap dengan ayam goreng, telur balado, dan sambal kacang. Buka setiap pagi 06.00–10.00.",
      blokRumah: "A-2", phone: "0812-3037-1053", status: "published", createdAt: "2026-10-01",
    },
    {
      id: "u2", name: "Servis AC & Elektronik", owner: "Hendra Gunawan", category: "Jasa", price: "Mulai Rp75.000",
      description: "Cuci AC, isi freon, servis kulkas dan mesin cuci. Bisa panggilan ke rumah.",
      blokRumah: "A-5", phone: "0812-3148-1212", status: "published", createdAt: "2026-09-28",
    },
    {
      id: "u3", name: "Es Kopi Susu Padma", owner: "Fajar Ramadhan", category: "Minuman", price: "Rp15.000",
      description: "Kopi susu gula aren, cokelat, dan matcha. Pesan antar dalam lingkungan gratis.",
      blokRumah: "B-6", phone: "0812-3777-1113", status: "published", createdAt: "2026-10-05",
    },
    {
      id: "u4", name: "Jahit & Permak Kadek", owner: "Kadek Sinta", category: "Fashion", price: "Mulai Rp10.000",
      description: "Permak celana, jahit seragam sekolah, dan pesan kebaya.",
      blokRumah: "B-10", phone: "0812-3925-1378", status: "draft", createdAt: "2026-10-20",
    },
  ],
  pengurus: [
    { id: "g1", name: "H. Bambang Sutrisno", role: "Ketua RT", phone: "0812-3333-1000", blokRumah: "A-9", periode: "2025–2028" },
    { id: "g2", name: "Rina Marlina", role: "Sekretaris", phone: "0812-3333-1001", blokRumah: "A-6", periode: "2025–2028" },
    { id: "g3", name: "Lina Kartika", role: "Bendahara", phone: "0812-3333-1002", blokRumah: "A-8", periode: "2025–2028" },
    { id: "g4", name: "Joko Prasetyo", role: "Seksi Keamanan", phone: "0812-3333-1003", blokRumah: "A-7", periode: "2025–2028" },
    { id: "g5", name: "Eko Purnomo", role: "Seksi Kebersihan", phone: "0812-3333-1004", blokRumah: "A-15", periode: "2025–2028" },
    { id: "g6", name: "Arif Rahman", role: "Takmir Mushala", phone: "0812-3333-1005", blokRumah: "C-5", periode: "2025–2028" },
  ],
  kontak: [
    { id: "c1", name: "Ketua RT – H. Bambang", group: "Pengurus RT", phone: "0812-3333-1000" },
    { id: "c2", name: "Sekretaris – Rina", group: "Pengurus RT", phone: "0812-3333-1001" },
    { id: "c3", name: "Bendahara – Lina", group: "Pengurus RT", phone: "0812-3333-1002" },
    { id: "c4", name: "Pos Satpam Padma", group: "Keamanan", phone: "0812-9000-1111", note: "Siaga 24 jam" },
    { id: "c5", name: "Polsek Terdekat", group: "Keamanan", phone: "(021) 555-0110" },
    { id: "c6", name: "Polisi", group: "Darurat", phone: "110" },
    { id: "c7", name: "Ambulans", group: "Darurat", phone: "118" },
    { id: "c8", name: "Pemadam Kebakaran", group: "Darurat", phone: "113" },
    { id: "c9", name: "PLN", group: "Layanan", phone: "123" },
    { id: "c10", name: "PDAM", group: "Layanan", phone: "(021) 555-0222" },
  ],
  transaksi: [
    { id: "t1", akun: "warga", type: "masuk", amount: 9600000, category: "Iuran Bulanan", note: "Iuran Oktober 64 KK", date: "2026-10-10" },
    { id: "t2", akun: "warga", type: "keluar", amount: 3500000, category: "Keamanan", note: "Honor satpam Oktober", date: "2026-10-05" },
    { id: "t3", akun: "warga", type: "keluar", amount: 1200000, category: "Kebersihan", note: "Petugas sampah Oktober", date: "2026-10-05" },
    { id: "t4", akun: "warga", type: "keluar", amount: 850000, category: "Fasilitas", note: "Ganti lampu jalan Blok A", date: "2026-10-14" },
    { id: "t5", akun: "warga", type: "masuk", amount: 2500000, category: "Donasi", note: "Donasi warga untuk taman", date: "2026-10-16" },
    { id: "t6", akun: "warga", type: "masuk", amount: 18400000, category: "Saldo Awal", note: "Saldo per 1 Oktober", date: "2026-10-01" },
    { id: "t7", akun: "mushala", type: "masuk", amount: 6200000, category: "Saldo Awal", note: "Saldo per 1 Oktober", date: "2026-10-01" },
    { id: "t8", akun: "mushala", type: "masuk", amount: 1850000, category: "Infaq Jumat", note: "Kotak infaq 4 pekan", date: "2026-10-17" },
    { id: "t9", akun: "mushala", type: "keluar", amount: 450000, category: "Operasional", note: "Listrik & air mushala", date: "2026-10-08" },
    { id: "t10", akun: "mushala", type: "keluar", amount: 600000, category: "Kegiatan", note: "Konsumsi pengajian", date: "2026-10-12" },
  ],
  kebutuhan: [
    { id: "n1", akun: "warga", title: "Pengadaan CCTV Gerbang", description: "4 unit CCTV untuk gerbang utama dan jalan lingkungan.", target: 12000000, terkumpul: 7450000, deadline: "2026-12-15", status: "berjalan" },
    { id: "n2", akun: "warga", title: "Renovasi Taman Bermain", description: "Pengecatan ulang dan penggantian ayunan taman anak.", target: 8000000, terkumpul: 8000000, deadline: "2026-09-30", status: "terpenuhi" },
    { id: "n3", akun: "mushala", title: "Karpet Baru Mushala", description: "Penggantian karpet ruang utama mushala ukuran 8x10 m.", target: 9500000, terkumpul: 4100000, deadline: "2026-11-30", status: "berjalan" },
    { id: "n4", akun: "mushala", title: "Sound System", description: "Pembelian amplifier dan 2 speaker untuk adzan & kajian.", target: 5000000, terkumpul: 1750000, deadline: "2027-01-31", status: "berjalan" },
  ],
  mapItems: [],
  mapSettings: [],
};
