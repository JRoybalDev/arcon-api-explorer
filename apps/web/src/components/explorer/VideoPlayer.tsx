import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiPlay, FiPause, FiMaximize2, FiVolume2, FiVolumeX } from "react-icons/fi";

type VideoPlayerProps = {
  src: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  onEnded?: () => void;
  showControls?: boolean;
  onControlsEnter?: () => void;
  onControlsLeave?: () => void;
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

export function VideoPlayer({ src, autoPlay = true, loop = false, muted = false, onEnded, showControls = true, onControlsEnter, onControlsLeave }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
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

    const onLoaded = () => {
      setDuration(vid.duration || 0);
      if (autoPlay) {
        void vid.play().then(() => setPlaying(!vid.paused)).catch(() => {});
      }
    };

    const onEndedHandler = () => {
      setPlaying(false);
      onEnded?.();
    };

    vid.addEventListener("loadedmetadata", onLoaded);
    vid.addEventListener("ended", onEndedHandler);

    return () => {
      vid.removeEventListener("loadedmetadata", onLoaded);
      vid.removeEventListener("ended", onEndedHandler);
    };
  }, [src, autoPlay, onEnded]);

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
    const tick = () => {
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

  function togglePlay() {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      void vid.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      vid.pause();
      setPlaying(false);
    }
  }

  function seekTo(percent: number) {
    const vid = videoRef.current;
    if (!vid || !isFinite(duration) || duration <= 0) return;
    vid.currentTime = Math.max(0, Math.min(duration, percent * duration));
    setCurrent(vid.currentTime);
  }

  function toggleFullscreen() {
    const vid = videoRef.current;
    const el = vid ?? containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      setIsFullscreen(false);
    } else {
      // Request fullscreen on the actual video element when available so the media
      // scales to fill the screen correctly.
      void (vid ? vid.requestFullscreen() : el.requestFullscreen())
        .then(() => setIsFullscreen(true))
        .catch(() => {});
    }
  }

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
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <video
        ref={videoRef}
        src={src}
        className="explorer-video-player__video"
        playsInline
        autoPlay={autoPlay}
        loop={loop}
      />

      <AnimatePresence>
        {showControls ? (
          <motion.div
            className="explorer-video-player__controls"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            onPointerEnter={(e) => {
              e.stopPropagation();
              onControlsEnter?.();
            }}
            onPointerLeave={(e) => {
              e.stopPropagation();
              onControlsLeave?.();
            }}
          >
            <button className="explorer-video-player__play" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>
              {playing ? <FiPause /> : <FiPlay />}
            </button>

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
            </div>

            <button className="explorer-video-player__fullscreen" onClick={toggleFullscreen} aria-label="Fullscreen">
              <FiMaximize2 />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default VideoPlayer;
