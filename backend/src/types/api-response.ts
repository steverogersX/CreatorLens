import type { Response } from "express";
import { StatusCodes } from "http-status-codes";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
  };
}

export const sendSuccess = <T>(res: Response, data: T, status = StatusCodes.OK): void => {
  res.status(status).json({ success: true, data } satisfies ApiResponse<T>);
};

export const sendError = (res: Response, message: string, code: string, status: number): void => {
  res.status(status).json({ success: false, error: { message, code } } satisfies ApiResponse);
};
