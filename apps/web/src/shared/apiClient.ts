import {
  ExplorerContentsSchema,
  ExplorerFolderSchema,
  ExplorerMediaSchema,
  SiteListSchema,
  SiteSchema,
  UploadListSchema,
  UploadSchema,
  type ExplorerMedia,
  type SiteDraft
} from "@fullstack-template/schema";
import { apiJson, withAdminKey } from "./api";

export type AuthConfig = {
  authMode: "admin-key" | "better-auth";
  signupMode: "private" | "public";
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user" | string;
  banned: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateAdminUserInput = {
  name: string;
  email: string;
  password: string;
  role: "admin" | "user";
};

export type UpdateAdminUserRoleInput = {
  role: "admin" | "user";
};

export type BanAdminUserInput = {
  banReason?: string;
  banExpiresIn?: number;
};

export type SetAdminUserPasswordInput = {
  newPassword: string;
};

export const apiClient = {
  auth: {
    async config() {
      return (await apiJson("/api/auth/config")) as AuthConfig;
    },

    async requestPasswordReset(email: string, redirectTo: string) {
      return apiJson("/api/auth/request-password-reset", {
        method: "POST",
        body: JSON.stringify({ email, redirectTo })
      });
    },

    async resetPassword(token: string, newPassword: string) {
      return apiJson("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword })
      });
    }
  },

  sites: {
    async listPublic() {
      return SiteListSchema.parse(await apiJson("/api/sites"));
    },

    async getPublic(slug: string) {
      return SiteSchema.parse(await apiJson(`/api/sites/${encodeURIComponent(slug)}`));
    }
  },

  admin: {
    async verifySession(adminKey: string) {
      return apiJson("/api/admin/session", withAdminKey(adminKey));
    },

    async listSites(adminKey: string) {
      return SiteListSchema.parse(await apiJson("/api/admin/sites", withAdminKey(adminKey)));
    },

    async listUsers(adminKey: string) {
      return (await apiJson("/api/admin/users", withAdminKey(adminKey))) as AdminUser[];
    },

    async createUser(adminKey: string, input: CreateAdminUserInput) {
      return apiJson(
        "/api/admin/users",
        withAdminKey(adminKey, {
          method: "POST",
          body: JSON.stringify(input)
        })
      );
    },

    async updateUserRole(adminKey: string, userId: string, input: UpdateAdminUserRoleInput) {
      return apiJson(
        `/api/admin/users/${encodeURIComponent(userId)}/role`,
        withAdminKey(adminKey, {
          method: "POST",
          body: JSON.stringify(input)
        })
      );
    },

    async banUser(adminKey: string, userId: string, input: BanAdminUserInput) {
      return apiJson(
        `/api/admin/users/${encodeURIComponent(userId)}/ban`,
        withAdminKey(adminKey, {
          method: "POST",
          body: JSON.stringify(input)
        })
      );
    },

    async unbanUser(adminKey: string, userId: string) {
      return apiJson(
        `/api/admin/users/${encodeURIComponent(userId)}/unban`,
        withAdminKey(adminKey, {
          method: "POST"
        })
      );
    },

    async setUserPassword(adminKey: string, userId: string, input: SetAdminUserPasswordInput) {
      return apiJson(
        `/api/admin/users/${encodeURIComponent(userId)}/password`,
        withAdminKey(adminKey, {
          method: "POST",
          body: JSON.stringify(input)
        })
      );
    },

    async revokeUserSessions(adminKey: string, userId: string) {
      return apiJson(
        `/api/admin/users/${encodeURIComponent(userId)}/revoke-sessions`,
        withAdminKey(adminKey, {
          method: "POST"
        })
      );
    },

    async deleteUser(adminKey: string, userId: string) {
      return apiJson(
        `/api/admin/users/${encodeURIComponent(userId)}`,
        withAdminKey(adminKey, {
          method: "DELETE"
        })
      );
    },

    async saveSite(adminKey: string, draft: SiteDraft) {
      return SiteSchema.parse(
        await apiJson(
          "/api/sites",
          withAdminKey(adminKey, {
            method: "POST",
            body: JSON.stringify(draft)
          })
        )
      );
    },

    async deleteSite(adminKey: string, slug: string) {
      return SiteSchema.parse(
        await apiJson(
          `/api/sites/${encodeURIComponent(slug)}`,
          withAdminKey(adminKey, {
            method: "DELETE"
          })
        )
      );
    }
  },

  uploads: {
    async list(adminKey: string) {
      return UploadListSchema.parse(await apiJson("/api/uploads", withAdminKey(adminKey)));
    },

    async create(adminKey: string, file: File) {
      const form = new FormData();
      form.append("file", file);

      return UploadSchema.parse(
        await apiJson(
          "/api/uploads",
          withAdminKey(adminKey, {
            method: "POST",
            body: form
          })
        )
      );
    },

    async replace(adminKey: string, uploadId: string, file: File) {
      const form = new FormData();
      form.append("file", file);

      return UploadSchema.parse(
        await apiJson(
          `/api/uploads/${encodeURIComponent(uploadId)}/replace`,
          withAdminKey(adminKey, {
            method: "POST",
            body: form
          })
        )
      );
    },

    async delete(adminKey: string, uploadId: string) {
      return UploadSchema.parse(
        await apiJson(
          `/api/uploads/${encodeURIComponent(uploadId)}`,
          withAdminKey(adminKey, {
            method: "DELETE"
          })
        )
      );
    }
  },

  explorer: {
    async contents(
      adminKey: string,
      input: {
        filter?: "all" | "image" | "video" | "mixed";
        folderId?: string | null;
        limit?: number;
        offset?: number;
        search?: string;
        shuffleSeed?: number;
        sort?: "newest" | "oldest" | "name";
      } = {}
    ) {
      const params = new URLSearchParams();
      if (input.folderId) {
        params.set("folderId", input.folderId);
      }
      if (input.filter) {
        params.set("filter", input.filter);
      }
      if (typeof input.limit === "number") {
        params.set("limit", String(input.limit));
      }
      if (typeof input.offset === "number") {
        params.set("offset", String(input.offset));
      }
      if (input.search) {
        params.set("search", input.search);
      }
      if (input.shuffleSeed) {
        params.set("shuffleSeed", String(input.shuffleSeed));
      }
      if (input.sort) {
        params.set("sort", input.sort);
      }

      const query = params.toString();
      return ExplorerContentsSchema.parse(await apiJson(`/api/explorer/contents${query ? `?${query}` : ""}`, withAdminKey(adminKey)));
    },

    async listFolders(adminKey: string) {
      return ExplorerFolderSchema.array().parse(await apiJson("/api/explorer/folders", withAdminKey(adminKey)));
    },

    async createFolder(adminKey: string, input: { name: string; parentId: string | null }) {
      return ExplorerFolderSchema.parse(
        await apiJson(
          "/api/explorer/folders",
          withAdminKey(adminKey, {
            method: "POST",
            body: JSON.stringify(input)
          })
        )
      );
    },

    async uploadFile(adminKey: string, file: File, folderId: string | null) {
      const form = new FormData();
      form.append("file", file);
      if (folderId) {
        form.append("folderId", folderId);
      }

      return ExplorerMediaSchema.parse(
        await apiJson(
          "/api/explorer/media/upload",
          withAdminKey(adminKey, {
            method: "POST",
            body: form
          })
        )
      );
    },

    async uploadFileWithProgress(adminKey: string, file: File, folderId: string | null, onProgress: (loaded: number, total: number) => void, signal?: AbortSignal) {
      const form = new FormData();
      form.append("file", file);
      if (folderId) {
        form.append("folderId", folderId);
      }

      return new Promise<ExplorerMedia>((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("POST", "/api/explorer/media/upload");
        request.setRequestHeader("X-Admin-Key", adminKey);

        if (signal?.aborted) {
          request.abort();
          reject(new Error("Upload cancelled"));
          return;
        }

        function abortRequest() {
          request.abort();
        }

        signal?.addEventListener("abort", abortRequest, { once: true });

        request.upload.addEventListener("progress", (event) => {
          onProgress(event.loaded, event.lengthComputable ? event.total : file.size);
        });

        request.addEventListener("load", () => {
          try {
            const parsed = JSON.parse(request.responseText) as unknown;

            if (request.status < 200 || request.status >= 300) {
              reject(new Error(typeof parsed === "object" && parsed && "message" in parsed ? String(parsed.message) : "Upload failed"));
              return;
            }

            const data = parsed && typeof parsed === "object" && "success" in parsed && parsed.success === true && "data" in parsed ? parsed.data : parsed;
            resolve(ExplorerMediaSchema.parse(data));
          } catch (error) {
            reject(error);
          } finally {
            signal?.removeEventListener("abort", abortRequest);
          }
        });

        request.addEventListener("error", () => {
          signal?.removeEventListener("abort", abortRequest);
          reject(new Error("Upload failed"));
        });
        request.addEventListener("abort", () => {
          signal?.removeEventListener("abort", abortRequest);
          reject(new Error("Upload cancelled"));
        });
        request.send(form);
      });
    },

    async addRemoteMedia(adminKey: string, input: { folderId: string | null; items: Array<{ tags?: string[]; thumbnailUrl?: string; title?: string; url: string }> }, signal?: AbortSignal) {
      return ExplorerMediaSchema.array().parse(
        await apiJson(
          "/api/explorer/media/remote",
          withAdminKey(adminKey, {
            method: "POST",
            signal,
            body: JSON.stringify(input)
          })
        )
      );
    },

    async moveMedia(adminKey: string, input: { folderId: string | null; mediaIds: string[] }) {
      return ExplorerMediaSchema.array().parse(
        await apiJson(
          "/api/explorer/media/move",
          withAdminKey(adminKey, {
            method: "POST",
            body: JSON.stringify(input)
          })
        )
      );
    },

    async deleteMedia(adminKey: string, mediaIds: string[]) {
      return ExplorerMediaSchema.array().parse(
        await apiJson(
          "/api/explorer/media",
          withAdminKey(adminKey, {
            method: "DELETE",
            body: JSON.stringify({ mediaIds })
          })
        )
      );
    },

    async setFavorite(adminKey: string, mediaId: string, favorite: boolean): Promise<ExplorerMedia> {
      return ExplorerMediaSchema.parse(
        await apiJson(
          `/api/explorer/media/${encodeURIComponent(mediaId)}/favorite`,
          withAdminKey(adminKey, {
            method: "POST",
            body: JSON.stringify({ favorite })
          })
        )
      );
    },

    async setTags(adminKey: string, mediaId: string, tags: string[]): Promise<ExplorerMedia> {
      return ExplorerMediaSchema.parse(
        await apiJson(
          `/api/explorer/media/${encodeURIComponent(mediaId)}/tags`,
          withAdminKey(adminKey, {
            method: "POST",
            body: JSON.stringify({ tags })
          })
        )
      );
    }
  }
};
