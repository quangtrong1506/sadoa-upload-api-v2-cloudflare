import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../app";

vi.mock("../services/telegram.service", () => ({
  telegramService: {
    uploadImage: vi.fn(async () => [
      { file_id: "id_large", file_unique_id: "u1", width: 1280, height: 720 },
      { file_id: "id_small", file_unique_id: "u2", width: 320, height: 180 },
    ]),
    streamImage: vi.fn(async () => ({
      stream: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("fake-image-bytes"));
          controller.close();
        },
      }),
      contentType: "image/png",
    })),
  },
}));

const PNG_1X1 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describe("POST /api/images/upload", () => {
  it("rejects requests without the API key (401)", async () => {
    const res = await request(app)
      .post("/api/images/upload")
      .attach("image", Buffer.from(PNG_1X1, "base64"), {
        filename: "pixel.png",
        contentType: "image/png",
      });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("rejects non-image files (400)", async () => {
    const res = await request(app)
      .post("/api/images/upload")
      .set("x-api-key", "dev_api_key")
      .attach("image", Buffer.from("not an image"), {
        filename: "note.txt",
        contentType: "text/plain",
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("uploads a valid image and returns file ids (200)", async () => {
    const res = await request(app)
      .post("/api/images/upload")
      .set("x-api-key", "dev_api_key")
      .attach("image", Buffer.from(PNG_1X1, "base64"), {
        filename: "pixel.png",
        contentType: "image/png",
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.fileId).toBe("id_large");
  });
});

describe("GET /api/images/:id", () => {
  it("streams the stored image back (200, image content-type)", async () => {
    const res = await request(app).get("/api/images/abc123");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("image/png");
    expect(res.body.toString()).toBe("fake-image-bytes");
  });
});
