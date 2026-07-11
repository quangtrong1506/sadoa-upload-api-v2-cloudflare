import { Api, InputFile } from "grammy";
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
  sendMessage(
    chatId: string | number,
    text: string,
    options?: TelegramSendMessageOptions,
  ): Promise<TelegramMessage> {
    try {
      return this.api.sendMessage(chatId, text, options) as unknown as Promise<TelegramMessage>;
    } catch (error) {
      throw new Error(
        `Failed to send Telegram message: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
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
  sendPhoto(
    chatId: string | number,
    photo: string | Buffer,
    options?: TelegramSendPhotoOptions,
    fileOptions?: TelegramSendPhotoFileOptions,
  ): Promise<TelegramMessage> {
    try {
      const input = toInputFile(photo, fileOptions?.filename ?? "photo");
      return this.api.sendPhoto(chatId, input, options) as unknown as Promise<TelegramMessage>;
    } catch (error) {
      throw new Error(
        `Failed to send Telegram photo: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
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
  sendMediaGroup(
    chatId: string | number,
    media: TelegramInputMedia[],
    options?: TelegramSendMediaGroupOptions,
  ): Promise<TelegramMediaGroup> {
    try {
      const grammyMedia = media.map((item) => ({
        ...item,
        media: toInputFile(item.media, "file"),
      }));
      return this.api.sendMediaGroup(
        chatId,
        grammyMedia as Parameters<typeof this.api.sendMediaGroup>[1],
        options,
      ) as unknown as Promise<TelegramMediaGroup>;
    } catch (error) {
      throw new Error(
        `Failed to send Telegram media group: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Send a document to a chat.
   */
  sendDocument(
    chatId: string | number,
    document: string | Buffer,
    options?: TelegramSendDocumentOptions,
    fileOptions?: TelegramSendDocumentFileOptions,
  ): Promise<TelegramMessage> {
    try {
      const input = toInputFile(document, fileOptions?.filename ?? "document");
      return this.api.sendDocument(chatId, input, options) as unknown as Promise<TelegramMessage>;
    } catch (error) {
      throw new Error(
        `Failed to send Telegram document: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Send a video to a chat.
   */
  sendVideo(
    chatId: string | number,
    video: string | Buffer,
    options?: TelegramSendVideoOptions,
    fileOptions?: TelegramSendVideoFileOptions,
  ): Promise<TelegramMessage> {
    try {
      const input = toInputFile(video, fileOptions?.filename ?? "video");
      return this.api.sendVideo(chatId, input, options) as unknown as Promise<TelegramMessage>;
    } catch (error) {
      throw new Error(
        `Failed to send Telegram video: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Send a chat action to indicate bot activity (e.g. typing, uploading photo).
   */
  sendChatAction(chatId: string | number, action: TelegramChatAction): Promise<boolean> {
    try {
      return this.api.sendChatAction(
        chatId,
        action as Parameters<typeof this.api.sendChatAction>[1],
      );
    } catch (error) {
      throw new Error(
        `Failed to send Telegram chat action: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Delete a message from a chat.
   */
  deleteMessage(chatId: string | number, messageId: number): Promise<boolean> {
    try {
      return this.api.deleteMessage(chatId, messageId);
    } catch (error) {
      throw new Error(
        `Failed to delete Telegram message: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
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
      throw new Error(
        `Failed to get Telegram file path: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
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
      throw new Error(
        `Failed to stream Telegram image: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
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
