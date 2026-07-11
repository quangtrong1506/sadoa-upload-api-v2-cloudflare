export interface OpenApiSchema {
  type?: "string" | "number" | "integer" | "boolean" | "array" | "object";
  format?: string;
  description?: string;
  properties?: Record<string, OpenApiSchema>;
  required?: string[];
  items?: OpenApiSchema;
  additionalProperties?: boolean | OpenApiSchema;
  nullable?: boolean;
  example?: unknown;
  enum?: unknown[];
  oneOf?: OpenApiSchema[];
  anyOf?: OpenApiSchema[];
  allOf?: OpenApiSchema[];
  $ref?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  default?: unknown;
}

export interface OpenApiSecurityScheme {
  type: "apiKey";
  in: "header" | "query" | "cookie";
  name: string;
  description?: string;
}

export interface OpenApiParameter {
  name: string;
  in: "path" | "query" | "header";
  required?: boolean;
  schema: OpenApiSchema | { $ref: string };
  description?: string;
  example?: unknown;
}

export interface OpenApiEncoding {
  contentType?: string;
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
  headers?: OpenApiParameter[];
}

export interface OpenApiRequestBody {
  required?: boolean;
  content: {
    [mediaType: string]: {
      schema: OpenApiSchema | { $ref: string };
      example?: unknown;
      encoding?: Record<string, OpenApiEncoding>;
    };
  };
}

export interface OpenApiResponse {
  description: string;
  content?: {
    [mediaType: string]: {
      schema: OpenApiSchema | { $ref: string };
      example?: unknown;
    };
  };
  headers?: Record<string, OpenApiParameter>;
}

export interface OpenApiOperation {
  tags?: string[];
  summary?: string;
  description?: string;
  security?: Record<string, string[]>[];
  parameters?: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  responses: Record<string, OpenApiResponse>;
}

export interface OpenApiPathItem {
  [method: string]: OpenApiOperation;
}

export interface OpenApiDocument {
  openapi: "3.1.0";
  info: {
    title: string;
    version: string;
    description?: string;
    contact?: {
      name?: string;
      url?: string;
    };
  };
  servers?: {
    url: string;
    description?: string;
  }[];
  tags?: {
    name: string;
    description?: string;
  }[];
  security?: Record<string, string[]>[];
  components?: {
    schemas?: Record<string, OpenApiSchema>;
    securitySchemes?: Record<string, OpenApiSecurityScheme>;
  };
  paths: Record<string, OpenApiPathItem>;
}

export const openApiDocument: OpenApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "sadoa-upload-api-v2-cloudflare",
    version: "1.0.0",
    description:
      "Production-ready API for image upload and retrieval on Cloudflare Workers using Express.js",
    contact: {
      name: "API Support",
    },
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Local development",
    },
    {
      url: "https://api.example.com",
      description: "Production",
    },
  ],
  tags: [
    {
      name: "health",
      description: "Health and status checks",
    },
    {
      name: "images",
      description: "Image upload and retrieval operations",
    },
    {
      name: "examples",
      description: "Example CRUD endpoints",
    },
  ],
  security: [
    {
      "x-api-key": [],
    },
  ],
  components: {
    securitySchemes: {
      "x-api-key": {
        type: "apiKey",
        in: "header",
        name: "x-api-key",
        description: "API key required for authenticated endpoints",
      },
    },
    schemas: {
      ApiResponse: {
        type: "object",
        description: "Standard API response envelope used across all endpoints",
        properties: {
          success: {
            type: "boolean",
            description: "Indicates whether the request succeeded",
          },
          message: {
            type: "string",
            description: "Human-readable message describing the result",
          },
          data: {
            description: "Response payload when successful",
          },
          errors: {
            description: "Error details when the request failed",
          },
        },
        required: ["success"],
      },
      ErrorResponse: {
        type: "object",
        description: "Structured error response returned on failures",
        properties: {
          success: {
            type: "boolean",
            example: false,
          },
          message: {
            type: "string",
            description: "Human-readable error message",
            example: "Validation failed",
          },
          errors: {
            description: "Additional error context or validation details",
            example: { fieldErrors: { name: "name is required", email: "invalid email format" } },
          },
        },
        required: ["success", "message"],
      },
      HealthData: {
        type: "object",
        description: "Health check payload",
        properties: {
          status: {
            type: "string",
            example: "ok",
          },
          timestamp: {
            type: "string",
            format: "date-time",
            example: "2026-07-11T10:00:00.000Z",
          },
        },
        required: ["status", "timestamp"],
      },
      Photo: {
        type: "object",
        description: "Telegram photo variant with dimensions",
        properties: {
          file_id: {
            type: "string",
            example: "AgACAgQAAxkBAAIBc2e...",
          },
          file_unique_id: {
            type: "string",
            example: "AQADz4y_xxQ",
          },
          width: {
            type: "integer",
            example: 1280,
          },
          height: {
            type: "integer",
            example: 720,
          },
          file_size: {
            type: "integer",
            example: 45000,
          },
        },
        required: ["file_id", "file_unique_id", "width", "height"],
      },
      UploadImageData: {
        type: "object",
        description: "Response data for single image upload",
        properties: {
          fileId: {
            type: "string",
            description: "Telegram file ID of the uploaded image",
            example: "AgACAgQAAxkBAAIBc2e...",
          },
          photos: {
            type: "array",
            items: { $ref: "#/components/schemas/Photo" },
            description: "Available photo size variants",
          },
        },
        required: ["fileId", "photos"],
      },
      UploadImagesData: {
        type: "object",
        description: "Response data for multiple image upload",
        properties: {
          fileIds: {
            type: "array",
            items: { type: "string" },
            description: "Telegram file IDs of the uploaded images",
            example: ["AgACAgQAAxkBAAIBc2e...", "AgACAgQAAxkBAAIBdGe..."],
          },
          photos: {
            type: "array",
            items: { $ref: "#/components/schemas/Photo" },
            description: "All photo size variants across all uploaded images",
          },
        },
        required: ["fileIds", "photos"],
      },
      ExampleData: {
        type: "object",
        description: "Example record",
        properties: {
          id: {
            type: "string",
            format: "uuid",
            example: "550e8400-e29b-41d4-a716-446655440000",
          },
          name: {
            type: "string",
            example: "Ada Lovelace",
          },
          email: {
            type: "string",
            format: "email",
            example: "ada@example.com",
          },
          age: {
            type: "integer",
            nullable: true,
            example: 36,
          },
        },
        required: ["id", "name", "email"],
      },
    },
  },
  paths: {
    "/api/health": {
      get: {
        tags: ["health"],
        summary: "Health check",
        description: "Returns the current health status and timestamp of the API",
        responses: {
          "200": {
            description: "API is healthy and running",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiResponse" },
                example: {
                  success: true,
                  message: "API running",
                  data: {
                    status: "ok",
                    timestamp: "2026-07-11T10:00:00.000Z",
                  },
                },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: {
                  success: false,
                  message: "Internal Server Error",
                  errors: { details: "Unexpected failure" },
                },
              },
            },
          },
        },
      },
    },
    "/images/{id}": {
      get: {
        tags: ["images"],
        summary: "Retrieve image by ID",
        description: "Streams the stored image bytes back to the client with long cache headers",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Telegram file ID of the image",
            example: "AgACAgQAAxkBAAIBc2e...",
          },
        ],
        responses: {
          "200": {
            description: "Image binary data",
            content: {
              "image/jpeg": {
                schema: { type: "string", format: "binary" },
              },
              "image/png": {
                schema: { type: "string", format: "binary" },
              },
              "image/webp": {
                schema: { type: "string", format: "binary" },
              },
            },
            headers: {
              "Cache-Control": {
                name: "Cache-Control",
                in: "header",
                description: "Cache lifetime in seconds",
                schema: { type: "string", example: "public, max-age=31536000" },
              },
            },
          },
          "400": {
            description: "Bad request",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: {
                  success: false,
                  message: "Bad Request",
                },
              },
            },
          },
          "404": {
            description: "Image not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: {
                  success: false,
                  message: "Not Found",
                },
              },
            },
          },
        },
      },
    },
    "/api/images/upload": {
      post: {
        tags: ["images"],
        summary: "Upload multiple images",
        description:
          "Uploads one or more images to Telegram. Accepts multipart/form-data with image files. Returns file IDs and photo size variants.",
        security: [
          {
            "x-api-key": [],
          },
        ],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                description: "Multipart form data containing image files",
                properties: {
                  images: {
                    type: "array",
                    description: "Array of image files to upload",
                    items: {
                      type: "string",
                      format: "binary",
                      description: "Binary image data (PNG, JPEG, WebP)",
                    },
                  },
                },
                required: ["images"],
              },
              encoding: {
                images: {
                  contentType: "image/png, image/jpeg, image/webp",
                  style: "form",
                  explode: true,
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Images uploaded successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiResponse" },
                example: {
                  success: true,
                  message: "Images uploaded",
                  data: {
                    fileIds: ["AgACAgQAAxkBAAIBc2e...", "AgACAgQAAxkBAAIBdGe..."],
                    photos: [
                      {
                        file_id: "AgACAgQAAxkBAAIBc2e...",
                        file_unique_id: "AQADz4y_xxQ",
                        width: 1280,
                        height: 720,
                        file_size: 45000,
                      },
                    ],
                  },
                },
              },
            },
          },
          "400": {
            description: "Bad request - no files or invalid format",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: {
                  success: false,
                  message: "No image files provided",
                },
              },
            },
          },
          "401": {
            description: "Missing or invalid API key",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: {
                  success: false,
                  message: "Unauthorized",
                },
              },
            },
          },
          "413": {
            description: "Payload too large or too many files",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: {
                  success: false,
                  message: "Maximum 10 images allowed per request",
                },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: {
                  success: false,
                  message: "Internal Server Error",
                  errors: { details: "Telegram bot token not configured" },
                },
              },
            },
          },
        },
      },
    },
    "/api/example": {
      get: {
        tags: ["examples"],
        summary: "List examples",
        description: "Retrieves a paginated list of example records",
        parameters: [
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
            description: "Maximum number of records to return",
            example: 20,
          },
        ],
        responses: {
          "200": {
            description: "Examples retrieved successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiResponse" },
                example: {
                  success: true,
                  message: "Examples retrieved",
                  data: [
                    {
                      id: "550e8400-e29b-41d4-a716-446655440000",
                      name: "Ada Lovelace",
                      email: "ada@example.com",
                      age: 36,
                    },
                  ],
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["examples"],
        summary: "Create example",
        description: "Creates a new example record",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                    minLength: 1,
                    maxLength: 120,
                    example: "Ada Lovelace",
                  },
                  email: {
                    type: "string",
                    format: "email",
                    example: "ada@example.com",
                  },
                  age: {
                    type: "integer",
                    minimum: 0,
                    maximum: 150,
                    nullable: true,
                    example: 36,
                  },
                },
                required: ["name", "email"],
              },
              example: {
                name: "Ada Lovelace",
                email: "ada@example.com",
                age: 36,
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Example created successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiResponse" },
                example: {
                  success: true,
                  message: "Example created",
                  data: {
                    id: "550e8400-e29b-41d4-a716-446655440000",
                    name: "Ada Lovelace",
                    email: "ada@example.com",
                    age: 36,
                  },
                },
              },
            },
          },
          "422": {
            description: "Validation failed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: {
                  success: false,
                  message: "Validation failed",
                  errors: {
                    fieldErrors: {
                      name: "name is required",
                      email: "invalid email format",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
