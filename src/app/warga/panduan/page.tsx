import Link from "next/link";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Panduan & Privasi" };

export default function Page() {
  return <>
    <PageHeader eyebrow="Informasi Warga" title="Panduan & Privasi" description="Cara menggunakan portal dan memahami informasi yang dibagikan." />
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="card space-y-4 p-6">
        <h2 className="text-lg font-semibold">Panduan penggunaan</h2>
        <div><h3 className="font-semibold">Daftar dan masuk</h3><p className="mt-1 text-sm leading-relaxed text-concrete-600">Daftar menggunakan email dan data rumah, verifikasi email, lalu tunggu persetujuan pengurus. Lihat status atau ajukan ulang data melalui halaman akun.</p><Link className="mt-2 inline-block text-sm font-semibold text-maroon-700 underline" href="/warga/akun">Buka akun</Link></div>
        <div><h3 className="font-semibold">Kirim kegiatan atau UMKM</h3><p className="mt-1 text-sm leading-relaxed text-concrete-600">Warga yang disetujui dapat mengirim informasi kegiatan dan usaha. Kiriman ditinjau admin sebelum ditayangkan; perubahan dapat memerlukan peninjauan ulang.</p></div>
        <div><h3 className="font-semibold">Buat dan pantau pengaduan</h3><p className="mt-1 text-sm leading-relaxed text-concrete-600">Buka Pengaduan, pilih Buat Pengaduan, dan jelaskan kejadian secara faktual. Pada tab Laporan Saya Anda dapat memeriksa status dan membuka riwayat pembaruan. Hubungi pengurus jika memerlukan bantuan.</p><Link className="mt-2 inline-block text-sm font-semibold text-maroon-700 underline" href="/warga/pengaduan">Buka pengaduan</Link></div>
      </section>
      <section className="card space-y-4 p-6">
        <h2 className="text-lg font-semibold">Informasi privasi</h2>
        <div><h3 className="font-semibold">Data akun dan rumah</h3><p className="mt-1 text-sm leading-relaxed text-concrete-600">Data pendaftaran digunakan pengurus untuk memverifikasi warga. Data penghuni rumah, termasuk nama, nomor telepon, dan jumlah penghuni, tersedia bagi warga yang disetujui dan admin. Denah umum menampilkan posisi, nomor, dan status rumah.</p></div>
        <div><h3 className="font-semibold">Pengaduan dan anonimitas</h3><p className="mt-1 text-sm leading-relaxed text-concrete-600">Pengurus dapat melihat identitas dan lokasi pelapor. Pada laporan anonim yang ditayangkan, nama dan lokasi disembunyikan; judul dan isi tetap dapat mengungkap identitas. Hindari mencantumkan informasi pengenal jika ingin anonim. Foto bukti baru disimpan secara privat untuk pelapor dan admin setelah pengurus mengaktifkan perlindungan foto. Foto lama perlu dipindahkan oleh pengurus; tanyakan kepada pengurus jika Anda memiliki foto lama.</p></div>
        <div><h3 className="font-semibold">Informasi yang ditampilkan</h3><p className="mt-1 text-sm leading-relaxed text-concrete-600">Pengumuman, konten yang disetujui, kontak, dan informasi kas dapat dilihat pengunjung. Periksa kembali informasi pribadi sebelum memasukkannya ke konten yang akan ditayangkan.</p></div>
        <div><h3 className="font-semibold">Penyimpanan dan penghapusan</h3><p className="mt-1 text-sm leading-relaxed text-concrete-600">Pengaduan dan foto yang masih digunakan disimpan sampai dihapus oleh pihak yang berwenang. Pelapor dapat menghapus laporan sebelum tayang; setelah tayang, hubungi pengurus. Penghapusan akun tidak selalu menghapus kiriman. Salinan cadangan mengikuti kebijakan pengelola.</p></div>
        <div><h3 className="font-semibold">Pertanyaan atau masalah</h3><p className="mt-1 text-sm leading-relaxed text-concrete-600">Untuk meminta koreksi atau penghapusan data, melaporkan masalah akses, atau menanyakan penggunaan data, hubungi pengurus melalui daftar kontak.</p><Link className="mt-2 inline-block text-sm font-semibold text-maroon-700 underline" href="/warga/kontak">Lihat kontak pengurus</Link></div>
      </section>
    </div>
  </>;
}
