import { type ChangeEvent, type DragEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FiCode, FiLink, FiList, FiUpload, FiX } from "react-icons/fi";
import type { ExplorerFolder } from "./types";

export type UploadModalRemoteItem = {
  id: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  type: "image" | "video";
};

export type UploadModalSubmitInput = {
  files: File[];
  folderId: string | null;
  remoteItems: UploadModalRemoteItem[];
};

type UploadModalProps = {
  currentFolderId: string | null;
  folders: ExplorerFolder[];
  isUploading: boolean;
  onClose: () => void;
  onSubmit: (input: UploadModalSubmitInput) => Promise<void>;
};

type UploadTab = "files" | "url" | "bulk" | "json";

const jsonTemplate = `{
  "videoDetails": [
    {
      "title": "Video Title",
      "videoUrl": "https://example.com/video.mp4",
      "thumbnailUrl": "https://example.com/thumb.jpg"
    }
  ]
}`;

export function UploadModal({ currentFolderId, folders, isUploading, onClose, onSubmit }: UploadModalProps) {
  const [activeTab, setActiveTab] = useState<UploadTab>("files");
  const [bulkUrls, setBulkUrls] = useState("");
  const [destinationFolderId, setDestinationFolderId] = useState(currentFolderId ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [jsonInput, setJsonInput] = useState(jsonTemplate);
  const [message, setMessage] = useState("");
  const [remoteItems, setRemoteItems] = useState<UploadModalRemoteItem[]>([]);
  const [singleThumbnailMode, setSingleThumbnailMode] = useState<"auto" | "custom">("auto");
  const [singleTitle, setSingleTitle] = useState("");
  const [singleUrl, setSingleUrl] = useState("");
  const [singleThumbnailUrl, setSingleThumbnailUrl] = useState("");
  const [isMobileUpload, setIsMobileUpload] = useState(false);

  const folderOptions = useMemo(() => buildFolderOptions(folders), [folders]);
  const canUpload = files.length > 0 || remoteItems.length > 0;

  useEffect(() => {
    const query = window.matchMedia("(max-width: 680px)");

    function updateUploadMode() {
      setIsMobileUpload(query.matches);

      if (query.matches) {
        setActiveTab("files");
        setDestinationFolderId(currentFolderId ?? "");
      }
    }

    updateUploadMode();
    query.addEventListener("change", updateUploadMode);
    return () => query.removeEventListener("change", updateUploadMode);
  }, [currentFolderId]);

  function addFiles(selectedFiles: FileList | File[]) {
    setFiles((current) => [...current, ...Array.from(selectedFiles)]);
    setMessage("");
  }

  function chooseFiles(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) {
      addFiles(event.target.files);
    }
  }

  function dropFiles(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    addFiles(event.dataTransfer.files);
  }

  function addSingleUrl() {
    const url = singleUrl.trim();

    if (!url) {
      setMessage("Add a media URL first.");
      return;
    }

    setRemoteItems((current) => [
      ...current,
      createRemoteItem({
        thumbnailUrl: singleThumbnailMode === "custom" ? singleThumbnailUrl.trim() : "",
        title: singleTitle.trim(),
        url
      })
    ]);
    setSingleTitle("");
    setSingleUrl("");
    setSingleThumbnailUrl("");
    setMessage("");
  }

  function addBulkUrls() {
    const urls = bulkUrls
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (urls.length === 0) {
      setMessage("Add at least one URL.");
      return;
    }

    setRemoteItems((current) => [...current, ...urls.map((url) => createRemoteItem({ url }))]);
    setBulkUrls("");
    setMessage("");
  }

  function addJsonItems() {
    try {
      const parsed = JSON.parse(jsonInput) as unknown;
      const items = parseJsonItems(parsed);

      if (items.length === 0) {
        setMessage("JSON did not include any media items.");
        return;
      }

      setRemoteItems((current) => [...current, ...items]);
      setMessage("");
    } catch {
      setMessage("JSON could not be parsed.");
    }
  }

  function updateRemoteTitle(id: string, title: string) {
    setRemoteItems((current) => current.map((item) => (item.id === id ? { ...item, title } : item)));
  }

  function removeRemoteItem(id: string) {
    setRemoteItems((current) => current.filter((item) => item.id !== id));
  }

  async function submit() {
    if (!canUpload) {
      setMessage("Add files or URLs before uploading.");
      return;
    }

    await onSubmit({
      files,
      folderId: isMobileUpload ? currentFolderId : destinationFolderId || null,
      remoteItems
    });
  }

  return (
    <motion.div
      className="explorer-upload-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Upload media"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <motion.div
        className="explorer-upload-modal__panel"
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="explorer-upload-modal__header">
          <div>
            <h2>Upload Media</h2>
            <p>{isMobileUpload ? "Add files to upload" : "Add files or URLs to upload"}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close upload modal">
            <FiX aria-hidden />
          </button>
        </header>

        {!isMobileUpload ? (
          <div className="explorer-upload-tabs" role="tablist" aria-label="Upload source">
            <TabButton activeTab={activeTab} icon={<FiUpload aria-hidden />} label="Upload Files" tab="files" onChange={setActiveTab} />
            <TabButton activeTab={activeTab} icon={<FiLink aria-hidden />} label="Add URL" tab="url" onChange={setActiveTab} />
            <TabButton activeTab={activeTab} icon={<FiList aria-hidden />} label="Bulk URLs" tab="bulk" onChange={setActiveTab} />
            <TabButton activeTab={activeTab} icon={<FiCode aria-hidden />} label="JSON Import" tab="json" onChange={setActiveTab} />
          </div>
        ) : null}

        <section className="explorer-upload-modal__body">
          {!isMobileUpload ? (
            <label className="explorer-upload-field">
              <span>Destination Folder</span>
              <select value={destinationFolderId} onChange={(event) => setDestinationFolderId(event.target.value)}>
                <option value="">Root (no folder)</option>
                {folderOptions.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {activeTab === "files" ? (
            <label className="explorer-upload-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={dropFiles}>
              <input multiple type="file" accept="image/*,video/*" onChange={chooseFiles} />
              <span>
                <FiUpload aria-hidden />
              </span>
              <strong>
                Drop files here or <em>browse</em>
              </strong>
              <small>PNG, JPG, GIF, MP4, MOV, WEBM - up to 2 GB</small>
            </label>
          ) : null}

          {activeTab === "url" ? (
            <div className="explorer-upload-form">
              <TextInput label="Media URL *" placeholder="https://example.com/photo.jpg" value={singleUrl} onChange={setSingleUrl} />
              <TextInput label="Title (Optional)" placeholder="My photo title" value={singleTitle} onChange={setSingleTitle} />
              <div className="explorer-upload-inline">
                <span>Thumbnail URL</span>
                <label>
                  <input checked={singleThumbnailMode === "auto"} type="checkbox" onChange={(event) => setSingleThumbnailMode(event.target.checked ? "auto" : "custom")} />
                  Auto
                </label>
              </div>
              {singleThumbnailMode === "custom" ? <TextInput label="" placeholder="https://example.com/thumb.jpg" value={singleThumbnailUrl} onChange={setSingleThumbnailUrl} /> : null}
              <button className="explorer-upload-secondary" type="button" onClick={addSingleUrl}>
                Add to Queue
              </button>
            </div>
          ) : null}

          {activeTab === "bulk" ? (
            <div className="explorer-upload-form">
              <p>Enter one URL per line. Each will be added as a separate media item.</p>
              <textarea placeholder={"https://example.com/photo1.jpg\nhttps://example.com/photo2.jpg\nhttps://example.com/video.mp4"} value={bulkUrls} onChange={(event) => setBulkUrls(event.target.value)} />
              <button className="explorer-upload-secondary" type="button" onClick={addBulkUrls}>
                Add All to Queue
              </button>
            </div>
          ) : null}

          {activeTab === "json" ? (
            <div className="explorer-upload-form">
              <div className="explorer-upload-template-row">
                <p>Import JSON media objects.</p>
                <button type="button" onClick={() => setJsonInput(jsonTemplate)}>
                  Load template
                </button>
              </div>
              <textarea className="explorer-upload-json" value={jsonInput} onChange={(event) => setJsonInput(event.target.value)} />
              <button className="explorer-upload-secondary" type="button" onClick={addJsonItems}>
                Parse & Add to Queue
              </button>
            </div>
          ) : null}

          {files.length > 0 || remoteItems.length > 0 ? (
            <div className="explorer-upload-queue">
              <strong>Queue</strong>
              {files.map((file) => (
                <div className="explorer-upload-queue__row" key={`${file.name}-${file.lastModified}`}>
                  <span>{file.name}</span>
                  <small>{formatBytes(file.size)}</small>
                </div>
              ))}
              {remoteItems.map((item) => (
                <div className="explorer-upload-queue__remote" key={item.id}>
                  <input aria-label={`Title for ${item.url}`} value={item.title} onChange={(event) => updateRemoteTitle(item.id, event.target.value)} />
                  <small>{item.url}</small>
                  <button type="button" onClick={() => removeRemoteItem(item.id)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {message ? <p className="explorer-upload-message">{message}</p> : null}
        </section>

        <footer className="explorer-upload-modal__footer">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button disabled={!canUpload || isUploading} type="button" onClick={() => void submit()}>
            {isUploading ? "Uploading..." : "Upload"}
          </button>
        </footer>
      </motion.div>
    </motion.div>
  );
}

function TabButton({
  activeTab,
  icon,
  label,
  tab,
  onChange
}: {
  activeTab: UploadTab;
  icon: ReactNode;
  label: string;
  tab: UploadTab;
  onChange: (tab: UploadTab) => void;
}) {
  return (
    <button aria-selected={activeTab === tab} role="tab" type="button" onClick={() => onChange(tab)}>
      {icon}
      {label}
    </button>
  );
}

function TextInput({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="explorer-upload-field">
      {label ? <span>{label}</span> : null}
      <input placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function buildFolderOptions(folders: ExplorerFolder[]) {
  const childrenByParent = folders.reduce<Record<string, ExplorerFolder[]>>((groups, folder) => {
    const parentId = folder.parentId ?? "root";
    groups[parentId] = [...(groups[parentId] ?? []), folder];
    return groups;
  }, {});

  function walk(parentId: string, prefix: string): Array<{ id: string; label: string }> {
    return (childrenByParent[parentId] ?? []).flatMap((folder) => {
      const label = `${prefix}${folder.name}`;
      return [{ id: folder.id, label }, ...walk(folder.id, `${prefix}${folder.name} / `)];
    });
  }

  return walk("root", "");
}

function createRemoteItem(input: { thumbnailUrl?: string; title?: string; url: string }): UploadModalRemoteItem {
  const type = inferContentType(input.url).startsWith("video/") ? "video" : "image";

  return {
    id: crypto.randomUUID(),
    thumbnailUrl: input.thumbnailUrl || "",
    title: input.title || titleFromUrl(input.url),
    type,
    url: input.url
  };
}

function parseJsonItems(parsed: unknown): UploadModalRemoteItem[] {
  if (Array.isArray(parsed)) {
    return parsed.flatMap((item) => itemFromUnknown(item));
  }

  if (parsed && typeof parsed === "object" && "videoDetails" in parsed && Array.isArray(parsed.videoDetails)) {
    return parsed.videoDetails.flatMap((item) => itemFromUnknown(item));
  }

  return [];
}

function itemFromUnknown(item: unknown): UploadModalRemoteItem[] {
  if (!item || typeof item !== "object") {
    return [];
  }

  const record = item as Record<string, unknown>;
  const url = stringValue(record.videoUrl) || stringValue(record.url) || stringValue(record.mediaUrl);

  if (!url) {
    return [];
  }

  return [
    createRemoteItem({
      thumbnailUrl: stringValue(record.thumbnailUrl),
      title: stringValue(record.title) || stringValue(record.name),
      url
    })
  ];
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function titleFromUrl(url: string) {
  const filename = url.split("?")[0]?.split("/").filter(Boolean).pop() ?? "Untitled media";
  return decodeURIComponent(filename);
}

export function inferContentType(url: string) {
  const cleanUrl = url.split("?")[0]?.toLowerCase() ?? "";

  if (/\.(mp4|mov|webm|m4v)$/.test(cleanUrl)) {
    return "video/mp4";
  }

  if (/\.(gif)$/.test(cleanUrl)) {
    return "image/gif";
  }

  if (/\.(png)$/.test(cleanUrl)) {
    return "image/png";
  }

  if (/\.(webp)$/.test(cleanUrl)) {
    return "image/webp";
  }

  return "image/jpeg";
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
