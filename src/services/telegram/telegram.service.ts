import { AppError } from "../../utils/app-error";

interface TelegramResponse<T> {
  ok: boolean;
  result?: T;
  error_code?: number;
  description?: string;
  parameters?: { retry_after?: number };
}

interface TelegramFile {
  file_id: string;
  file_unique_id: string;
  file_size?: number;
  file_path?: string;
}

interface TelegramMessage {
  message_id: number;
  photo?: Array<{ file_id: string; file_unique_id: string; width: number; height: number; file_size?: number }>;
  [key: string]: unknown;
}

type TelegramMediaGroup = TelegramMessage[];

export interface TelegramServiceOptions {
  token: string;
}

export interface SendMessageOptions {
  chat_id: string | number;
  text: string;
  parse_mode?: string;
  disable_web_page_preview?: boolean;
  reply_to_message_id?: number;
  reply_markup?: unknown;
}

export interface SendPhotoOptions {
  chat_id: string | number;
  photo: string | Buffer;
  caption?: string;
  parse_mode?: string;
  reply_to_message_id?: number;
  reply_markup?: unknown;
  filename?: string;
  contentType?: string;
}

export interface SendDocumentOptions {
  chat_id: string | number;
  document: string | Buffer;
  caption?: string;
  parse_mode?: string;
  reply_to_message_id?: number;
  reply_markup?: unknown;
  filename?: string;
  contentType?: string;
}

export interface SendVideoOptions {
  chat_id: string | number;
  video: string | Buffer;
  caption?: string;
  parse_mode?: string;
  reply_to_message_id?: number;
  reply_markup?: unknown;
  filename?: string;
  contentType?: string;
}

export interface SendMediaGroupOptions {
  chat_id: string | number;
  media: Array<{
    type: string;
    media: string | Buffer;
    caption?: string;
    parse_mode?: string;
    filename?: string;
    contentType?: string;
  }>;
  reply_to_message_id?: number;
}

export interface SendChatActionOptions {
  chat_id: string | number;
  action: string;
}

export interface DeleteMessageOptions {
  chat_id: string | number;
  message_id: number;
}

export interface GetFileOptions {
  file_id: string;
}

export class TelegramService {
  private readonly token: string;
  private readonly filePathCache = new Map<string, string>();

  private get apiUrl(): string {
    return `https://api.telegram.org/bot${this.token}`;
  }

  private get fileUrl(): string {
    return `https://api.telegram.org/file/bot${this.token}`;
  }

  constructor(token: string) {
    this.token = token;
  }

  private async request<T>(method: string, body?: FormData | Record<string, unknown>): Promise<T> {
    const init: RequestInit = { method: "POST" };

    if (body instanceof FormData) {
      init.body = body;
    } else if (body) {
      init.headers = { "Content-Type": "application/json" };
      init.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.apiUrl}/${method}`, init);
    const data = (await response.json()) as TelegramResponse<T>;

    if (!data.ok) {
      if (data.error_code === 429) {
        const retryAfter = data.parameters?.retry_after;
        throw new AppError(
          429,
          "Telegram rate limit reached. Please retry later.",
          retryAfter !== undefined ? { retry_after: retryAfter } : undefined,
        );
      }
      throw new AppError(
        502,
        `Telegram error (${data.error_code}): ${data.description || "unknown error"}`,
      );
    }

    return data.result as T;
  }

  private createFormData(data: Record<string, unknown>, files: Record<string, { value: Buffer; filename: string; contentType?: string }>): FormData {
    const form = new FormData();

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        form.append(key, String(value));
      }
    }

    for (const [key, file] of Object.entries(files)) {
      form.append(key, new Blob([file.value], { type: file.contentType || "application/octet-stream" }), file.filename);
    }

    return form;
  }

  async sendMessage(options: SendMessageOptions): Promise<TelegramMessage> {
    return this.request<TelegramMessage>("sendMessage", options as unknown as Record<string, unknown>);
  }

  async sendPhoto(options: SendPhotoOptions): Promise<TelegramMessage> {
    const { photo, filename, contentType, ...rest } = options;

    if (typeof photo === "string") {
      return this.request<TelegramMessage>("sendPhoto", { ...rest, photo } as unknown as Record<string, unknown>);
    }

    const form = this.createFormData(rest as unknown as Record<string, unknown>, {
      photo: { value: photo, filename: filename ?? "photo.jpg", contentType: contentType ?? "image/jpeg" },
    });

    return this.request<TelegramMessage>("sendPhoto", form);
  }

  async sendDocument(options: SendDocumentOptions): Promise<TelegramMessage> {
    const { document, filename, contentType, ...rest } = options;

    if (typeof document === "string") {
      return this.request<TelegramMessage>("sendDocument", { ...rest, document } as unknown as Record<string, unknown>);
    }

    const form = this.createFormData(rest as unknown as Record<string, unknown>, {
      document: { value: document, filename: filename ?? "document", contentType: contentType ?? "application/octet-stream" },
    });

    return this.request<TelegramMessage>("sendDocument", form);
  }

  async sendVideo(options: SendVideoOptions): Promise<TelegramMessage> {
    const { video, filename, contentType, ...rest } = options;

    if (typeof video === "string") {
      return this.request<TelegramMessage>("sendVideo", { ...rest, video } as unknown as Record<string, unknown>);
    }

    const form = this.createFormData(rest as unknown as Record<string, unknown>, {
      video: { value: video, filename: filename ?? "video.mp4", contentType: contentType ?? "video/mp4" },
    });

    return this.request<TelegramMessage>("sendVideo", form);
  }

  async sendMediaGroup(options: SendMediaGroupOptions): Promise<TelegramMediaGroup> {
    const form = new FormData();
    const mediaPayload: Record<string, unknown>[] = [];

    for (let i = 0; i < options.media.length; i++) {
      const item = options.media[i];
      const mediaItem: Record<string, unknown> = { type: item.type };

      if (typeof item.media === "string") {
        mediaItem.media = item.media;
      } else {
        const filename = item.filename ?? `file_${i}`;
        const contentType = item.contentType ?? "application/octet-stream";
        form.append(`media_${i}`, new Blob([item.media], { type: contentType }), filename);
        mediaItem.media = `attach://media_${i}`;
      }

      if (item.caption) mediaItem.caption = item.caption;
      if (item.parse_mode) mediaItem.parse_mode = item.parse_mode;

      mediaPayload.push(mediaItem);
    }

    form.append("media", JSON.stringify(mediaPayload));

    const entries = Object.entries(options).filter(([k]) => k !== "media");
    for (let i = 0; i < entries.length; i++) {
      const [key, value] = entries[i];
      if (value !== undefined) {
        form.append(key, String(value));
      }
    }

    return this.request<TelegramMediaGroup>("sendMediaGroup", form);
  }

  async sendChatAction(options: SendChatActionOptions): Promise<boolean> {
    return this.request<boolean>("sendChatAction", options as unknown as Record<string, unknown>);
  }

  async deleteMessage(options: DeleteMessageOptions): Promise<boolean> {
    return this.request<boolean>("deleteMessage", options as unknown as Record<string, unknown>);
  }

  async getFile(options: GetFileOptions): Promise<TelegramFile> {
    return this.request<TelegramFile>("getFile", options as unknown as Record<string, unknown>);
  }

  async getFilePath(fileId: string): Promise<string> {
    const cached = this.filePathCache.get(fileId);
    if (cached) return cached;

    const file = await this.getFile({ file_id: fileId });
    if (!file.file_path) {
      throw new AppError(502, "Telegram file_path is missing");
    }

    this.filePathCache.set(fileId, file.file_path);
    return file.file_path;
  }

  async streamImage(fileId: string): Promise<Response> {
    const filePath = await this.getFilePath(fileId);
    const response = await fetch(`${this.fileUrl}/${filePath}`);

    if (!response.ok) {
      throw new AppError(502, "Failed to fetch Telegram file");
    }

    return response;
  }

}
