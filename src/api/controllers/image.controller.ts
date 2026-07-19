import type { NextFunction, Request, Response } from "express";
import { Readable } from "node:stream";
import { getEnv } from "../../config/env";
import { telegramService } from "../../services/telegram";
import { AppError } from "../../utils/app-error";
import type { UploadedFile } from "../middleware/upload.middleware";
import { httpResponse } from "../responses";
import { IMAGE_CACHE_CONTROL } from "../../utils/image-cache";
import type { IFileBase } from "../../types";

type RequestWithFiles = Request & { uploadedFiles?: UploadedFile[] };

function sortPhotosByWidthAsc<T extends { width: number }>(photos: T[]): T[] {
  return [...photos].sort((a, b) => a.width - b.width);
}

function mapPhotoToBase(photo: {
  file_id: string;
  width?: number;
  height?: number;
  file_size?: number;
}): IFileBase {
  return {
    id: photo.file_id,
    width: photo.width,
    height: photo.height,
    file_size: photo.file_size,
  };
}

/**
 * POST /api/images/upload
 * Authenticated + multipart-validated by upstream middleware.
 * Uploads one or more images to Telegram and returns the resulting file ids.
 */
export async function uploadImage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const files = (req as RequestWithFiles).uploadedFiles;
    if (!files || files.length === 0) {
      next(AppError.badRequest("No image files provided"));
      return;
    }

    const chatId = getEnv().TELEGRAM_CHAT_ID;
    if (!chatId) {
      next(AppError.internal("TELEGRAM_CHAT_ID is not configured"));
      return;
    }

    if (files.length === 1) {
      const file = files[0];
      const message = await telegramService.sendPhoto({
        chat_id: chatId,
        photo: file.buffer,
        filename: file.originalname,
        contentType: file.mimetype,
      });
      const photos = sortPhotosByWidthAsc(message.photo ?? []).map(mapPhotoToBase);
      httpResponse.ok(res, { photos: [photos] }, "Image uploaded");
      return;
    }

    const media = files.map((file) => ({
      type: "photo" as const,
      media: file.buffer,
      filename: file.originalname,
      contentType: file.mimetype,
    }));

    const messages = await telegramService.sendMediaGroup({
      chat_id: chatId,
      media,
    });
    const photos = messages.map((m) => sortPhotosByWidthAsc(m.photo ?? []).map(mapPhotoToBase));

    httpResponse.ok(res, { photos }, "Images uploaded");
  } catch (error) {
    next(error);
  }
}

/**
 * GET /images/:id
 * Streams the stored image bytes back to the client with long cache headers.
 * Cache-Control lets browsers and Cloudflare edge cache the response.
 */
export async function getImage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const response = await telegramService.streamImage(id as string);
    const contentType = response.headers.get("content-type") ?? "application/octet-stream";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", IMAGE_CACHE_CONTROL);

    if (response.body) {
      const stream = Readable.fromWeb(response.body);
      stream.on("error", (err) => {
        try {
          res.end();
        } catch {
          // ignore
        }
        next(err);
      });
      stream.pipe(res);
      return;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    res.send(buffer);
  } catch (error) {
    next(error);
  }
}
