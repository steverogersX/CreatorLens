import type { Request, Response, NextFunction } from "express";
import { fromZodError } from "zod-validation-error";
import { analyzeVideosSchema } from "@/schemas/video.schema";
import { BadRequestError } from "@/errors/app-error";
import { analyzeVideos as analyzeVideoService } from "@/services/video.service";
import { StatusCodes } from "http-status-codes";

export async function analyzeVideos(req: Request, res: Response, next: NextFunction): Promise<void> {
    const result = analyzeVideosSchema.safeParse(req.body);

    if (!result.success) {
        throw new BadRequestError(fromZodError(result.error).message);
    }

    const [url1, url2] = result.data.urls;

    const videoAnalysis = await analyzeVideoService([url1, url2])


    res.status(StatusCodes.OK).json({ data: videoAnalysis });

}
