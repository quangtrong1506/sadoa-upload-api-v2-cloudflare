import type { Request, Response } from "express";
import { httpResponse } from "../responses";
import { exampleService } from "../../services/example.service";
import type { ExampleInput } from "../schemas/example.schema";

export function createExample(req: Request, res: Response): void {
  const input = req.body as ExampleInput;
  const record = exampleService.create(input);
  httpResponse.created(res, record, "Example created");
}

export function listExamples(req: Request, res: Response): void {
  const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
  const limit = Number(rawLimit ?? 20);
  const records = exampleService.list(Number.isFinite(limit) ? limit : 20);
  httpResponse.ok(res, records, "Examples retrieved");
}
