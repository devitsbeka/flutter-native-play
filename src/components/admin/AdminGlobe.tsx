import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import ThreeGlobe from 'three-globe';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ActiveUser } from '@/hooks/useActiveUsers';
import { countryCoordinates } from '@/lib/countryCoordinates';

interface AdminGlobeProps {
  users: ActiveUser[];
}

export function AdminGlobe({ users }: AdminGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<ThreeGlobe | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Check online status
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

    // Group users by country
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

    // Convert to points data
    const pointsData = Array.from(countryGroups.entries()).map(([code, data]) => {
      const coords = countryCoordinates[code] || countryCoordinates.ge;
      return {
        lat: coords.lat,
        lng: coords.lon,
        size: Math.min(0.8, 0.2 + data.count * 0.15),
        color: data.hasOnline ? '#10b981' : '#6b7280',
        name: coords.name,
        count: data.count,
      };
    });

    // Create globe
    const globe = new ThreeGlobe()
      .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-dark.jpg')
      .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
      .pointsData(pointsData)
      .pointAltitude('size')
      .pointColor('color')
      .pointRadius(0.5)
      .pointsMerge(false)
      .atmosphereColor('#6366f1')
      .atmosphereAltitude(0.2)
      .showAtmosphere(true);

    globeRef.current = globe;

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    renderer.setClearColor(0x0f0a1e, 1);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Setup scene
    const scene = new THREE.Scene();
    scene.add(globe);
    scene.add(new THREE.AmbientLight(0x404040, 2));
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Setup camera - focus on Georgia region
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.z = 300;

    // Add orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.rotateSpeed = 0.5;
    controls.enableZoom = true;
    controls.minDistance = 150;
    controls.maxDistance = 500;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;

    // Rotate to show Georgia initially (approximately)
    globe.rotation.y = -0.7;
    globe.rotation.x = 0.3;

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

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
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [users]);

  return (
    <div ref={containerRef} className="absolute inset-0" />
  );
}
