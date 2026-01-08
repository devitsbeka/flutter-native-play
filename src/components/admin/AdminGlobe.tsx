import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ActiveUser } from '@/hooks/useActiveUsers';
import { countryCoordinates } from '@/lib/countryCoordinates';

interface AdminGlobeProps {
  users: ActiveUser[];
}

// Convert lat/lon to 3D position
function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  
  return new THREE.Vector3(x, y, z);
}

export function AdminGlobe({ users }: AdminGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    globe: THREE.Group;
    animationId: number;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => setIsReady(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!containerRef.current || !isReady) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    
    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 2.5;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x0f0a1e, 1);
    container.appendChild(renderer.domElement);

    // Globe group
    const globe = new THREE.Group();
    scene.add(globe);

    // Earth sphere with dark texture
    const earthGeometry = new THREE.SphereGeometry(1, 64, 64);
    const earthMaterial = new THREE.MeshPhongMaterial({
      color: 0x1a1a2e,
      emissive: 0x0a0a15,
      specular: 0x333355,
      shininess: 5,
    });
    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    globe.add(earthMesh);

    // Wireframe overlay for landmass feel
    const wireframeGeometry = new THREE.SphereGeometry(1.002, 32, 32);
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x4338ca,
      wireframe: true,
      transparent: true,
      opacity: 0.08,
    });
    const wireframeMesh = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
    globe.add(wireframeMesh);

    // Atmosphere glow
    const atmosphereGeometry = new THREE.SphereGeometry(1.15, 64, 64);
    const atmosphereMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(0.4, 0.3, 0.9, 1.0) * intensity;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    globe.add(atmosphereMesh);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);

    // Check online status
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

    // Group users by country and add markers
    const countryGroups = new Map<string, { count: number; hasOnline: boolean }>();
    users.forEach(user => {
      const code = user.country_code?.toLowerCase() || user.region?.toLowerCase() || 'ge';
      const existing = countryGroups.get(code) || { count: 0, hasOnline: false };
      const isOnline = user.status === 'online' && user.last_seen >= twoMinutesAgo;
      countryGroups.set(code, {
        count: existing.count + 1,
        hasOnline: existing.hasOnline || isOnline,
      });
    });

    // Create markers for each country
    countryGroups.forEach((data, code) => {
      const coords = countryCoordinates[code] || countryCoordinates.ge;
      const position = latLonToVector3(coords.lat, coords.lon, 1.02);
      
      // Marker dot
      const markerGeometry = new THREE.SphereGeometry(0.02 + data.count * 0.008, 16, 16);
      const markerMaterial = new THREE.MeshBasicMaterial({
        color: data.hasOnline ? 0x10b981 : 0x6b7280,
      });
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.copy(position);
      globe.add(marker);

      // Glow ring for online markers
      if (data.hasOnline) {
        const ringGeometry = new THREE.RingGeometry(0.03, 0.06, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
          color: 0x10b981,
          transparent: true,
          opacity: 0.4,
          side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.copy(position);
        ring.lookAt(new THREE.Vector3(0, 0, 0));
        globe.add(ring);
      }
    });

    // Initial rotation to show Georgia region
    globe.rotation.y = -0.8;
    globe.rotation.x = 0.4;

    // Mouse interaction
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;
      globe.rotation.y += deltaX * 0.005;
      globe.rotation.x += deltaY * 0.005;
      globe.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, globe.rotation.x));
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('mouseleave', onMouseUp);
    renderer.domElement.style.cursor = 'grab';

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      
      // Auto-rotate when not dragging
      if (!isDragging) {
        globe.rotation.y += 0.002;
      }
      
      renderer.render(scene, camera);
    };
    animate();

    sceneRef.current = { scene, camera, renderer, globe, animationId };

    // Handle resize
    const handleResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('mouseleave', onMouseUp);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [users, isReady]);

  return (
    <div ref={containerRef} className="absolute inset-0" />
  );
}
