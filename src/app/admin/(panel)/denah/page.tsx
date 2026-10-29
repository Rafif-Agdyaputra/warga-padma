"use client";

import { MapEditor } from "@/components/admin/map-editor";
import { PageHeader } from "@/components/ui";

export default function Page() {
  return (
    <>
      <PageHeader
        index="05"
        eyebrow="Data Lingkungan"
        title="Editor Denah"
        description="Atur tata letak denah sesuai siteplan asli: unggah gambar siteplan sebagai acuan, lalu geser, ubah ukuran, dan putar setiap rumah maupun elemen peta."
      />
      <MapEditor />
    </>
  );
}
