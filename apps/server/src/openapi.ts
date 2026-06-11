export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "ARCON API",
    version: "0.1.0",
    description: "Hono API for explorer media, public site records, protected dashboard writes, uploads, and Better Auth."
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
      ExplorerFolder: {
        type: "object",
        required: ["id", "name", "parentId", "coverUrl", "folderCount", "itemCount", "createdAt", "updatedAt"],
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          parentId: { type: ["string", "null"], format: "uuid" },
          coverUrl: { type: "string" },
          folderCount: { type: "integer", minimum: 0 },
          itemCount: { type: "integer", minimum: 0 },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" }
        }
      },
      ExplorerMedia: {
        type: "object",
        required: ["id", "name", "contentType", "createdAt", "duration", "favorite", "folderId", "height", "previewUrl", "size", "source", "storageKey", "storageProvider", "storageResourceType", "tags", "url", "width"],
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          contentType: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          duration: { type: ["integer", "null"] },
          favorite: { type: "boolean" },
          folderId: { type: ["string", "null"], format: "uuid" },
          height: { type: ["integer", "null"] },
          previewUrl: { type: "string" },
          size: { type: "integer", minimum: 0 },
          source: { type: "string", examples: ["indexed", "upload", "remote", "fake"] },
          storageKey: { type: "string" },
          storageProvider: { type: "string", examples: ["local", "remote"] },
          storageResourceType: { type: "string", examples: ["image", "video", "raw"] },
          tags: { type: "array", items: { type: "string" } },
          url: { type: "string" },
          width: { type: ["integer", "null"] }
        }
      },
      ExplorerContents: {
        type: "object",
        required: ["folders", "media", "mediaLimit", "mediaOffset", "mediaTotal"],
        properties: {
          folders: { type: "array", items: { $ref: "#/components/schemas/ExplorerFolder" } },
          media: { type: "array", items: { $ref: "#/components/schemas/ExplorerMedia" } },
          mediaLimit: { type: "integer", minimum: 0 },
          mediaOffset: { type: "integer", minimum: 0 },
          mediaTotal: { type: "integer", minimum: 0 }
        }
      },
      ExplorerCreateFolderInput: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", minLength: 1, maxLength: 120 },
          parentId: { type: ["string", "null"], format: "uuid" }
        }
      },
      ExplorerRemoteMediaInput: {
        type: "object",
        required: ["items"],
        properties: {
          folderId: { type: ["string", "null"], format: "uuid" },
          items: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              required: ["url"],
              properties: {
                title: { type: "string", maxLength: 240 },
                url: { type: "string", format: "uri" },
                thumbnailUrl: { type: "string" },
                tags: { type: "array", items: { type: "string" } }
              }
            }
          }
        }
      },
      ExplorerMoveMediaInput: {
        type: "object",
        required: ["mediaIds"],
        properties: {
          folderId: { type: ["string", "null"], format: "uuid" },
          mediaIds: { type: "array", minItems: 1, items: { type: "string", format: "uuid" } }
        }
      },
      ExplorerDeleteMediaInput: {
        type: "object",
        required: ["mediaIds"],
        properties: {
          mediaIds: { type: "array", minItems: 1, items: { type: "string", format: "uuid" } }
        }
      },
      ExplorerFavoriteInput: {
        type: "object",
        required: ["favorite"],
        properties: {
          favorite: { type: "boolean" }
        }
      },
      ExplorerTagsInput: {
        type: "object",
        required: ["tags"],
        properties: {
          tags: { type: "array", maxItems: 30, items: { type: "string", minLength: 1, maxLength: 40 } }
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
    "/api/explorer/contents": {
      get: {
        summary: "List explorer folders and media",
        description: "Returns child folders plus a paginated media list. Search matches file names and tags. The mixed filter includes media from the current folder and all descendant folders.",
        security: [{ AdminKey: [] }],
        parameters: [
          { name: "folderId", in: "query", schema: { type: "string", format: "uuid" } },
          { name: "filter", in: "query", schema: { type: "string", enum: ["all", "image", "video", "mixed"], default: "all" } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "sort", in: "query", schema: { type: "string", enum: ["newest", "oldest", "name"], default: "newest" } },
          { name: "shuffleSeed", in: "query", description: "Stable seed for shuffled ordering across paginated requests.", schema: { type: "integer" } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 240, default: 120 } },
          { name: "offset", in: "query", schema: { type: "integer", minimum: 0, default: 0 } }
        ],
        responses: {
          "200": {
            description: "Explorer contents",
            content: { "application/json": { schema: { allOf: [{ $ref: "#/components/schemas/ApiSuccess" }, { type: "object", properties: { data: { $ref: "#/components/schemas/ExplorerContents" } } }] } } }
          }
        }
      }
    },
    "/api/explorer/folders": {
      get: {
        summary: "List all explorer folders",
        security: [{ AdminKey: [] }],
        responses: {
          "200": {
            description: "Folder list",
            content: { "application/json": { schema: { allOf: [{ $ref: "#/components/schemas/ApiSuccess" }, { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/ExplorerFolder" } } } }] } } }
          }
        }
      },
      post: {
        summary: "Create an explorer folder",
        security: [{ AdminKey: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ExplorerCreateFolderInput" } } }
        },
        responses: {
          "201": {
            description: "Created folder",
            content: { "application/json": { schema: { allOf: [{ $ref: "#/components/schemas/ApiSuccess" }, { type: "object", properties: { data: { $ref: "#/components/schemas/ExplorerFolder" } } }] } } }
          },
          "400": { description: "Invalid payload", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
          "404": { description: "Parent folder not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } }
        }
      }
    },
    "/api/explorer/media/upload": {
      post: {
        summary: "Upload one explorer media file",
        security: [{ AdminKey: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file"],
                properties: {
                  file: { type: "string", format: "binary" },
                  folderId: { type: "string", format: "uuid" }
                }
              }
            }
          }
        },
        responses: {
          "201": {
            description: "Uploaded media",
            content: { "application/json": { schema: { allOf: [{ $ref: "#/components/schemas/ApiSuccess" }, { type: "object", properties: { data: { $ref: "#/components/schemas/ExplorerMedia" } } }] } } }
          },
          "400": { description: "Missing file", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } }
        }
      }
    },
    "/api/explorer/media/remote": {
      post: {
        summary: "Add remote explorer media URLs",
        security: [{ AdminKey: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ExplorerRemoteMediaInput" } } }
        },
        responses: {
          "201": {
            description: "Created remote media rows",
            content: { "application/json": { schema: { allOf: [{ $ref: "#/components/schemas/ApiSuccess" }, { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/ExplorerMedia" } } } }] } } }
          },
          "400": { description: "Invalid payload", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } }
        }
      }
    },
    "/api/explorer/media/move": {
      post: {
        summary: "Move explorer media items",
        security: [{ AdminKey: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ExplorerMoveMediaInput" } } }
        },
        responses: {
          "200": {
            description: "Moved media rows",
            content: { "application/json": { schema: { allOf: [{ $ref: "#/components/schemas/ApiSuccess" }, { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/ExplorerMedia" } } } }] } } }
          }
        }
      }
    },
    "/api/explorer/media": {
      delete: {
        summary: "Delete explorer media items",
        security: [{ AdminKey: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ExplorerDeleteMediaInput" } } }
        },
        responses: {
          "200": {
            description: "Deleted media rows",
            content: { "application/json": { schema: { allOf: [{ $ref: "#/components/schemas/ApiSuccess" }, { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/ExplorerMedia" } } } }] } } }
          }
        }
      }
    },
    "/api/explorer/media/{id}/favorite": {
      post: {
        summary: "Set explorer media favorite state",
        security: [{ AdminKey: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ExplorerFavoriteInput" } } }
        },
        responses: {
          "200": {
            description: "Updated media row",
            content: { "application/json": { schema: { allOf: [{ $ref: "#/components/schemas/ApiSuccess" }, { type: "object", properties: { data: { $ref: "#/components/schemas/ExplorerMedia" } } }] } } }
          },
          "404": { description: "Media not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } }
        }
      }
    },
    "/api/explorer/media/{id}/tags": {
      post: {
        summary: "Replace explorer media tags",
        security: [{ AdminKey: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ExplorerTagsInput" } } }
        },
        responses: {
          "200": {
            description: "Updated media row",
            content: { "application/json": { schema: { allOf: [{ $ref: "#/components/schemas/ApiSuccess" }, { type: "object", properties: { data: { $ref: "#/components/schemas/ExplorerMedia" } } }] } } }
          },
          "400": { description: "Invalid payload", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
          "404": { description: "Media not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } }
        }
      }
    },
    "/api/explorer/populate": {
      post: {
        summary: "Run explorer filesystem population",
        security: [{ AdminKey: [] }],
        responses: {
          "200": {
            description: "Population completed",
            content: { "application/json": { schema: { allOf: [{ $ref: "#/components/schemas/ApiSuccess" }, { type: "object", properties: { data: { type: "object", properties: { completed: { type: "boolean" } } } } }] } } }
          }
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
    <title>ARCON API Docs</title>
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
