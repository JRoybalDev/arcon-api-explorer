import type { ExplorerFile, ExplorerFolder } from "./types";

export const explorerFolders: ExplorerFolder[] = [
  {
    id: "architecture",
    name: "Architecture",
    count: 8,
    parentId: null,
    coverUrl: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "nature",
    name: "Nature",
    count: 9,
    parentId: null,
    coverUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "street-photography",
    name: "Street Photography",
    count: 5,
    parentId: null,
    coverUrl: "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "abstracts",
    name: "Abstracts",
    count: 4,
    parentId: null,
    coverUrl: "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "projects",
    name: "Projects",
    count: 2,
    parentId: null,
    coverUrl: "https://images.unsplash.com/photo-1557682250-33bd709cbe85?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "night-shots",
    name: "Night Shots",
    count: 5,
    parentId: "architecture",
    coverUrl: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "interiors",
    name: "Interiors",
    count: 3,
    parentId: "architecture",
    coverUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80"
  }
];

export const sampleExplorerFiles: ExplorerFile[] = [
  {
    id: "sample-abstract-light",
    name: "mocha-light-curve.jpg",
    contentType: "image/jpeg",
    createdAt: "2026-06-01T10:00:00.000Z",
    folderId: null,
    height: 6670,
    previewUrl: "https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?auto=format&fit=crop&w=900&q=80",
    size: 118_500_000,
    tags: ["abstract", "texture", "minimal"],
    url: "https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?auto=format&fit=crop&w=900&q=80",
    width: 4447
  },
  {
    id: "sample-city-night",
    name: "city-night-rooftop.jpg",
    contentType: "image/jpeg",
    createdAt: "2026-05-28T22:30:00.000Z",
    folderId: null,
    height: 2592,
    previewUrl: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=900&q=80",
    size: 44_200_000,
    tags: ["city", "night"],
    url: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=900&q=80",
    width: 3888
  },
  {
    id: "architecture-tower",
    name: "glass_tower_night.jpg",
    contentType: "image/jpeg",
    createdAt: "2026-05-18T20:00:00.000Z",
    folderId: "architecture",
    height: 3840,
    previewUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80",
    size: 5_400_000,
    tags: ["architecture", "night"],
    url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80",
    width: 2560
  },
  {
    id: "architecture-street",
    name: "street_entry_lights.jpg",
    contentType: "image/jpeg",
    createdAt: "2026-05-12T20:00:00.000Z",
    folderId: "architecture",
    height: 3024,
    previewUrl: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=80",
    size: 4_900_000,
    tags: ["street", "architecture"],
    url: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=80",
    width: 4032
  },
  {
    id: "architecture-skyline",
    name: "city_skyline_dusk.jpg",
    contentType: "image/jpeg",
    createdAt: "2026-05-04T20:00:00.000Z",
    folderId: "architecture",
    height: 2592,
    previewUrl: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=900&q=80",
    size: 4_800_000,
    tags: ["skyline", "city"],
    url: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=900&q=80",
    width: 3888
  }
];
