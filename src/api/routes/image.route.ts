import { Router } from "express";
import { uploadImage } from "../controllers/image.controller";
import { apiKeyMiddleware } from "../middleware/api-key";
import { uploadMiddleware } from "../middleware/upload.middleware";

const router = Router();

router.post("/upload", apiKeyMiddleware, uploadMiddleware, uploadImage);

export default router;
