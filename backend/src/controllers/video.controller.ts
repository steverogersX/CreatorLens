import type { Request, Response, NextFunction } from "express";
import { fromZodError } from "zod-validation-error";
import { analyzeVideosSchema } from "@/schemas/video.schema";
import { BadRequestError } from "@/errors/app-error";
import { analyzeVideos as analyzeVideoService } from "@/services/video.service";
import { threadExists } from "@/db/persist";
import { StatusCodes } from "http-status-codes";

export async function analyzeVideos(req: Request, res: Response, next: NextFunction): Promise<void> {
  const result = analyzeVideosSchema.safeParse(req.body);
  if (!result.success) {
    throw new BadRequestError(fromZodError(result.error).message);
  }

  if (result.data.type === "followup") {
    const { threadId } = result.data;
    const exists = await threadExists(threadId);
    if (!exists) {
      throw new BadRequestError(`Thread ${threadId} not found`);
    }
    res.status(StatusCodes.OK).json({ data: { threadId } });
    return;
  }

  const [url1, url2] = result.data.urls;
  const { threadId, analyses } = await analyzeVideoService([url1, url2]);
  res.status(StatusCodes.OK).json({ data: { threadId, analyses } });
}
