import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../app";

vi.mock("../services/telegram", () => ({
  telegramService: {
    sendPhoto: vi.fn(async () => ({
      message_id: 1,
      chat: { id: 1, type: "private" },
      date: 1,
      photo: [
        { file_id: "id_large", file_unique_id: "u1", width: 1280, height: 720 },
        { file_id: "id_small", file_unique_id: "u2", width: 320, height: 180 },
      ],
    })),
    sendMediaGroup: vi.fn(async () => [
      {
        message_id: 1,
        chat: { id: 1, type: "private" },
        date: 1,
        photo: [{ file_id: "id_1", file_unique_id: "u1", width: 800, height: 600 }],
      },
      {
        message_id: 2,
        chat: { id: 1, type: "private" },
        date: 1,
        photo: [{ file_id: "id_2", file_unique_id: "u2", width: 1024, height: 768 }],
      },
    ]),
    streamImage: vi.fn(async () => ({
      buffer: new TextEncoder().encode("fake-image-bytes"),
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

  it("uploads multiple valid images and returns file ids (200)", async () => {
    const res = await request(app)
      .post("/api/images/upload")
      .set("x-api-key", "dev_api_key")
      .attach("images", Buffer.from(PNG_1X1, "base64"), {
        filename: "pixel1.png",
        contentType: "image/png",
      })
      .attach("images", Buffer.from(PNG_1X1, "base64"), {
        filename: "pixel2.png",
        contentType: "image/png",
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.fileIds).toEqual(["id_1", "id_2"]);
  });
});

describe("GET /images/:id", () => {
  it("streams the stored image back (200, image content-type)", async () => {
    const res = await request(app).get("/images/abc123");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("image/png");
    expect(res.body.toString()).toBe("fake-image-bytes");
  });
});
