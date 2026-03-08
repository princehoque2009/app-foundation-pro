import { z } from "zod";

// Shared input validation schemas for security

/** Max lengths to prevent abuse */
export const MAX_POST_CAPTION = 5000;
export const MAX_COMMENT_LENGTH = 2000;
export const MAX_MESSAGE_LENGTH = 5000;
export const MAX_BIO_LENGTH = 500;
export const MAX_DISPLAY_NAME = 50;
export const MAX_USERNAME = 30;

/** File upload limits */
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

export const captionSchema = z.string().max(MAX_POST_CAPTION, `Caption must be under ${MAX_POST_CAPTION} characters`).optional();
export const commentSchema = z.string().trim().min(1, "Comment cannot be empty").max(MAX_COMMENT_LENGTH, `Comment must be under ${MAX_COMMENT_LENGTH} characters`);
export const messageSchema = z.string().trim().min(1, "Message cannot be empty").max(MAX_MESSAGE_LENGTH, `Message must be under ${MAX_MESSAGE_LENGTH} characters`);
export const bioSchema = z.string().max(MAX_BIO_LENGTH, `Bio must be under ${MAX_BIO_LENGTH} characters`).optional();

/** Validates an uploaded file for type and size */
export const validateFileUpload = (file: File, type: "image" | "video"): string | null => {
  const allowedTypes = type === "image" ? ALLOWED_IMAGE_TYPES : ALLOWED_VIDEO_TYPES;
  const maxSize = type === "image" ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;

  if (!allowedTypes.includes(file.type)) {
    return `Invalid file type. Allowed: ${allowedTypes.map(t => t.split("/")[1]).join(", ")}`;
  }
  if (file.size > maxSize) {
    return `File too large. Max size: ${Math.round(maxSize / (1024 * 1024))}MB`;
  }
  return null;
};

/** Sanitize user input: strip potential script tags */
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/javascript:/gi, "");
};
