import { Router } from "express";
import { uploadImage, getImage } from "../controllers/image.controller";
import { apiKeyMiddleware } from "../middleware/api-key";
import { uploadMiddleware } from "../middleware/upload.middleware";

const router = Router();

router.post("/upload", apiKeyMiddleware, uploadMiddleware, uploadImage);
router.get("/:id", getImage);

export default router;
