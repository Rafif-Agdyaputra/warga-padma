// Path saja disimpan di database; URL dibuat lokal dan tidak memberi akses publik.
export function pengaduanPhotoUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("data:")) return path;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f-]+\.jpg$/.test(path)) return undefined;
  return `/api/pengaduan-foto?path=${encodeURIComponent(path)}`;
}
