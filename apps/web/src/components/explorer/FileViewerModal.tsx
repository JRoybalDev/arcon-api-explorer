import { type MouseEvent, type RefObject, type TouchEvent, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FiArrowLeft, FiCopy, FiDownload, FiHeart, FiImage, FiLock, FiMaximize2, FiMoreVertical, FiPauseCircle, FiPlayCircle, FiPlus, FiRefreshCw, FiShuffle, FiSkipBack, FiSkipForward, FiTrash2, FiX, FiZap } from "react-icons/fi";
import { FaDice } from "react-icons/fa";
import type { ExplorerFile } from "./types";

type FileViewerModalProps = {
  autoEnabled: boolean;
  favoriteIds: string[];
  file: ExplorerFile;
  fileIndex: number;
  files: ExplorerFile[];
  loopEnabled: boolean;
  shuffleEnabled: boolean;
  totalFiles: number;
  onAutoToggle: () => void;
  onClose: () => void;
  onFavoriteToggle: (fileId: string) => void;
  onLoopToggle: () => void;
  onNavigateByOffset: (offset: number) => void;
  onRandom: () => void;
  onShuffle: () => void;
  onTagsChange: (fileId: string, tags: string[]) => void;
};

type SwipeState = "next" | "previous" | "close" | "reset" | null;
type SwipePreviewDirection = "next" | "previous" | null;

export function FileViewerModal({
  autoEnabled,
  favoriteIds,
  file,
  fileIndex,
  files,
  loopEnabled,
  shuffleEnabled,
  totalFiles,
  onAutoToggle,
  onClose,
  onFavoriteToggle,
  onLoopToggle,
  onNavigateByOffset,
  onRandom,
  onShuffle,
  onTagsChange
}: FileViewerModalProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const chromeTimer = useRef<number | null>(null);
  const lastTapAt = useRef(0);
  const panStartOffset = useRef({ x: 0, y: 0 });
  const pinchStartDistance = useRef<number | null>(null);
  const pinchStartScale = useRef(1);
  const swipeTimer = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [interactionLocked, setInteractionLocked] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [previewDirection, setPreviewDirection] = useState<SwipePreviewDirection>(null);
  const [swipePreviewFile, setSwipePreviewFile] = useState<ExplorerFile | null>(null);
  const [viewerChromeVisible, setViewerChromeVisible] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [swipeState, setSwipeState] = useState<SwipeState>(null);
  const [tagDraft, setTagDraft] = useState("");
  const [tagEditorOpen, setTagEditorOpen] = useState(false);
  const [videoLoops, setVideoLoops] = useState(0);
  const [zoomScale, setZoomScale] = useState(1);
  const isImage = file.contentType.startsWith("image/");
  const isVideo = file.contentType.startsWith("video/");
  const isFavorite = favoriteIds.includes(file.id);
  const currentIndex = Math.max(0, fileIndex);
  const loadedIndex = files.findIndex((candidate) => candidate.id === file.id);
  const nextFile = loadedIndex >= 0 ? files[loadedIndex + 1] ?? null : null;
  const previousFile = loadedIndex > 0 ? files[loadedIndex - 1] ?? null : null;
  const previewFile = swipePreviewFile;
  const stageWidth = stageRef.current?.clientWidth ?? (typeof window === "undefined" ? 390 : window.innerWidth);
  const swipeGap = 28;
  const incomingItemX = getIncomingItemX({ dragX: dragOffset.x, previewDirection, stageWidth, swipeGap, swipeState });
  const activeItemX = getActiveItemX({ dragX: dragOffset.x, stageWidth, swipeGap, swipeState });
  const viewerOffsetY = swipeState === "close" ? (typeof window === "undefined" ? 900 : window.innerHeight) : swipeState === "reset" ? 0 : dragOffset.y;

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
    setSwipeState(null);
    setDragOffset({ x: 0, y: 0 });
    setInteractionLocked(false);
    setPanOffset({ x: 0, y: 0 });
    setPreviewDirection(null);
    setSwipePreviewFile(null);
    setTagDraft("");
    setTagEditorOpen(false);
    setZoomScale(1);
  }, [file.id, autoEnabled]);

  // Autoplay and restore remembered volume/mute when a video is loaded
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !isVideo) return;

    // Restore saved volume/muted from localStorage
    try {
      const saved = localStorage.getItem("explorer_video_volume");
      if (saved !== null) {
        const parsed = JSON.parse(saved) as { volume: number; muted: boolean } | null;
        if (parsed && typeof parsed.volume === "number") {
          vid.volume = clamp(parsed.volume, 0, 1);
        }
        vid.muted = !!parsed?.muted;
      }
    } catch (e) {
      // ignore storage errors
    }

    // If the video is already ready, try play immediately, otherwise wait for metadata
    const tryPlay = async (allowMutedFallback = true) => {
      try {
        await vid.play();
      } catch (err) {
        // Autoplay may be blocked with sound; try muted fallback if allowed
        if (allowMutedFallback) {
          const prevMuted = vid.muted;
          vid.muted = true;
          try {
            await vid.play();
          } catch (err2) {
            // give up silently
            vid.muted = prevMuted;
          }
        }
      }
    };

    if (vid.readyState >= 2) {
      void tryPlay(true);
    } else {
      const handleLoaded = () => void tryPlay(true);
      vid.addEventListener("loadeddata", handleLoaded, { once: true });
    }

    // Persist volume/muted changes
    const handleVolumeChange = () => {
      try {
        localStorage.setItem(
          "explorer_video_volume",
          JSON.stringify({ volume: vid.volume, muted: vid.muted })
        );
      } catch (e) {
        // ignore
      }
    };

    vid.addEventListener("volumechange", handleVolumeChange);

    return () => {
      vid.removeEventListener("volumechange", handleVolumeChange);
    };
  }, [file.id, isVideo]);

  useEffect(() => {
    return () => {
      if (chromeTimer.current) {
        window.clearTimeout(chromeTimer.current);
      }

      if (swipeTimer.current) {
        window.clearTimeout(swipeTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    setViewerChromeVisible(true);
    scheduleChromeHide();

    return () => {
      if (chromeTimer.current) {
        window.clearTimeout(chromeTimer.current);
      }
    };
  }, [file.id, mobileMenuOpen]);

  useEffect(() => {
    if (!autoEnabled || isVideo) {
      return;
    }

    const timer = window.setTimeout(() => {
      goNext();
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [autoEnabled, isVideo, file.id, totalFiles]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        requestClose();
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [interactionLocked, onClose]);

  function goPrevious() {
    if (totalFiles > 0) {
      onNavigateByOffset(-1);
    }
  }

  function goNext() {
    if (totalFiles > 0) {
      onNavigateByOffset(1);
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

    // After entering fullscreen, attempt to play the video and restore remembered volume
    const vid = videoRef.current;
    if (!vid) return;

    try {
      const saved = localStorage.getItem("explorer_video_volume");
      if (saved) {
        const parsed = JSON.parse(saved) as { volume: number; muted: boolean } | null;
        if (parsed && typeof parsed.volume === "number") {
          vid.volume = clamp(parsed.volume, 0, 1);
        }
        vid.muted = !!parsed?.muted;
      }
    } catch (e) {
      // ignore
    }

    try {
      await vid.play();
    } catch (err) {
      // try muted fallback
      const prev = vid.muted;
      vid.muted = true;
      try {
        await vid.play();
      } catch (err2) {
        vid.muted = prev;
      }
    }
  }

  function requestClose() {
    if (interactionLocked || zoomScale > 1.01) {
      revealViewerChrome();
      return;
    }

    onClose();
  }

  function handleStageClick(event: MouseEvent<HTMLElement>) {
    if (window.matchMedia("(max-width: 760px)").matches) {
      return;
    }

    const target = event.target;
    if (!(target instanceof HTMLElement) || target.closest("img, video, a")) {
      return;
    }

    requestClose();
  }

  function scheduleChromeHide() {
    if (chromeTimer.current) {
      window.clearTimeout(chromeTimer.current);
    }

    if (mobileMenuOpen) {
      return;
    }

    chromeTimer.current = window.setTimeout(() => {
      setViewerChromeVisible(false);
    }, 5000);
  }

  function revealViewerChrome() {
    setViewerChromeVisible(true);
    scheduleChromeHide();
  }

  function handleTouchStart(event: TouchEvent<HTMLElement>) {
    event.stopPropagation();
    revealViewerChrome();

    if (interactionLocked) {
      clearGestureState();
      return;
    }

    if (event.touches.length === 2) {
      const firstTouch = event.touches[0];
      const secondTouch = event.touches[1];

      if (!firstTouch || !secondTouch) {
        return;
      }

      const distance = getTouchDistance(firstTouch, secondTouch);
      pinchStartDistance.current = distance;
      pinchStartScale.current = zoomScale;
      touchStartX.current = null;
      touchStartY.current = null;
      setDragOffset({ x: 0, y: 0 });
      setPreviewDirection(null);
      setSwipePreviewFile(null);
      setSwipeState(null);
      return;
    }

    touchStartX.current = event.touches[0]?.clientX ?? null;
    touchStartY.current = event.touches[0]?.clientY ?? null;
    panStartOffset.current = panOffset;
    if (swipeTimer.current) {
      window.clearTimeout(swipeTimer.current);
    }
    setDragOffset({ x: 0, y: 0 });
    setPreviewDirection(null);
    setSwipePreviewFile(null);
    setSwipeState(null);
  }

  function handleTouchMove(event: TouchEvent<HTMLElement>) {
    if (interactionLocked) {
      event.stopPropagation();
      event.preventDefault();
      return;
    }

    if (event.touches.length === 2 && pinchStartDistance.current) {
      const firstTouch = event.touches[0];
      const secondTouch = event.touches[1];

      if (!firstTouch || !secondTouch) {
        return;
      }

      const distance = getTouchDistance(firstTouch, secondTouch);
      const nextScale = clamp((distance / pinchStartDistance.current) * pinchStartScale.current, 1, 4);

      event.stopPropagation();
      event.preventDefault();
      setZoomScale(nextScale);
      setPanOffset((current) => getClampedPanOffset({ ...current, scale: nextScale, stageElement: stageRef.current }));
      return;
    }

    if (touchStartX.current === null || touchStartY.current === null) {
      return;
    }

    const touch = event.touches[0];
    const deltaX = (touch?.clientX ?? 0) - touchStartX.current;
    const deltaY = (touch?.clientY ?? 0) - touchStartY.current;
    const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);

    event.stopPropagation();
    event.preventDefault();

    if (zoomScale > 1.01) {
      setPanOffset(
        getClampedPanOffset({
          x: panStartOffset.current.x + deltaX,
          y: panStartOffset.current.y + deltaY,
          scale: zoomScale,
          stageElement: stageRef.current
        })
      );
      setDragOffset({ x: 0, y: 0 });
      setPreviewDirection(null);
      setSwipePreviewFile(null);
      return;
    }

    if (isHorizontalSwipe) {
      setDragOffset({ x: deltaX, y: 0 });
      const nextPreviewDirection = Math.abs(deltaX) > 8 ? (deltaX < 0 ? "next" : "previous") : null;
      setPreviewDirection(nextPreviewDirection);
      setSwipePreviewFile(nextPreviewDirection === "next" ? nextFile ?? null : nextPreviewDirection === "previous" ? previousFile ?? null : null);
      return;
    }

    setDragOffset({ x: 0, y: Math.max(0, deltaY) });
    setPreviewDirection(null);
    setSwipePreviewFile(null);
  }

  function handleTouchEnd(event: TouchEvent<HTMLElement>) {
    if (pinchStartDistance.current) {
      pinchStartDistance.current = null;
      pinchStartScale.current = zoomScale;
      if (zoomScale < 1.08) {
        setZoomScale(1);
        setPanOffset({ x: 0, y: 0 });
        panStartOffset.current = { x: 0, y: 0 };
      }
      return;
    }

    if (interactionLocked) {
      event.stopPropagation();
      clearGestureState();
      return;
    }

    if (touchStartX.current === null || touchStartY.current === null) {
      return;
    }

    event.stopPropagation();

    const touch = event.changedTouches[0];
    const deltaX = (touch?.clientX ?? 0) - touchStartX.current;
    const deltaY = (touch?.clientY ?? 0) - touchStartY.current;
    const isTap = Math.abs(deltaX) < 12 && Math.abs(deltaY) < 12;

    touchStartX.current = null;
    touchStartY.current = null;

    if (isTap) {
      handleStageTap();
      return;
    }

    if (zoomScale > 1.01) {
      clearGestureState();
      return;
    }

    const horizontalSwipeThreshold = (stageRef.current?.clientWidth ?? window.innerWidth) / 3;
    const verticalSwipeThreshold = (stageRef.current?.clientHeight ?? window.innerHeight) / 3;

    if (deltaY > verticalSwipeThreshold && Math.abs(deltaX) < 55) {
      commitSwipe("close");
      return;
    }

    if (Math.abs(deltaX) < horizontalSwipeThreshold || Math.abs(deltaY) > 55) {
      resetSwipe();
      return;
    }

    commitSwipe(deltaX < 0 ? "next" : "previous");
  }

  function resetSwipe() {
    setSwipeState("reset");

    if (swipeTimer.current) {
      window.clearTimeout(swipeTimer.current);
    }

    swipeTimer.current = window.setTimeout(() => {
      setDragOffset({ x: 0, y: 0 });
      setPreviewDirection(null);
      setSwipePreviewFile(null);
      setSwipeState(null);
    }, 180);
  }

  function clearGestureState() {
    touchStartX.current = null;
    touchStartY.current = null;
    pinchStartDistance.current = null;
    setDragOffset({ x: 0, y: 0 });
    panStartOffset.current = panOffset;
    setPreviewDirection(null);
    setSwipePreviewFile(null);
    setSwipeState(null);
  }

  function handleStageTap() {
    const now = Date.now();
    const isDoubleTap = now - lastTapAt.current < 300;
    lastTapAt.current = now;

    if (!isDoubleTap) {
      return;
    }

    const nextScale = zoomScale > 1.01 ? 1 : 2.4;

    if (nextScale === 1) {
      setPanOffset({ x: 0, y: 0 });
      panStartOffset.current = { x: 0, y: 0 };
    }

    setZoomScale(nextScale);
  }

  function toggleInteractionLock() {
    setInteractionLocked((current) => !current);

    if (!interactionLocked) {
      clearGestureState();
    }
  }

  function addTag() {
    const nextTag = tagDraft.trim();

    if (!nextTag) {
      return;
    }

    const nextTags = Array.from(new Set([...(file.tags ?? []), nextTag]));
    onTagsChange(file.id, nextTags);
    setTagDraft("");
    setTagEditorOpen(false);
  }

  function removeTag(tagToRemove: string) {
    onTagsChange(file.id, (file.tags ?? []).filter((tag) => tag !== tagToRemove));
  }

  function commitSwipe(nextSwipeState: Exclude<SwipeState, null | "reset">) {
    setSwipeState(nextSwipeState);

    if (swipeTimer.current) {
      window.clearTimeout(swipeTimer.current);
    }

    swipeTimer.current = window.setTimeout(() => {
      if (nextSwipeState === "next") {
        setDragOffset({ x: 0, y: 0 });
        setPreviewDirection(null);
        setSwipePreviewFile(null);
        setSwipeState(null);
        goNext();
        return;
      }

      if (nextSwipeState === "previous") {
        setDragOffset({ x: 0, y: 0 });
        setPreviewDirection(null);
        setSwipePreviewFile(null);
        setSwipeState(null);
        goPrevious();
        return;
      }

      requestClose();
    }, 220);
  }

  function renderMedia(targetFile: ExplorerFile, hiddenVideoControls = false) {
    const targetIsImage = targetFile.contentType.startsWith("image/");
    const targetIsVideo = targetFile.contentType.startsWith("video/");

    return (
      <>
        {targetIsImage ? <img alt="" src={targetFile.url} /> : null}
        {targetIsVideo ? (
          <video autoPlay controls={!hiddenVideoControls} muted={hiddenVideoControls} playsInline src={targetFile.url} />
        ) : null}
        {!targetIsImage && !targetIsVideo ? <a href={targetFile.url}>Open file</a> : null}
      </>
    );
  }

  return (
    <motion.div
      className="explorer-viewer"
      role="dialog"
      aria-modal="true"
      aria-label={`${file.name} preview`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      onPointerDownCapture={revealViewerChrome}
      style={{
        transform: `translate3d(0, ${viewerOffsetY}px, 0)`,
        transition: swipeState === "close" || swipeState === "reset" ? "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)" : "none"
      }}
    >
      <header className={`explorer-viewer__mobile-header ${viewerChromeVisible || mobileMenuOpen ? "is-visible" : "is-hidden"}`}>
        <button type="button" onClick={requestClose} aria-label="Close viewer">
          <FiArrowLeft aria-hidden />
        </button>
        <strong>{formatDate(file.createdAt)}</strong>
        <div className="explorer-viewer__mobile-header-actions">
          <button className={isFavorite ? "active" : ""} type="button" onClick={() => onFavoriteToggle(file.id)} aria-label="Favorite">
            <FiHeart aria-hidden />
          </button>
          <button type="button" onClick={() => setMobileMenuOpen((current) => !current)} aria-label="Viewer options" aria-expanded={mobileMenuOpen}>
            <FiMoreVertical aria-hidden />
          </button>
        </div>
        {mobileMenuOpen ? (
          <div className="explorer-viewer__mobile-menu">
            <button type="button">
              <FiImage aria-hidden /> Set as Album Thumbnail
            </button>
            <a href={file.url} download>
              <FiDownload aria-hidden /> Download
            </a>
            <button className="danger" type="button">
              <FiTrash2 aria-hidden /> Delete File
            </button>
          </div>
        ) : null}
      </header>

      <div className="explorer-viewer__counter">
        {Math.min(currentIndex + 1, totalFiles)} / {totalFiles}
      </div>
      <button className="explorer-viewer__close" type="button" onClick={requestClose} aria-label="Close viewer">
        <FiX aria-hidden />
      </button>

      <motion.div
        className="explorer-viewer__stage"
        ref={stageRef}
        initial={{ opacity: 0, scale: 0.985 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleStageClick}
        onTouchCancel={() => {
          touchStartX.current = null;
          touchStartY.current = null;
          setDragOffset({ x: 0, y: 0 });
          pinchStartDistance.current = null;
          setPreviewDirection(null);
          setSwipePreviewFile(null);
        }}
      >
        {previewFile ? (
          <div
            className="explorer-viewer__media-peek"
            style={{ transform: `translate3d(${incomingItemX}px, 0, 0)`, transition: swipeState ? "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)" : "none" }}
          >
            {renderMedia(previewFile, true)}
          </div>
        ) : null}
        <div
            className="explorer-viewer__media-item"
            style={{
            transform: `translate3d(${activeItemX + panOffset.x}px, ${panOffset.y}px, 0) scale(${zoomScale})`,
            transition: swipeState === "next" || swipeState === "previous" || swipeState === "reset" ? "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)" : "none"
          }}
        >
          {isImage ? <img alt="" src={file.url} /> : null}
          {isVideo ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              controls
              loop={loopEnabled && !autoEnabled}
              src={file.url}
              onEnded={handleVideoEnded}
            />
          ) : null}
          {!isImage && !isVideo ? <a href={file.url}>Open file</a> : null}
        </div>
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
          <div className="explorer-viewer__tags-list">
            {(file.tags?.length ? file.tags : []).map((tag) => (
              <button key={tag} type="button" onClick={() => removeTag(tag)} title={`Remove ${tag}`}>
                {tag}
                <FiX aria-hidden />
              </button>
            ))}
            {file.tags?.length ? null : <span>No tags</span>}
          </div>
          {tagEditorOpen ? (
            <div className="explorer-viewer__tag-create">
              <input
                autoFocus
                placeholder="New tag"
                value={tagDraft}
                onChange={(event) => setTagDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    addTag();
                  }

                  if (event.key === "Escape") {
                    setTagEditorOpen(false);
                    setTagDraft("");
                  }
                }}
              />
              <button type="button" onClick={addTag}>
                Add
              </button>
              <button type="button" onClick={() => {
                setTagEditorOpen(false);
                setTagDraft("");
              }}>
                Cancel
              </button>
            </div>
          ) : (
            <button className="explorer-viewer__tag-add" type="button" onClick={() => setTagEditorOpen(true)}>
              <FiPlus aria-hidden /> Add Tag
            </button>
          )}
        </div>

        <div className="explorer-viewer__controls">
          <button className="explorer-viewer__control-main explorer-viewer__control-main--side" type="button" onClick={goPrevious} title="Previous file">
            <FiSkipBack aria-hidden /> Prev
          </button>
          <button className="explorer-viewer__control-main explorer-viewer__control-main--center" aria-pressed={autoEnabled} type="button" onClick={onAutoToggle} title="Auto advance">
            {autoEnabled ? <FiPauseCircle aria-hidden /> : <FiPlayCircle aria-hidden />} Auto {autoEnabled ? "ON" : "OFF"}
          </button>
          <button className="explorer-viewer__control-main explorer-viewer__control-main--side" type="button" onClick={goNext} title="Next file">
            Next <FiSkipForward aria-hidden />
          </button>
          <button className="explorer-viewer__control-action" aria-label="Favorite" aria-pressed={isFavorite} type="button" onClick={() => onFavoriteToggle(file.id)} title="Favorite">
            <FiHeart aria-hidden />
          </button>
          <button className="explorer-viewer__control-action" aria-label="Open random file" type="button" onClick={onRandom} title="Open random file">
            <FaDice aria-hidden />
          </button>
          <button className="explorer-viewer__control-action" aria-label={shuffleEnabled ? "Turn shuffle off" : "Turn shuffle on"} aria-pressed={shuffleEnabled} type="button" onClick={onShuffle} title={shuffleEnabled ? "Shuffle ON" : "Shuffle OFF"}>
            <FiShuffle aria-hidden />
          </button>
          <button className="explorer-viewer__control-action" aria-label="Fullscreen" type="button" onClick={() => void enterFullscreen(stageRef)} title="Fullscreen">
            <FiMaximize2 aria-hidden />
          </button>
          {isVideo ? (
            <button className="explorer-viewer__control-action explorer-viewer__control-action--half" aria-label={loopEnabled ? "Turn loop off" : "Turn loop on"} aria-pressed={loopEnabled} type="button" onClick={onLoopToggle} title="Loop video">
              <FiRefreshCw aria-hidden />
            </button>
          ) : null}
          <button className="explorer-viewer__control-link" type="button" onClick={() => void copyUrl()} title="Copy URL">
            <FiCopy aria-hidden /> Copy URL
          </button>
        </div>

        <div className="explorer-viewer__links">
          <p>Press ESC to close - click outside to dismiss</p>
        </div>
      </motion.aside>

      <nav className={`explorer-viewer__mobile-actions ${viewerChromeVisible ? "is-visible" : "is-hidden"}`} aria-label="Viewer actions">
        <button type="button" onClick={onRandom}>
          <FaDice aria-hidden /> <span>Random</span>
        </button>
        <button aria-pressed={autoEnabled} type="button" onClick={onAutoToggle}>
          <FiZap aria-hidden /> <span>Auto</span>
        </button>
        <button aria-pressed={shuffleEnabled} type="button" onClick={onShuffle}>
          <FiShuffle aria-hidden /> <span>Shuffle</span>
        </button>
        <button aria-pressed={interactionLocked} type="button" onClick={toggleInteractionLock}>
          <FiLock aria-hidden /> <span>Lock</span>
        </button>
      </nav>
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getTouchDistance(firstTouch: { clientX: number; clientY: number }, secondTouch: { clientX: number; clientY: number }) {
  return Math.hypot(firstTouch.clientX - secondTouch.clientX, firstTouch.clientY - secondTouch.clientY);
}

function getClampedPanOffset({
  scale,
  stageElement,
  x,
  y
}: {
  scale: number;
  stageElement: HTMLElement | null;
  x: number;
  y: number;
}) {
  if (scale <= 1.01 || !stageElement) {
    return { x: 0, y: 0 };
  }

  const maxX = (stageElement.clientWidth * (scale - 1)) / 2;
  const maxY = (stageElement.clientHeight * (scale - 1)) / 2;

  return {
    x: clamp(x, -maxX, maxX),
    y: clamp(y, -maxY, maxY)
  };
}

function getIncomingItemX({
  dragX,
  previewDirection,
  stageWidth,
  swipeGap,
  swipeState
}: {
  dragX: number;
  previewDirection: SwipePreviewDirection;
  stageWidth: number;
  swipeGap: number;
  swipeState: SwipeState;
}) {
  if (swipeState === "next" || swipeState === "previous") {
    return 0;
  }

  if (swipeState === "reset") {
    if (previewDirection === "next") {
      return stageWidth + swipeGap;
    }

    if (previewDirection === "previous") {
      return -stageWidth - swipeGap;
    }
  }

  if (previewDirection === "next") {
    return Math.max(0, stageWidth + swipeGap + dragX);
  }

  if (previewDirection === "previous") {
    return Math.min(0, -stageWidth - swipeGap + dragX);
  }

  return 0;
}

function getActiveItemX({
  dragX,
  stageWidth,
  swipeGap,
  swipeState
}: {
  dragX: number;
  stageWidth: number;
  swipeGap: number;
  swipeState: SwipeState;
}) {
  if (swipeState === "next") {
    return -stageWidth - swipeGap;
  }

  if (swipeState === "previous") {
    return stageWidth + swipeGap;
  }

  if (swipeState === "reset") {
    return 0;
  }

  return dragX;
}
