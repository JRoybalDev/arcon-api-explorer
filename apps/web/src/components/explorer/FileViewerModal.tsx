import { type RefObject, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FiCopy, FiExternalLink, FiHeart, FiMaximize2, FiPauseCircle, FiPlayCircle, FiRefreshCw, FiShuffle, FiSkipBack, FiSkipForward, FiX } from "react-icons/fi";
import type { ExplorerFile } from "./types";

type FileViewerModalProps = {
  autoEnabled: boolean;
  favoriteIds: string[];
  file: ExplorerFile;
  files: ExplorerFile[];
  loopEnabled: boolean;
  onAutoToggle: () => void;
  onClose: () => void;
  onFavoriteToggle: (fileId: string) => void;
  onLoopToggle: () => void;
  onNavigate: (fileId: string) => void;
  onRandom: () => void;
  onShuffle: () => void;
};

export function FileViewerModal({
  autoEnabled,
  favoriteIds,
  file,
  files,
  loopEnabled,
  onAutoToggle,
  onClose,
  onFavoriteToggle,
  onLoopToggle,
  onNavigate,
  onRandom,
  onShuffle
}: FileViewerModalProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoops, setVideoLoops] = useState(0);
  const isImage = file.contentType.startsWith("image/");
  const isVideo = file.contentType.startsWith("video/");
  const isFavorite = favoriteIds.includes(file.id);
  const currentIndex = Math.max(0, files.findIndex((candidate) => candidate.id === file.id));
  const nextFile = files[(currentIndex + 1) % files.length];
  const previousFile = files[(currentIndex - 1 + files.length) % files.length];

  const metadata = useMemo(
    () => [
      { label: "Type", value: isVideo ? "Video" : isImage ? "Image" : "File" },
      { label: "Folder", value: "Root" },
      { label: "Size", value: formatBytes(file.size) },
      { label: "Dimensions", value: file.width && file.height ? `${file.width} x ${file.height}` : "Unknown" },
      { label: "Uploaded", value: formatDate(file.createdAt) }
    ],
    [file, isImage, isVideo]
  );

  useEffect(() => {
    setVideoLoops(0);
  }, [file.id, autoEnabled]);

  useEffect(() => {
    if (!autoEnabled || isVideo) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (nextFile) {
        onNavigate(nextFile.id);
      }
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [autoEnabled, isVideo, nextFile, onNavigate]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  function goPrevious() {
    if (previousFile) {
      onNavigate(previousFile.id);
    }
  }

  function goNext() {
    if (nextFile) {
      onNavigate(nextFile.id);
    }
  }

  function handleVideoEnded() {
    if (!autoEnabled) {
      return;
    }

    const video = videoRef.current;
    const maxLoops = video && Number.isFinite(video.duration) && video.duration < 60 ? 2 : 1;
    const nextLoopCount = videoLoops + 1;

    if (nextLoopCount < maxLoops) {
      setVideoLoops(nextLoopCount);
      void video?.play();
      return;
    }

    setVideoLoops(0);
    goNext();
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(file.url);
  }

  async function enterFullscreen(targetRef: RefObject<HTMLElement | null>) {
    await targetRef.current?.requestFullscreen?.();
  }

  function openOriginal() {
    window.open(file.url, "_blank", "noopener,noreferrer,width=1200,height=800");
  }

  return (
    <motion.div className="explorer-viewer" role="dialog" aria-modal="true" aria-label={`${file.name} preview`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18 }}>
      <div className="explorer-viewer__counter">
        {currentIndex + 1} / {files.length}
      </div>
      <button className="explorer-viewer__close" type="button" onClick={onClose} aria-label="Close viewer">
        <FiX aria-hidden />
      </button>

      <button className="explorer-viewer__nav explorer-viewer__nav--previous" type="button" onClick={goPrevious} aria-label="Previous file">
        <FiSkipBack aria-hidden />
      </button>
      <button className="explorer-viewer__nav explorer-viewer__nav--next" type="button" onClick={goNext} aria-label="Next file">
        <FiSkipForward aria-hidden />
      </button>

      <motion.div
        className="explorer-viewer__stage"
        ref={stageRef}
        initial={{ opacity: 0, scale: 0.985 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        {isImage ? <img alt="" src={file.previewUrl || file.url} /> : null}
        {isVideo ? <video ref={videoRef} controls loop={loopEnabled && !autoEnabled} src={file.url} onEnded={handleVideoEnded} /> : null}
        {!isImage && !isVideo ? <a href={file.url}>Open file</a> : null}
      </motion.div>

      <motion.aside
        className="explorer-viewer__details"
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <div>
          <h2>{file.name}</h2>
          <span>{isVideo ? "Video" : isImage ? "Image" : "File"}</span>
        </div>

        <dl>
          {metadata.slice(1).map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>

        <div className="explorer-viewer__tags">
          {(file.tags?.length ? file.tags : ["archive"]).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>

        <div className="explorer-viewer__controls">
          <button aria-pressed={isFavorite} type="button" onClick={() => onFavoriteToggle(file.id)} title="Favorite">
            <FiHeart aria-hidden /> Favorite
          </button>
          <button type="button" onClick={onShuffle} title="Shuffle file list">
            <FiShuffle aria-hidden /> Shuffle
          </button>
          <button type="button" onClick={onRandom} title="Open random file">
            <FiRefreshCw aria-hidden /> Random
          </button>
          <button type="button" onClick={() => void enterFullscreen(stageRef)} title="Fullscreen">
            <FiMaximize2 aria-hidden /> Fullscreen
          </button>
          <button type="button" onClick={openOriginal} title="Open original">
            <FiExternalLink aria-hidden /> Open
          </button>
          {isVideo ? (
            <button aria-pressed={loopEnabled} type="button" onClick={onLoopToggle} title="Loop video">
              <FiRefreshCw aria-hidden /> Loop
            </button>
          ) : null}
          <button aria-pressed={autoEnabled} type="button" onClick={onAutoToggle} title="Auto advance">
            {autoEnabled ? <FiPauseCircle aria-hidden /> : <FiPlayCircle aria-hidden />} Auto
          </button>
        </div>

        <div className="explorer-viewer__links">
          <button type="button" onClick={() => void copyUrl()}>
            <FiCopy aria-hidden /> Copy URL
          </button>
        </div>
      </motion.aside>
    </motion.div>
  );
}

function formatBytes(bytes: number) {
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
