export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Fullstack Template API",
    version: "0.1.0",
    description: "Bun + Hono API for public site records, protected dashboard writes, uploads, and Better Auth."
  },
  servers: [{ url: "/" }],
  components: {
    securitySchemes: {
      AdminKey: {
        type: "apiKey",
        in: "header",
        name: "X-Admin-Key"
      },
      BetterAuthCookie: {
        type: "apiKey",
        in: "cookie",
        name: "better-auth.session_token"
      }
    },
    schemas: {
      ApiMeta: {
        type: "object",
        properties: {
          requestId: { type: "string" }
        }
      },
      ApiSuccess: {
        type: "object",
        required: ["success", "data"],
        properties: {
          success: { type: "boolean", const: true },
          data: {},
          meta: { $ref: "#/components/schemas/ApiMeta" }
        }
      },
      ApiError: {
        type: "object",
        required: ["success", "error"],
        properties: {
          success: { type: "boolean", const: false },
          error: { type: "string" },
          code: { type: "string" },
          details: {},
          meta: { $ref: "#/components/schemas/ApiMeta" }
        }
      },
      Upload: {
        type: "object",
        required: ["id", "filename", "url", "thumbnailUrl", "storageProvider", "storageKey", "storageResourceType", "contentType", "size", "createdAt"],
        properties: {
          id: { type: "string", format: "uuid" },
          filename: { type: "string" },
          url: { type: "string" },
          thumbnailUrl: { type: "string" },
          storageProvider: { type: "string", examples: ["local", "cloudinary"] },
          storageKey: { type: "string" },
          storageResourceType: { type: "string", examples: ["image", "video", "raw"] },
          contentType: { type: "string" },
          size: { type: "integer", minimum: 0 },
          createdAt: { type: "string", format: "date-time" }
        }
      },
      Site: {
        type: "object",
        required: ["id", "slug", "title", "description", "heroImageUrl", "metadata", "branding", "links", "published", "updatedAt"],
        properties: {
          id: { type: "string", format: "uuid" },
          slug: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          heroImageUrl: { type: "string" },
          metadata: { type: "object" },
          branding: { type: "object" },
          links: { type: "array", items: { type: "object" } },
          published: { type: "boolean" },
          updatedAt: { type: "string", format: "date-time" }
        }
      }
    }
  },
  paths: {
    "/health": {
      get: {
        summary: "Health check",
        responses: {
          "200": { description: "API is healthy" }
        }
      }
    },
    "/api/sites": {
      get: {
        summary: "List published site records",
        responses: {
          "200": { description: "Published records" }
        }
      },
      post: {
        summary: "Create or update a site record",
        security: [{ AdminKey: [] }, { BetterAuthCookie: [] }],
        responses: {
          "201": { description: "Saved site record" },
          "400": { description: "Invalid payload", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } }
        }
      }
    },
    "/api/sites/{slug}": {
      get: {
        summary: "Get a published site record",
        parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Published site record" },
          "404": { description: "Not found" }
        }
      },
      delete: {
        summary: "Delete a site record",
        security: [{ AdminKey: [] }, { BetterAuthCookie: [] }],
        parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Deleted site record" },
          "404": { description: "Not found" }
        }
      }
    },
    "/api/uploads": {
      get: {
        summary: "List uploads",
        security: [{ AdminKey: [] }, { BetterAuthCookie: [] }],
        responses: {
          "200": { description: "Upload list" }
        }
      },
      post: {
        summary: "Upload a media asset",
        security: [{ AdminKey: [] }, { BetterAuthCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file"],
                properties: {
                  file: { type: "string", format: "binary" }
                }
              }
            }
          }
        },
        responses: {
          "201": { description: "Created upload" }
        }
      }
    },
    "/api/uploads/{id}/replace": {
      post: {
        summary: "Replace an upload and remove the old stored asset",
        description: "Uploads the new file, updates Postgres, then deletes the previous local or Cloudinary asset so storage does not overpopulate.",
        security: [{ AdminKey: [] }, { BetterAuthCookie: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file"],
                properties: {
                  file: { type: "string", format: "binary" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Replaced upload" },
          "404": { description: "Upload not found" }
        }
      }
    },
    "/api/uploads/{id}": {
      delete: {
        summary: "Delete an upload and remove the stored asset",
        security: [{ AdminKey: [] }, { BetterAuthCookie: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Deleted upload" },
          "404": { description: "Upload not found" }
        }
      }
    },
    "/api/admin/session": {
      get: {
        summary: "Verify dashboard admin access",
        security: [{ AdminKey: [] }, { BetterAuthCookie: [] }],
        responses: {
          "200": { description: "Session is valid" }
        }
      }
    },
    "/api/auth/*": {
      get: {
        summary: "Better Auth routes",
        responses: {
          "200": { description: "Better Auth response" }
        }
      },
      post: {
        summary: "Better Auth routes",
        responses: {
          "200": { description: "Better Auth response" }
        }
      }
    }
  }
} as const;

export function openApiHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Fullstack Template API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: "/openapi.json",
        dom_id: "#swagger-ui",
        deepLinking: true,
        persistAuthorization: true
      });
    </script>
  </body>
</html>`;
}
