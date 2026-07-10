import { Router } from "express";
import { createExample, listExamples } from "../controllers/example.controller";
import { validateBody } from "../middleware/validate";
import { exampleSchema } from "../schemas/example.schema";

const router = Router();

router.get("/", listExamples);
router.post("/", validateBody(exampleSchema), createExample);

export default router;
