export async function api<T = unknown>(url: string, method = "GET", body?: unknown): Promise<T> {
  const r = await fetch(url, {
    method, headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error ?? "خطا");
  return j;
}

/** آپلود مستقیم از مرورگر به Cloudinary (بدون محدودیت حجم سرور) */
export async function uploadMedia(file: File) {
  const kind = file.type.startsWith("video/") ? "VIDEO" : "IMAGE";
  const s = await api<{
    cloudName: string;
    apiKey: string;
    timestamp: number;
    folder: string;
    signature: string;
    resourceType: "image" | "video";
  }>("/api/upload/sign", "POST", { isVideo: kind === "VIDEO" });
  const fd = new FormData();
  fd.append("file", file);
  fd.append("api_key", s.apiKey);
  fd.append("timestamp", String(s.timestamp));
  fd.append("folder", s.folder);
  fd.append("signature", s.signature);
  const r = await fetch(`https://api.cloudinary.com/v1_1/${s.cloudName}/${kind === "VIDEO" ? "video" : "image"}/upload`, { method: "POST", body: fd });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message ?? "آپلود ناموفق بود");
  if (typeof j.secure_url !== "string") throw new Error("نشانی فایل آپلودشده دریافت نشد");
  return { mediaUrl: j.secure_url };
}
