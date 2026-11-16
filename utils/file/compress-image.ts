import type { ImagePolicy } from "@/dto/file/file";

// WhatsApp-style compression in the browser, before upload: shrink to the
// policy's longest side, re-encode (WebP by default) at a quality where the
// loss isn't visible, and drop metadata (camera, GPS) by redrawing the pixels.
// The server does the same as a safety net, so anything this can't handle
// (HEIC on most browsers, animated GIFs) is simply uploaded as is.

const SKIP = new Set(["image/gif", "image/svg+xml"]);
const MIME: Record<string, string> = { webp: "image/webp", jpeg: "image/jpeg", png: "image/png" };
const EXT: Record<string, string> = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function renamed(name: string, type: string): string {
  const ext = EXT[type];
  return ext ? `${name.replace(/\.[A-Za-z0-9]{1,10}$/, "")}.${ext}` : name;
}

export async function compressImage(file: File, policy: ImagePolicy | null): Promise<File> {
  if (!policy || !policy.compress || policy.keep_original) return file;
  if (!file.type.startsWith("image/") || SKIP.has(file.type)) return file;

  let bitmap: ImageBitmap;
  try {
    // applies the EXIF rotation, so the redrawn image is the right way up
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file; // a format this browser can't read (HEIC): the server converts it
  }

  const scale = Math.min(1, policy.max_side / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const wanted = policy.format === "keep" ? file.type : MIME[policy.format] ?? "image/webp";
  let blob = await toBlob(canvas, wanted, policy.quality / 100);
  // a browser that can't encode the format returns PNG or null: try JPEG
  if (!blob || blob.type !== wanted) blob = await toBlob(canvas, "image/jpeg", policy.quality / 100);
  if (!blob) return file;

  // never make it bigger, unless shrinking was the point
  if (scale === 1 && blob.size >= file.size) return file;
  return new File([blob], renamed(file.name, blob.type), { type: blob.type, lastModified: Date.now() });
}
