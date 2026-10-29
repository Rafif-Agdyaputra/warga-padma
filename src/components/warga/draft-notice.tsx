import { AlertTriangle, ShieldCheck } from "lucide-react";

export function DraftNotice({ text = "Kiriman Anda akan disimpan sebagai draft dan baru tampil untuk warga setelah disetujui admin." }: { text?: string }) {
  return (
    <div className="flex gap-3 rounded-xl border border-sage-100 bg-sage-50 p-3.5 text-[13px] leading-relaxed text-sage-700">
      <ShieldCheck className="mt-0.5 size-4 shrink-0" />
      {text}
    </div>
  );
}

export function HoaxWarning() {
  return (
    <div className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50">
      <div className="hairline-stripe h-1.5" />
      <div className="flex gap-3 p-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-400 text-concrete-900">
          <AlertTriangle className="size-4" />
        </span>
        <div className="text-[13px] leading-relaxed text-concrete-700">
          <p className="font-semibold text-concrete-900">Dilarang menyebarkan pengaduan atau keluhan palsu</p>
          <p className="mt-0.5">
            Pastikan laporan sesuai fakta dan tidak mengandung fitnah, SARA, atau data pribadi orang lain.
            Pengaduan palsu dapat ditindak sesuai aturan lingkungan dan UU ITE.
          </p>
        </div>
      </div>
    </div>
  );
}
