import type { Upload } from "@fullstack-template/schema";

export type ExplorerFilter = "all" | "image" | "video";
export type ExplorerSort = "newest" | "oldest" | "name";
export type ExplorerView = "small" | "medium" | "large" | "list";

export type ExplorerFolder = {
  id: string;
  name: string;
  count: number;
  parentId: string | null;
  coverUrl: string;
};

export type ExplorerFile = {
  id: string;
  name: string;
  contentType: string;
  createdAt: string;
  folderId: string | null;
  height?: number;
  previewUrl: string;
  size: number;
  tags?: string[];
  url: string;
  width?: number;
};

export function uploadToExplorerFile(upload: Upload): ExplorerFile {
  return {
    id: upload.id,
    name: upload.filename,
    contentType: upload.contentType,
    createdAt: upload.createdAt,
    folderId: null,
    height: undefined,
    previewUrl: upload.thumbnailUrl || upload.url,
    size: upload.size,
    tags: [],
    url: upload.url,
    width: undefined
  };
}
