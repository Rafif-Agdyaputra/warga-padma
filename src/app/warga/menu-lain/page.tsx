import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { menuLain } from "@/components/warga/nav";

export const metadata = { title: "Menu Lain" };
export default function Page() {
  return <><PageHeader eyebrow="Layanan Warga" title="Menu Lain" description="Jelajahi informasi dan layanan lainnya untuk warga Padma." /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{menuLain.map((item) => <Link key={item.href} href={item.href} className="card flex min-w-0 items-center gap-3 p-4 transition hover:border-maroon-200 hover:shadow-lift"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-maroon-50 text-maroon-700"><item.icon className="size-5" /></span><span className="min-w-0 flex-1"><span className="block font-semibold">{item.label}</span><span className="mt-0.5 block text-sm text-concrete-500">{item.desc}</span></span><ChevronRight className="size-4 shrink-0 text-concrete-400" /></Link>)}</div></>;
}
