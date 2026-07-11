import { TelegramService } from "./telegram.service";
import { getEnv } from "../../config/env";
import { AppError } from "../../utils/app-error";

const botToken = getEnv().TELEGRAM_BOT_TOKEN;
if (!botToken) {
  throw AppError.internal("TELEGRAM_BOT_TOKEN is required to initialize TelegramService");
}

export const telegramService = new TelegramService(botToken);
export { TelegramService } from "./telegram.service";
export type * from "./telegram.types";
