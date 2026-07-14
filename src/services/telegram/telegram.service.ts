import { Api, InputFile, GrammyError, HttpError } from "grammy";
import {
  type TelegramSendPhotoFileOptions,
  type TelegramSendDocumentFileOptions,
  type TelegramSendVideoFileOptions,
} from "./telegram.types";
import { AppError } from "../../utils/app-error";
import {
  type TelegramMessage,
  type TelegramMediaGroup,
  type TelegramChatAction,
  type TelegramSendMessageOptions,
  type TelegramSendPhotoOptions,
  type TelegramSendDocumentOptions,
  type TelegramSendVideoOptions,
  type TelegramSendMediaGroupOptions,
  type TelegramInputMedia,
} from "./telegram.types";

/**
 * Wraps the Telegram Bot API for the image store.
 *
 * Uses grammy, whose `Api` client is built on the web `fetch` + `FormData`
 * primitives and is designed to run on Cloudflare Workers (unlike the
 * `request`-based clients that fail to upload files at the edge).
 */
export class TelegramService {
  private readonly api: Api;
  private readonly token: string;

  constructor(botToken: string) {
    if (!botToken) {
      throw AppError.internal("TELEGRAM_BOT_TOKEN is required to initialize TelegramService");
    }

    this.token = botToken;
    this.api = new Api(botToken);
  }

  /**
   * Send a text message to a chat.
   */
  async sendMessage(
    chatId: string | number,
    text: string,
    options?: TelegramSendMessageOptions,
  ): Promise<TelegramMessage> {
    try {
      return (await this.api.sendMessage(
        chatId,
        text,
        options,
      )) as unknown as Promise<TelegramMessage>;
    } catch (error) {
      return mapTelegramError(error);
    }
  }

  /**
   * Send a photo to a chat.
   *
   * @param chatId - Target chat identifier.
   * @param photo - File ID, URL, or raw Buffer.
   * @param options - Optional send parameters (caption, parse mode, etc.).
   * @param fileOptions - Optional file metadata (filename, content type).
   * @returns The sent {@link TelegramMessage}.
   */
  async sendPhoto(
    chatId: string | number,
    photo: string | Buffer,
    options?: TelegramSendPhotoOptions,
    fileOptions?: TelegramSendPhotoFileOptions,
  ): Promise<TelegramMessage> {
    try {
      const input = toInputFile(photo, fileOptions?.filename ?? "photo");
      return (await this.api.sendPhoto(chatId, input, options)) as unknown as TelegramMessage;
    } catch (error) {
      return mapTelegramError(error);
    }
  }

  /**
   * Send a media group (album) to a chat.
   *
   * Raw {@link Buffer} media items are wrapped in {@link InputFile} so the
   * request is sent via fetch + FormData (Workers-compatible).
   *
   * @param chatId - Target chat identifier.
   * @param media - Array of media items (photos, videos, documents, audio).
   * @param options - Optional send parameters.
   * @returns Array of sent {@link TelegramMessage} objects.
   */
  async sendMediaGroup(
    chatId: string | number,
    media: TelegramInputMedia[],
    options?: TelegramSendMediaGroupOptions,
  ): Promise<TelegramMediaGroup> {
    try {
      const grammyMedia = media.map((item) => ({
        ...item,
        media: toInputFile(item.media, "file"),
      }));
      return (await this.api.sendMediaGroup(
        chatId,
        grammyMedia as Parameters<typeof this.api.sendMediaGroup>[1],
        options,
      )) as unknown as TelegramMediaGroup;
    } catch (error) {
      return mapTelegramError(error);
    }
  }

  /**
   * Send a document to a chat.
   */
  async sendDocument(
    chatId: string | number,
    document: string | Buffer,
    options?: TelegramSendDocumentOptions,
    fileOptions?: TelegramSendDocumentFileOptions,
  ): Promise<TelegramMessage> {
    try {
      const input = toInputFile(document, fileOptions?.filename ?? "document");
      return (await this.api.sendDocument(chatId, input, options)) as unknown as TelegramMessage;
    } catch (error) {
      return mapTelegramError(error);
    }
  }

  /**
   * Send a video to a chat.
   */
  async sendVideo(
    chatId: string | number,
    video: string | Buffer,
    options?: TelegramSendVideoOptions,
    fileOptions?: TelegramSendVideoFileOptions,
  ): Promise<TelegramMessage> {
    try {
      const input = toInputFile(video, fileOptions?.filename ?? "video");
      return (await this.api.sendVideo(chatId, input, options)) as unknown as TelegramMessage;
    } catch (error) {
      return mapTelegramError(error);
    }
  }

  /**
   * Send a chat action to indicate bot activity (e.g. typing, uploading photo).
   */
  async sendChatAction(chatId: string | number, action: TelegramChatAction): Promise<boolean> {
    try {
      return await this.api.sendChatAction(
        chatId,
        action as Parameters<typeof this.api.sendChatAction>[1],
      );
    } catch (error) {
      return mapTelegramError(error);
    }
  }

  /**
   * Delete a message from a chat.
   */
  async deleteMessage(chatId: string | number, messageId: number): Promise<boolean> {
    try {
      return await this.api.deleteMessage(chatId, messageId);
    } catch (error) {
      return mapTelegramError(error);
    }
  }

  /**
   * Retrieve the file path for a given Telegram file_id.
   *
   * @param fileId - Telegram file identifier.
   * @returns Remote file path usable with the Telegram file download endpoint.
   * @throws {Error} If the Telegram API request fails or file is not found.
   */
  async getFilePath(fileId: string): Promise<string> {
    try {
      const file = await this.api.getFile(fileId);
      if (!file.file_path) {
        throw new Error("Telegram file_path is missing");
      }
      return file.file_path;
    } catch (error) {
      return mapTelegramError(error);
    }
  }

  /**
   * Download the raw bytes of a stored Telegram file.
   *
   * @param fileId - Telegram file identifier.
   * @returns A {@link Uint8Array} of file bytes and its content type.
   * @throws {Error} If the Telegram API request fails.
   */
  async streamImage(fileId: string): Promise<{ buffer: Uint8Array; contentType: string }> {
    try {
      const filePath = await this.getFilePath(fileId);
      const response = await fetch(`https://api.telegram.org/file/bot${this.token}/${filePath}`);

      if (!response.ok) {
        throw new Error("Failed to fetch Telegram file");
      }

      const buffer = new Uint8Array(await response.arrayBuffer());
      return {
        buffer,
        contentType: this.getContentType(filePath),
      };
    } catch (error) {
      return mapTelegramError(error);
    }
  }

  /**
   * Guess the MIME type from a Telegram file path extension.
   *
   * @param filePath - Remote file path returned by Telegram.
   * @returns MIME type string.
   */
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
  }
}

/**
 * Map a Telegram/grammy error onto an {@link AppError}.
 *
 * Telegram rate limits (HTTP 429) are surfaced to the client as a 429 response
 * carrying the `retry_after` hint from Telegram, instead of leaking a generic
 * 500. Other upstream Telegram faults become 502 (bad gateway). Anything that
 * is not a known Telegram error is re-wrapped as a 500 so the global error
 * handler still produces a structured body.
 *
 * This helper always throws; it exists only to centralize the mapping.
 */
function mapTelegramError(error: unknown): never {
  if (error instanceof GrammyError) {
    if (error.error_code === 429) {
      const retryAfter = error.parameters?.retry_after;
      throw new AppError(
        429,
        "Telegram rate limit reached. Please retry later.",
        retryAfter !== undefined ? { retry_after: retryAfter } : undefined,
      );
    }

    throw new AppError(
      502,
      `Telegram error (${error.error_code}): ${error.description || "unknown error"}`,
      { method: error.method, error_code: error.error_code },
    );
  }

  if (error instanceof HttpError) {
    throw new AppError(502, "Failed to communicate with Telegram");
  }

  throw new AppError(
    500,
    `Telegram request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
  );
}

/**
 * Normalize a Telegram input source into a grammy {@link InputFile}.
 *
 * `string` values are passed through unchanged (file_id or URL); `Buffer`
 * values are wrapped so grammy can upload them via FormData.
 */
function toInputFile(media: string | Buffer | InputFile, fallbackName: string): string | InputFile {
  if (typeof media === "string") {
    return media;
  }
  if (media instanceof InputFile) {
    return media;
  }
  return new InputFile(media, fallbackName);
}
