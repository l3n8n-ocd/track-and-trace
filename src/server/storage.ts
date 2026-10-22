import "server-only";
import { v2 as cloudinary } from "cloudinary";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { cloudinaryEnabled, env } from "@/lib/env";

// Stored paths are prefixed with their backend:
//   cld:image:<public_id>       Cloudinary, public photo
//   cldauth:<type>:<public_id>  Cloudinary, authenticated (private) proof file
//   local:<relative path>       Local disk (development only)

export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const PROOF_TYPES = [...PHOTO_TYPES, "application/pdf"];
export const MAX_FILE_BYTES = 4 * 1024 * 1024;

if (cloudinaryEnabled) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

const PUBLIC_DIR = path.join(process.cwd(), "public", "uploads");
const PRIVATE_DIR = path.join(process.cwd(), ".data", "private");

export class FileValidationError extends Error {}

export function validateFile(file: File, allowed: string[]) {
  if (!allowed.includes(file.type)) {
    throw new FileValidationError(`${file.name}: file type not allowed`);
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new FileValidationError(`${file.name}: file is larger than 4 MB`);
  }
}

function extension(file: File) {
  return { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" }[
    file.type
  ] ?? "bin";
}

async function uploadToCloudinary(
  file: File,
  options: { folder: string; type: "upload" | "authenticated" },
): Promise<{ publicId: string; resourceType: string }> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: options.folder,
          type: options.type,
          resource_type: "image",
          public_id: randomUUID(),
          overwrite: false,
        },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error("Upload failed"));
          resolve({ publicId: result.public_id, resourceType: result.resource_type });
        },
      )
      .end(buffer);
  });
}

export async function savePhoto(file: File): Promise<string> {
  validateFile(file, PHOTO_TYPES);
  if (cloudinaryEnabled) {
    const { publicId } = await uploadToCloudinary(file, {
      folder: "returndesk/photos",
      type: "upload",
    });
    return `cld:image:${publicId}`;
  }
  await mkdir(PUBLIC_DIR, { recursive: true });
  const name = `${randomUUID()}.${extension(file)}`;
  await writeFile(path.join(PUBLIC_DIR, name), Buffer.from(await file.arrayBuffer()));
  return `local:${name}`;
}

export async function saveProof(file: File): Promise<string> {
  validateFile(file, PROOF_TYPES);
  if (cloudinaryEnabled) {
    const { publicId, resourceType } = await uploadToCloudinary(file, {
      folder: "returndesk/proof",
      type: "authenticated",
    });
    return `cldauth:${resourceType}:${publicId}`;
  }
  await mkdir(PRIVATE_DIR, { recursive: true });
  const name = `${randomUUID()}.${extension(file)}`;
  await writeFile(path.join(PRIVATE_DIR, name), Buffer.from(await file.arrayBuffer()));
  return `local:${name}`;
}

// Public URL for a report photo. `blurred` is used in search results so
// distinguishing details stay hidden until ownership is verified (FR-S2).
export function photoUrl(stored: string, opts: { blurred?: boolean; width?: number } = {}) {
  const width = opts.width ?? 800;
  if (stored.startsWith("cld:")) {
    const publicId = stored.split(":").slice(2).join(":");
    return cloudinary.url(publicId, {
      secure: true,
      transformation: [
        { width, crop: "limit", quality: "auto", fetch_format: "auto" },
        ...(opts.blurred ? [{ effect: "blur:900" }] : []),
      ],
    });
  }
  return `/uploads/${stored.replace(/^local:/, "")}`;
}

// Proof files are never linked directly; /api/files/proof/[id] checks
// permissions and then calls this.
export async function proofResponse(stored: string): Promise<Response> {
  if (stored.startsWith("cldauth:")) {
    const [, resourceType, ...rest] = stored.split(":");
    const url = cloudinary.url(rest.join(":"), {
      secure: true,
      type: "authenticated",
      sign_url: true,
      resource_type: resourceType,
    });
    return Response.redirect(url, 302);
  }
  const name = path.basename(stored.replace(/^local:/, ""));
  const data = await readFile(path.join(PRIVATE_DIR, name));
  const type = name.endsWith(".pdf")
    ? "application/pdf"
    : name.endsWith(".png")
      ? "image/png"
      : name.endsWith(".webp")
        ? "image/webp"
        : "image/jpeg";
  return new Response(data, {
    headers: { "Content-Type": type, "Cache-Control": "private, no-store" },
  });
}
