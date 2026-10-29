"use client";

import { useStore } from "@/lib/store";
import type { House } from "@/lib/types";
import { Compass, DEFAULT_SETTINGS, HouseShape, MapBackground, MapDefs, MapItemShape } from "@/components/map/render";

export { statusStyle } from "@/components/map/render";

export function HouseMap({
  houses, selected, onSelect, highlight, compact,
}: {
  houses: House[];
  selected?: string;
  onSelect?: (h: House) => void;
  highlight?: Set<string> | null;
  compact?: boolean;
}) {
  const { data } = useStore();
  const settings = data.mapSettings[0] ?? DEFAULT_SETTINGS;
  const items = [...data.mapItems].sort((a, b) => a.z - b.z);

  return (
    <svg viewBox={`0 0 ${settings.width} ${settings.height}`} className="block h-auto w-full select-none" role="img" aria-label="Denah Perumahan Padma">
      <MapDefs />
      <MapBackground settings={settings} />
      {items.map((it) => <MapItemShape key={it.id} item={it} compact={compact} />)}
      {houses.map((h) => (
        <g
          key={h.id}
          onClick={() => onSelect?.(h)}
          className={onSelect ? "cursor-pointer outline-none focus:outline-none focus-visible:outline-none [&_rect]:transition-all [&_rect]:duration-200 hover:[&_rect]:brightness-95" : undefined}
          style={{ outline: "none", WebkitTapHighlightColor: "transparent" }}
          role={onSelect ? "button" : undefined}
          tabIndex={onSelect ? 0 : undefined}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect?.(h)}
          aria-label={`Rumah ${h.label || `${h.blok}-${h.nomor}`}${h.owner ? `, ${h.owner}` : ""}`}
        >
          <HouseShape house={h} selected={selected === h.id} hit={!!highlight?.has(h.id)} dim={!!highlight && !highlight.has(h.id)} />
        </g>
      ))}
      {!compact && <Compass settings={settings} />}
    </svg>
  );
}
