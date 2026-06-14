import { type MouseEvent, type RefObject, type TouchEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiArrowLeft, FiCopy, FiDownload, FiHeart, FiImage, FiLock, FiMaximize2, FiMoreVertical, FiPauseCircle, FiPlayCircle, FiPlus, FiRefreshCw, FiRepeat, FiRotateCw, FiShuffle, FiSkipBack, FiSkipForward, FiTrash2, FiVideo, FiX, FiZap } from "react-icons/fi";
import { FaDice, FaHeart } from "react-icons/fa";
import { mediaThumbnailUrl, type ExplorerFile } from "./types";
import VideoPlayer from "./VideoPlayer";

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
  autoAdvanceSettings: {
    imageDuration: number;
    videoThreshold: number;
    videoLoops: number;
  };
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
  onTagsChange,
  autoAdvanceSettings
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
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [videoLoops, setVideoLoops] = useState(0);
  const [zoomScale, setZoomScale] = useState(1);
  const [isMobileView, setIsMobileView] = useState(false);
  const [isRotated, setIsRotated] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 768px)");
    setIsMobileView(query.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobileView(e.matches);
    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, []);

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
    setShowCopiedToast(false);
    setIsRotated(false);
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
    if ((!autoEnabled && loopEnabled) || isVideo) {
      return;
    }

    const timer = window.setTimeout(() => {
      goNext();
    }, (autoAdvanceSettings.imageDuration || 10) * 1000);

    return () => window.clearTimeout(timer);
  }, [autoEnabled, loopEnabled, isVideo, file.id, totalFiles, autoAdvanceSettings.imageDuration]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        requestClose();
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [interactionLocked, onClose]);

  const goPrevious = useCallback(() => {
    if (totalFiles > 0) {
      onNavigateByOffset(-1);
    }
  }, [totalFiles, onNavigateByOffset]);

  const goNext = useCallback(() => {
    if (totalFiles > 0) {
      onNavigateByOffset(1);
    }
  }, [totalFiles, onNavigateByOffset]);

  const handleAutoToggle = useCallback(() => {
    onAutoToggle();
  }, [onAutoToggle]);

  const handleLoopToggle = useCallback(() => {
    onLoopToggle();
  }, [onLoopToggle]);

  const handleVideoEnded = useCallback(() => {
    // Auto-advance if auto-advance is enabled OR if loop is off
    if (!autoEnabled && loopEnabled) {
      return;
    }

    const video = videoRef.current;
    const threshold = autoAdvanceSettings.videoThreshold || 30;
    const maxLoops = video && Number.isFinite(video.duration) && video.duration < threshold ? (autoAdvanceSettings.videoLoops || 2) : 1;
    const nextLoopCount = videoLoops + 1;

    if (nextLoopCount < maxLoops) {
      setVideoLoops(nextLoopCount);
      void video?.play();
      return;
    }

    setVideoLoops(0);
    goNext();
  }, [autoEnabled, loopEnabled, autoAdvanceSettings, videoLoops, goNext]);

  async function copyUrl() {
    // Prefer the public CDN preview URL for images when available so users
    // can paste a stable external link into other applications. Fall back to
    // the main `file.url` if no preview/public URL is present.
    const publicUrl = file.contentType.startsWith("image/")
      ? (file.previewUrl || file.url)
      : file.url;

    // Construct the absolute URL by prefixing relative content paths with the current origin
    const absoluteUrl = publicUrl.startsWith("http")
      ? publicUrl
      : `${window.location.origin}${publicUrl}`;

    // Try modern Clipboard API first (requires secure context). If it fails
    // (e.g. site served over HTTP), fall back to a textarea+execCommand copy
    // and finally show a prompt as last resort.
    let copied = false;
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      copied = true;
    } catch (e) {
      // fallback below
    }

    if (!copied) {
      try {
        const ta = document.createElement("textarea");
        ta.value = absoluteUrl;
        ta.setAttribute("readonly", "");
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        const sel = document.getSelection();
        const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
        ta.select();
        copied = document.execCommand("copy");
        document.body.removeChild(ta);
        if (range && sel) {
          sel.removeAllRanges();
          sel.addRange(range);
        }
      } catch (e) {
        copied = false;
      }
    }

    if (!copied) {
      // last resort: show a prompt so the user can copy manually
      // eslint-disable-next-line no-alert
      window.prompt("Copy URL (Ctrl/Cmd+C, Enter)", absoluteUrl);
    } else {
      setShowCopiedToast(true);
      setTimeout(() => setShowCopiedToast(false), 2000);
    }
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
    if (!(target instanceof HTMLElement) || target.closest("img, video, a, .explorer-video-player__controls")) {
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

  function toggleViewerChrome() {
    setViewerChromeVisible((current) => {
      const next = !current;
      if (next) {
        scheduleChromeHide();
      }
      return next;
    });
  }

  function handleTouchStart(event: TouchEvent<HTMLElement>) {
    event.stopPropagation();

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
      // single tap toggles viewer chrome immediately; double-tap still toggles zoom
      const now = Date.now();
      const isDoubleTap = now - lastTapAt.current < 300;
      lastTapAt.current = now;

      if (isDoubleTap) {
        const nextScale = zoomScale > 1.01 ? 1 : 2.4;

        if (nextScale === 1) {
          setPanOffset({ x: 0, y: 0 });
          panStartOffset.current = { x: 0, y: 0 };
        }

        setZoomScale(nextScale);
        return;
      }

      // single tap: toggle chrome visibility
      toggleViewerChrome();
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
    const thumbnailUrl = mediaThumbnailUrl(targetFile);

    if (hiddenVideoControls) {
      return (
        <>
          {targetIsImage ? <img alt="" src={targetFile.url} /> : null}
          {targetIsVideo && thumbnailUrl ? <img alt="" src={thumbnailUrl} /> : null}
          {targetIsVideo && !thumbnailUrl ? <FiVideo aria-hidden /> : null}
          {!targetIsImage && !targetIsVideo ? <a href={targetFile.url}>Open file</a> : null}
        </>
      );
    }

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
      style={{
        transform: `translate3d(0, ${viewerOffsetY}px, 0)`,
        transition: swipeState === "close" || swipeState === "reset" ? "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)" : "none"
      }}
    >
      {isMobileView && (
      <header
        className={`explorer-viewer__mobile-header ${viewerChromeVisible || mobileMenuOpen ? "is-visible" : "is-hidden"}`}
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 8px)" }}
      >
        <button type="button" onClick={onClose} aria-label="Close viewer">
          <FiArrowLeft aria-hidden />
        </button>
        <strong>{formatDate(file.createdAt)}</strong>
        <div className="explorer-viewer__mobile-header-actions">
          <button className={isFavorite ? "active" : ""} type="button" onClick={() => onFavoriteToggle(file.id)} aria-label={isFavorite ? "Unfavorite" : "Favorite"}>
            {isFavorite ? <FaHeart aria-hidden /> : <FiHeart aria-hidden />}
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
      )}
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
            <VideoPlayer
              videoRef={videoRef}
              src={file.url}
              autoPlay
              loop={loopEnabled}
              muted={false}
              onEnded={handleVideoEnded}
              showControls={viewerChromeVisible}
              onControlsEnter={() => {
                revealViewerChrome();
              }}
              onControlsLeave={() => {
                scheduleChromeHide();
              }}
              isRotated={isRotated}
              onRotateToggle={() => setIsRotated(!isRotated)}
              onLoopToggle={handleLoopToggle}
              onAutoToggle={handleAutoToggle}
              isMobile={isMobileView}
              controlsOffset={isRotated ? 10 : 45} 
              onPrevious={goPrevious}
              onNext={goNext}
              onShuffle={onShuffle}
              onRandom={onRandom}
              shuffleEnabled={shuffleEnabled}
              loopEnabled={loopEnabled}
              autoEnabled={autoEnabled}
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
          <div className="explorer-viewer__controls-row">
            <button className="explorer-viewer__control-main" type="button" onClick={goPrevious} title="Previous file">
              <FiSkipBack aria-hidden /> <span>Prev</span>
            </button>

            <button
              className="explorer-viewer__control-main"
              aria-pressed={autoEnabled}
              type="button"
              onClick={handleAutoToggle}
              title="Auto advance"
            >
              {autoEnabled ? <FiPauseCircle aria-hidden /> : <FiPlayCircle aria-hidden />} <span>Auto {autoEnabled ? "ON" : "OFF"}</span>
            </button>

            <button className="explorer-viewer__control-main" type="button" onClick={goNext} title="Next file">
              <span>Next</span> <FiSkipForward aria-hidden />
            </button>
          </div>

          <div className="explorer-viewer__controls-row">
            <button className="explorer-viewer__control-action" aria-label={isFavorite ? "Unfavorite" : "Favorite"} aria-pressed={isFavorite} type="button" onClick={() => onFavoriteToggle(file.id)} title={isFavorite ? "Unfavorite" : "Favorite"}>
              {isFavorite ? <FaHeart aria-hidden /> : <FiHeart aria-hidden />} <span>Favorite</span>
            </button>

            {isVideo ? (
              <button
                className="explorer-viewer__control-action"
                aria-label={loopEnabled ? "Turn loop off" : "Turn loop on"}
                aria-pressed={loopEnabled}
                type="button"
                onClick={handleLoopToggle}
                title="Loop video"
              >
                <FiRefreshCw aria-hidden /> <span>Loop {loopEnabled ? "ON" : "OFF"}</span>
              </button>
            ) : (
              <button className="explorer-viewer__control-action" aria-hidden disabled type="button" title="Loop not available">
                <FiRefreshCw aria-hidden /> <span>Loop</span>
              </button>
            )}
          </div>

          <div className="explorer-viewer__controls-row">
            <button className="explorer-viewer__control-action" aria-label="Open random file" type="button" onClick={onRandom} title="Open random file">
              <FaDice aria-hidden /> <span>Random</span>
            </button>

            <button
              className="explorer-viewer__control-action"
              aria-label={shuffleEnabled ? "Turn shuffle off" : "Turn shuffle on"}
              aria-pressed={shuffleEnabled}
              type="button"
              onClick={onShuffle}
              title={shuffleEnabled ? "Shuffle ON" : "Shuffle OFF"}
            >
              <FiShuffle aria-hidden /> <span>Shuffle {shuffleEnabled ? "ON" : "OFF"}</span>
            </button>
          </div>

          <div className="explorer-viewer__controls-row">
            <button 
              className="explorer-viewer__control-link" 
              type="button" 
              onClick={() => void copyUrl()} 
              title="Copy URL"
              style={{ position: "relative" }}
            >
              <FiCopy aria-hidden /> <span>Copy URL</span>
              <AnimatePresence>
                {showCopiedToast && (
                  <motion.span
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: -32 }}
                    exit={{ opacity: 0 }}
                    style={{
                      position: "absolute",
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "#3b82f6",
                      color: "white",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: "bold",
                      whiteSpace: "nowrap",
                      pointerEvents: "none",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
                    }}
                  >
                    Copied!
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>

        <div className="explorer-viewer__links">
          <p>Press ESC to close - click outside to dismiss</p>
        </div>
      </motion.aside>

      {isMobileView && (
      <nav
        className={`explorer-viewer__mobile-actions ${viewerChromeVisible ? "is-visible" : "is-hidden"}`}
        aria-label="Viewer actions"
        style={{ 
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)",
          display: "flex",
          flexDirection: "row",
          flexWrap: "nowrap",
          justifyContent: "space-evenly"
        }}
      >
        <button type="button" onClick={onRandom} title="Random">
          <FaDice aria-hidden />
        </button>
        <button aria-pressed={autoEnabled} type="button" onClick={handleAutoToggle} title="Auto">
          <FiZap aria-hidden />
        </button>
        <button 
          aria-pressed={interactionLocked} 
          type="button" 
          onClick={toggleInteractionLock} 
          title="Interaction Lock"
        >
          <FiLock aria-hidden />
        </button>
        <button aria-pressed={loopEnabled} type="button" onClick={handleLoopToggle} title="Loop" disabled={!isVideo}>
          <FiRefreshCw aria-hidden />
        </button>
        <button aria-pressed={shuffleEnabled} type="button" onClick={onShuffle} title="Shuffle">
          <FiShuffle aria-hidden />
        </button>
      </nav>
      )}
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
