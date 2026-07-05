// Cloudinary configuration and helpers.
// Uses unsigned upload preset for direct browser -> Cloudinary uploads.

export const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
export const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined;

export function isCloudinaryConfigured(): boolean {
  return Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET);
}

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
}

export async function uploadToCloudinary(
  file: Blob,
  opts: { folder?: string } = {}
): Promise<CloudinaryUploadResult> {
  if (!isCloudinaryConfigured()) {
    throw new Error(
      "Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in your .env."
    );
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET!);
  if (opts.folder) formData.append("folder", opts.folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Cloudinary upload failed (${res.status}): ${text || res.statusText}`);
  }
  return (await res.json()) as CloudinaryUploadResult;
}

/**
 * Insert f_auto,q_auto delivery transforms into a Cloudinary URL for
 * automatic format + quality optimization. No-op for non-Cloudinary URLs.
 */
export function optimizeCloudinaryUrl(url?: string | null, extra?: string): string {
  if (!url) return "";
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  const transforms = ["f_auto", "q_auto", ...(extra ? [extra] : [])].join(",");
  // Avoid double-adding if already present
  if (url.includes(`/upload/${transforms}/`) || /\/upload\/[^/]*f_auto[^/]*\//.test(url)) return url;
  return url.replace("/upload/", `/upload/${transforms}/`);
}
