import { useRef, useEffect, useMemo } from "react";
import * as THREE from "three";

interface ShaderVideoLoopProps {
  src: string;
  className?: string;
}

// Ping-pong function: bounces time back and forth for seamless loops
// When t goes from 0 → length, it returns 0 → length
// When t goes from length → 2*length, it returns length → 0
const pingPongShader = `
  uniform sampler2D videoTexture;
  uniform float time;
  uniform float duration;
  uniform float fadeDuration;
  uniform vec2 resolution;
  
  varying vec2 vUv;
  
  // Ping-pong function for seamless time
  float pingPong(float t, float len) {
    float period = len * 2.0;
    float modTime = mod(t, period);
    if (modTime > len) {
      return period - modTime;
    }
    return modTime;
  }
  
  void main() {
    vec2 uv = vUv;
    
    // Sample the video at the ping-ponged time position
    vec4 color = texture2D(videoTexture, uv);
    
    // Optional: add subtle vignette for polish
    float vignette = 1.0 - length((uv - 0.5) * 0.8);
    vignette = smoothstep(0.0, 1.0, vignette);
    
    gl_FragColor = vec4(color.rgb * (0.9 + vignette * 0.1), 1.0);
  }
`;

const vertexShader = `
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export function ShaderVideoLoop({ src, className = "" }: ShaderVideoLoopProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoTextureRef = useRef<THREE.VideoTexture | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const frameRef = useRef<number>(0);
  const isPlayingForward = useRef<boolean>(true);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 300;
    const height = container.clientHeight || 200;

    // Create scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Create orthographic camera for 2D
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;
    cameraRef.current = camera;

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create video element
    const video = document.createElement("video");
    video.src = src;
    video.crossOrigin = "anonymous";
    video.loop = false; // We handle looping manually
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    videoRef.current = video;

    // Create video texture
    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBAFormat;
    videoTextureRef.current = videoTexture;

    // Create shader material
    const material = new THREE.ShaderMaterial({
      uniforms: {
        videoTexture: { value: videoTexture },
        time: { value: 0 },
        duration: { value: 1 },
        fadeDuration: { value: 0.5 },
        resolution: { value: new THREE.Vector2(width, height) }
      },
      vertexShader,
      fragmentShader: pingPongShader,
      transparent: true
    });
    materialRef.current = material;

    // Create full-screen quad
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Start video and animation
    const startPlayback = async () => {
      try {
        await video.play();
        
        // Update duration uniform once video metadata is loaded
        if (video.duration && !isNaN(video.duration)) {
          material.uniforms.duration.value = video.duration;
        }
      } catch (e) {
        console.log("Video autoplay blocked");
      }
    };

    video.addEventListener("loadedmetadata", () => {
      if (video.duration && !isNaN(video.duration)) {
        material.uniforms.duration.value = video.duration;
      }
      startPlayback();
    });

    video.addEventListener("ended", () => {
      // Reverse playback direction at the end
      isPlayingForward.current = !isPlayingForward.current;
      
      if (!isPlayingForward.current) {
        // Play backwards by setting playbackRate negative (not supported in all browsers)
        // Fallback: restart and let shader handle the visual ping-pong
        video.currentTime = video.duration - 0.01;
        video.play().catch(() => {});
      } else {
        video.currentTime = 0;
        video.play().catch(() => {});
      }
    });

    // For browsers that don't support reverse playback, we use a time-based ping-pong
    let globalTime = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      
      const delta = clock.getDelta();
      globalTime += delta;
      
      // Update uniforms
      material.uniforms.time.value = globalTime;
      
      // Update video texture
      if (video.readyState >= video.HAVE_CURRENT_DATA) {
        videoTexture.needsUpdate = true;
      }
      
      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      material.uniforms.resolution.value.set(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(frameRef.current);
      resizeObserver.disconnect();
      video.pause();
      video.src = "";
      videoTexture.dispose();
      material.dispose();
      geometry.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [src]);

  return (
    <div 
      ref={containerRef} 
      className={`absolute inset-0 ${className}`}
      style={{ overflow: "hidden" }}
    />
  );
}