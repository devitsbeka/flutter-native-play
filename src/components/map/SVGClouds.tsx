import { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface SVGCloudsProps {
  className?: string;
}

function random(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min) + min);
}

const SVGClouds: React.FC<SVGCloudsProps> = ({ className = '' }) => {
  const topSvgRef = useRef<SVGSVGElement>(null);
  const bottomSvgRef = useRef<SVGSVGElement>(null);
  const animationsRef = useRef<gsap.core.Tween[]>([]);

  useEffect(() => {
    gsap.defaults({ ease: "none" });

    const SPEED = {
      fast: 15,
      medium: 20,
      slow: 25,
    };

    // Top clouds
    gsap.set('#cloud-top-1', { x: -400 });
    const topCloud1 = gsap.to('#cloud-top-1', {
      duration: SPEED.medium,
      x: 1400,
      repeat: -1,
      onRepeat: () => gsap.set('#cloud-top-1', { y: random(0, 60) })
    });
    topCloud1.progress(0.3);

    gsap.set('#cloud-top-2', { x: -300 });
    const topCloud2 = gsap.to('#cloud-top-2', {
      duration: SPEED.fast,
      x: 1300,
      repeat: -1,
      onRepeat: () => gsap.set('#cloud-top-2', { y: random(20, 80) })
    });
    topCloud2.progress(0.7);

    gsap.set('#cloud-top-3', { x: -200 });
    const topCloud3 = gsap.to('#cloud-top-3', {
      duration: SPEED.slow,
      x: 1200,
      repeat: -1,
      onRepeat: () => gsap.set('#cloud-top-3', { y: random(10, 50) })
    });
    topCloud3.progress(0.5);

    gsap.set('#cloud-top-4', { x: -250 });
    const topCloud4 = gsap.to('#cloud-top-4', {
      duration: SPEED.medium + 3,
      x: 1250,
      repeat: -1,
      onRepeat: () => gsap.set('#cloud-top-4', { y: random(30, 90) })
    });
    topCloud4.progress(0.1);

    // Bottom clouds
    gsap.set('#cloud-bottom-1', { x: -350 });
    const bottomCloud1 = gsap.to('#cloud-bottom-1', {
      duration: SPEED.fast + 2,
      x: 1350,
      repeat: -1,
      onRepeat: () => gsap.set('#cloud-bottom-1', { y: random(0, 40) })
    });
    bottomCloud1.progress(0.4);

    gsap.set('#cloud-bottom-2', { x: -280 });
    const bottomCloud2 = gsap.to('#cloud-bottom-2', {
      duration: SPEED.medium,
      x: 1280,
      repeat: -1,
      onRepeat: () => gsap.set('#cloud-bottom-2', { y: random(10, 50) })
    });
    bottomCloud2.progress(0.8);

    gsap.set('#cloud-bottom-3', { x: -180 });
    const bottomCloud3 = gsap.to('#cloud-bottom-3', {
      duration: SPEED.slow - 3,
      x: 1180,
      repeat: -1,
      onRepeat: () => gsap.set('#cloud-bottom-3', { y: random(5, 35) })
    });
    bottomCloud3.progress(0.2);

    animationsRef.current = [topCloud1, topCloud2, topCloud3, topCloud4, bottomCloud1, bottomCloud2, bottomCloud3];

    return () => {
      animationsRef.current.forEach(anim => anim.kill());
    };
  }, []);

  return (
    <>
      {/* Top clouds - 25% of screen */}
      <div 
        className={`absolute top-0 left-0 right-0 overflow-hidden pointer-events-none ${className}`} 
        style={{ height: '25%', filter: 'blur(2px)' }}
      >
        <svg 
          ref={topSvgRef}
          viewBox="0 0 1000 150" 
          className="w-full h-full"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <symbol id="cloud-large" viewBox="0 0 200 80">
              <ellipse cx="40" cy="50" rx="35" ry="25" fill="#fff" />
              <ellipse cx="80" cy="40" rx="45" ry="30" fill="#fff" />
              <ellipse cx="130" cy="45" rx="40" ry="28" fill="#fff" />
              <ellipse cx="165" cy="55" rx="30" ry="22" fill="#fff" />
              <ellipse cx="60" cy="55" rx="30" ry="20" fill="#d4f1ff" fillOpacity="0.6" />
              <ellipse cx="110" cy="55" rx="35" ry="22" fill="#d4f1ff" fillOpacity="0.6" />
            </symbol>
            <symbol id="cloud-medium" viewBox="0 0 150 60">
              <ellipse cx="30" cy="35" rx="28" ry="20" fill="#fff" />
              <ellipse cx="65" cy="28" rx="35" ry="25" fill="#fff" />
              <ellipse cx="110" cy="35" rx="30" ry="22" fill="#fff" />
              <ellipse cx="50" cy="40" rx="25" ry="18" fill="#d4f1ff" fillOpacity="0.5" />
              <ellipse cx="90" cy="42" rx="28" ry="16" fill="#d4f1ff" fillOpacity="0.5" />
            </symbol>
            <symbol id="cloud-small" viewBox="0 0 100 45">
              <ellipse cx="25" cy="28" rx="22" ry="15" fill="#fff" />
              <ellipse cx="50" cy="22" rx="28" ry="18" fill="#fff" />
              <ellipse cx="75" cy="28" rx="20" ry="14" fill="#fff" />
              <ellipse cx="50" cy="32" rx="25" ry="12" fill="#d4f1ff" fillOpacity="0.5" />
            </symbol>
          </defs>

          <use id="cloud-top-1" href="#cloud-large" y={10} width={280} height={100} />
          <use id="cloud-top-2" href="#cloud-medium" y={40} width={200} height={80} />
          <use id="cloud-top-3" href="#cloud-small" y={20} width={140} height={60} />
          <use id="cloud-top-4" href="#cloud-medium" y={60} width={180} height={70} />
        </svg>
      </div>

      {/* Bottom clouds - 15% of screen */}
      <div 
        className={`absolute bottom-0 left-0 right-0 overflow-hidden pointer-events-none ${className}`} 
        style={{ height: '15%', filter: 'blur(3px)' }}
      >
        <svg 
          ref={bottomSvgRef}
          viewBox="0 0 1000 100" 
          className="w-full h-full"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <symbol id="cloud-bottom-large" viewBox="0 0 200 80">
              <ellipse cx="40" cy="50" rx="35" ry="25" fill="#fff" />
              <ellipse cx="80" cy="40" rx="45" ry="30" fill="#fff" />
              <ellipse cx="130" cy="45" rx="40" ry="28" fill="#fff" />
              <ellipse cx="165" cy="55" rx="30" ry="22" fill="#fff" />
            </symbol>
            <symbol id="cloud-bottom-medium" viewBox="0 0 150 60">
              <ellipse cx="30" cy="35" rx="28" ry="20" fill="#fff" />
              <ellipse cx="65" cy="28" rx="35" ry="25" fill="#fff" />
              <ellipse cx="110" cy="35" rx="30" ry="22" fill="#fff" />
            </symbol>
            <symbol id="cloud-bottom-small" viewBox="0 0 100 45">
              <ellipse cx="25" cy="28" rx="22" ry="15" fill="#fff" />
              <ellipse cx="50" cy="22" rx="28" ry="18" fill="#fff" />
              <ellipse cx="75" cy="28" rx="20" ry="14" fill="#fff" />
            </symbol>
          </defs>

          <use id="cloud-bottom-1" href="#cloud-bottom-large" y={-10} width={300} height={110} />
          <use id="cloud-bottom-2" href="#cloud-bottom-medium" y={10} width={220} height={85} />
          <use id="cloud-bottom-3" href="#cloud-bottom-small" y={20} width={150} height={60} />
        </svg>
      </div>
    </>
  );
};

export default SVGClouds;
