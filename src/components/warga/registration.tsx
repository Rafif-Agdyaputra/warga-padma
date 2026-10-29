"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import type { WargaRelation } from "@/lib/types";
import { Field, Input, Select } from "@/components/ui";

export interface RegFields { fullName: string; phone: string; houseId: string; relation: WargaRelation }

// id rumah = kode internal (tetap), yang ditampilkan selalu blok + nomor terkini di denah
export function useHouseName() {
  const { data } = useStore();
  return (id?: string | null, fallback?: string) => {
    const h = id ? data.houses.find((x) => x.id === id) : undefined;
    return h ? h.label || `${h.blok}-${h.nomor}` : fallback ?? "-";
  };
}

export const relationLabel: Record<WargaRelation, string> = { pemilik: "Pemilik rumah", penyewa: "Penyewa / kontrak", keluarga: "Anggota keluarga" };

export const phoneOk = (p: string) => /^[0-9+()\- ]{8,20}$/.test(p.trim()) && p.replace(/\D/g, "").length >= 9;

// minimal 8 karakter, ada huruf dan angka
export function passwordIssue(p: string) {
  if (p.length < 8) return "Minimal 8 karakter";
  if (!/[a-zA-Z]/.test(p) || !/\d/.test(p)) return "Gabungkan huruf dan angka";
  return null;
}

export function RegistrationFields({ value, onChange }: { value: RegFields; onChange: (v: RegFields) => void }) {
  const { data } = useStore();
  const groups = useMemo(() => {
    const m = new Map<string, typeof data.houses>();
    for (const h of data.houses) m.set(h.blok, [...(m.get(h.blok) ?? []), h]);
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [data.houses]);
  const set = (patch: Partial<RegFields>) => onChange({ ...value, ...patch });

  return (
    <>
      <Field label="Nama lengkap" hint="Sesuai identitas, untuk dicocokkan pengurus">
        <Input required minLength={3} maxLength={80} value={value.fullName} onChange={(e) => set({ fullName: e.target.value })} autoComplete="name" />
      </Field>
      <Field label="No. HP / WhatsApp" hint={value.phone && !phoneOk(value.phone) ? "Nomor tidak valid" : undefined}>
        <Input required type="tel" value={value.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="08xx xxxx xxxx" autoComplete="tel" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nomor rumah">
          <Select required value={value.houseId} onChange={(e) => set({ houseId: e.target.value })}>
            <option value="" disabled>Pilih rumah…</option>
            {groups.map(([blok, hs]) => (
              <optgroup key={blok} label={`Blok ${blok}`}>
                {hs.map((h) => <option key={h.id} value={h.id}>{h.label || `${h.blok}-${h.nomor}`}</option>)}
              </optgroup>
            ))}
          </Select>
        </Field>
        <Field label="Status di rumah">
          <Select value={value.relation} onChange={(e) => set({ relation: e.target.value as WargaRelation })}>
            {(Object.keys(relationLabel) as WargaRelation[]).map((r) => <option key={r} value={r}>{relationLabel[r]}</option>)}
          </Select>
        </Field>
      </div>
    </>
  );
}

export function AuthCard({ eyebrow, title, subtitle, children }: { eyebrow: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-lg animate-rise">
      <div className="card rivets overflow-hidden">
        <div className="hairline-stripe h-1.5" />
        <div className="p-6 pt-8 md:p-8 md:pt-10">
          <div className="label-mono">{eyebrow}</div>
          <h1 className="mt-1.5 text-2xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-concrete-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
