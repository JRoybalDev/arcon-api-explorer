import { SiteListSchema, SiteSchema, UploadListSchema, UploadSchema, type SiteDraft } from "@fullstack-template/schema";
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
  }
};
