import { PageData } from "@/components/page-data";
import { WargaShell } from "@/components/warga/shell";

export default function WargaLayout({ children }: { children: React.ReactNode }) {
  return <PageData><WargaShell>{children}</WargaShell></PageData>;
}
