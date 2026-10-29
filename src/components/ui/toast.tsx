"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, Info, AlertTriangle } from "lucide-react";

type Tone = "success" | "info" | "warning";
interface T { id: number; msg: string; tone: Tone }

const Ctx = createContext<(msg: string, tone?: Tone) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<T[]>([]);
  const push = useCallback((msg: string, tone: Tone = "success") => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, msg, tone }]);
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), 3200);
  }, []);
  const icons = { success: CheckCircle2, info: Info, warning: AlertTriangle };
  const colors = { success: "text-sage-500", info: "text-maroon-500", warning: "text-amber-500" };

  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex flex-col items-center gap-2 px-4 md:bottom-6">
        {items.map((t) => {
          const Icon = icons[t.tone];
          return (
            <div key={t.id} className="pointer-events-auto flex animate-sheet items-center gap-3 rounded-2xl bg-concrete-900 px-4 py-3 text-sm text-white shadow-lift">
              <Icon className={`size-4 ${colors[t.tone]}`} />
              {t.msg}
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
