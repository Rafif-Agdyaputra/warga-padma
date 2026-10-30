"use client";

import { useMemo, useState } from "react";
import { Check, Pencil, Plus, Search, Trash2, X, type LucideIcon } from "lucide-react";
import { pengaduanPhotoUrl } from "@/lib/pengaduan-photo";
import { useStore } from "@/lib/store";
import { cn, uid } from "@/lib/utils";
import type { ModerationStatus, StoreData } from "@/lib/types";
import { Button, EmptyState, Field, ImageInput, Input, Modal, PageHeader, Select, Tabs, Textarea } from "@/components/ui";
import { useToast } from "@/components/ui/toast";

type Collection = keyof StoreData;
type Row<K extends Collection> = StoreData[K][number];

export interface FieldDef {
  key: string;
  label: string;
  type?: "text" | "textarea" | "select" | "date" | "number" | "image" | "tel" | "checkbox" | "time" | "custom";
  options?: { value: string; label: string }[] | string[];
  required?: boolean;
  full?: boolean;
  placeholder?: string;
  hint?: string;
  // tampilkan field hanya jika kondisi terpenuhi
  showIf?: (form: Record<string, unknown>) => boolean;
  // untuk type "custom": render editor sendiri
  render?: (value: unknown, set: (v: unknown) => void, form: Record<string, unknown>) => React.ReactNode;
}

export interface ColDef<T> {
  label: string;
  render: (row: T) => React.ReactNode;
  className?: string;
  primary?: boolean;
}

interface Props<K extends Collection> {
  collection: K;
  index?: string;
  eyebrow: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  columns: ColDef<Row<K>>[];
  fields: FieldDef[];
  defaults: Partial<Row<K>>;
  moderated?: boolean;
  searchKeys?: string[];
  filter?: { key: string; options: { value: string; label: string }[] };
  header?: React.ReactNode;
  idPrefix?: string;
  canCreate?: boolean;
  canDelete?: boolean;
  sort?: (a: Row<K>, b: Row<K>) => number;
  transform?: (v: Record<string, unknown>) => Record<string, unknown>;
}

export function CrudPage<K extends Collection>(p: Props<K>) {
  const { data, add, update, remove } = useStore();
  const toast = useToast();
  const rows = data[p.collection] as Row<K>[];
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<string>("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});

  const filterKey = p.moderated ? "status" : p.filter?.key;
  const filterOptions = p.moderated
    ? [{ value: "draft", label: "Draft" }, { value: "published", label: "Tayang" }, { value: "rejected", label: "Ditolak" }]
    : p.filter?.options;

  const list = useMemo(() => {
    let l = rows as unknown as Record<string, unknown>[];
    if (filterKey && tab !== "all") l = l.filter((r) => r[filterKey] === tab);
    if (q && p.searchKeys) l = l.filter((r) => p.searchKeys!.some((k) => String(r[k] ?? "").toLowerCase().includes(q.toLowerCase())));
    const out = l as unknown as Row<K>[];
    return p.sort ? [...out].sort(p.sort) : out;
  }, [rows, tab, q, filterKey, p.searchKeys, p.sort]);

  const countBy = (v: string) => (rows as unknown as Record<string, unknown>[]).filter((r) => filterKey && r[filterKey] === v).length;

  const openNew = () => { setForm({ ...p.defaults }); setEditing(null); setOpen(true); };
  const openEdit = (r: Row<K>) => { setForm({ ...(r as object) }); setEditing((r as { id: string }).id); setOpen(true); };

  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = p.transform ? p.transform(form) : form;
    setSaving(true);
    const ok = editing
      ? await update(p.collection, editing, val as Partial<Row<K>>)
      : await add(p.collection, { ...(val as object), id: uid(p.idPrefix ?? "x") } as Row<K>);
    setSaving(false);
    if (!ok) return;
    toast(editing ? "Perubahan disimpan" : "Data ditambahkan");
    setOpen(false);
  };

  const setStatus = async (id: string, status: ModerationStatus) => {
    if (!(await update(p.collection, id, { status } as unknown as Partial<Row<K>>))) return;
    toast(status === "published" ? "Disetujui & ditayangkan" : status === "rejected" ? "Kiriman ditolak" : "Dikembalikan ke draft", status === "published" ? "success" : "info");
  };

  const del = async (id: string) => {
    if (!confirm("Hapus data ini secara permanen?")) return;
    if (await remove(p.collection, id)) toast("Data dihapus", "info");
  };

  const actions = (r: Row<K>) => {
    const row = r as unknown as { id: string; status?: ModerationStatus };
    return (
      <div className="flex items-center justify-end gap-1">
        {p.moderated && row.status !== "published" && (
          <button onClick={() => setStatus(row.id, "published")} title="Setujui" className="grid size-8 place-items-center rounded-lg bg-sage-50 text-sage-600 transition hover:bg-sage-500 hover:text-white"><Check className="size-4" /></button>
        )}
        {p.moderated && row.status === "draft" && (
          <button onClick={() => setStatus(row.id, "rejected")} title="Tolak" className="grid size-8 place-items-center rounded-lg bg-amber-50 text-amber-600 transition hover:bg-amber-400 hover:text-concrete-900"><X className="size-4" /></button>
        )}
        <button onClick={() => openEdit(r)} title="Edit" className="grid size-8 place-items-center rounded-lg text-concrete-500 transition hover:bg-concrete-100 hover:text-concrete-800"><Pencil className="size-4" /></button>
        {p.canDelete !== false && (
          <button onClick={() => del(row.id)} title="Hapus" className="grid size-8 place-items-center rounded-lg text-concrete-500 transition hover:bg-maroon-50 hover:text-maroon-700"><Trash2 className="size-4" /></button>
        )}
      </div>
    );
  };

  return (
    <>
      <PageHeader
        index={p.index}
        eyebrow={p.eyebrow}
        title={p.title}
        description={p.description}
        action={p.canCreate !== false && <Button icon={Plus} onClick={openNew}>Tambah Data</Button>}
      />

      {p.header}

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-concrete-100 p-4 md:flex-row md:items-center md:justify-between">
          {filterOptions ? (
            <Tabs
              value={tab}
              onChange={setTab}
              items={[{ value: "all", label: "Semua", count: rows.length }, ...filterOptions.map((o) => ({ ...o, count: countBy(o.value) }))]}
            />
          ) : <div className="label-mono">{rows.length} data</div>}
          {p.searchKeys && (
            <div className="relative md:w-64">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-concrete-400" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari…" className="h-10 pl-10" />
            </div>
          )}
        </div>

        {list.length === 0 ? (
          <div className="p-4"><EmptyState icon={p.icon} title="Tidak ada data" /></div>
        ) : (
          <>
            {/* tabel desktop */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-concrete-100 bg-concrete-50/70">
                    {p.columns.map((c) => <th key={c.label} className={cn("label-mono whitespace-nowrap px-4 py-3 !font-semibold", c.className)}>{c.label}</th>)}
                    <th className="label-mono px-4 py-3 text-right !font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-concrete-100">
                  {list.map((r) => (
                    <tr key={(r as { id: string }).id} className="transition hover:bg-concrete-50/60">
                      {p.columns.map((c) => <td key={c.label} className={cn("px-4 py-3 align-middle text-concrete-700", c.className)}>{c.render(r)}</td>)}
                      <td className="px-4 py-3">{actions(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* kartu mobile */}
            <div className="divide-y divide-concrete-100 md:hidden">
              {list.map((r) => (
                <div key={(r as { id: string }).id} className="p-4">
                  <div className="font-medium text-concrete-900">{(p.columns.find((c) => c.primary) ?? p.columns[0]).render(r)}</div>
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
                    {p.columns.filter((c) => c !== (p.columns.find((x) => x.primary) ?? p.columns[0])).map((c) => (
                      <div key={c.label} className="min-w-0">
                        <dt className="label-mono !text-[9.5px]">{c.label}</dt>
                        <dd className="truncate text-[13px] text-concrete-700">{c.render(r)}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-3 border-t border-concrete-100 pt-2">{actions(r)}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit ${p.title}` : `Tambah ${p.title}`}
        size="lg"
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Batal</Button><Button type="submit" form="crud-form" disabled={saving}>{saving ? "Menyimpan…" : "Simpan"}</Button></>}
      >
        <form id="crud-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          {p.fields.map((f) => {
            const v = form[f.key];
            const set = (val: unknown) => setForm((s) => ({ ...s, [f.key]: val }));
            const opts = (f.options ?? []).map((o) => (typeof o === "string" ? { value: o, label: o } : o));
            const full = f.full || f.type === "textarea" || f.type === "image" || f.type === "custom";
            if (f.showIf && !f.showIf(form)) return null;
            if (f.type === "custom" && f.render)
              return <div key={f.key} className="sm:col-span-2">{f.render(v, set, form)}</div>;
            if (f.type === "checkbox")
              return (
                <label key={f.key} className="flex items-center gap-2.5 text-sm text-concrete-700 sm:col-span-2">
                  <input type="checkbox" checked={!!v} onChange={(e) => set(e.target.checked)} className="size-4 accent-maroon-600" /> {f.label}
                </label>
              );
            return (
              <Field key={f.key} label={f.label} hint={f.hint} className={full ? "sm:col-span-2" : ""}>
                {f.type === "textarea" ? (
                  <Textarea required={f.required} value={(v as string) ?? ""} onChange={(e) => set(e.target.value)} placeholder={f.placeholder} />
                ) : f.type === "select" ? (
                  <Select required={f.required} value={(v as string) ?? ""} onChange={(e) => set(e.target.value)}>
                    {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Select>
                ) : f.type === "image" ? (
                  <ImageInput value={v as string | undefined} onChange={set} preview={p.collection === "pengaduan" ? pengaduanPhotoUrl : undefined} />
                ) : (
                  <Input
                    required={f.required}
                    type={f.type ?? "text"}
                    value={(v as string | number) ?? ""}
                    placeholder={f.placeholder}
                    onChange={(e) => set(f.type === "number" ? Number(e.target.value) : e.target.value)}
                  />
                )}
              </Field>
            );
          })}
        </form>
      </Modal>
    </>
  );
}
