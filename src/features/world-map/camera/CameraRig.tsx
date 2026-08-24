import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CameraDefinition } from "../schemas/worldDefinition";
import { useCameraStore } from "../state/worldStore";

/** Fixed cinematic axis: high, pulled back, slightly off-center — no orbit. */
const CAMERA_DIRECTION = new THREE.Vector3(0.1, 0.72, 0.69).normalize();

interface CameraRigProps {
  definition: CameraDefinition;
  reducedMotion: boolean;
  /**
   * Vertical-scroll mode. Drag travels the route along Z with flick momentum
   * (the flick glides vertically only, so a sideways look-around does not
   * launch the camera down the route). Used on phones.
   */
  verticalScroll?: boolean;
}

/** Flick decay per second. Lower = the throw stops sooner. */
const MOMENTUM_DECAY = 0.012;
/** Below this speed (world units/sec) the glide is over. */
const MOMENTUM_CUTOFF = 0.4;
/** A drag slower than this on release is a stop, not a flick. */
const FLICK_MIN_SPEED = 6;

/**
 * Controlled cinematic camera. Users can pan (drag) and zoom (wheel/pinch)
 * within clamped limits; the store holds goals and this rig eases toward
 * them with damping. Rotation under the map is impossible by construction —
 * the view axis is constant.
 */
export function CameraRig({ definition, reducedMotion, verticalScroll = false }: CameraRigProps) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const current = useRef({
    target: new THREE.Vector3(...definition.target),
    zoom: 1,
    parallax: new THREE.Vector2(0, 0),
  });
  /** Residual Z velocity from a flick, decayed in the frame loop. */
  const momentum = useRef(0);

  // Initialize goals once per world.
  useEffect(() => {
    useCameraStore.setState({ target: definition.target, zoom: 1 });
    current.current.target.set(...definition.target);
    current.current.zoom = 1;
  }, [definition]);

  // Pointer pan + wheel zoom + pinch, attached to the canvas only.
  useEffect(() => {
    const el = gl.domElement;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let pinchDist = 0;

    const worldPerPixel = () => (definition.distance * current.current.zoom) / el.clientHeight / 9;

    // Flick tracking: last sample position and time, so release velocity is
    // measured from real movement rather than guessed from the final delta.
    let lastMoveT = 0;
    let lastVelZ = 0;

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      lastMoveT = e.timeStamp;
      lastVelZ = 0;
      momentum.current = 0;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) {
        // Subtle parallax from pointer position when idle.
        const rect = el.getBoundingClientRect();
        current.current.parallax.set(
          ((e.clientX - rect.left) / rect.width - 0.5) * 2,
          ((e.clientY - rect.top) / rect.height - 0.5) * 2,
        );
        return;
      }
      const scale = worldPerPixel() * 9;
      // Vertical mode used to lock x entirely, which made the map feel caged:
      // anything near the screen edge could never be brought into view. x pans
      // freely now, just at a slightly gentler rate so the route still reads as
      // the dominant axis; panLimits keeps it on the land.
      const dx = -(e.clientX - lastX) * scale * (verticalScroll ? 0.85 : 1);
      const dz = -(e.clientY - lastY) * scale * 1.4;

      if (verticalScroll) {
        const dt = Math.max(1, e.timeStamp - lastMoveT);
        lastVelZ = (dz / dt) * 1000;
        lastMoveT = e.timeStamp;
      }

      lastX = e.clientX;
      lastY = e.clientY;
      useCameraStore.getState().panBy(dx, dz, definition.panLimits, definition.target);
    };
    const endDrag = (e?: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      if (!verticalScroll || reducedMotion) return;
      // Only a genuine flick glides. Releasing after a pause has a stale
      // velocity sample, so ignore anything older than a frame or two.
      const stale = e ? e.timeStamp - lastMoveT > 90 : true;
      if (!stale && Math.abs(lastVelZ) > FLICK_MIN_SPEED) {
        momentum.current = THREE.MathUtils.clamp(lastVelZ, -160, 160);
      }
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const store = useCameraStore.getState();
      if (verticalScroll) {
        // A wheel/trackpad is the natural way to travel a vertical route;
        // zooming on scroll would fight the gesture.
        momentum.current = 0;
        store.panBy(0, e.deltaY * 0.08, definition.panLimits, definition.target);
        return;
      }
      const next = THREE.MathUtils.clamp(
        store.zoom * (1 + Math.sign(e.deltaY) * 0.08),
        definition.zoomRange[0],
        definition.zoomRange[1],
      );
      store.setZoom(next);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        );
        if (pinchDist > 0) {
          const store = useCameraStore.getState();
          store.setZoom(
            THREE.MathUtils.clamp(
              store.zoom * (pinchDist / d),
              definition.zoomRange[0],
              definition.zoomRange[1],
            ),
          );
        }
        pinchDist = d;
      }
    };
    const onTouchEnd = () => {
      pinchDist = 0;
    };

    el.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [gl, definition, verticalScroll, reducedMotion]);

  useFrame((_, delta) => {
    const goals = useCameraStore.getState();
    const c = current.current;

    // Glide after a flick. Exponential decay keeps the deceleration curve
    // frame-rate independent, and panBy re-clamps so the route ends stay hard.
    if (momentum.current !== 0) {
      goals.panBy(0, momentum.current * delta, definition.panLimits, definition.target);
      momentum.current *= Math.pow(MOMENTUM_DECAY, delta);
      if (Math.abs(momentum.current) < MOMENTUM_CUTOFF) momentum.current = 0;
    }
    // Damped approach; reduced motion snaps instantly.
    const lambda = reducedMotion ? 1000 : 4;
    c.target.x = THREE.MathUtils.damp(c.target.x, goals.target[0], lambda, delta);
    c.target.y = THREE.MathUtils.damp(c.target.y, goals.target[1], lambda, delta);
    c.target.z = THREE.MathUtils.damp(c.target.z, goals.target[2], lambda, delta);
    c.zoom = THREE.MathUtils.damp(c.zoom, goals.zoom, lambda, delta);

    // Pointer parallax is a desktop nicety; on a touch route it just makes
    // the world wobble under the thumb while scrolling.
    const parallaxStrength = reducedMotion || verticalScroll ? 0 : 1.6;
    const px = c.parallax.x * parallaxStrength;
    const pz = c.parallax.y * parallaxStrength * 0.8;

    const distance = definition.distance * c.zoom;
    camera.position
      .copy(c.target)
      .addScaledVector(CAMERA_DIRECTION, distance)
      .add(new THREE.Vector3(px, 0, pz));
    camera.lookAt(c.target.x + px * 0.4, c.target.y, c.target.z + pz * 0.4);
  });

  return null;
}
