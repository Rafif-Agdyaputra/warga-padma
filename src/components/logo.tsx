import { cn } from "@/lib/utils";

export function Logo({ className, light, sub = "Portal Warga" }: { className?: string; light?: boolean; sub?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative grid size-9 place-items-center rounded-xl bg-yellow-500 shadow-[0_6px_16px_-8px_rgba(234,179,8,0.8)]">
        <svg viewBox="0 0 24 24" className="size-5 text-white" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          {/* kelopak padma + atap */}
          <path d="M12 20c-4-1.5-6-4.5-6-8 2 .5 4 2 6 4.5C14 14 16 12.5 18 12c0 3.5-2 6.5-6 8Z" />
          <path d="M12 16.5C10.5 14 10.5 10.5 12 7c1.5 3.5 1.5 7 0 9.5Z" />
          <path d="M4 9.5 12 3l8 6.5" />
        </svg>
        <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white bg-orange-500" />
      </div>
      <div className="leading-none">
        <div className={cn("font-display text-[15px] font-semibold tracking-tight", light ? "text-white" : "text-concrete-900")}>Padma</div>
        <div className={cn("mt-1 font-mono text-[9.5px] uppercase tracking-[0.18em]", light ? "text-white/60" : "text-concrete-500")}>{sub}</div>
      </div>
    </div>
  );
}