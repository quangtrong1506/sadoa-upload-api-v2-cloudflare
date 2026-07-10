import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/app-error";

// Workers have a 128 MB memory ceiling and no disk — keep uploads modest.
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Shape of the parsed upload, attached to `req.uploadedFile` for controllers.
 * Kept independent of `multer` so the project has no multipart dependency.
 */
export interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

type RequestWithFile = Request & { uploadedFile?: UploadedFile };

/**
 * Multer-free multipart parser.
 *
 * The raw request body is read once and handed to a Web `Request`, whose native
 * `formData()` does the parsing. This avoids `multer`/`busboy` and any
 * third-party Node stream dependency, keeping it portable to Workers.
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
    const file = form.get("image");

    if (!file || typeof file === "string") {
      next(AppError.badRequest("No image file provided"));
      return;
    }
    if (!file.type.startsWith("image/")) {
      next(AppError.badRequest("Only image files are allowed"));
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      next(AppError.badRequest("Image exceeds the 10 MB limit"));
      return;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    (req as RequestWithFile).uploadedFile = {
      buffer,
      originalname: file.name,
      mimetype: file.type,
      size: buffer.length,
    };

    next();
  } catch (error) {
    next(error);
  }
}
