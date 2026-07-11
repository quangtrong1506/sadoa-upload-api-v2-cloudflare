import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/app-error";

// Workers have a 128 MB memory ceiling and no disk — keep uploads modest.
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3 MB
const MAX_FILES = 10;

/**
 * Shape of a single parsed upload, attached to `req.uploadedFiles` for controllers.
 */
export interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

type RequestWithFiles = Request & { uploadedFiles?: UploadedFile[] };

/**
 * Multer-free multipart parser.
 *
 * Supports both single `image` and multiple `images[]` fields.
 * Normalizes the result into an array of UploadedFile objects.
 */
export async function uploadMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === "string") {
        headers.set(key, value);
      } else if (Array.isArray(value) && value.length > 0) {
        headers.set(key, value.join(", "));
      }
    }

    const chunks: Uint8Array[] = [];
    for await (const chunk of req) {
      chunks.push(chunk as Uint8Array);
    }

    const webRequest = new Request(url, {
      method: req.method,
      headers,
      body: Buffer.concat(chunks),
    });

    const form = await webRequest.formData();

    const singleFile = form.get("image");
    const multiFiles = form.getAll("images");

    const files: File[] = [];

    if (singleFile && typeof singleFile !== "string") {
      files.push(singleFile);
    }

    for (const file of multiFiles) {
      if (typeof file !== "string") {
        files.push(file);
      }
    }

    if (files.length === 0) {
      next(AppError.badRequest("No image files provided"));
      return;
    }
    if (files.length > MAX_FILES) {
      next(AppError.badRequest(`Maximum ${MAX_FILES} images allowed per request`));
      return;
    }

    const uploadedFiles: UploadedFile[] = [];

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        next(AppError.badRequest("Only image files are allowed"));
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        next(AppError.badRequest(`Image "${file.name}" exceeds the 3 MB limit`));
        return;
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      uploadedFiles.push({
        buffer,
        originalname: file.name,
        mimetype: file.type,
        size: buffer.length,
      });
    }

    (req as RequestWithFiles).uploadedFiles = uploadedFiles;

    next();
  } catch (error) {
    next(error);
  }
}
