import type { Response } from "express";

/**
 * Standard API response envelope shared by every endpoint.
 *
 *  - success: boolean flag indicating the outcome.
 *  - message: optional human-readable message.
 *  - data:    optional payload.
 *  - errors:  optional validation / error details.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: unknown;
}

function send(res: Response, statusCode: number, body: ApiResponse): Response {
  return res.status(statusCode).json(body);
}

export const httpResponse = {
  ok<T>(res: Response, data?: T, message?: string): Response {
    return send(res, 200, { success: true, message, data });
  },

  created<T>(res: Response, data?: T, message = "Created"): Response {
    return send(res, 201, { success: true, message, data });
  },

  noContent(res: Response): Response {
    return res.status(204).end();
  },

  error(res: Response, statusCode: number, message: string, errors?: unknown): Response {
    return send(res, statusCode, { success: false, message, errors });
  },
};
