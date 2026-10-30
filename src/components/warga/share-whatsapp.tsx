"use client";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui";

export function ShareWhatsApp({ title, path }: { title: string; path: string }) {
  return <Button type="button" variant="outline" icon={Share2} onClick={() => {
    const url = new URL(path, window.location.origin).href;
    const text = `${title}\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }}>Bagikan via WhatsApp</Button>;
}
