"use client";

import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";

export function PageData({ children }: { children: React.ReactNode }) {
  const { user, loadedPage, pageLoading, pageError, hasMore, loadMore, retry } = useStore();
  const pathname = usePathname();
  const loaded = loadedPage === `${pathname}:${user?.id ?? "anonymous"}`;
  if (!loaded) {
    return <div className="grid min-h-dvh place-items-center p-6 text-center" role={pageError ? "alert" : "status"}>
      {pageError ? <div><p className="mb-4">{pageError}</p><button className="rounded-xl bg-maroon-700 px-4 py-2 text-white" onClick={retry}>Coba lagi</button></div> : <p>Memuat data halaman…</p>}
    </div>;
  }
  return <>
    {children}
    {(pageError || hasMore || pageLoading) && <div className="mx-auto max-w-7xl px-4 pb-28 text-center text-sm" role={pageError ? "alert" : "status"}>
      {pageError && <p className="mb-2 text-maroon-700">{pageError}</p>}
      {hasMore && <p className="mb-2 text-concrete-600">Sebagian data sudah dimuat. Pencarian, filter, dan jumlah berlaku untuk data yang sudah dimuat.</p>}
      {pageError ? <button className="rounded-xl bg-maroon-700 px-4 py-2 text-white" onClick={retry}>Coba lagi</button> : hasMore && <button className="rounded-xl bg-maroon-700 px-4 py-2 text-white disabled:opacity-50" disabled={pageLoading} onClick={loadMore}>{pageLoading ? "Memuat…" : "Muat lebih banyak"}</button>}
    </div>}
  </>;
}
