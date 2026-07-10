import type { ExampleInput } from "../api/schemas/example.schema";

export interface ExampleRecord {
  id: string;
  name: string;
  email: string;
  age?: number;
  createdAt: string;
}

/**
 * Example service layer.
 *
 * In a real project this is where data access (D1, KV, external APIs) lives.
 * Kept dependency-free here so the base template stays runnable without a
 * database binding, while still showing the controller -> service split.
 */
class ExampleService {
  private readonly store = new Map<string, ExampleRecord>();

  create(input: ExampleInput): ExampleRecord {
    const record: ExampleRecord = {
      id: crypto.randomUUID(),
      name: input.name,
      email: input.email,
      ...(input.age === undefined ? {} : { age: input.age }),
      createdAt: new Date().toISOString(),
    };
    this.store.set(record.id, record);
    return record;
  }

  list(limit: number): ExampleRecord[] {
    return Array.from(this.store.values()).slice(0, limit);
  }
}

export const exampleService = new ExampleService();
