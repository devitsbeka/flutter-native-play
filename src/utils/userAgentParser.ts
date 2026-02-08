/**
 * Lightweight user-agent parser - no external dependencies
 * Extracts browser, OS, and device type from navigator
 */

export interface ParsedUserAgent {
  browser: string;
  os: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
}

export function parseUserAgent(): ParsedUserAgent {
  const ua = navigator.userAgent;

  return {
    browser: detectBrowser(ua),
    os: detectOS(ua),
    deviceType: detectDeviceType(ua),
  };
}

function detectBrowser(ua: string): string {
  // Order matters — more specific checks first
  if (ua.includes('SamsungBrowser')) return 'Samsung Browser';
  if (ua.includes('UCBrowser') || ua.includes('UCWEB')) return 'UC Browser';
  if (ua.includes('OPR') || ua.includes('Opera')) return 'Opera';
  if (ua.includes('Edg/') || ua.includes('Edge/')) return 'Edge';
  if (ua.includes('Brave')) return 'Brave';
  if (ua.includes('Vivaldi')) return 'Vivaldi';
  if (ua.includes('YaBrowser')) return 'Yandex';
  if (ua.includes('Firefox') || ua.includes('FxiOS')) return 'Firefox';
  if (ua.includes('CriOS')) return 'Chrome'; // Chrome on iOS
  if (ua.includes('Chrome') && !ua.includes('Chromium')) return 'Chrome';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('MSIE') || ua.includes('Trident/')) return 'IE';
  return 'Other';
}

function detectOS(ua: string): string {
  if (/iPad|iPhone|iPod/.test(ua)) return 'iOS';
  if (/Android/.test(ua)) return 'Android';
  if (/Windows NT/.test(ua)) return 'Windows';
  if (/Mac OS X/.test(ua)) return 'macOS';
  if (/CrOS/.test(ua)) return 'Chrome OS';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Other';
}

function detectDeviceType(ua: string): 'mobile' | 'tablet' | 'desktop' {
  // Check for tablet patterns first
  if (/iPad/.test(ua)) return 'tablet';
  if (/Android/.test(ua) && !/Mobile/.test(ua)) return 'tablet';
  
  // Check for mobile
  if (/Mobile|iPhone|iPod|Android.*Mobile|webOS|BlackBerry|Opera Mini|IEMobile/.test(ua)) {
    return 'mobile';
  }
  
  // Touch-capable with small screen = likely mobile
  if ('ontouchstart' in window && window.innerWidth < 768) {
    return 'mobile';
  }
  
  // Touch-capable with medium screen = likely tablet
  if ('ontouchstart' in window && window.innerWidth < 1024) {
    return 'tablet';
  }

  return 'desktop';
}
