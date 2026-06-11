import { type RefObject, type TouchEvent, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FiArrowLeft, FiCopy, FiDownload, FiExternalLink, FiHeart, FiImage, FiLock, FiMaximize2, FiMoreVertical, FiPauseCircle, FiPlayCircle, FiRefreshCw, FiShuffle, FiSkipBack, FiSkipForward, FiTrash2, FiX, FiZap } from "react-icons/fi";
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

type SwipeState = "next" | "previous" | "close" | "reset" | null;
type SwipePreviewDirection = "next" | "previous" | null;

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
  const [videoLoops, setVideoLoops] = useState(0);
  const [zoomScale, setZoomScale] = useState(1);
  const isImage = file.contentType.startsWith("image/");
  const isVideo = file.contentType.startsWith("video/");
  const isFavorite = favoriteIds.includes(file.id);
  const currentIndex = Math.max(0, files.findIndex((candidate) => candidate.id === file.id));
  const nextFile = files[(currentIndex + 1) % files.length];
  const previousFile = files[(currentIndex - 1 + files.length) % files.length];
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
    setZoomScale(1);
  }, [file.id, autoEnabled]);

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
      if (nextFile) {
        onNavigate(nextFile.id);
      }
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [autoEnabled, isVideo, nextFile, onNavigate]);

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

  function requestClose() {
    if (interactionLocked || zoomScale > 1.01) {
      revealViewerChrome();
      return;
    }

    onClose();
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
        {targetIsImage ? <img alt="" src={targetFile.previewUrl || targetFile.url} /> : null}
        {targetIsVideo ? <video controls={!hiddenVideoControls} muted={hiddenVideoControls} playsInline src={targetFile.url} /> : null}
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
        {currentIndex + 1} / {files.length}
      </div>
      <button className="explorer-viewer__close" type="button" onClick={requestClose} aria-label="Close viewer">
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
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
          {isImage ? <img alt="" src={file.previewUrl || file.url} /> : null}
          {isVideo ? <video ref={videoRef} controls loop={loopEnabled && !autoEnabled} src={file.url} onEnded={handleVideoEnded} /> : null}
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

      <nav className={`explorer-viewer__mobile-actions ${viewerChromeVisible ? "is-visible" : "is-hidden"}`} aria-label="Viewer actions">
        <button type="button" onClick={onRandom}>
          <FiRefreshCw aria-hidden /> <span>Random</span>
        </button>
        <button aria-pressed={autoEnabled} type="button" onClick={onAutoToggle}>
          <FiZap aria-hidden /> <span>Auto</span>
        </button>
        <button type="button" onClick={onShuffle}>
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
