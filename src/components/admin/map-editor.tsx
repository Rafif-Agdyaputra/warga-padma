"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignHorizontalSpaceAround,
  AlignStartHorizontal, AlignStartVertical, AlignVerticalSpaceAround, BoxSelect, ListOrdered, Scaling,
  BringToFront, Copy, Grid3x3, Home, ImagePlus, Landmark, Minus, MousePointer2, Plus, RotateCcw, RotateCw,
  Rows3, Save, SendToBack, Spline, Tag, Trash2, Trees, Undo2, X,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { getSupabase } from "@/lib/supabase/client";
import { cn, readImage } from "@/lib/utils";
import type { House, HouseStatus, MapItem, MapItemKind, MapSettings } from "@/lib/types";
import { Compass, DEFAULT_SETTINGS, HouseShape, MapBackground, MapDefs, MapItemShape, houseLabel } from "@/components/map/render";
import { Badge, Button, Field, Input, Modal, Select } from "@/components/ui";
import { useToast } from "@/components/ui/toast";

type Ref = { type: "house" | "item"; id: string };
type Sel = Ref | null;
type Box = { x: number; y: number; w: number; h: number; rotation?: number };
type Drag = { mode: "move" | "resize" | "marquee"; sx: number; sy: number; origs: { ref: Ref; box: Box }[]; base: Ref[] } | null;
type Rect = { x: number; y: number; w: number; h: number };

const refKey = (r: Ref) => `${r.type}:${r.id}`;

// kotak pembatas (aabb) objek yang sudah diputar
function aabb(b: Box): Rect {
  const r = ((b.rotation ?? 0) * Math.PI) / 180;
  const cos = Math.abs(Math.cos(r));
  const sin = Math.abs(Math.sin(r));
  const w = b.w * cos + b.h * sin;
  const h = b.w * sin + b.h * cos;
  return { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h };
}
const intersects = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const contains = (a: Rect, b: Rect) => b.x >= a.x && b.y >= a.y && b.x + b.w <= a.x + a.w && b.y + b.h <= a.y + a.h;
type Snapshot = { houses: House[]; items: MapItem[] };

const itemPresets: Record<MapItemKind, Partial<MapItem>> = {
  jalan: { w: 300, h: 40, label: "JL. BARU", tone: "netral", z: 0 },
  hijau: { w: 200, h: 40, tone: "hijau", z: 1 },
  fasilitas: { w: 160, h: 76, label: "FASILITAS", sublabel: "Keterangan", tone: "netral", z: 1 },
  label: { w: 80, h: 24, label: "BLOK E", tone: "netral", z: 2 },
};
const kindName: Record<MapItemKind, string> = { jalan: "Jalan", hijau: "Area hijau", fasilitas: "Fasilitas", label: "Label" };

const num = (v: string, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const normRot = (r: number) => ((Math.round(r) % 360) + 360) % 360;

export function MapEditor() {
  const { data, ready, refresh } = useStore();
  const toast = useToast();
  const svgRef = useRef<SVGSVGElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [houses, setHouses] = useState<House[]>([]);
  const [items, setItems] = useState<MapItem[]>([]);
  const [settings, setSettings] = useState<MapSettings>(DEFAULT_SETTINGS);
  const [removed, setRemoved] = useState<{ houses: string[]; items: string[] }>({ houses: [], items: [] });
  const [dirty, setDirty] = useState(false);
  const [sels, setSels] = useState<Ref[]>([]);
  const [drag, setDrag] = useState<Drag>(null);
  const [marquee, setMarquee] = useState<Rect | null>(null);
  const sel: Sel = sels.length === 1 ? sels[0] : null;
  const setSel = useCallback((r: Sel) => setSels(r ? [r] : []), []);
  const selKeys = useMemo(() => new Set(sels.map(refKey)), [sels]);
  const [zoom, setZoom] = useState(1);
  const [snap, setSnap] = useState(true);
  const [grid, setGrid] = useState(5);
  const [showBg, setShowBg] = useState(true);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [rowOpen, setRowOpen] = useState(false);
  const [find, setFind] = useState("");

  // salin data server ke draft editor selama belum ada perubahan
  useEffect(() => {
    if (!ready || dirty) return;
    setHouses(data.houses.map((h) => ({ ...h, rotation: h.rotation ?? 0 })));
    setItems(data.mapItems);
    setSettings(data.mapSettings[0] ?? DEFAULT_SETTINGS);
  }, [ready, dirty, data.houses, data.mapItems, data.mapSettings]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const sn = useCallback((v: number) => (snap ? Math.round(v / grid) * grid : Math.round(v)), [snap, grid]);

  const pushHistory = useCallback(() => {
    setHistory((h) => [...h.slice(-49), { houses, items }]);
  }, [houses, items]);

  const undo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setHouses(last.houses);
    setItems(last.items);
    setHistory((h) => h.slice(0, -1));
    setDirty(true);
  };

  const selHouse = sel?.type === "house" ? houses.find((h) => h.id === sel.id) : undefined;
  const selItem = sel?.type === "item" ? items.find((i) => i.id === sel.id) : undefined;
  const selObj: Box | undefined = selHouse ?? selItem;

  const getObj = useCallback((r: Ref): Box | undefined =>
    r.type === "house" ? houses.find((h) => h.id === r.id) : items.find((i) => i.id === r.id), [houses, items]);

  // ubah banyak objek sekaligus; fn mengembalikan patch per objek
  const patchMany = useCallback((refs: Ref[], fn: (b: Box, r: Ref) => Partial<House & MapItem> | null) => {
    const hp = new Map<string, Partial<House>>();
    const ip = new Map<string, Partial<MapItem>>();
    for (const r of refs) {
      const o = getObj(r);
      if (!o) continue;
      const patch = fn(o, r);
      if (!patch) continue;
      (r.type === "house" ? hp : ip).set(r.id, patch);
    }
    if (!hp.size && !ip.size) return;
    setDirty(true);
    if (hp.size) setHouses((l) => l.map((h) => (hp.has(h.id) ? ({ ...h, ...hp.get(h.id) } as House) : h)));
    if (ip.size) setItems((l) => l.map((i) => (ip.has(i.id) ? ({ ...i, ...ip.get(i.id) } as MapItem) : i)));
  }, [getObj]);

  const patchSel = useCallback((patch: Partial<House & MapItem>, target: Sel = sel) => {
    if (!target) return;
    setDirty(true);
    if (target.type === "house") setHouses((l) => l.map((h) => (h.id === target.id ? { ...h, ...patch } as House : h)));
    else setItems((l) => l.map((i) => (i.id === target.id ? { ...i, ...patch } as MapItem : i)));
  }, [sel]);

  // titik tengah area yang sedang terlihat (koordinat kanvas)
  const viewCenter = () => {
    const el = scrollRef.current;
    const svg = svgRef.current;
    if (!el || !svg) return { x: settings.width / 2, y: settings.height / 2 };
    const scale = svg.getBoundingClientRect().width / settings.width;
    return { x: (el.scrollLeft + el.clientWidth / 2) / scale, y: (el.scrollTop + el.clientHeight / 2) / scale };
  };

  const nextHouseId = (blok: string, nomor: number) => {
    const base = `${blok}-${nomor}`;
    return houses.some((h) => h.id === base) ? `${base}-${Math.random().toString(36).slice(2, 6)}` : base;
  };

  const addHouse = () => {
    pushHistory();
    const c = viewCenter();
    const blok = selHouse?.blok ?? houses[houses.length - 1]?.blok ?? "A";
    const nomor = Math.max(0, ...houses.filter((h) => h.blok === blok).map((h) => h.nomor)) + 1;
    const h: House = {
      id: nextHouseId(blok, nomor), blok, nomor, owner: "Belum berpenghuni", phone: "-", status: "kosong", penghuni: 0,
      x: sn(c.x - 22), y: sn(c.y - 45), w: selHouse?.w ?? 44, h: selHouse?.h ?? 90, rotation: 0,
    };
    setHouses((l) => [...l, h]);
    setSel({ type: "house", id: h.id });
    setDirty(true);
  };

  const addItem = (kind: MapItemKind) => {
    pushHistory();
    const c = viewCenter();
    const p = itemPresets[kind];
    const it: MapItem = {
      id: crypto.randomUUID(), kind, tone: "netral", rotation: 0, z: 0, ...p,
      x: sn(c.x - (p.w ?? 100) / 2), y: sn(c.y - (p.h ?? 40) / 2), w: p.w ?? 100, h: p.h ?? 40,
    } as MapItem;
    setItems((l) => [...l, it]);
    setSel({ type: "item", id: it.id });
    setDirty(true);
  };

  const duplicate = () => {
    if (!sels.length) return;
    pushHistory();
    if (selHouse) {
      const nomor = selHouse.nomor + 1;
      const h = { ...selHouse, id: nextHouseId(selHouse.blok, nomor), nomor, label: undefined, x: selHouse.x + selHouse.w + 6, owner: "Belum berpenghuni", phone: "-", status: "kosong" as HouseStatus, penghuni: 0 };
      setHouses((l) => [...l, h]);
      setSel({ type: "house", id: h.id });
    } else if (selItem) {
      const it = { ...selItem, id: crypto.randomUUID(), x: selItem.x + 20, y: selItem.y + 20 };
      setItems((l) => [...l, it]);
      setSel({ type: "item", id: it.id });
    } else {
      // banyak objek: salin semuanya bergeser 20px
      const used = new Set(houses.map((h) => h.id));
      const newHouses: House[] = [];
      const newItems: MapItem[] = [];
      for (const r of sels) {
        if (r.type === "house") {
          const h = houses.find((x) => x.id === r.id);
          if (!h) continue;
          let id = `${h.blok}-${h.nomor}`;
          while (used.has(id)) id = `${h.blok}-${h.nomor}-${Math.random().toString(36).slice(2, 6)}`;
          used.add(id);
          newHouses.push({ ...h, id, label: undefined, x: h.x + 20, y: h.y + 20, owner: "Belum berpenghuni", phone: "-", status: "kosong", penghuni: 0 });
        } else {
          const it = items.find((x) => x.id === r.id);
          if (it) newItems.push({ ...it, id: crypto.randomUUID(), x: it.x + 20, y: it.y + 20 });
        }
      }
      setHouses((l) => [...l, ...newHouses]);
      setItems((l) => [...l, ...newItems]);
      setSels([...newHouses.map((h) => ({ type: "house" as const, id: h.id })), ...newItems.map((i) => ({ type: "item" as const, id: i.id }))]);
    }
    setDirty(true);
  };

  const removeSel = () => {
    if (!sels.length) return;
    const hIds = sels.filter((r) => r.type === "house").map((r) => r.id);
    const iIds = sels.filter((r) => r.type === "item").map((r) => r.id);
    if (hIds.length && !confirm(hIds.length === 1 && selHouse ? `Hapus rumah ${houseLabel(selHouse)} beserta datanya?` : `Hapus ${hIds.length} rumah${iIds.length ? ` dan ${iIds.length} elemen` : ""} beserta datanya?`)) return;
    pushHistory();
    setHouses((l) => l.filter((h) => !hIds.includes(h.id)));
    setItems((l) => l.filter((i) => !iIds.includes(i.id)));
    setRemoved((r) => ({ houses: [...r.houses, ...hIds], items: [...r.items, ...iIds] }));
    setSels([]);
    setDirty(true);
  };

  const rotateSel = (deg: number) => patchMany(sels, (b) => ({ rotation: normRot((b.rotation ?? 0) + deg) }));

  const layer = (dir: 1 | -1) => {
    if (!selItem) return;
    pushHistory();
    patchSel({ z: selItem.z + dir });
  };

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") { e.preventDefault(); undo(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setSels(houses.map((h) => ({ type: "house", id: h.id })));
        return;
      }
      if (!sels.length) return;
      const step = e.shiftKey ? 10 : 1;
      const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (moves[e.key]) {
        e.preventDefault();
        const [mx, my] = moves[e.key];
        if (!e.repeat) pushHistory();
        patchMany(sels, (b) => ({ x: b.x + mx, y: b.y + my }));
      } else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); removeSel(); }
      else if (e.key === "Escape") setSels([]);
      else if (e.key.toLowerCase() === "r") { pushHistory(); rotateSel(e.shiftKey ? -90 : 90); }
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") { e.preventDefault(); duplicate(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // pointer -> koordinat kanvas
  const toSvg = (e: React.PointerEvent) => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM()!.inverse());
  };

  const startDrag = (e: React.PointerEvent, target: Ref, mode: "move" | "resize") => {
    e.stopPropagation();
    e.preventDefault();
    if (!getObj(target)) return;
    // shift / ctrl / cmd + klik = tambah atau lepas dari pilihan
    if (mode === "move" && (e.shiftKey || e.metaKey || e.ctrlKey)) {
      setSels((l) => (l.some((r) => refKey(r) === refKey(target)) ? l.filter((r) => refKey(r) !== refKey(target)) : [...l, target]));
      return;
    }
    const group = mode === "move" && selKeys.has(refKey(target)) ? sels : [target];
    if (!(mode === "move" && selKeys.has(refKey(target)))) setSels([target]);
    pushHistory();
    const p = toSvg(e);
    // objek yang diklik jadi acuan snap, sisanya ikut bergeser dengan jarak tetap
    const ordered = [target, ...group.filter((r) => refKey(r) !== refKey(target))];
    const origs = ordered.flatMap((ref) => {
      const o = getObj(ref);
      return o ? [{ ref, box: { x: o.x, y: o.y, w: o.w, h: o.h, rotation: o.rotation ?? 0 } }] : [];
    });
    setDrag({ mode, sx: p.x, sy: p.y, origs, base: [] });
    svgRef.current?.setPointerCapture(e.pointerId);
  };

  const startMarquee = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const p = toSvg(e);
    const additive = e.shiftKey || e.metaKey || e.ctrlKey;
    const base = additive ? sels : [];
    if (!additive) setSels([]);
    setDrag({ mode: "marquee", sx: p.x, sy: p.y, origs: [], base });
    svgRef.current?.setPointerCapture(e.pointerId);
  };

  const onMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const p = toSvg(e);
    const dx = p.x - drag.sx;
    const dy = p.y - drag.sy;

    if (drag.mode === "marquee") {
      const r = { x: Math.min(drag.sx, p.x), y: Math.min(drag.sy, p.y), w: Math.abs(dx), h: Math.abs(dy) };
      if (r.w + r.h < 4) return;
      setMarquee(r);
      // rumah cukup tersentuh, elemen besar (jalan dll) harus masuk penuh
      const hits: Ref[] = [
        ...houses.filter((h) => intersects(r, aabb(h))).map((h) => ({ type: "house" as const, id: h.id })),
        ...items.filter((i) => contains(r, aabb(i))).map((i) => ({ type: "item" as const, id: i.id })),
      ];
      const keys = new Set(drag.base.map(refKey));
      setSels([...drag.base, ...hits.filter((h) => !keys.has(refKey(h)))]);
      return;
    }

    if (Math.abs(dx) + Math.abs(dy) < 0.5 || !drag.origs.length) return;
    if (drag.mode === "move") {
      const lead = drag.origs[0].box;
      const ddx = sn(lead.x + dx) - lead.x;
      const ddy = sn(lead.y + dy) - lead.y;
      const byKey = new Map(drag.origs.map((o) => [refKey(o.ref), o.box]));
      patchMany(drag.origs.map((o) => o.ref), (_b, r) => {
        const o = byKey.get(refKey(r))!;
        return { x: o.x + ddx, y: o.y + ddy };
      });
    } else {
      // ubah ukuran pada sumbu lokal objek yang diputar
      const { ref, box } = drag.origs[0];
      const a = (-(box.rotation ?? 0) * Math.PI) / 180;
      const lx = dx * Math.cos(a) - dy * Math.sin(a);
      const ly = dx * Math.sin(a) + dy * Math.cos(a);
      patchSel({ w: Math.max(8, sn(box.w + lx)), h: Math.max(8, sn(box.h + ly)) }, ref);
    }
  };

  const endDrag = () => {
    setDrag(null);
    setMarquee(null);
  };

  // ---------- aksi banyak objek ----------
  const selBoxes = sels.flatMap((r) => { const o = getObj(r); return o ? [{ r, o }] : []; });

  const align = (mode: "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom") => {
    if (selBoxes.length < 2) return;
    pushHistory();
    const minX = Math.min(...selBoxes.map(({ o }) => o.x));
    const maxX = Math.max(...selBoxes.map(({ o }) => o.x + o.w));
    const minY = Math.min(...selBoxes.map(({ o }) => o.y));
    const maxY = Math.max(...selBoxes.map(({ o }) => o.y + o.h));
    patchMany(sels, (b) => ({
      left: { x: minX }, right: { x: maxX - b.w }, hcenter: { x: Math.round((minX + maxX) / 2 - b.w / 2) },
      top: { y: minY }, bottom: { y: maxY - b.h }, vcenter: { y: Math.round((minY + maxY) / 2 - b.h / 2) },
    }[mode]));
  };

  // jarak sama rata antara objek pertama dan terakhir (urut posisi)
  const distribute = (axis: "x" | "y", gap?: number) => {
    if (selBoxes.length < 3 && gap === undefined) return;
    pushHistory();
    const size = axis === "x" ? "w" : "h";
    const sorted = [...selBoxes].sort((a, b) => a.o[axis] - b.o[axis]);
    const first = sorted[0].o;
    const last = sorted[sorted.length - 1].o;
    const total = sorted.reduce((s2, { o }) => s2 + o[size], 0);
    const g = gap ?? (last[axis] + last[size] - first[axis] - total) / (sorted.length - 1);
    const pos = new Map<string, number>();
    let cur = first[axis];
    for (const { r, o } of sorted) { pos.set(refKey(r), Math.round(cur)); cur += o[size] + g; }
    patchMany(sels, (_b, r) => ({ [axis]: pos.get(refKey(r)) }));
  };

  const matchSize = () => {
    const lead = selBoxes[0]?.o;
    if (!lead) return;
    pushHistory();
    patchMany(sels, () => ({ w: lead.w, h: lead.h }));
  };

  const renumber = (blok: string, start: number, order: "x" | "y", prefixLabel: boolean) => {
    const hs = selBoxes.filter(({ r }) => r.type === "house").sort((a, b) => order === "x" ? a.o.x - b.o.x || a.o.y - b.o.y : a.o.y - b.o.y || a.o.x - b.o.x);
    if (!hs.length) return;
    pushHistory();
    const no = new Map(hs.map(({ r }, i) => [r.id, start + i]));
    patchMany(hs.map(({ r }) => r), (_b, r) => ({ blok: blok.toUpperCase(), nomor: no.get(r.id), ...(prefixLabel ? {} : { label: undefined }) }));
    toast(`${hs.length} rumah dinomori ${blok.toUpperCase()}${start}–${blok.toUpperCase()}${start + hs.length - 1}`);
  };

  const bulkStatus = (status: HouseStatus) => {
    pushHistory();
    patchMany(sels.filter((r) => r.type === "house"), () => ({ status }));
  };

  const bloks = useMemo(() => [...new Set(houses.map((h) => h.blok))].sort(), [houses]);

  const uploadBackground = async (file: File) => {
    setUploading(true);
    try {
      const dataUrl = await readImage(file, 2000);
      const img = new Image();
      await new Promise((r) => { img.onload = r; img.src = dataUrl; });
      const sb = getSupabase();
      const { data: auth } = await sb.auth.getUser();
      if (!auth.user) throw new Error("Sesi admin berakhir, silakan masuk ulang");
      const blob = await (await fetch(dataUrl)).blob();
      const path = `${auth.user.id}/siteplan-${crypto.randomUUID()}.jpg`;
      const { error } = await sb.storage.from("uploads").upload(path, blob, { contentType: "image/jpeg" });
      if (error) throw error;
      const url = sb.storage.from("uploads").getPublicUrl(path).data.publicUrl;
      setSettings((s) => ({ ...s, backgroundUrl: url, height: Math.round((s.width * img.height) / img.width) }));
      setShowBg(true);
      setDirty(true);
      toast("Siteplan diunggah — tinggi kanvas disesuaikan dengan gambar");
    } catch (err) {
      toast(`Gagal mengunggah: ${(err as Error).message}`, "warning");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    const sb = getSupabase();
    try {
      const s = settings;
      const r1 = await sb.from("map_settings").upsert({
        id: 1, width: s.width, height: s.height, background_url: s.backgroundUrl ?? null,
        background_opacity: s.backgroundOpacity, show_background: s.showBackground, updated_at: new Date().toISOString(),
      });
      if (r1.error) throw r1.error;

      const goneHouses = removed.houses.filter((id) => !houses.some((h) => h.id === id));
      const goneItems = removed.items.filter((id) => !items.some((i) => i.id === id));
      if (goneHouses.length) { const r = await sb.from("houses").delete().in("id", goneHouses); if (r.error) throw r.error; }
      if (goneItems.length) { const r = await sb.from("map_items").delete().in("id", goneItems); if (r.error) throw r.error; }

      if (houses.length) {
        const r = await sb.from("houses").upsert(houses.map((h) => ({
          id: h.id, blok: h.blok, nomor: h.nomor, owner: h.owner, phone: h.phone, status: h.status, penghuni: h.penghuni,
          x: Math.round(h.x), y: Math.round(h.y), w: Math.round(h.w), h: Math.round(h.h), rotation: normRot(h.rotation ?? 0), label: h.label || null,
        })));
        if (r.error) throw r.error;
      }
      if (items.length) {
        const r = await sb.from("map_items").upsert(items.map((i) => ({
          id: i.id, kind: i.kind, label: i.label || null, sublabel: i.sublabel || null, tone: i.tone,
          x: Math.round(i.x), y: Math.round(i.y), w: Math.round(i.w), h: Math.round(i.h), rotation: normRot(i.rotation), z: i.z,
        })));
        if (r.error) throw r.error;
      }
      await refresh();
      setRemoved({ houses: [], items: [] });
      setHistory([]);
      setDirty(false);
      toast("Denah tersimpan dan langsung tampil di halaman warga");
    } catch (err) {
      const e = err as { message?: string };
      toast(`Gagal menyimpan denah: ${e.message ?? "periksa koneksi"}`, "warning");
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    if (!confirm("Buang semua perubahan yang belum disimpan?")) return;
    setRemoved({ houses: [], items: [] });
    setHistory([]);
    setSel(null);
    setDirty(false);
  };

  const sortedItems = useMemo(() => [...items].sort((a, b) => a.z - b.z), [items]);
  const findResults = useMemo(() => {
    const q = find.trim().toLowerCase().replace(/[-\s]/g, "");
    if (!q) return [];
    return houses.filter((h) => houseLabel(h).toLowerCase().replace(/[-\s]/g, "").includes(q) || h.owner.toLowerCase().includes(q)).slice(0, 6);
  }, [find, houses]);

  const tool = "flex h-9 items-center gap-1.5 rounded-xl px-3 text-[13px] font-medium text-concrete-700 transition hover:bg-concrete-100";

  return (
    <div className="space-y-4">
      {/* toolbar */}
      <div className="card flex flex-wrap items-center gap-1 p-2">
        <button className={tool} onClick={addHouse}><Home className="size-4 text-maroon-600" />Rumah</button>
        <button className={tool} onClick={() => setRowOpen(true)}><Rows3 className="size-4 text-maroon-600" />Baris rumah</button>
        <span className="mx-1 h-6 w-px bg-concrete-200" />
        <button className={tool} onClick={() => addItem("jalan")}><Spline className="size-4 text-concrete-500" />Jalan</button>
        <button className={tool} onClick={() => addItem("hijau")}><Trees className="size-4 text-sage-500" />Area hijau</button>
        <button className={tool} onClick={() => addItem("fasilitas")}><Landmark className="size-4 text-amber-600" />Fasilitas</button>
        <button className={tool} onClick={() => addItem("label")}><Tag className="size-4 text-concrete-500" />Label</button>
        <span className="mx-1 h-6 w-px bg-concrete-200" />
        <button className={cn(tool, snap && "bg-concrete-900 text-white hover:bg-concrete-800")} onClick={() => setSnap((v) => !v)} title="Tempel ke grid">
          <Grid3x3 className="size-4" />Snap {snap && `${grid}px`}
        </button>
        <button className={tool} onClick={undo} disabled={!history.length} title="Urungkan (Ctrl/Cmd+Z)"><Undo2 className="size-4" /></button>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl bg-concrete-100 p-1">
            <button onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))} className="grid size-7 place-items-center rounded-lg hover:bg-white" aria-label="Perkecil"><Minus className="size-3.5" /></button>
            <span className="w-11 text-center font-mono text-[11px]">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))} className="grid size-7 place-items-center rounded-lg hover:bg-white" aria-label="Perbesar"><Plus className="size-3.5" /></button>
          </div>
          {dirty && <Button variant="ghost" size="sm" onClick={discard}>Buang</Button>}
          <Button size="sm" icon={Save} onClick={save} disabled={!dirty || saving}>{saving ? "Menyimpan…" : dirty ? "Simpan Denah" : "Tersimpan"}</Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* kanvas */}
        <div className="card relative min-w-0 overflow-hidden">
          <div ref={scrollRef} className="max-h-[72vh] overflow-auto bg-concrete-100">
            <div className="p-4" style={{ width: `max(${Math.round(zoom * 100)}%, ${Math.round(zoom * 760)}px)` }}>
              <svg
                ref={svgRef}
                viewBox={`0 0 ${settings.width} ${settings.height}`}
                className="block h-auto w-full select-none rounded-lg bg-white shadow-soft"
                onPointerMove={onMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onPointerDown={startMarquee}
              >
                <MapDefs />
                <MapBackground settings={settings} forceShow={showBg} />
                {sortedItems.map((it) => (
                  <g key={it.id} onPointerDown={(e) => startDrag(e, { type: "item", id: it.id }, "move")} className="cursor-move" style={{ touchAction: "none" }}>
                    <MapItemShape item={it} />
                  </g>
                ))}
                {houses.map((h) => (
                  <g key={h.id} onPointerDown={(e) => startDrag(e, { type: "house", id: h.id }, "move")} className="cursor-move" style={{ touchAction: "none" }}>
                    <HouseShape house={h} selected={selKeys.has(`house:${h.id}`)} />
                  </g>
                ))}
                <Compass settings={settings} />
                {sels.length > 1 && selBoxes.map(({ r, o }) => (
                  <rect
                    key={refKey(r)}
                    x={o.x - 3} y={o.y - 3} width={o.w + 6} height={o.h + 6} rx="6"
                    transform={o.rotation ? `rotate(${o.rotation} ${o.x + o.w / 2} ${o.y + o.h / 2})` : undefined}
                    fill="none" stroke="#eca825" strokeWidth="2" strokeDasharray="5 4" pointerEvents="none"
                  />
                ))}
                {sel && selObj && (
                  <g transform={selObj.rotation ? `rotate(${selObj.rotation} ${selObj.x + selObj.w / 2} ${selObj.y + selObj.h / 2})` : undefined}>
                    <rect x={selObj.x - 3} y={selObj.y - 3} width={selObj.w + 6} height={selObj.h + 6} rx="6" fill="none" stroke="#eca825" strokeWidth="2" strokeDasharray="5 4" pointerEvents="none" />
                    <rect
                      x={selObj.x + selObj.w - 5} y={selObj.y + selObj.h - 5} width="12" height="12" rx="3"
                      fill="#fff" stroke="#801818" strokeWidth="2" className="cursor-nwse-resize" style={{ touchAction: "none" }}
                      onPointerDown={(e) => startDrag(e, sel, "resize")}
                    />
                  </g>
                )}
                {marquee && (
                  <rect x={marquee.x} y={marquee.y} width={marquee.w} height={marquee.h} fill="#eca825" fillOpacity=".08" stroke="#d8941a" strokeWidth="1.5" strokeDasharray="6 4" pointerEvents="none" />
                )}
              </svg>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-concrete-100 px-4 py-2.5 text-[11.5px] text-concrete-500">
            <span className="flex items-center gap-1"><MousePointer2 className="size-3.5" />Seret objek untuk memindah, kotak pojok untuk ubah ukuran</span>
            <span className="flex items-center gap-1"><BoxSelect className="size-3.5" />Seret di area kosong untuk memilih banyak</span>
            <span><kbd className="font-mono">Shift</kbd>+klik tambah/lepas pilihan</span>
            <span><kbd className="font-mono">Ctrl/⌘ A</kbd> pilih semua rumah</span>
            <span><kbd className="font-mono">←↑→↓</kbd> geser 1px (Shift 10px)</span>
            <span><kbd className="font-mono">R</kbd> putar 90°</span>
            <span><kbd className="font-mono">Ctrl/⌘ D</kbd> duplikat</span>
            <span><kbd className="font-mono">Del</kbd> hapus</span>
            <span className="ml-auto font-mono">{sels.length > 0 && `${sels.length} dipilih · `}{houses.length} rumah · {items.length} elemen{dirty && " · belum disimpan"}</span>
          </div>
        </div>

        {/* inspector */}
        <aside className="card h-fit p-4 xl:sticky xl:top-24" onFocusCapture={(e) => { if ((e.target as HTMLElement).dataset.hist !== "0") pushHistory(); }}>
          {sels.length > 1 && (
            <MultiPanel
              count={sels.length}
              houseCount={sels.filter((r) => r.type === "house").length}
              defaultBlok={selBoxes.find(({ r }) => r.type === "house") ? (houses.find((h) => h.id === selBoxes.find(({ r }) => r.type === "house")!.r.id)?.blok ?? "A") : "A"}
              onClear={() => setSels([])}
              onAlign={align}
              onDistribute={distribute}
              onMatchSize={matchSize}
              onRotate={(d) => { pushHistory(); rotateSel(d); }}
              onSetRotation={(deg) => { pushHistory(); patchMany(sels, () => ({ rotation: normRot(deg) })); }}
              onRenumber={renumber}
              onStatus={bulkStatus}
              onDuplicate={duplicate}
              onDelete={removeSel}
            />
          )}

          {sels.length === 0 && (
            <div className="space-y-5">
              <div>
                <div className="label-mono mb-2">Pilih cepat</div>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => setSels(houses.map((h) => ({ type: "house", id: h.id })))} className="rounded-full bg-concrete-900 px-3 py-1 text-xs font-medium text-white">Semua rumah</button>
                  {bloks.map((b) => (
                    <button key={b} onClick={() => setSels(houses.filter((h) => h.blok === b).map((h) => ({ type: "house", id: h.id })))} className="rounded-full bg-concrete-100 px-3 py-1 font-mono text-xs font-semibold text-concrete-700 hover:bg-concrete-200">
                      Blok {b}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="label-mono mb-2">Cari unit</div>
                <Input value={find} onChange={(e) => setFind(e.target.value)} placeholder="mis. A5 atau nama pemilik" className="h-10" data-hist="0" />
                {findResults.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {findResults.map((h) => (
                      <button key={h.id} onClick={() => { setSel({ type: "house", id: h.id }); setFind(""); }} className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-concrete-50">
                        <span className="font-mono font-semibold">{houseLabel(h)}</span>
                        <span className="truncate pl-2 text-xs text-concrete-500">{h.owner}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="label-mono mb-2">Siteplan (latar)</div>
                {settings.backgroundUrl ? (
                  <div className="space-y-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={settings.backgroundUrl} alt="Siteplan" className="h-28 w-full rounded-xl border border-concrete-200 object-cover" />
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" icon={ImagePlus} onClick={() => fileRef.current?.click()} disabled={uploading}>Ganti</Button>
                      <Button size="sm" variant="danger" icon={X} onClick={() => { setSettings((s) => ({ ...s, backgroundUrl: undefined, showBackground: false })); setDirty(true); }}>Hapus</Button>
                    </div>
                    <Field label={`Transparansi latar · ${Math.round(settings.backgroundOpacity * 100)}%`}>
                      <input type="range" min="0.1" max="1" step="0.05" value={settings.backgroundOpacity} data-hist="0"
                        onChange={(e) => { setSettings((s) => ({ ...s, backgroundOpacity: Number(e.target.value) })); setDirty(true); }}
                        className="w-full accent-maroon-600" />
                    </Field>
                    <label className="flex items-center gap-2 text-sm text-concrete-700">
                      <input type="checkbox" checked={showBg} onChange={(e) => setShowBg(e.target.checked)} className="size-4 accent-maroon-600" data-hist="0" />
                      Tampilkan di editor
                    </label>
                    <label className="flex items-center gap-2 text-sm text-concrete-700">
                      <input type="checkbox" checked={settings.showBackground} data-hist="0"
                        onChange={(e) => { setSettings((s) => ({ ...s, showBackground: e.target.checked })); setDirty(true); }}
                        className="size-4 accent-maroon-600" />
                      Tampilkan juga di halaman warga
                    </label>
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="flex h-28 w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-concrete-300 bg-concrete-50 text-sm text-concrete-500 transition hover:border-maroon-400 hover:text-maroon-600"
                  >
                    <ImagePlus className="size-5" />
                    {uploading ? "Mengunggah…" : "Unggah gambar siteplan"}
                    <span className="text-[11px] text-concrete-400">Foto/scan denah asli sebagai acuan</span>
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadBackground(f); e.target.value = ""; }} />
              </div>

              <div>
                <div className="label-mono mb-2">Ukuran kanvas</div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Lebar"><Input type="number" min={200} max={6000} value={settings.width} className="h-10" onChange={(e) => { setSettings((s) => ({ ...s, width: num(e.target.value, s.width) })); setDirty(true); }} /></Field>
                  <Field label="Tinggi"><Input type="number" min={200} max={6000} value={settings.height} className="h-10" onChange={(e) => { setSettings((s) => ({ ...s, height: num(e.target.value, s.height) })); setDirty(true); }} /></Field>
                </div>
                <div className="mt-2">
                  <Field label="Ukuran grid snap (px)">
                    <Select value={grid} onChange={(e) => setGrid(Number(e.target.value))} className="h-10" data-hist="0">
                      {[1, 2, 5, 10, 20].map((g) => <option key={g} value={g}>{g}</option>)}
                    </Select>
                  </Field>
                </div>
              </div>
              <p className="rounded-xl bg-sage-50 p-3 text-xs leading-relaxed text-sage-700">
                Tips: unggah siteplan, atur transparansi, lalu geser setiap rumah tepat di atas kavlingnya. Klik objek untuk mengubah detailnya.
              </p>
            </div>
          )}

          {selHouse && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="label-mono">Rumah</div>
                  <div className="font-display text-2xl font-semibold">{houseLabel(selHouse)}</div>
                </div>
                <button onClick={() => setSel(null)} className="grid size-8 place-items-center rounded-full hover:bg-concrete-100"><X className="size-4" /></button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Blok"><Input className="h-10" value={selHouse.blok} onChange={(e) => patchSel({ blok: e.target.value.toUpperCase() })} /></Field>
                <Field label="Nomor"><Input className="h-10" type="number" value={selHouse.nomor} onChange={(e) => patchSel({ nomor: num(e.target.value, selHouse.nomor) })} /></Field>
                <Field label="Label"><Input className="h-10" value={selHouse.label ?? ""} placeholder="opsional" onChange={(e) => patchSel({ label: e.target.value })} /></Field>
              </div>
              <GeometryFields obj={selHouse} onChange={patchSel} onRotate={(d) => { pushHistory(); rotateSel(d); }} />
              <div className="space-y-3 border-t border-concrete-100 pt-4">
                <div className="label-mono">Data penghuni</div>
                <Field label="Pemilik"><Input className="h-10" value={selHouse.owner} onChange={(e) => patchSel({ owner: e.target.value })} /></Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Status">
                    <Select className="h-10" value={selHouse.status} onChange={(e) => patchSel({ status: e.target.value as HouseStatus })}>
                      <option value="dihuni">Dihuni</option><option value="disewakan">Disewakan</option><option value="kosong">Kosong</option>
                    </Select>
                  </Field>
                  <Field label="Penghuni"><Input className="h-10" type="number" min={0} value={selHouse.penghuni} onChange={(e) => patchSel({ penghuni: num(e.target.value) })} /></Field>
                </div>
                <Field label="Telepon"><Input className="h-10" value={selHouse.phone} onChange={(e) => patchSel({ phone: e.target.value })} /></Field>
              </div>
              <ObjActions onDuplicate={duplicate} onDelete={removeSel} />
            </div>
          )}

          {selItem && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="label-mono">Elemen</div>
                  <div className="font-display text-xl font-semibold">{kindName[selItem.kind]}</div>
                </div>
                <button onClick={() => setSel(null)} className="grid size-8 place-items-center rounded-full hover:bg-concrete-100"><X className="size-4" /></button>
              </div>
              <Field label="Jenis">
                <Select className="h-10" value={selItem.kind} onChange={(e) => patchSel({ kind: e.target.value as MapItemKind })}>
                  {(Object.keys(kindName) as MapItemKind[]).map((k) => <option key={k} value={k}>{kindName[k]}</option>)}
                </Select>
              </Field>
              <Field label="Teks"><Input className="h-10" value={selItem.label ?? ""} onChange={(e) => patchSel({ label: e.target.value })} /></Field>
              {selItem.kind === "fasilitas" && (
                <>
                  <Field label="Keterangan"><Input className="h-10" value={selItem.sublabel ?? ""} onChange={(e) => patchSel({ sublabel: e.target.value })} /></Field>
                  <Field label="Warna">
                    <Select className="h-10" value={selItem.tone} onChange={(e) => patchSel({ tone: e.target.value as MapItem["tone"] })}>
                      <option value="netral">Netral</option><option value="aksen">Aksen (marun)</option><option value="hijau">Hijau</option>
                    </Select>
                  </Field>
                </>
              )}
              <GeometryFields obj={selItem} onChange={patchSel} onRotate={(d) => { pushHistory(); rotateSel(d); }} />
              <div>
                <div className="mb-1.5 text-[13px] font-medium text-concrete-700">Lapisan <Badge className="ml-1">{selItem.z}</Badge></div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" icon={SendToBack} onClick={() => layer(-1)}>Ke belakang</Button>
                  <Button size="sm" variant="outline" icon={BringToFront} onClick={() => layer(1)}>Ke depan</Button>
                </div>
              </div>
              <ObjActions onDuplicate={duplicate} onDelete={removeSel} />
            </div>
          )}
        </aside>
      </div>

      <RowDialog
        open={rowOpen}
        onClose={() => setRowOpen(false)}
        defaultBlok={selHouse?.blok ?? "E"}
        onCreate={(cfg) => {
          pushHistory();
          const c = viewCenter();
          const total = cfg.jumlah * (cfg.arah === "h" ? cfg.w + cfg.gap : cfg.h + cfg.gap);
          const sx = sn(cfg.arah === "h" ? c.x - total / 2 : c.x - cfg.w / 2);
          const sy = sn(cfg.arah === "h" ? c.y - cfg.h / 2 : c.y - total / 2);
          const used = new Set(houses.map((h) => h.id));
          const fresh: House[] = Array.from({ length: cfg.jumlah }, (_, i) => {
            const nomor = cfg.mulai + i;
            let id = `${cfg.blok}-${nomor}`;
            if (used.has(id)) id = `${id}-${Math.random().toString(36).slice(2, 6)}`;
            used.add(id);
            return {
              id, blok: cfg.blok, nomor, owner: "Belum berpenghuni", phone: "-", status: "kosong", penghuni: 0,
              x: cfg.arah === "h" ? sx + i * (cfg.w + cfg.gap) : sx,
              y: cfg.arah === "h" ? sy : sy + i * (cfg.h + cfg.gap),
              w: cfg.w, h: cfg.h, rotation: cfg.rotation,
            };
          });
          setHouses((l) => [...l, ...fresh]);
          setDirty(true);
          setRowOpen(false);
          toast(`${fresh.length} rumah ditambahkan — seret ke posisinya`, "info");
        }}
      />
    </div>
  );
}

function GeometryFields({ obj, onChange, onRotate }: { obj: Box; onChange: (p: Partial<Box>) => void; onRotate: (deg: number) => void }) {
  const f = (k: keyof Box, label: string) => (
    <Field label={label}>
      <Input className="h-10 font-mono" type="number" value={obj[k] ?? 0} onChange={(e) => onChange({ [k]: num(e.target.value, obj[k] ?? 0) })} />
    </Field>
  );
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">{f("x", "X")}{f("y", "Y")}{f("w", "Lebar")}{f("h", "Tinggi")}</div>
      <div className="flex items-end gap-2">
        <div className="flex-1">{f("rotation", "Rotasi (°)")}</div>
        <Button size="sm" variant="outline" className="h-10" icon={RotateCcw} onClick={() => onRotate(-90)} aria-label="Putar kiri" />
        <Button size="sm" variant="outline" className="h-10" icon={RotateCw} onClick={() => onRotate(90)} aria-label="Putar kanan" />
      </div>
      <input type="range" min={0} max={359} value={obj.rotation ?? 0} onChange={(e) => onChange({ rotation: Number(e.target.value) })} className="w-full accent-maroon-600" />
    </div>
  );
}

function ObjActions({ onDuplicate, onDelete }: { onDuplicate: () => void; onDelete: () => void }) {
  return (
    <div className="flex gap-2 border-t border-concrete-100 pt-4">
      <Button size="sm" variant="outline" icon={Copy} onClick={onDuplicate} className="flex-1">Duplikat</Button>
      <Button size="sm" variant="danger" icon={Trash2} onClick={onDelete} className="flex-1">Hapus</Button>
    </div>
  );
}

interface RowCfg { blok: string; mulai: number; jumlah: number; arah: "h" | "v"; w: number; h: number; gap: number; rotation: number }

function RowDialog({ open, onClose, onCreate, defaultBlok }: { open: boolean; onClose: () => void; onCreate: (c: RowCfg) => void; defaultBlok: string }) {
  const [cfg, setCfg] = useState<RowCfg>({ blok: defaultBlok, mulai: 1, jumlah: 8, arah: "h", w: 44, h: 90, gap: 6, rotation: 0 });
  useEffect(() => { if (open) setCfg((c) => ({ ...c, blok: defaultBlok })); }, [open, defaultBlok]);
  const set = (k: keyof RowCfg, v: string) => setCfg((c) => ({ ...c, [k]: k === "blok" || k === "arah" ? (k === "blok" ? v.toUpperCase() : v) : num(v) }));
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tambah Baris Rumah"
      subtitle="Membuat beberapa unit berjajar sekaligus"
      footer={<><Button variant="ghost" onClick={onClose}>Batal</Button><Button onClick={() => onCreate(cfg)}>Tambahkan {cfg.jumlah} rumah</Button></>}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="Blok"><Input value={cfg.blok} onChange={(e) => set("blok", e.target.value)} /></Field>
        <Field label="Nomor awal"><Input type="number" min={1} value={cfg.mulai} onChange={(e) => set("mulai", e.target.value)} /></Field>
        <Field label="Jumlah"><Input type="number" min={1} max={60} value={cfg.jumlah} onChange={(e) => set("jumlah", e.target.value)} /></Field>
        <Field label="Arah">
          <Select value={cfg.arah} onChange={(e) => set("arah", e.target.value)}>
            <option value="h">Mendatar</option><option value="v">Menurun</option>
          </Select>
        </Field>
        <Field label="Lebar unit"><Input type="number" min={8} value={cfg.w} onChange={(e) => set("w", e.target.value)} /></Field>
        <Field label="Tinggi unit"><Input type="number" min={8} value={cfg.h} onChange={(e) => set("h", e.target.value)} /></Field>
        <Field label="Jarak antar unit"><Input type="number" min={0} value={cfg.gap} onChange={(e) => set("gap", e.target.value)} /></Field>
        <Field label="Hadap (rotasi)">
          <Select value={cfg.rotation} onChange={(e) => set("rotation", e.target.value)}>
            <option value={0}>Atas (0°)</option><option value={90}>Kanan (90°)</option><option value={180}>Bawah (180°)</option><option value={270}>Kiri (270°)</option>
          </Select>
        </Field>
      </div>
    </Modal>
  );
}

function MultiPanel(p: {
  count: number;
  houseCount: number;
  defaultBlok: string;
  onClear: () => void;
  onAlign: (m: "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom") => void;
  onDistribute: (axis: "x" | "y", gap?: number) => void;
  onMatchSize: () => void;
  onRotate: (deg: number) => void;
  onSetRotation: (deg: number) => void;
  onRenumber: (blok: string, start: number, order: "x" | "y", keepLabel: boolean) => void;
  onStatus: (s: HouseStatus) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [gap, setGap] = useState(6);
  const [blok, setBlok] = useState(p.defaultBlok);
  const [start, setStart] = useState(1);
  const [order, setOrder] = useState<"x" | "y">("x");
  useEffect(() => setBlok(p.defaultBlok), [p.defaultBlok]);

  const ic = "grid h-9 flex-1 place-items-center rounded-lg border border-concrete-200 text-concrete-600 transition hover:border-maroon-200 hover:bg-maroon-50/40 hover:text-maroon-700 disabled:opacity-40";
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="label-mono">Pilihan</div>
          <div className="font-display text-xl font-semibold">{p.count} objek</div>
          <div className="text-xs text-concrete-500">{p.houseCount} rumah · {p.count - p.houseCount} elemen</div>
        </div>
        <button onClick={p.onClear} className="grid size-8 place-items-center rounded-full hover:bg-concrete-100" aria-label="Batal pilih"><X className="size-4" /></button>
      </div>

      <div>
        <div className="mb-1.5 text-[13px] font-medium text-concrete-700">Rata</div>
        <div className="flex gap-1.5">
          <button className={ic} title="Rata kiri" onClick={() => p.onAlign("left")}><AlignStartVertical className="size-4" /></button>
          <button className={ic} title="Tengah horizontal" onClick={() => p.onAlign("hcenter")}><AlignCenterVertical className="size-4" /></button>
          <button className={ic} title="Rata kanan" onClick={() => p.onAlign("right")}><AlignEndVertical className="size-4" /></button>
          <button className={ic} title="Rata atas" onClick={() => p.onAlign("top")}><AlignStartHorizontal className="size-4" /></button>
          <button className={ic} title="Tengah vertikal" onClick={() => p.onAlign("vcenter")}><AlignCenterHorizontal className="size-4" /></button>
          <button className={ic} title="Rata bawah" onClick={() => p.onAlign("bottom")}><AlignEndHorizontal className="size-4" /></button>
        </div>
      </div>

      <div>
        <div className="mb-1.5 text-[13px] font-medium text-concrete-700">Jarak antar objek</div>
        <div className="flex gap-1.5">
          <button className={ic} title="Samakan jarak mendatar" disabled={p.count < 3} onClick={() => p.onDistribute("x")}><AlignHorizontalSpaceAround className="size-4" /></button>
          <button className={ic} title="Samakan jarak menurun" disabled={p.count < 3} onClick={() => p.onDistribute("y")}><AlignVerticalSpaceAround className="size-4" /></button>
          <button className={ic} title="Samakan ukuran dengan objek pertama" onClick={p.onMatchSize}><Scaling className="size-4" /></button>
        </div>
        <div className="mt-2 flex items-end gap-1.5">
          <Field label="Jarak tetap (px)" className="flex-1"><Input type="number" min={0} value={gap} onChange={(e) => setGap(num(e.target.value))} className="h-9" data-hist="0" /></Field>
          <Button size="sm" variant="outline" className="h-9" onClick={() => p.onDistribute("x", gap)}>Mendatar</Button>
          <Button size="sm" variant="outline" className="h-9" onClick={() => p.onDistribute("y", gap)}>Menurun</Button>
        </div>
      </div>

      <div>
        <div className="mb-1.5 text-[13px] font-medium text-concrete-700">Rotasi semua</div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" className="h-9" icon={RotateCcw} onClick={() => p.onRotate(-90)} aria-label="Putar kiri" />
          <Button size="sm" variant="outline" className="h-9" icon={RotateCw} onClick={() => p.onRotate(90)} aria-label="Putar kanan" />
          {[0, 90, 180, 270].map((d) => (
            <button key={d} onClick={() => p.onSetRotation(d)} className="h-9 flex-1 rounded-lg border border-concrete-200 font-mono text-xs text-concrete-600 hover:border-maroon-200 hover:text-maroon-700">{d}°</button>
          ))}
        </div>
      </div>

      {p.houseCount > 0 && (
        <div className="space-y-3 border-t border-concrete-100 pt-4">
          <div className="label-mono flex items-center gap-1.5"><ListOrdered className="size-3.5" />Penomoran {p.houseCount} rumah</div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Blok"><Input className="h-9" value={blok} onChange={(e) => setBlok(e.target.value.toUpperCase())} data-hist="0" /></Field>
            <Field label="Mulai nomor"><Input className="h-9" type="number" min={1} value={start} onChange={(e) => setStart(num(e.target.value, 1))} data-hist="0" /></Field>
          </div>
          <Field label="Urutan">
            <Select className="h-9" value={order} onChange={(e) => setOrder(e.target.value as "x" | "y")} data-hist="0">
              <option value="x">Kiri → kanan</option>
              <option value="y">Atas → bawah</option>
            </Select>
          </Field>
          <Button size="sm" variant="secondary" className="w-full" onClick={() => p.onRenumber(blok, start, order, false)}>
            Terapkan {blok}{start}–{blok}{start + p.houseCount - 1}
          </Button>
          <Field label="Status hunian semua">
            <Select className="h-9" defaultValue="" onChange={(e) => { if (e.target.value) p.onStatus(e.target.value as HouseStatus); e.target.value = ""; }} data-hist="0">
              <option value="" disabled>Pilih status…</option>
              <option value="dihuni">Dihuni</option><option value="disewakan">Disewakan</option><option value="kosong">Kosong</option>
            </Select>
          </Field>
        </div>
      )}

      <ObjActions onDuplicate={p.onDuplicate} onDelete={p.onDelete} />
    </div>
  );
}
