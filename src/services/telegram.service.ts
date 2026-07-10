import { getEnv } from "../config/env";
import { AppError } from "../utils/app-error";

const TELEGRAM_API = "https://api.telegram.org/bot";

interface TelegramPhoto {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

interface SendPhotoResponse {
  ok: boolean;
  result: { photo: TelegramPhoto[] };
}

interface GetFileResponse {
  ok: boolean;
  result: { file_path: string };
}

function requireBotToken(): string {
  const token = getEnv().TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw AppError.internal("TELEGRAM_BOT_TOKEN is not configured");
  }
  return token;
}

function requireChatId(): string {
  const chatId = getEnv().TELEGRAM_CHAT_ID;
  if (!chatId) {
    throw AppError.internal("TELEGRAM_CHAT_ID is not configured");
  }
  return chatId;
}

/**
 * Image store backed by a Telegram bot.
 *
 * Rewritten for the Workers runtime: uses the native `fetch` API and the Web
 * `FormData`/`Blob` types instead of `axios` + `form-data`, which keeps the
 * code free of Node-only stream dependencies. Images are held in-memory by the
 * bot, so uploads return file ids and retrieval streams the bytes back out.
 */
export const telegramService = {
  async uploadImage(buffer: Buffer, filename: string, mimeType: string): Promise<TelegramPhoto[]> {
    const form = new FormData();
    form.append("chat_id", requireChatId());
    form.append("photo", new Blob([buffer], { type: mimeType }), filename);

    const response = await fetch(`${TELEGRAM_API}${requireBotToken()}/sendPhoto`, {
      method: "POST",
      body: form,
    });
    const data = (await response.json()) as SendPhotoResponse;

    if (!data.ok) {
      throw AppError.internal("Failed to upload image to Telegram");
    }

    // Telegram returns several resolutions; return largest first.
    return [...data.result.photo].sort((a, b) => b.width - a.width);
  },

  async getFilePath(fileId: string): Promise<string> {
    const response = await fetch(
      `${TELEGRAM_API}${requireBotToken()}/getFile?file_id=${encodeURIComponent(fileId)}`,
    );
    const data = (await response.json()) as GetFileResponse;

    if (!data.ok || !data.result?.file_path) {
      throw AppError.notFound("Image not found in Telegram");
    }
    return data.result.file_path;
  },

  async streamImage(
    fileId: string,
  ): Promise<{ stream: ReadableStream<Uint8Array>; contentType: string }> {
    const token = requireBotToken();
    const filePath = await this.getFilePath(fileId);
    const response = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);

    if (!response.ok || !response.body) {
      throw AppError.notFound("Image not found");
    }
    return {
      stream: response.body,
      contentType: this.getContentType(filePath),
    };
  },

  getContentType(filePath: string): string {
    const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
    const types: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
    };
    return types[ext] ?? "application/octet-stream";
  },
};
