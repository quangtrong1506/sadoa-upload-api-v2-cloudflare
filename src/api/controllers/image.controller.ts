import type { NextFunction, Request, Response } from "express";
import { getEnv } from "../../config/env";
import { telegramService } from "../../services/telegram";
import { AppError } from "../../utils/app-error";
import type { UploadedFile } from "../middleware/upload.middleware";
import { httpResponse } from "../responses";

type RequestWithFiles = Request & { uploadedFiles?: UploadedFile[] };

function sortPhotosByWidthDesc<T extends { width: number }>(photos: T[]): T[] {
  return [...photos].sort((a, b) => b.width - a.width);
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
      const message = await telegramService.sendPhoto(chatId, file.buffer, undefined, {
        filename: file.originalname,
        contentType: file.mimetype,
      });
      const photos = sortPhotosByWidthDesc(message.photo ?? []);
      httpResponse.ok(res, { fileId: photos[0]?.file_id, photos }, "Image uploaded");
      return;
    }

    const media = files.map((file) => ({
      type: "photo" as const,
      media: file.buffer,
      caption: undefined,
      parse_mode: undefined,
      caption_entities: undefined,
      show_caption_above_media: undefined,
      has_spoiler: undefined,
    }));

    const messages = await telegramService.sendMediaGroup(chatId, media);
    const fileIds = messages.map((m) => m.photo?.[0]?.file_id).filter(Boolean) as string[];
    const photos = messages.flatMap((m) => m.photo ?? []);

    httpResponse.ok(res, { fileIds, photos }, "Images uploaded");
  } catch (error) {
    next(error);
  }
}

/**
 * GET /images/:id
 * Streams the stored image bytes back to the client with long cache headers.
 */
export async function getImage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { buffer, contentType } = await telegramService.streamImage(id as string);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000");
    res.send(Buffer.from(buffer));
  } catch (error) {
    next(error);
  }
}
