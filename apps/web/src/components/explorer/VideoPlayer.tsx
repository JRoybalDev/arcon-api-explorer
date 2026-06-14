import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiPlay, FiPause, FiMaximize2, FiVolume2, FiVolumeX, FiRotateCw, FiSkipBack, FiSkipForward, FiRefreshCw, FiShuffle, FiZap } from "react-icons/fi";
import { FaDice } from "react-icons/fa";

type VideoPlayerProps = {
  src: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  onEnded?: () => void;
  showControls?: boolean;
  onControlsEnter?: () => void;
  onControlsLeave?: () => void;
  isRotated?: boolean;
  onRotateToggle?: () => void;
  isMobile?: boolean;
  controlsOffset?: number;
  videoRef?: RefObject<HTMLVideoElement | null>;
  onPrevious?: () => void;
  onNext?: () => void;
  onShuffle?: () => void;
  onRandom?: () => void;
  onLoopToggle?: () => void;
  onAutoToggle?: () => void;
  shuffleEnabled?: boolean;
  loopEnabled?: boolean;
  autoEnabled?: boolean;
};

function formatTime(sec = 0) {
  const s = Math.floor(sec || 0);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function VideoPlayer({
  src,
  autoPlay = true,
  loop = false,
  muted = false,
  onEnded,
  showControls = true,
  onControlsEnter,
  onControlsLeave,
  isRotated,
  onRotateToggle,
  isMobile,
  controlsOffset,
  videoRef: externalVideoRef,
  onPrevious,
  onNext,
  onShuffle,
  onRandom,
  onLoopToggle,
  onAutoToggle,
  shuffleEnabled,
  loopEnabled,
  autoEnabled }: VideoPlayerProps) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const videoRef = externalVideoRef || localVideoRef;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const prevVolumeRef = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [volume, setVolume] = useState(muted ? 0 : 1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const onEndedHandler = () => {
      setPlaying(false);
      onEnded?.();
    };

    vid.addEventListener("ended", onEndedHandler);
    return () => vid.removeEventListener("ended", onEndedHandler);
  }, [onEnded]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const tryPlay = async () => {
      try {
        if (vid.paused) await vid.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    };

    const onLoaded = () => {
      setDuration(vid.duration || 0);
      if (autoPlay) void tryPlay();
    };

    if (vid.readyState >= 2) onLoaded();

    vid.addEventListener("loadedmetadata", onLoaded);

    return () => {
      vid.removeEventListener("loadedmetadata", onLoaded);
    };
  }, [src, autoPlay]);

  // Restore persisted volume from localStorage and persist changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem("explorer_video_volume");
      if (saved) {
        const parsed = JSON.parse(saved) as { volume?: number; muted?: boolean } | null;
        if (parsed && typeof parsed.volume === "number") {
          setVolume(clamp(parsed.volume, 0, 1));
        }
      }
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("explorer_video_volume", JSON.stringify({ volume, muted: volume <= 0.001 }));
    } catch (e) {
      // ignore
    }
  }, [volume]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    vid.volume = volume;
    vid.muted = volume <= 0.001;
  }, [volume]);

  useEffect(() => {
    const tick = (time: number) => {
      const vid = videoRef.current;
      if (!vid) return;
      setCurrent(vid.currentTime || 0);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const togglePlay = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      void vid.play().then(() => setPlaying(true)).catch(() => { });
    } else {
      vid.pause();
      setPlaying(false);
    }
  }, [videoRef]);

  const seekTo = useCallback((percent: number) => {
    const vid = videoRef.current;
    if (!vid || !isFinite(duration) || duration <= 0) return;
    vid.currentTime = Math.max(0, Math.min(duration, percent * duration));
    setCurrent(vid.currentTime);
  }, [videoRef, duration]);

  const toggleFullscreen = useCallback(() => {
    const vid = videoRef.current;
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      setIsFullscreen(false);
    } else {
      // Request fullscreen on the container so React controls remain visible
      void el.requestFullscreen().then(() => setIsFullscreen(true))
        .catch(() => { });
    }
  }, [videoRef]);

  useEffect(() => {
    function onFullScreenChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }

    document.addEventListener("fullscreenchange", onFullScreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullScreenChange);
  }, []);

  // Keyboard shortcuts: space/k play-pause, arrows seek, up/down volume, f fullscreen, m mute
  useEffect(() => {
    function isTypingTarget(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || target.isContentEditable) return true;
      return false;
    }

    function onKey(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;

      const vid = videoRef.current;
      if (!vid) return;

      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "arrowleft":
          e.preventDefault();
          vid.currentTime = Math.max(0, (vid.currentTime || 0) - 5);
          setCurrent(vid.currentTime);
          break;
        case "arrowright":
          e.preventDefault();
          vid.currentTime = Math.min(vid.duration || 0, (vid.currentTime || 0) + 5);
          setCurrent(vid.currentTime);
          break;
        case "arrowup":
          e.preventDefault();
          setVolume((v) => clamp(Math.min(1, v + 0.05), 0, 1));
          break;
        case "arrowdown":
          e.preventDefault();
          setVolume((v) => clamp(Math.max(0, v - 0.05), 0, 1));
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
          e.preventDefault();
          // mute toggle: store previous volume
          if (volume > 0.001) {
            prevVolumeRef.current = volume;
            setVolume(0);
          } else {
            setVolume(prevVolumeRef.current ?? 1);
            prevVolumeRef.current = null;
          }
          break;
        default:
          break;
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [volume]);

  return (
    <div
      className="explorer-video-player"
      ref={containerRef}
      style={
        isRotated
          ? {
            position: "fixed",
            top: "50%",
            left: "50%",
            width: "100dvh",
            height: "100dvw",
            transform: "translate(-50%, -50%) rotate(90deg)",
            maxWidth: "none",
            maxHeight: "none",
            display: "flex",
            flexDirection: "column",
            zIndex: 100,
            borderRadius: 0,
          }
          : { height: "100%", width: "100%", position: "relative" }
      }
    >
      <video
        ref={videoRef}
        src={src}
        className="explorer-video-player__video"
        playsInline
        onClick={togglePlay}
        onPointerMove={(e) => {
          e.stopPropagation();
          onControlsEnter?.();
        }}
        autoPlay={autoPlay}
        loop={loop}
        disableRemotePlayback
        webkit-disable-remote-playback="true"
        style={{
          width: '100%',
          height: '100%',
          maxHeight: isFullscreen ? '100dvh' : 'none',
          maxWidth: 'none',
          objectFit: 'contain'
        }}
      />

      {/* Hover area: always present to detect pointer enter/leave even when controls are hidden */}
      <div
        className="explorer-video-player__controls-hover"
        onPointerEnter={(e) => {
          e.stopPropagation();
          onControlsEnter?.();
        }}
        onPointerMove={(e) => {
          e.stopPropagation();
          onControlsEnter?.();
        }}
        onPointerLeave={(e) => {
          e.stopPropagation();
          onControlsLeave?.();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 56,
          zIndex: 3,
          background: 'transparent'
        }}
      />

      <AnimatePresence>
        {showControls ? (
          <motion.div
            className="explorer-video-player__controls"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            style={isMobile ? {
              bottom: `calc(env(safe-area-inset-bottom, 0px) + ${controlsOffset || 0}px)`,
              left: "50%",
              x: "-50%",
              width: isRotated ? "92%" : "94%",
              maxWidth: isRotated ? "600px" : "none",
              borderRadius: "12px",
            } : {
              bottom: "16px",
              left: "50%",
              x: "-50%",
              width: "calc(100% - 32px)",
              borderRadius: "12px",
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            onPointerEnter={(e) => {
              e.stopPropagation();
              onControlsEnter?.();
            }}
            onPointerMove={(e) => {
              e.stopPropagation();
              onControlsEnter?.();
            }}
            onPointerLeave={(e) => {
              e.stopPropagation();
              onControlsLeave?.();
            }}
          >
            <div 
              className="explorer-video-player__nav-group"
              style={!isMobile && isFullscreen ? { gap: '12px' } : {}}
            >
              {!isMobile && (
                <button className="explorer-video-player__nav-btn" onClick={onPrevious} aria-label="Previous">
                  <FiSkipBack />
                </button>
              )}
              <button className="explorer-video-player__play" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>
                {playing ? <FiPause /> : <FiPlay />}
              </button>
              {!isMobile && (
                <button className="explorer-video-player__nav-btn" onClick={onNext} aria-label="Next">
                  <FiSkipForward />
                </button>
              )}
            </div>

            <div className="explorer-video-player__time">{formatTime(current)}</div>

            <div className="explorer-video-player__progress">
              <input
                type="range"
                min={0}
                max={1}
                step={0.001}
                value={duration ? current / duration : 0}
                onChange={(e) => seekTo(Number(e.target.value))}
                aria-label="Seek"
              />
            </div>

            <div className="explorer-video-player__time">-{formatTime(Math.max(0, duration - current))}</div>

            <div
              className="explorer-video-player__volume"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button
                className="explorer-video-player__volume-icon"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (volume > 0.001) {
                    prevVolumeRef.current = volume;
                    setVolume(0);
                  } else {
                    setVolume(prevVolumeRef.current ?? 1);
                    prevVolumeRef.current = null;
                  }
                }}
                aria-label={volume > 0.001 ? "Mute" : "Unmute"}
              >
                {volume > 0.001 ? <FiVolume2 /> : <FiVolumeX />}
              </button>
              {!isMobile && (
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onPointerDown={(e) => e.stopPropagation()}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  aria-label="Volume"
                />
              )}
            </div>

            <div 
              className="explorer-video-player__util-group"
              style={!isMobile && isFullscreen ? { gap: '12px' } : {}}
            >
              {isMobile ? (
                onRotateToggle && (
                  <button className="explorer-video-player__util-btn" onClick={onRotateToggle} aria-label="Rotate">
                    <FiRotateCw />
                  </button>
                )
              ) : (
                <>
                  {isFullscreen && (
                    <>
                      <button
                        className={`explorer-video-player__util-btn ${loopEnabled ? 'is-active' : ''}`}
                        onClick={onLoopToggle}
                        aria-label="Loop"
                        aria-pressed={loopEnabled}
                      >
                        <FiRefreshCw />
                      </button>
                      <button
                        className={`explorer-video-player__util-btn ${shuffleEnabled ? 'is-active' : ''}`}
                        onClick={onShuffle}
                        aria-label="Shuffle"
                        aria-pressed={shuffleEnabled}
                      >
                        <FiShuffle />
                      </button>
                      <button
                        className="explorer-video-player__util-btn"
                        onClick={onRandom}
                        aria-label="Random"
                      >
                        <FaDice />
                      </button>
                    </>
                  )}
                  <button className="explorer-video-player__fullscreen" onClick={toggleFullscreen} aria-label="Fullscreen">
                    <FiMaximize2 />
                  </button>
                </>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default VideoPlayer;
