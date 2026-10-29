import type { House, MapItem, MapSettings } from "@/lib/types";

export const DEFAULT_SETTINGS: MapSettings = { id: 1, width: 1000, height: 790, backgroundOpacity: 0.5, showBackground: false };

export const statusStyle = {
  dihuni: { fill: "#e0e7e3", stroke: "#53665c", label: "Dihuni", dot: "bg-sage-500" },
  disewakan: { fill: "#fbecc6", stroke: "#d8941a", label: "Disewakan", dot: "bg-amber-400" },
  kosong: { fill: "#f7f5f2", stroke: "#a9a298", label: "Kosong", dot: "bg-concrete-300" },
} as const;

export const houseLabel = (h: House) => h.label || `${h.blok}${h.nomor}`;

const rot = (r: number | undefined, x: number, y: number, w: number, h: number) =>
  r ? `rotate(${r} ${x + w / 2} ${y + h / 2})` : undefined;

export function MapDefs() {
  return (
    <defs>
      <pattern id="map-grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M20 0H0V20" fill="none" stroke="#2a2724" strokeOpacity=".05" />
      </pattern>
      <pattern id="map-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="8" stroke="#53665c" strokeOpacity=".22" strokeWidth="3" />
      </pattern>
      <linearGradient id="map-sel" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#801818" />
        <stop offset="1" stopColor="#ac145a" />
      </linearGradient>
      <filter id="map-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#801818" floodOpacity=".35" />
      </filter>
    </defs>
  );
}

export function MapBackground({ settings, forceShow }: { settings: MapSettings; forceShow?: boolean }) {
  const { width, height, backgroundUrl, backgroundOpacity, showBackground } = settings;
  return (
    <>
      <rect width={width} height={height} fill="#fbfaf8" />
      {backgroundUrl && (showBackground || forceShow) && (
        <image href={backgroundUrl} x="0" y="0" width={width} height={height} preserveAspectRatio="none" opacity={backgroundOpacity} />
      )}
      <rect width={width} height={height} fill="url(#map-grid)" pointerEvents="none" />
    </>
  );
}

export function MapItemShape({ item, compact }: { item: MapItem; compact?: boolean }) {
  const { x, y, w, h, label, sublabel } = item;
  const t = rot(item.rotation, x, y, w, h);
  const vertical = h > w;

  if (item.kind === "jalan")
    return (
      <g transform={t}>
        <rect x={x} y={y} width={w} height={h} rx="6" fill="#e3dfd8" />
        {vertical ? (
          <line x1={x + w / 2} y1={y + 20} x2={x + w / 2} y2={y + h - 20} stroke="#fbfaf8" strokeWidth="2" strokeDasharray="14 12" />
        ) : (
          <line x1={x + 20} y1={y + h / 2} x2={x + w - 20} y2={y + h / 2} stroke="#fbfaf8" strokeWidth="2" strokeDasharray="14 12" />
        )}
        {label && !compact && (
          <text
            x={vertical ? x + w / 2 : x + 20}
            y={vertical ? y + 24 : y + Math.min(h / 2 - 6, 24)}
            fontSize="11"
            fill="#7d776e"
            letterSpacing="2"
            className="font-mono"
            transform={vertical ? `rotate(90 ${x + w / 2} ${y + 24})` : undefined}
          >
            {label}
          </text>
        )}
      </g>
    );

  if (item.kind === "hijau")
    return (
      <g transform={t}>
        <rect x={x} y={y} width={w} height={h} rx="6" fill="url(#map-hatch)" />
        {label && !compact && <text x={x + 10} y={y + 16} fontSize="10" fill="#53665c" className="font-mono" letterSpacing="1">{label}</text>}
      </g>
    );

  if (item.kind === "label")
    return (
      <g transform={t}>
        <rect x={x} y={y} width={w} height={h} rx={Math.min(h / 2, 14)} fill="#2a2724" />
        <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" fontSize="11" fontWeight="600" fill="#fff" className="font-mono" letterSpacing="1.5">
          {label}
        </text>
      </g>
    );

  // fasilitas
  const tone = {
    netral: { fill: "#efece7", stroke: "#a9a298", text: "#3f3b36" },
    aksen: { fill: "#fbf1f3", stroke: "#ac145a", text: "#801818" },
    hijau: { fill: "url(#map-hatch)", stroke: "#53665c", text: "#3f3b36" },
  }[item.tone];
  return (
    <g transform={t}>
      <rect x={x} y={y} width={w} height={h} rx="10" fill={tone.fill} stroke={tone.stroke} strokeWidth="1.2" />
      {label && <text x={x + 14} y={y + Math.min(32, h / 2 + 4)} fontSize="12" fontWeight="700" fill={tone.text} className="font-mono" letterSpacing="1.2">{label}</text>}
      {sublabel && !compact && h >= 50 && <text x={x + 14} y={y + 52} fontSize="11" fill="#7d776e">{sublabel}</text>}
    </g>
  );
}

export function HouseShape({
  house, selected, hit, dim,
}: { house: House; selected?: boolean; hit?: boolean; dim?: boolean }) {
  const { x, y, w, h } = house;
  const s = statusStyle[house.status];
  const font = Math.max(8, Math.min(12, w / 3.6, h / 3));
  return (
    <g opacity={dim ? 0.28 : 1} className="transition-opacity duration-300">
      <g transform={rot(house.rotation, x, y, w, h)}>
        <rect
          x={x} y={y} width={w} height={h} rx={Math.min(7, w / 5)}
          fill={selected ? "url(#map-sel)" : s.fill}
          stroke={selected ? "#801818" : hit ? "#ac145a" : s.stroke}
          strokeWidth={selected || hit ? 2.2 : 1.2}
          strokeDasharray={house.status === "kosong" && !selected ? "4 3" : undefined}
          filter={selected ? "url(#map-shadow)" : undefined}
        />
        {/* atap = sisi depan rumah, diputar mengikuti rotasi */}
        {h >= 36 && (
          <path
            d={`M${x + w / 2 - Math.min(12, w / 3)} ${y + 18} l${Math.min(12, w / 3)} -8 l${Math.min(12, w / 3)} 8`}
            fill="none" stroke={selected ? "#fff" : s.stroke} strokeOpacity={selected ? 0.9 : 0.6}
            strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none"
          />
        )}
      </g>
      <text
        x={x + w / 2} y={y + h / 2 + font / 3}
        textAnchor="middle" fontSize={font} fontWeight="600"
        fill={selected ? "#fff" : "#3f3b36"} className="font-mono" pointerEvents="none"
      >
        {houseLabel(house)}
      </text>
    </g>
  );
}

export function Compass({ settings }: { settings: MapSettings }) {
  return (
    <g transform={`translate(${settings.width - 38} 112)`} pointerEvents="none">
      <circle r="20" fill="#fff" stroke="#cfc9bf" />
      <path d="M0 -13 L5 3 L0 0 L-5 3Z" fill="#801818" />
      <text y="-24" textAnchor="middle" fontSize="10" fontWeight="700" fill="#801818" className="font-mono">U</text>
    </g>
  );
}
