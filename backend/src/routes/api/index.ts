import { Router } from "express";
import { chatStream, getThread } from "@/controllers/video.controller";

const router = Router();

router.post("/chat", chatStream);
router.get("/thread/:threadId", getThread);

export default router;
