import { motion } from "framer-motion";
import { FiFileText, FiImage, FiVideo } from "react-icons/fi";
import type { ExplorerFile } from "./types";

type FileCardProps = {
  file: ExplorerFile;
  view: "small" | "medium" | "large" | "list";
  onOpen: (fileId: string) => void;
};

export function FileCard({ file, view, onOpen }: FileCardProps) {
  const isImage = file.contentType.startsWith("image/");
  const isVideo = file.contentType.startsWith("video/");
  const Icon = isImage ? FiImage : isVideo ? FiVideo : FiFileText;
  const isList = view === "list";

  return (
    <motion.article
      className={isList ? "explorer-file-card explorer-file-card--list" : "explorer-file-card"}
      initial={{ opacity: 0, y: isList ? 4 : 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "32px" }}
      whileHover={isList ? { x: 3 } : { y: -3, scale: 1.01 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      layout
    >
      <button className="explorer-file-card__preview" type="button" onClick={() => onOpen(file.id)}>
        {isImage ? <img alt="" src={file.previewUrl} /> : null}
        {isVideo ? <video muted playsInline src={file.url} /> : null}
        {!isImage && !isVideo ? <Icon aria-hidden /> : null}
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
