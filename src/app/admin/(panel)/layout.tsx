import { PageData } from "@/components/page-data";
import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/shell";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin Padma" }, robots: { index: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <PageData><AdminShell>{children}</AdminShell></PageData>;
}
