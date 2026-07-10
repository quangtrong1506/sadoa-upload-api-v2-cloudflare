import { Readable } from "node:stream";
import type { NextFunction, Request, Response } from "express";
import { httpResponse } from "../responses";
import { AppError } from "../../utils/app-error";
import { telegramService } from "../../services/telegram.service";
import type { UploadedFile } from "../middleware/upload.middleware";

type RequestWithFile = Request & { uploadedFile?: UploadedFile };

/**
 * POST /api/images/upload
 * Authenticated + multipart-validated by upstream middleware. Uploads the image
 * to Telegram and returns the resulting file ids (largest resolution first).
 */
export async function uploadImage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const file = (req as RequestWithFile).uploadedFile;
    if (!file) {
      next(AppError.badRequest("No image file provided"));
      return;
    }

    const photos = await telegramService.uploadImage(file.buffer, file.originalname, file.mimetype);
    httpResponse.ok(res, { fileId: photos[0]?.file_id, photos }, "Image uploaded");
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/images/:id
 * Streams the stored image bytes back to the client with long cache headers.
 */
export async function getImage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { stream, contentType } = await telegramService.streamImage(id);

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000");

    Readable.fromWeb(stream as Parameters<typeof Readable.fromWeb>[0]).pipe(res);
  } catch (error) {
    next(error);
  }
}
