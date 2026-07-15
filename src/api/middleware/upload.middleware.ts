import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/app-error";

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3 MB
const MAX_FILES = 10;

export interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

type RequestWithFiles = Request & { uploadedFiles?: UploadedFile[] };

interface CloudflareNativeRequest extends Request {
  formData(): Promise<FormData>;
}

interface CloudflareRequest extends Request {
  raw?: CloudflareNativeRequest;
}

function isCloudflareRequest(req: Request): req is CloudflareRequest {
  return "raw" in req && req.raw !== undefined;
}

async function parseMultipartNative(req: CloudflareRequest): Promise<File[]> {
  const nativeRequest = req.raw!;
  const form = await nativeRequest.formData();

  const files: File[] = [];
  const singleFile = form.get("image");
  const multiFiles = form.getAll("images");

  if (singleFile && typeof singleFile !== "string") {
    files.push(singleFile);
  }

  for (const file of multiFiles) {
    if (typeof file !== "string") {
      files.push(file);
    }
  }

  return files;
}

async function parseMultipartFallback(req: Request): Promise<File[]> {
  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") {
      headers.set(key, value);
    } else if (Array.isArray(value) && value.length > 0) {
      headers.set(key, value.join(", "));
    }
  }

  const webRequest = new Request(url, {
    method: req.method,
    headers,
    body: new ReadableStream({
      async start(controller) {
        for await (const chunk of req) {
          controller.enqueue(chunk as Uint8Array);
        }
        controller.close();
      },
    }),
  });

  const form = await webRequest.formData();

  const files: File[] = [];
  const singleFile = form.get("image");
  const multiFiles = form.getAll("images");

  if (singleFile && typeof singleFile !== "string") {
    files.push(singleFile);
  }

  for (const file of multiFiles) {
    if (typeof file !== "string") {
      files.push(file);
    }
  }

  return files;
}

export async function uploadMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    let files: File[];

    if (isCloudflareRequest(req)) {
      files = await parseMultipartNative(req);
    } else {
      files = await parseMultipartFallback(req);
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

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
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
