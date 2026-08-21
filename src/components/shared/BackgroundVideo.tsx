import { useEffect, useRef, useState } from "react";

/**
 * A background loop that can never show Safari's grey ▶.
 *
 * iOS Safari in Low Power Mode refuses autoplay and paints its own play
 * glyph over the paused frame. Three attempts to hide that glyph with CSS
 * failed — modern Safari ignores the ::-webkit-media-controls selectors for
 * it — and resuming on first touch (AutoplayRescue) still leaves the glyph
 * on screen from load until that touch. So this stops fighting the glyph
 * and removes its stage instead:
 *
 *  - The <video> carries NO autoplay attribute; playback is requested from
 *    JS. Until the 'playing' event actually fires, the element is
 *    invisible (opacity 0) — whatever Safari draws on it, nobody sees.
 *  - The still (poster artwork or first frame) renders as a plain <img>
 *    underneath, so a blocked video degrades to exactly what the design's
 *    poster shows, not to a play button.
 *  - Every touch, pointer-up and tab return retries play(); user gestures
 *    are allowed to start playback even in Low Power Mode, so the loop
 *    starts on the first interaction and fades in over the still.
 *
 * Two layouts, because callers position these two ways:
 *  - fill (default): wrapper takes the caller's className/style; still and
 *    video cover it (object-cover).
 *  - intrinsic: the still is the in-flow element (w-full h-auto) and sets
 *    the wrapper's height, matching a bare <video className="w-[…]"> whose
 *    height came from its own aspect ratio.
 */
export function BackgroundVideo({
  src,
  sources,
  still,
  className,
  style,
  layout = "fill",
  videoClassName = "",
}: {
  src?: string;
  /** Alternative to src: multiple encodings, first supported wins. */
  sources?: { src: string; type: string }[];
  /** Poster artwork or extracted first frame. Same aspect as the video. */
  still?: string;
  className?: string;
  style?: React.CSSProperties;
  layout?: "fill" | "intrinsic";
  /** Extra classes for the media elements (e.g. object-position tweaks). */
  videoClassName?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    let alive = true;

    const tryPlay = () => {
      // muted re-asserted in JS: Safari ignores the attribute alone in some
      // restore paths, and an unmuted play() is always refused.
      v.muted = true;
      v.play().catch(() => {});
    };
    const onPlaying = () => alive && setPlaying(true);
    const onPause = () => {
      if (alive && !v.ended) setPlaying(false);
    };
    v.addEventListener("playing", onPlaying);
    v.addEventListener("pause", onPause);
    v.addEventListener("loadeddata", tryPlay);
    tryPlay();

    const opts: AddEventListenerOptions = { passive: true };
    const onVisible = () => {
      if (document.visibilityState === "visible") tryPlay();
    };
    document.addEventListener("touchend", tryPlay, opts);
    document.addEventListener("pointerup", tryPlay, opts);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      alive = false;
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("loadeddata", tryPlay);
      document.removeEventListener("touchend", tryPlay);
      document.removeEventListener("pointerup", tryPlay);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [src]);

  const mediaFit =
    layout === "fill"
      ? `absolute inset-0 h-full w-full object-cover ${videoClassName}`
      : `absolute inset-0 h-full w-full ${videoClassName}`;

  return (
    <div className={className} style={style}>
      {still && (
        <img
          src={still}
          alt=""
          draggable={false}
          className={layout === "intrinsic" ? `block h-auto w-full ${videoClassName}` : mediaFit}
        />
      )}
      <video
        ref={videoRef}
        src={src}
        loop
        muted
        playsInline
        preload="auto"
        className={`${mediaFit} transition-opacity duration-500 ${playing ? "opacity-100" : "opacity-0"}`}
      >
        {sources?.map((s) => <source key={s.src} src={s.src} type={s.type} />)}
      </video>
    </div>
  );
}
