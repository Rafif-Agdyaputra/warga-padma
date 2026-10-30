"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { ImagePlus, X, type LucideIcon } from "lucide-react";
import { cn, readImage } from "@/lib/utils";
import type { ModerationStatus } from "@/lib/types";

/* ---------- button ---------- */
type BtnVariant = "primary" | "secondary" | "ghost" | "accent" | "danger" | "outline";
const btnStyles: Record<BtnVariant, string> = {
  primary: "bg-brand text-white shadow-[0_8px_20px_-10px_rgb(128_24_24/0.7)] hover:brightness-110",
  secondary: "bg-sage-500 text-white hover:bg-sage-600",
  accent: "bg-amber-400 text-concrete-900 hover:bg-amber-500",
  ghost: "text-concrete-600 hover:bg-concrete-100",
  outline: "border border-concrete-300 bg-white text-concrete-700 hover:border-concrete-400 hover:bg-concrete-50",
  danger: "bg-maroon-50 text-maroon-700 hover:bg-maroon-100",
};

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm" | "md" | "lg"; icon?: LucideIcon }
>(function Button({ variant = "primary", size = "md", icon: Icon, className, children, ...props }, ref) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
        size === "sm" && "h-8 px-3 text-xs",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-12 px-5 text-sm",
        btnStyles[variant],
        className,
      )}
      {...props}
    >
      {Icon && <Icon className={size === "sm" ? "size-3.5" : "size-4"} />}
      {children}
    </button>
  );
});

/* ---------- badge ---------- */
type Tone = "maroon" | "sage" | "amber" | "neutral";
const toneStyles: Record<Tone, string> = {
  maroon: "bg-maroon-50 text-maroon-700 ring-maroon-100",
  sage: "bg-sage-50 text-sage-600 ring-sage-100",
  amber: "bg-amber-50 text-amber-600 ring-amber-100",
  neutral: "bg-concrete-100 text-concrete-600 ring-concrete-200",
};
export function Badge({ tone = "neutral", children, className, dot }: { tone?: Tone; children: React.ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset", toneStyles[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: ModerationStatus }) {
  const map = {
    draft: { tone: "amber" as const, label: "Menunggu Review" },
    published: { tone: "sage" as const, label: "Tayang" },
    rejected: { tone: "maroon" as const, label: "Ditolak" },
  };
  return <Badge tone={map[status].tone} dot>{map[status].label}</Badge>;
}

/* ---------- section header ---------- */
export function PageHeader({
  index, eyebrow, title, description, action,
}: { index?: string; eyebrow: string; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
      <div className="animate-rise">
        <div className="mb-2 flex items-center gap-2">
          {index && <span className="font-mono text-[11px] font-semibold text-maroon-500">{index}</span>}
          <span className="h-px w-6 bg-concrete-300" />
          <span className="label-mono">{eyebrow}</span>
        </div>
        <h1 className="text-2xl font-semibold md:text-[32px] md:leading-tight">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-concrete-500 md:text-[15px]">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
    </div>
  );
}

/* ---------- form fields ---------- */
const fieldBase =
  "w-full rounded-xl border border-concrete-200 bg-concrete-50/60 px-3.5 text-sm text-concrete-800 placeholder:text-concrete-400 transition focus:border-maroon-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-maroon-100/60";

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[13px] font-medium text-concrete-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-concrete-400">{hint}</span>}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cn(fieldBase, "h-11", className)} {...p} />;
});

export function Textarea({ className, ...p }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldBase, "min-h-28 resize-y py-3", className)} {...p} />;
}

export function Select({ className, children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldBase, "h-11 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%237d776e%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[right_14px_center] bg-no-repeat pr-9", className)} {...p}>
      {children}
    </select>
  );
}

export function ImageInput({ value, onChange, preview }: { value?: string; onChange: (v?: string) => void; preview?: (value: string) => string | undefined }) {
  const ref = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  return (
    <div>
      {value ? (
        <div className="group relative overflow-hidden rounded-xl border border-concrete-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {(preview ? preview(value) : value) ? <img src={preview ? preview(value) : value} alt="" className="h-44 w-full object-cover" /> : <p className="p-4 text-sm text-concrete-600">Foto lama belum dipindahkan ke penyimpanan privat.</p>}
          <button type="button" onClick={() => onChange(undefined)} className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-concrete-900/70 text-white backdrop-blur transition hover:bg-concrete-900">
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-concrete-300 bg-concrete-50 text-sm text-concrete-500 transition hover:border-maroon-400 hover:bg-maroon-50/40 hover:text-maroon-600"
        >
          <ImagePlus className="size-6" />
          {loading ? "Memproses foto…" : "Klik untuk unggah foto"}
          <span className="text-[11px] text-concrete-400">JPG / PNG, otomatis dikompres</span>
        </button>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setLoading(true);
          try { onChange(await readImage(f)); } finally { setLoading(false); e.target.value = ""; }
        }}
      />
    </div>
  );
}

/* ---------- modal / bottom sheet ---------- */
export function Modal({
  open, onClose, title, subtitle, children, footer, size = "md",
}: { open: boolean; onClose: () => void; title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode; size?: "md" | "lg" }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center md:p-6">
      <div className="absolute inset-0 animate-fade bg-concrete-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal
        className={cn(
          "relative flex max-h-[92dvh] w-full animate-sheet flex-col overflow-hidden rounded-t-3xl bg-white shadow-lift md:rounded-3xl",
          size === "md" ? "md:max-w-lg" : "md:max-w-2xl",
        )}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-concrete-200 md:hidden" />
        <div className="flex items-start justify-between gap-4 border-b border-concrete-100 px-5 pb-4 pt-4 md:px-6 md:pt-5">
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            {subtitle && <p className="mt-0.5 text-sm text-concrete-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-full text-concrete-500 transition hover:bg-concrete-100">
            <X className="size-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5 md:px-6">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-concrete-100 bg-concrete-50/60 px-5 py-3.5 md:px-6">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- misc ---------- */
export function EmptyState({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text?: string }) {
  return (
    <div className="card bg-blueprint flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-concrete-100 text-concrete-500">
        <Icon className="size-5" />
      </div>
      <p className="font-medium text-concrete-800">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-concrete-500">{text}</p>}
    </div>
  );
}

const placeholderTones = [
  "from-maroon-700 to-maroon-500",
  "from-sage-600 to-sage-400",
  "from-concrete-700 to-concrete-500",
  "from-amber-500 to-amber-400",
];

export function Cover({ src, seed = "", icon: Icon, className }: { src?: string; seed?: string; icon: LucideIcon; className?: string }) {
  if (src)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={cn("h-full w-full object-cover", className)} />;
  const tone = placeholderTones[[...seed].reduce((s, c) => s + c.charCodeAt(0), 0) % placeholderTones.length];
  return (
    <div className={cn("relative grid h-full w-full place-items-center overflow-hidden bg-gradient-to-br", tone, className)}>
      <div className="bg-blueprint-dark absolute inset-0" />
      <Icon className="relative size-9 text-white/80" strokeWidth={1.5} />
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: string; count?: number }[] }) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0">
      {items.map((it) => (
        <button
          key={it.value}
          onClick={() => onChange(it.value)}
          className={cn(
            "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-all",
            value === it.value ? "bg-concrete-900 text-white shadow-soft" : "bg-white text-concrete-600 ring-1 ring-concrete-200 hover:ring-concrete-300",
          )}
        >
          {it.label}
          {it.count !== undefined && (
            <span className={cn("rounded-full px-1.5 text-[10px] font-semibold", value === it.value ? "bg-white/15" : "bg-concrete-100")}>{it.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Progress({ value, tone = "maroon" }: { value: number; tone?: "maroon" | "sage" | "amber" }) {
  const bg = { maroon: "bg-brand", sage: "bg-sage-500", amber: "bg-amber-400" }[tone];
  return (
    <div className="h-2 overflow-hidden rounded-full bg-concrete-100">
      <div className={cn("h-full rounded-full transition-[width] duration-700", bg)} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name.replace(/^(H\.|Hj\.)\s*/, "").split(" ").map((s) => s[0]).slice(0, 2).join("");
  return (
    <div className={cn("grid size-11 shrink-0 place-items-center rounded-2xl bg-sage-100 font-display text-sm font-semibold text-sage-700", className)}>
      {initials}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <div className={cn("size-7 animate-spin rounded-full border-2 border-concrete-300 border-t-maroon-600", className)} />;
}
