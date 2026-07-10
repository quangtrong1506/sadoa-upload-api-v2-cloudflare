import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../app";

describe("GET /api/health", () => {
  it("returns 200 with the standard success envelope", async () => {
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      message: "API running",
    });
    expect(res.body.data).toHaveProperty("status", "ok");
    expect(typeof res.body.data.timestamp).toBe("string");
  });
});

describe("POST /api/example", () => {
  it("creates a record when payload is valid", async () => {
    const res = await request(app)
      .post("/api/example")
      .send({ name: "Ada Lovelace", email: "ada@example.com", age: 36 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      name: "Ada Lovelace",
      email: "ada@example.com",
    });
  });

  it("returns 422 with field errors when payload is invalid", async () => {
    const res = await request(app).post("/api/example").send({ name: "", email: "not-an-email" });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.errors.fieldErrors).toHaveProperty("name");
    expect(res.body.errors.fieldErrors).toHaveProperty("email");
  });
});

describe("unknown routes", () => {
  it("returns 404 with a structured error", async () => {
    const res = await request(app).get("/api/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
