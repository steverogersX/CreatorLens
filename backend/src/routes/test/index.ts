import { Router, type Request, type Response } from "express";
import { sendSuccess } from "@/types/api-response";

const router = Router();

router.get("/ping", (_req: Request, res: Response) => {
  sendSuccess(res, { message: "test route alive" });
});

export default router;
