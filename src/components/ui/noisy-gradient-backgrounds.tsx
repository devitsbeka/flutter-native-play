import { useRef, useEffect } from 'react';

// Noise component integrated into the background
function Noise({
  patternSize = 100,
  patternScaleX = 1,
  patternScaleY = 1,
  patternRefreshInterval = 1,
  patternAlpha = 50,
  intensity = 1,
}) {
  const grainRef = useRef<HTMLCanvasElement>(null);
  const canvasCssSizeRef = useRef({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = grainRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error("Failed to get 2D context for noise canvas.");
      return;
    }

    let frame = 0;
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = patternSize;
    patternCanvas.height = patternSize;

    const patternCtx = patternCanvas.getContext('2d');
    if (!patternCtx) {
      console.error("Failed to get 2D context for pattern sub-canvas.");
      return;
    }
    const patternData = patternCtx.createImageData(patternSize, patternSize);
    const patternPixelDataLength = patternSize * patternSize * 4;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      let newCssWidth = window.innerWidth;
      let newCssHeight = window.innerHeight;

      if (canvas.parentElement) {
        const parentRect = canvas.parentElement.getBoundingClientRect();
        newCssWidth = parentRect.width;
        newCssHeight = parentRect.height;
      }
      
      canvasCssSizeRef.current = { width: newCssWidth, height: newCssHeight };

      canvas.width = newCssWidth * dpr;
      canvas.height = newCssHeight * dpr;
      
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const updatePattern = () => {
      for (let i = 0; i < patternPixelDataLength; i += 4) {
        const value = Math.random() * 255 * intensity;
        patternData.data[i] = value;
        patternData.data[i + 1] = value;
        patternData.data[i + 2] = value;
        patternData.data[i + 3] = patternAlpha;
      }
      patternCtx.putImageData(patternData, 0, 0);
    };

    const drawGrain = () => {
      const { width: cssWidth, height: cssHeight } = canvasCssSizeRef.current;
      if (cssWidth === 0 || cssHeight === 0) return;

      ctx.clearRect(0, 0, cssWidth, cssHeight);

      ctx.save();
      
      const safePatternScaleX = Math.max(0.001, patternScaleX);
      const safePatternScaleY = Math.max(0.001, patternScaleY);
      ctx.scale(safePatternScaleX, safePatternScaleY);

      const fillPattern = ctx.createPattern(patternCanvas, 'repeat');
      if (fillPattern) {
        ctx.fillStyle = fillPattern;
        ctx.fillRect(0, 0, cssWidth / safePatternScaleX, cssHeight / safePatternScaleY);
      }
      
      ctx.restore();
    };

    let animationFrameId: number;
    const loop = () => {
      if (canvasCssSizeRef.current.width > 0 && canvasCssSizeRef.current.height > 0) {
        if (frame % patternRefreshInterval === 0) {
          updatePattern();
          drawGrain();
        }
      }
      frame++;
      animationFrameId = window.requestAnimationFrame(loop);
    };

    window.addEventListener('resize', resize);
    resize();
    if (patternRefreshInterval > 0) {
      loop();
    } else {
      updatePattern();
      drawGrain();
    }

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [patternSize, patternScaleX, patternScaleY, patternRefreshInterval, patternAlpha, intensity]);

  return (
    <canvas
      ref={grainRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ mixBlendMode: 'overlay' }}
    />
  );
}

interface GradientColor {
  color: string;
  stop: string;
}

interface GradientBackgroundProps {
  gradientType?: 'radial-gradient' | 'linear-gradient' | 'conic-gradient';
  gradientSize?: string;
  gradientOrigin?: 'bottom-middle' | 'bottom-left' | 'bottom-right' | 'top-middle' | 'top-left' | 'top-right' | 'left-middle' | 'right-middle' | 'center';
  colors?: GradientColor[];
  enableNoise?: boolean;
  noisePatternSize?: number;
  noisePatternScaleX?: number;
  noisePatternScaleY?: number;
  noisePatternRefreshInterval?: number;
  noisePatternAlpha?: number;
  noiseIntensity?: number;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  customGradient?: string | null;
}

const GRADIENT_POSITIONS: Record<string, string> = {
  'bottom-middle': '50% 101%',
  'bottom-left': '0% 101%',
  'bottom-right': '100% 101%',
  'top-middle': '50% -1%',
  'top-left': '0% -1%',
  'top-right': '100% -1%',
  'left-middle': '-1% 50%',
  'right-middle': '101% 50%',
  'center': '50% 50%',
};

/**
 * The room-card gradient as a plain CSS value.
 *
 * The component below is the right thing for a room card, which wants the
 * grain. It is the wrong thing behind a question image, because the noise is
 * a canvas redrawn every frame, and there is one of these on screen for the
 * length of every round. This returns the same gradient as a string so a
 * caller can put it on a div and pay nothing for it.
 */
export function roomGradientCss(
  colors: GradientColor[],
  origin: keyof typeof GRADIENT_POSITIONS = 'bottom-middle',
  size = '125% 125%',
): string {
  const position = GRADIENT_POSITIONS[origin] || GRADIENT_POSITIONS['bottom-middle'];
  const stops = colors.map(({ color, stop }) => `${color} ${stop}`).join(',');
  return `radial-gradient(${size} at ${position},${stops})`;
}

function GradientBackground({
  gradientType = 'radial-gradient',
  gradientSize = '125% 125%',
  gradientOrigin = 'bottom-middle',
  colors = [
    { color: 'rgba(245,87,2,1)', stop: '10.5%' },
    { color: 'rgba(245,120,2,1)', stop: '16%' },
    { color: 'rgba(245,140,2,1)', stop: '17.5%' },
    { color: 'rgba(245,170,100,1)', stop: '25%' },
    { color: 'rgba(238,174,202,1)', stop: '40%' },
    { color: 'rgba(202,179,214,1)', stop: '65%' },
    { color: 'rgba(148,201,233,1)', stop: '100%' }
  ],
  enableNoise = true,
  noisePatternSize = 100,
  noisePatternScaleX = 1,
  noisePatternScaleY = 1,
  noisePatternRefreshInterval = 1,
  noisePatternAlpha = 50,
  noiseIntensity = 1,
  className = '',
  style = {},
  children,
  customGradient = null
}: GradientBackgroundProps) {
  const generateGradient = () => {
    if (customGradient) return customGradient;
    
    const position = GRADIENT_POSITIONS[gradientOrigin] || GRADIENT_POSITIONS['bottom-middle'];
    const colorStops = colors.map(({ color, stop }) => `${color} ${stop}`).join(',');
    
    if (gradientType === 'radial-gradient') {
      return `radial-gradient(${gradientSize} at ${position},${colorStops})`;
    } else if (gradientType === 'linear-gradient') {
      const angleMap: Record<string, string> = {
        'bottom-middle': '0deg',
        'bottom-left': '45deg',
        'bottom-right': '315deg',
        'top-middle': '180deg',
        'top-left': '135deg',
        'top-right': '225deg',
        'left-middle': '90deg',
        'right-middle': '270deg',
        'center': '0deg'
      };
      const angle = angleMap[gradientOrigin] || angleMap['bottom-middle'];
      return `linear-gradient(${angle},${colorStops})`;
    } else if (gradientType === 'conic-gradient') {
      return `conic-gradient(from 0deg at ${position},${colorStops})`;
    }
    
    return `${gradientType}(${colorStops})`;
  };

  const gradientStyle = {
    background: generateGradient(),
    ...style
  };

  return (
    <div className={`relative overflow-hidden ${className}`} style={gradientStyle}>
      {enableNoise && (
        <Noise
          patternSize={noisePatternSize}
          patternScaleX={noisePatternScaleX}
          patternScaleY={noisePatternScaleY}
          patternRefreshInterval={noisePatternRefreshInterval}
          patternAlpha={noisePatternAlpha}
          intensity={noiseIntensity}
        />
      )}
      {children}
    </div>
  );
}

// Preset gradient configurations
export const ROOM_GRADIENT_PRESETS = [
  { // Sunset Glow
    colors: [
      { color: 'rgba(245,87,2,1)', stop: '10.5%' },
      { color: 'rgba(245,120,2,1)', stop: '16%' },
      { color: 'rgba(245,140,2,1)', stop: '17.5%' },
      { color: 'rgba(245,170,100,1)', stop: '25%' },
      { color: 'rgba(238,174,202,1)', stop: '40%' },
      { color: 'rgba(202,179,214,1)', stop: '65%' },
      { color: 'rgba(148,201,233,1)', stop: '100%' }
    ]
  },
  { // Oceanic Depth
    colors: [
      { color: 'rgba(0,50,80,1)', stop: '0%' },
      { color: 'rgba(0,100,130,1)', stop: '25%' },
      { color: 'rgba(0,150,180,1)', stop: '50%' },
      { color: 'rgba(100,200,220,1)', stop: '75%' },
      { color: 'rgba(180,230,240,1)', stop: '100%' }
    ]
  },
  { // Forest Canopy
    colors: [
      { color: 'rgba(20,60,30,1)', stop: '0%' },
      { color: 'rgba(40,100,50,1)', stop: '30%' },
      { color: 'rgba(80,150,80,1)', stop: '60%' },
      { color: 'rgba(150,200,120,1)', stop: '85%' },
      { color: 'rgba(200,230,180,1)', stop: '100%' }
    ]
  },
  { // Cosmic Nebula
    colors: [
      { color: 'rgba(10,0,30,1)', stop: '0%' },
      { color: 'rgba(50,20,80,1)', stop: '25%' },
      { color: 'rgba(100,50,150,1)', stop: '50%' },
      { color: 'rgba(180,100,200,1)', stop: '75%' },
      { color: 'rgba(220,180,255,1)', stop: '100%' }
    ]
  },
  { // Desert Dawn
    colors: [
      { color: 'rgba(80,40,20,1)', stop: '0%' },
      { color: 'rgba(180,100,50,1)', stop: '30%' },
      { color: 'rgba(240,180,100,1)', stop: '60%' },
      { color: 'rgba(255,220,180,1)', stop: '85%' },
      { color: 'rgba(255,245,230,1)', stop: '100%' }
    ]
  },
  { // Fiery Embers
    colors: [
      { color: 'rgba(30,0,0,1)', stop: '0%' },
      { color: 'rgba(100,20,0,1)', stop: '25%' },
      { color: 'rgba(200,60,20,1)', stop: '50%' },
      { color: 'rgba(255,120,50,1)', stop: '75%' },
      { color: 'rgba(255,200,100,1)', stop: '100%' }
    ]
  },
  { // Lavender Dreams
    colors: [
      { color: 'rgba(60,40,80,1)', stop: '0%' },
      { color: 'rgba(120,80,140,1)', stop: '30%' },
      { color: 'rgba(180,140,200,1)', stop: '60%' },
      { color: 'rgba(220,200,240,1)', stop: '85%' },
      { color: 'rgba(250,240,255,1)', stop: '100%' }
    ]
  },
  { // Arctic Haze
    colors: [
      { color: 'rgba(40,60,80,1)', stop: '0%' },
      { color: 'rgba(80,120,150,1)', stop: '30%' },
      { color: 'rgba(150,180,200,1)', stop: '60%' },
      { color: 'rgba(200,220,235,1)', stop: '85%' },
      { color: 'rgba(240,248,255,1)', stop: '100%' }
    ]
  },
  { // Retro Wave
    colors: [
      { color: 'rgba(20,0,40,1)', stop: '0%' },
      { color: 'rgba(80,20,100,1)', stop: '25%' },
      { color: 'rgba(200,50,150,1)', stop: '50%' },
      { color: 'rgba(255,100,150,1)', stop: '75%' },
      { color: 'rgba(255,180,200,1)', stop: '100%' }
    ]
  }
];

export { GradientBackground };
