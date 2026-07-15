export interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

export interface TelegramMessage {
  message_id: number;
  photo?: TelegramPhotoSize[];
  [key: string]: unknown;
}

export type TelegramMediaGroup = TelegramMessage[];

export type TelegramChatAction = string;

export type TelegramSendMessageOptions = Record<string, unknown>;
export type TelegramSendPhotoOptions = Record<string, unknown>;
export type TelegramSendDocumentOptions = Record<string, unknown>;
export type TelegramSendVideoOptions = Record<string, unknown>;
export type TelegramSendMediaGroupOptions = Record<string, unknown>;
export type TelegramDeleteMessageOptions = Record<string, unknown>;

export interface TelegramSendPhotoFileOptions {
  filename?: string;
  contentType?: string;
}

export interface TelegramSendDocumentFileOptions {
  filename?: string;
  contentType?: string;
}

export interface TelegramSendVideoFileOptions {
  filename?: string;
  contentType?: string;
}

export type TelegramInputMedia = {
  type: string;
  media: string | Buffer;
  [key: string]: unknown;
};