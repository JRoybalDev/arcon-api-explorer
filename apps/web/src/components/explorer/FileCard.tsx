import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { FiCheck, FiFileText, FiImage, FiVideo } from "react-icons/fi";
import { mediaThumbnailUrl, type ExplorerFile } from "./types";

type FileCardProps = {
  file: ExplorerFile;
  isSelected?: boolean;
  isSelectionMode?: boolean;
  view: "small" | "medium" | "large" | "list";
  onOpen: (fileId: string) => void;
  onSelectToggle?: (fileId: string) => void;
};

export function FileCard({ file, isSelected = false, isSelectionMode = false, view, onOpen, onSelectToggle }: FileCardProps) {
  const isImage = file.contentType.startsWith("image/");
  const isVideo = file.contentType.startsWith("video/");
  const Icon = isImage ? FiImage : isVideo ? FiVideo : FiFileText;
  const isList = view === "list";
  const thumbnailUrl = mediaThumbnailUrl(file);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  // console.log("THUMBNAIL", thumbnailUrl, " | ", file.name," \n================================ ")
  const cardClassName = [
    "explorer-file-card",
    isList ? "explorer-file-card--list" : "",
    isSelectionMode ? "is-selectable" : "",
    isSelected ? "is-selected" : ""
  ]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    setThumbnailFailed(false);
  }, [thumbnailUrl]);

  function handlePress() {
    if (isSelectionMode) {
      onSelectToggle?.(file.id);
      return;
    }

    onOpen(file.id);
  }

  return (
    <motion.article
      aria-selected={isSelectionMode ? isSelected : undefined}
      className={cardClassName}
      initial={{ opacity: 0, y: isList ? 4 : 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "32px" }}
      whileHover={isList ? { x: 3 } : { y: -3, scale: 1.01 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
    >
      <button className="explorer-file-card__preview" type="button" onClick={handlePress} aria-label={isSelectionMode ? `Select ${file.name}` : `Open ${file.name}`}>
        {thumbnailUrl && !thumbnailFailed ? <img alt="" loading="lazy" decoding="async" src={thumbnailUrl} onError={() => setThumbnailFailed(true)} /> : <Icon aria-hidden />}
        {isSelectionMode ? (
          <span className="explorer-file-card__check" aria-hidden>
            {isSelected ? <FiCheck /> : null}
          </span>
        ) : null}
      </button>
      <div className="explorer-file-card__body">
        <strong>{file.name}</strong>
        <small>
          {file.contentType || "unknown"} - {formatBytes(file.size)}
        </small>
      </div>
      {view === "list" ? (
        <>
          <span>Root</span>
          <span>{formatBytes(file.size)}</span>
          <span>{formatDate(file.createdAt)}</span>
        </>
      ) : null}
    </motion.article>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}
