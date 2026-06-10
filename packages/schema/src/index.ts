import { z } from "zod";

export const LinkSchema = z.object({
  label: z.string().min(1).max(80),
  href: z.string().url(),
  kind: z.enum(["primary", "secondary", "social"]).default("secondary")
});

export const UploadSchema = z.object({
  id: z.string().uuid(),
  filename: z.string().min(1),
  url: z.string().min(1),
  thumbnailUrl: z.string().default(""),
  storageProvider: z.enum(["local", "cloudinary"]).or(z.string()).default("local"),
  storageKey: z.string().default(""),
  storageResourceType: z.enum(["image", "video", "raw"]).or(z.string()).default("raw"),
  contentType: z.string().min(1),
  size: z.number().int().nonnegative(),
  createdAt: z.string().datetime()
});

export const UploadListSchema = z.array(UploadSchema);

export const defaultSiteMetadata = {
  tabTitle: "",
  seoTitle: "",
  seoDescription: "",
  faviconUrl: "",
  ogImageUrl: "",
  frontendAsideMode: "static" as "scroll" | "static"
};

export const defaultSiteBranding = {
  backgroundColor: "#f7f7f2",
  lightBackgroundColor: "#f7f7f2",
  darkBackgroundColor: "#111418",
  lightSurfaceColor: "#ffffff",
  darkSurfaceColor: "#191f27",
  lightSurfaceMutedColor: "#f8fafc",
  darkSurfaceMutedColor: "#202833",
  lightSurfaceAccentColor: "#eef6f7",
  darkSurfaceAccentColor: "#16333a",
  lightBorderColor: "#deded2",
  darkBorderColor: "#2c3440",
  lightBorderStrongColor: "#c9c9bd",
  darkBorderStrongColor: "#435061",
  lightBorderAccentColor: "#c7dde0",
  darkBorderAccentColor: "#2b6871",
  lightSurfaceDangerColor: "#fff1f1",
  darkSurfaceDangerColor: "#3a2020",
  lightBorderDangerColor: "#f1c5c5",
  darkBorderDangerColor: "#6f3535",
  lightTextColor: "#18212f",
  darkTextColor: "#e8edf3",
  lightHeadingColor: "#101828",
  darkHeadingColor: "#f7fafc",
  lightMutedColor: "#536173",
  darkMutedColor: "#aab6c5",
  lightNavColor: "#445064",
  darkNavColor: "#c6d0dd",
  lightAccentColor: "#006d77",
  darkAccentColor: "#55c8d6",
  lightAccentStrongColor: "#005f69",
  darkAccentStrongColor: "#9de4ec",
  lightAccentTextColor: "#193926",
  darkAccentTextColor: "#d6fbef",
  lightButtonPrimaryColor: "#635bff",
  darkButtonPrimaryColor: "#7c73ff",
  lightButtonPrimaryTextColor: "#ffffff",
  darkButtonPrimaryTextColor: "#ffffff",
  lightButtonSecondaryColor: "#eef6f7",
  darkButtonSecondaryColor: "#202833",
  lightButtonSecondaryTextColor: "#005f69",
  darkButtonSecondaryTextColor: "#9de4ec",
  lightButtonSecondaryBorderColor: "#c7dde0",
  darkButtonSecondaryBorderColor: "#435061",
  lightDangerColor: "#b42318",
  darkDangerColor: "#ff9b8f",
  lightNavActiveColor: "#e7f0e8",
  darkNavActiveColor: "#18382f",
  lightTopbarColor: "#f7f7f2",
  darkTopbarColor: "#111418",
  surfaceColor: "#ffffff",
  textColor: "#18212f",
  headingColor: "#101828",
  accentColor: "#006d77"
};

export const SiteMetadataSchema = z.object({
  tabTitle: z.string().max(80).default(""),
  seoTitle: z.string().max(160).default(""),
  seoDescription: z.string().max(300).default(""),
  faviconUrl: z.string().url().or(z.literal("")).default(""),
  ogImageUrl: z.string().url().or(z.literal("")).default(""),
  frontendAsideMode: z.enum(["scroll", "static"]).default("static")
});

export const SiteBrandingSchema = z.object({
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#f7f7f2"),
  lightBackgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#f7f7f2"),
  darkBackgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#111418"),
  lightSurfaceColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#ffffff"),
  darkSurfaceColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#191f27"),
  lightSurfaceMutedColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#f8fafc"),
  darkSurfaceMutedColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#202833"),
  lightSurfaceAccentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#eef6f7"),
  darkSurfaceAccentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#16333a"),
  lightBorderColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#deded2"),
  darkBorderColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#2c3440"),
  lightBorderStrongColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#c9c9bd"),
  darkBorderStrongColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#435061"),
  lightBorderAccentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#c7dde0"),
  darkBorderAccentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#2b6871"),
  lightSurfaceDangerColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#fff1f1"),
  darkSurfaceDangerColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#3a2020"),
  lightBorderDangerColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#f1c5c5"),
  darkBorderDangerColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#6f3535"),
  lightTextColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#18212f"),
  darkTextColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#e8edf3"),
  lightHeadingColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#101828"),
  darkHeadingColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#f7fafc"),
  lightMutedColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#536173"),
  darkMutedColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#aab6c5"),
  lightNavColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#445064"),
  darkNavColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#c6d0dd"),
  lightAccentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#006d77"),
  darkAccentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#55c8d6"),
  lightAccentStrongColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#005f69"),
  darkAccentStrongColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#9de4ec"),
  lightAccentTextColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#193926"),
  darkAccentTextColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#d6fbef"),
  lightButtonPrimaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#635bff"),
  darkButtonPrimaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#7c73ff"),
  lightButtonPrimaryTextColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#ffffff"),
  darkButtonPrimaryTextColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#ffffff"),
  lightButtonSecondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#eef6f7"),
  darkButtonSecondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#202833"),
  lightButtonSecondaryTextColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#005f69"),
  darkButtonSecondaryTextColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#9de4ec"),
  lightButtonSecondaryBorderColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#c7dde0"),
  darkButtonSecondaryBorderColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#435061"),
  lightDangerColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#b42318"),
  darkDangerColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#ff9b8f"),
  lightNavActiveColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#e7f0e8"),
  darkNavActiveColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#18382f"),
  lightTopbarColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#f7f7f2"),
  darkTopbarColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#111418"),
  surfaceColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#ffffff"),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#18212f"),
  headingColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#101828"),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#006d77")
});

export const SiteSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(160),
  description: z.string().max(1000).default(""),
  heroImageUrl: z.string().url().or(z.literal("")).default(""),
  metadata: SiteMetadataSchema.default(defaultSiteMetadata),
  branding: SiteBrandingSchema.default(defaultSiteBranding),
  links: z.array(LinkSchema).default([]),
  published: z.boolean().default(false),
  updatedAt: z.string().datetime()
});

export const SiteDraftSchema = SiteSchema.omit({
  id: true,
  updatedAt: true
}).extend({
  slug: SiteSchema.shape.slug,
  title: SiteSchema.shape.title
});

export const SiteListSchema = z.array(SiteSchema);

export const ApiMetaSchema = z.object({
  requestId: z.string().optional()
});

export const ApiErrorSchema = z.object({
  success: z.literal(false).default(false),
  error: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional(),
  meta: ApiMetaSchema.optional()
});

export const ApiSuccessSchema = z.object({
  success: z.literal(true),
  data: z.unknown(),
  meta: ApiMetaSchema.optional()
});

export const ApiResponseSchema = z.union([ApiSuccessSchema, ApiErrorSchema]);

export type Link = z.infer<typeof LinkSchema>;
export type Upload = z.infer<typeof UploadSchema>;
export type UploadList = z.infer<typeof UploadListSchema>;
export type SiteMetadata = z.infer<typeof SiteMetadataSchema>;
export type SiteBranding = z.infer<typeof SiteBrandingSchema>;
export type Site = z.infer<typeof SiteSchema>;
export type SiteDraft = z.infer<typeof SiteDraftSchema>;
export type SiteDraftInput = z.input<typeof SiteDraftSchema>;
export type ApiMeta = z.infer<typeof ApiMetaSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type ApiSuccess = z.infer<typeof ApiSuccessSchema>;
export type ApiResponse = z.infer<typeof ApiResponseSchema>;
