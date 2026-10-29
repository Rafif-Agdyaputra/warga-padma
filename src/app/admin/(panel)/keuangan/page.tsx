"use client";

import { Wallet } from "lucide-react";
import { CrudPage } from "@/components/admin/crud-page";
import { Badge } from "@/components/ui";
import { useStore } from "@/lib/store";
import { rupiah, saldo, tanggal, today, totals } from "@/lib/utils";

function Summary() {
  const { data } = useStore();
  return (
    <div className="mb-6 grid gap-4 md:grid-cols-2">
      {(["warga", "mushala"] as const).map((a) => {
        const t = totals(data.transaksi, a);
        return (
          <div key={a} className={`relative overflow-hidden rounded-2xl p-5 text-white ${a === "warga" ? "bg-brand" : "bg-sage-600"}`}>
            <div className="bg-blueprint-dark absolute inset-0" />
            <div className="relative">
              <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/70">Saldo Kas {a === "warga" ? "Warga" : "Mushala"}</div>
              <div className="mt-2 font-display text-3xl font-semibold">{rupiah(saldo(data.transaksi, a))}</div>
              <div className="mt-3 flex gap-5 text-sm text-white/75">
                <span>Masuk {rupiah(t.masuk)}</span>
                <span>Keluar {rupiah(t.keluar)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Page() {
  return (
    <CrudPage
      collection="transaksi"
      index="08"
      eyebrow="Keuangan"
      title="Kas & Transaksi"
      description="Catat pemasukan dan pengeluaran kas warga maupun mushala. Saldo terhitung otomatis."
      icon={Wallet}
      idPrefix="t"
      header={<Summary />}
      searchKeys={["note", "category"]}
      filter={{ key: "akun", options: [{ value: "warga", label: "Kas Warga" }, { value: "mushala", label: "Kas Mushala" }] }}
      sort={(a, b) => b.date.localeCompare(a.date)}
      defaults={{ akun: "warga", type: "masuk", date: today(), amount: 0 }}
      transform={(v) => ({ ...v, amount: Number(v.amount) || 0 })}
      columns={[
        { label: "Keterangan", primary: true, render: (r) => <span className="font-medium text-concrete-900">{r.note}</span> },
        { label: "Akun", render: (r) => <Badge tone={r.akun === "warga" ? "maroon" : "sage"}>{r.akun}</Badge> },
        { label: "Kategori", render: (r) => r.category },
        { label: "Tanggal", render: (r) => tanggal(r.date), className: "whitespace-nowrap" },
        {
          label: "Nominal",
          className: "text-right whitespace-nowrap",
          render: (r) => <span className={`font-mono font-semibold ${r.type === "masuk" ? "text-sage-600" : "text-maroon-700"}`}>{r.type === "masuk" ? "+" : "−"}{rupiah(r.amount)}</span>,
        },
      ]}
      fields={[
        { key: "akun", label: "Akun kas", type: "select", options: [{ value: "warga", label: "Kas Warga" }, { value: "mushala", label: "Kas Mushala" }] },
        { key: "type", label: "Jenis", type: "select", options: [{ value: "masuk", label: "Pemasukan" }, { value: "keluar", label: "Pengeluaran" }] },
        { key: "amount", label: "Nominal (Rp)", type: "number", required: true },
        { key: "date", label: "Tanggal", type: "date", required: true },
        { key: "category", label: "Kategori", required: true, placeholder: "mis. Iuran Bulanan" },
        { key: "note", label: "Keterangan", required: true },
      ]}
    />
  );
}
