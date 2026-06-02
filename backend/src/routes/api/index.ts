import { Router } from "express";
import { chatStream, getThread, getThreads } from "@/controllers/video.controller";

const router = Router();

router.post("/chat", chatStream);
router.get("/threads", getThreads);
router.get("/thread/:threadId", getThread);

export default router;
