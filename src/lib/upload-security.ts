/**
 * Secure upload helpers — magic-byte sniffing, path containment, size limits.
 * Storage is under DATA_DIR/uploads (not web-root). Serve only via authenticated API.
 */

import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2 MiB

export type AllowedImageMime = "image/jpeg" | "image/png" | "image/webp";

const MIME_EXT: Record<AllowedImageMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function uploadsRoot(): string {
  const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
  return path.join(dataDir, "uploads");
}

export function detectImageMime(buf: Buffer): AllowedImageMime | null {
  if (buf.length < 12) return null;
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  // PNG
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return "image/png";
  }
  // WEBP: RIFF....WEBP
  if (
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

/** Resolve a storage key under uploads root; rejects traversal */
export function resolveUploadPath(key: string): string | null {
  if (!key || key.includes("\0")) return null;
  if (!/^[a-zA-Z0-9/_-]+\.(jpg|png|webp)$/.test(key)) return null;
  const root = path.resolve(uploadsRoot());
  const dest = path.resolve(root, key);
  if (!dest.startsWith(root + path.sep) && dest !== root) return null;
  return dest;
}

export async function saveAvatarBuffer(
  userId: string,
  buf: Buffer
): Promise<{ key: string; mime: AllowedImageMime } | { error: string }> {
  if (buf.length === 0 || buf.length > AVATAR_MAX_BYTES) {
    return { error: "File must be between 1 byte and 2MB." };
  }
  const mime = detectImageMime(buf);
  if (!mime) {
    return { error: "Only JPEG, PNG, or WebP images are allowed." };
  }
  const ext = MIME_EXT[mime];
  const safeUser = userId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "user";
  const key = `avatars/${safeUser}/${randomUUID()}.${ext}`;
  const dest = resolveUploadPath(key);
  if (!dest) return { error: "Invalid storage path." };

  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, buf, { flag: "wx" });
  return { key, mime };
}

export async function deleteUploadKey(key: string | undefined): Promise<void> {
  if (!key) return;
  const dest = resolveUploadPath(key);
  if (!dest) return;
  await fs.unlink(dest).catch(() => {});
}
