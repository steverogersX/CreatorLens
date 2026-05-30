import { Router } from "express";
import { analyzeVideos } from "@/controllers/video.controller";

const router = Router();

router.post("/chat", analyzeVideos);

export default router;
