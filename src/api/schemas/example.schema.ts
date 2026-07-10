import { z } from "zod";

/** Validation schema for `POST /api/example`. */
export const exampleSchema = z.object({
  name: z.string().min(1, "name is required").max(120),
  email: z.string().email("invalid email format"),
  age: z.coerce.number().int().min(0).max(150).optional(),
});

export type ExampleInput = z.infer<typeof exampleSchema>;

/** Validation schema for the `name` path/query param of example lookups. */
export const exampleListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
