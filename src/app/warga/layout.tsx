import { WargaShell } from "@/components/warga/shell";

export default function WargaLayout({ children }: { children: React.ReactNode }) {
  return <WargaShell>{children}</WargaShell>;
}
