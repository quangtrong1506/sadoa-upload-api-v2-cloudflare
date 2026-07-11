import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../app";

describe("GET /openapi.json", () => {
  it("returns 200 with the OpenAPI 3.1 document", async () => {
    const res = await request(app).get("/openapi.json");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/vnd.oai.openapi+json");
    expect(res.body).toMatchObject({
      openapi: "3.1.0",
      info: {
        title: expect.any(String),
        version: expect.any(String),
      },
      paths: expect.objectContaining({}),
    });
    expect(res.body.paths).toHaveProperty("/api/health");
    expect(res.body.paths).toHaveProperty("/api/images/upload");
    expect(res.body.paths).toHaveProperty("/images/{id}");
  });
});

describe("GET /docs", () => {
  it("returns 200 with Swagger UI HTML", async () => {
    const res = await request(app).get("/docs");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.text).toContain("swagger-ui");
    expect(res.text).toContain("/openapi.json");
  });
});
