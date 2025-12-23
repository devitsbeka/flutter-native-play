import { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface SVGCloudsProps {
  className?: string;
}

function random(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min) + min);
}

const SVGClouds: React.FC<SVGCloudsProps> = ({ className = '' }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const animationsRef = useRef<gsap.core.Tween[]>([]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = svgRef.current;
    
    const getStartingX = (id: string): number => {
      const el = svg.querySelector(id);
      if (!el) return 1000;
      return 1000 + parseInt(el.getAttribute('data-width') || '100', 10);
    };

    const SPEED = {
      closer: 140,
      close: 180,
      far: 300,
      farther: 330,
      farthest: 360
    };

    gsap.defaults({ ease: "none" });

    // Cloud 1
    gsap.set('#cloud-1', { y: -65 });
    const cloud1 = gsap.to('#cloud-1', {
      duration: SPEED.close,
      x: getStartingX('#cloud-1'),
      repeat: -1,
      onRepeat: () => gsap.set('#cloud-1', { y: random(-200, 200) })
    });
    cloud1.progress(0.5);

    // Cloud 2
    gsap.set('#cloud-2', { y: -190 });
    const cloud2 = gsap.to('#cloud-2', {
      duration: SPEED.close + 30,
      x: getStartingX('#cloud-2'),
      repeat: -1,
      onRepeat: () => gsap.set('#cloud-2', { y: random(-210, 210) })
    });
    cloud2.progress(0.76);

    // Cloud 3
    gsap.set('#cloud-3', { y: -89 });
    const cloud3 = gsap.to('#cloud-3', {
      duration: SPEED.far,
      x: getStartingX('#cloud-3'),
      repeat: -1,
      onRepeat: () => gsap.set('#cloud-3', { y: random(-230, 230) })
    });
    cloud3.progress(0.89);

    // Cloud 4
    gsap.set('#cloud-4', { y: -125 });
    const cloud4 = gsap.to('#cloud-4', {
      duration: SPEED.far,
      x: getStartingX('#cloud-4'),
      repeat: -1,
      onRepeat: () => gsap.set('#cloud-4', { y: random(-230, 230) })
    });
    cloud4.progress(0.2);

    // Cloud 5
    gsap.set('#cloud-5', { y: -118 });
    const cloud5 = gsap.to('#cloud-5', {
      duration: SPEED.farthest,
      x: getStartingX('#cloud-5'),
      repeat: -1,
      onRepeat: () => gsap.set('#cloud-5', { y: random(-235, 235) })
    });
    cloud5.progress(0.08);

    // Cloud 6
    gsap.set('#cloud-6', { y: -20 });
    const cloud6 = gsap.to('#cloud-6', {
      duration: SPEED.farther,
      x: getStartingX('#cloud-6'),
      repeat: -1,
      onRepeat: () => gsap.set('#cloud-6', { y: random(-230, 230) })
    });
    cloud6.progress(0.14);

    // Cloud 7
    gsap.set('#cloud-7', { y: 108 });
    const cloud7 = gsap.to('#cloud-7', {
      duration: SPEED.far - 20,
      x: getStartingX('#cloud-7'),
      repeat: -1,
      onRepeat: () => gsap.set('#cloud-7', { y: random(-225, 225) })
    });
    cloud7.progress(0.57);

    // Cloud 8
    gsap.set('#cloud-8', { y: 58 });
    const cloud8 = gsap.to('#cloud-8', {
      duration: SPEED.farther - 10,
      x: getStartingX('#cloud-8'),
      repeat: -1,
      onRepeat: () => gsap.set('#cloud-8', { y: random(-230, 230) })
    });
    cloud8.progress(0.2);

    animationsRef.current = [cloud1, cloud2, cloud3, cloud4, cloud5, cloud6, cloud7, cloud8];

    return () => {
      animationsRef.current.forEach(anim => anim.kill());
    };
  }, []);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <svg 
        ref={svgRef}
        viewBox="0 0 1000 500" 
        className="w-full h-full"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Cloud 1 - Large fluffy cloud */}
          <symbol id="cloud-01-def" viewBox="0 0 200 80">
            <ellipse cx="40" cy="50" rx="35" ry="25" fill="#fff" />
            <ellipse cx="80" cy="40" rx="45" ry="30" fill="#fff" />
            <ellipse cx="130" cy="45" rx="40" ry="28" fill="#fff" />
            <ellipse cx="165" cy="55" rx="30" ry="22" fill="#fff" />
            <ellipse cx="60" cy="55" rx="30" ry="20" fill="#d4f1ff" />
            <ellipse cx="110" cy="55" rx="35" ry="22" fill="#d4f1ff" />
          </symbol>

          {/* Cloud 2 - Medium cloud */}
          <symbol id="cloud-02-def" viewBox="0 0 150 60">
            <ellipse cx="30" cy="35" rx="28" ry="20" fill="#fff" />
            <ellipse cx="65" cy="28" rx="35" ry="25" fill="#fff" />
            <ellipse cx="110" cy="35" rx="30" ry="22" fill="#fff" />
            <ellipse cx="50" cy="40" rx="25" ry="18" fill="#d4f1ff" />
            <ellipse cx="90" cy="42" rx="28" ry="16" fill="#d4f1ff" />
          </symbol>

          {/* Cloud 3 - Small cloud */}
          <symbol id="cloud-03-def" viewBox="0 0 100 45">
            <ellipse cx="25" cy="28" rx="22" ry="15" fill="#fff" />
            <ellipse cx="50" cy="22" rx="28" ry="18" fill="#fff" />
            <ellipse cx="75" cy="28" rx="20" ry="14" fill="#fff" />
            <ellipse cx="50" cy="32" rx="25" ry="12" fill="#d4f1ff" />
          </symbol>

          {/* Cloud 4 - Wide cloud */}
          <symbol id="cloud-04-def" viewBox="0 0 180 55">
            <ellipse cx="30" cy="35" rx="28" ry="18" fill="#fff" />
            <ellipse cx="70" cy="28" rx="38" ry="24" fill="#fff" />
            <ellipse cx="120" cy="30" rx="35" ry="22" fill="#fff" />
            <ellipse cx="160" cy="38" rx="25" ry="16" fill="#fff" />
            <ellipse cx="90" cy="40" rx="45" ry="14" fill="#d4f1ff" />
          </symbol>

          {/* Cloud 5 - Tiny cloud */}
          <symbol id="cloud-05-def" viewBox="0 0 70 35">
            <ellipse cx="20" cy="20" rx="18" ry="13" fill="#fff" />
            <ellipse cx="40" cy="16" rx="22" ry="15" fill="#fff" />
            <ellipse cx="55" cy="22" rx="14" ry="11" fill="#fff" />
            <ellipse cx="35" cy="24" rx="18" ry="10" fill="#d4f1ff" />
          </symbol>

          {/* Cloud 6 - Puffy cloud */}
          <symbol id="cloud-06-def" viewBox="0 0 120 50">
            <ellipse cx="25" cy="32" rx="22" ry="16" fill="#fff" />
            <ellipse cx="55" cy="24" rx="30" ry="20" fill="#fff" />
            <ellipse cx="90" cy="30" rx="26" ry="18" fill="#fff" />
            <ellipse cx="55" cy="35" rx="28" ry="14" fill="#d4f1ff" />
          </symbol>

          {/* Cloud 7 - Long cloud */}
          <symbol id="cloud-07-def" viewBox="0 0 160 50">
            <ellipse cx="25" cy="30" rx="22" ry="16" fill="#fff" />
            <ellipse cx="60" cy="24" rx="32" ry="20" fill="#fff" />
            <ellipse cx="100" cy="26" rx="30" ry="18" fill="#fff" />
            <ellipse cx="135" cy="32" rx="24" ry="15" fill="#fff" />
            <ellipse cx="80" cy="36" rx="40" ry="12" fill="#d4f1ff" />
          </symbol>

          {/* Cloud 8 - Rounded cloud */}
          <symbol id="cloud-08-def" viewBox="0 0 130 55">
            <ellipse cx="30" cy="35" rx="26" ry="18" fill="#fff" />
            <ellipse cx="65" cy="26" rx="35" ry="22" fill="#fff" />
            <ellipse cx="100" cy="35" rx="28" ry="18" fill="#fff" />
            <ellipse cx="65" cy="40" rx="35" ry="14" fill="#d4f1ff" />
          </symbol>
        </defs>

        {/* Cloud instances - positioned off-screen initially, animated by GSAP */}
        <use id="cloud-1" href="#cloud-01-def" x={-400} y={100} width={400} height={160} data-width="400" />
        <use id="cloud-2" href="#cloud-02-def" x={-300} y={50} width={300} height={120} data-width="300" />
        <use id="cloud-3" href="#cloud-03-def" x={-100} y={200} width={100} height={45} data-width="100" />
        <use id="cloud-4" href="#cloud-04-def" x={-180} y={150} width={180} height={55} data-width="180" />
        <use id="cloud-5" href="#cloud-05-def" x={-70} y={80} width={70} height={35} data-width="70" />
        <use id="cloud-6" href="#cloud-06-def" x={-120} y={280} width={120} height={50} data-width="120" />
        <use id="cloud-7" href="#cloud-07-def" x={-160} y={350} width={160} height={50} data-width="160" />
        <use id="cloud-8" href="#cloud-08-def" x={-130} y={420} width={130} height={55} data-width="130" />
      </svg>
    </div>
  );
};

export default SVGClouds;
