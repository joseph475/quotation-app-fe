/**
 * Browser Fingerprinting Utility
 * 
 * Generates a unique fingerprint for device identification and security monitoring
 */

/**
 * Detect available fonts by testing canvas rendering
 */
function detectFonts() {
  const testFonts = [
    'Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Verdana',
    'Georgia', 'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS',
    'Trebuchet MS', 'Arial Black', 'Impact', 'Tahoma', 'Calibri',
    'Cambria', 'Consolas', 'Monaco', 'Lucida Console', 'System'
  ];
  
  const availableFonts = [];
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  // Test string
  const testString = 'mmmmmmmmmmlli';
  
  // Baseline measurements with default font
  context.font = '72px monospace';
  const baselineWidth = context.measureText(testString).width;
  
  testFonts.forEach(font => {
    context.font = `72px ${font}, monospace`;
    const width = context.measureText(testString).width;
    
    if (width !== baselineWidth) {
      availableFonts.push(font);
    }
  });
  
  return availableFonts.join(',');
}

/**
 * Generate canvas fingerprint
 */
function generateCanvasFingerprint() {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = 200;
    canvas.height = 50;
    
    // Draw text with various properties
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    
    ctx.fillStyle = '#069';
    ctx.fillText('Browser fingerprint 🔒', 2, 15);
    
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Security check', 4, 35);
    
    // Draw some shapes
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgb(255,0,255)';
    ctx.beginPath();
    ctx.arc(50, 25, 20, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();
    
    return canvas.toDataURL();
  } catch (e) {
    return 'canvas_error';
  }
}

/**
 * Get WebGL information
 */
function getWebGLInfo() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
      return {
        vendor: 'no_webgl',
        renderer: 'no_webgl'
      };
    }
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    
    return {
      vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'unknown',
      renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown'
    };
  } catch (e) {
    return {
      vendor: 'webgl_error',
      renderer: 'webgl_error'
    };
  }
}

/**
 * Get audio context fingerprint
 */
function getAudioFingerprint() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return 'no_audio_context';
    
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const analyser = context.createAnalyser();
    const gain = context.createGain();
    const scriptProcessor = context.createScriptProcessor(4096, 1, 1);
    
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(10000, context.currentTime);
    
    gain.gain.setValueAtTime(0, context.currentTime);
    
    oscillator.connect(analyser);
    analyser.connect(scriptProcessor);
    scriptProcessor.connect(gain);
    gain.connect(context.destination);
    
    oscillator.start(0);
    
    const data = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(data);
    
    oscillator.stop();
    context.close();
    
    return data.slice(0, 30).join(',');
  } catch (e) {
    return 'audio_error';
  }
}

/**
 * Get device motion/orientation support
 */
function getMotionSupport() {
  return {
    deviceMotion: 'DeviceMotionEvent' in window,
    deviceOrientation: 'DeviceOrientationEvent' in window,
    absoluteOrientation: 'DeviceOrientationEvent' in window && 'absolute' in DeviceOrientationEvent.prototype
  };
}

/**
 * Get media devices information
 */
async function getMediaDevices() {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return { audioInputs: 0, videoInputs: 0, audioOutputs: 0 };
    }
    
    const devices = await navigator.mediaDevices.enumerateDevices();
    
    return {
      audioInputs: devices.filter(device => device.kind === 'audioinput').length,
      videoInputs: devices.filter(device => device.kind === 'videoinput').length,
      audioOutputs: devices.filter(device => device.kind === 'audiooutput').length
    };
  } catch (e) {
    return { audioInputs: 0, videoInputs: 0, audioOutputs: 0 };
  }
}

/**
 * Generate comprehensive browser fingerprint
 */
export async function generateFingerprint() {
  console.log('Starting fingerprint generation...');
  
  try {
    const webglInfo = getWebGLInfo();
    console.log('WebGL info:', webglInfo);
    
    const motionSupport = getMotionSupport();
    console.log('Motion support:', motionSupport);
    
    const mediaDevices = await getMediaDevices();
    console.log('Media devices:', mediaDevices);
    
    const fingerprint = {
      // Basic browser information
      userAgent: navigator.userAgent,
      language: navigator.language,
      languages: navigator.languages ? navigator.languages.join(',') : '',
      platform: navigator.platform,
      
      // Screen information
      screenResolution: `${screen.width}x${screen.height}`,
      screenColorDepth: screen.colorDepth,
      screenPixelDepth: screen.pixelDepth,
      availableScreenSize: `${screen.availWidth}x${screen.availHeight}`,
      
      // Timezone and locale
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),
      
      // Browser capabilities
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack,
      onlineStatus: navigator.onLine,
      
      // Hardware information
      hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
      deviceMemory: navigator.deviceMemory || 'unknown',
      maxTouchPoints: navigator.maxTouchPoints || 0,
      
      // Touch and input support
      touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      pointerEvents: 'PointerEvent' in window,
      
      // Canvas fingerprint
      canvasFingerprint: generateCanvasFingerprint(),
      
      // WebGL information
      webglVendor: webglInfo.vendor,
      webglRenderer: webglInfo.renderer,
      
      // Audio fingerprint
      audioFingerprint: getAudioFingerprint(),
      
      // Font detection
      availableFonts: detectFonts(),
      
      // Plugin information (limited in modern browsers)
      pluginCount: navigator.plugins ? navigator.plugins.length : 0,
      plugins: navigator.plugins ? Array.from(navigator.plugins).map(p => p.name).join(',') : '',
      
      // Storage support
      localStorage: !!window.localStorage,
      sessionStorage: !!window.sessionStorage,
      indexedDB: !!window.indexedDB,
      
      // Motion and orientation support
      motionSupport: motionSupport,
      
      // Media devices
      mediaDevices: mediaDevices,
      
      // Additional browser features
      webRTC: !!(navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia),
      webWorkers: !!window.Worker,
      serviceWorkers: 'serviceWorker' in navigator,
      
      // Battery API (deprecated but still available in some browsers)
      batteryAPI: 'getBattery' in navigator,
      
      // Timestamp
      timestamp: Date.now()
    };
    
    console.log('Fingerprint generated successfully:', Object.keys(fingerprint));
    return fingerprint;
  } catch (error) {
    console.error('Error generating fingerprint:', error);
    throw error;
  }
}

/**
 * Generate a hash from the fingerprint for easier comparison
 */
export function hashFingerprint(fingerprint) {
  const str = JSON.stringify(fingerprint);
  let hash = 0;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36);
}

/**
 * Compare two fingerprints and return similarity score
 */
export function compareFingerprints(fp1, fp2) {
  if (!fp1 || !fp2) return 0;
  
  const keys = Object.keys(fp1);
  let matches = 0;
  let total = 0;
  
  keys.forEach(key => {
    if (key === 'timestamp') return; // Skip timestamp
    
    total++;
    if (fp1[key] === fp2[key]) {
      matches++;
    }
  });
  
  return total > 0 ? matches / total : 0;
}

/**
 * Check if fingerprint indicates suspicious activity
 */
export function analyzeFingerprintSecurity(fingerprint, previousFingerprints = []) {
  const analysis = {
    riskScore: 0,
    flags: [],
    isNewDevice: true,
    similarityScores: []
  };
  
  // Check against previous fingerprints
  previousFingerprints.forEach(prevFp => {
    const similarity = compareFingerprints(fingerprint, prevFp);
    analysis.similarityScores.push(similarity);
    
    if (similarity > 0.8) {
      analysis.isNewDevice = false;
    }
  });
  
  // Risk factors
  if (fingerprint.userAgent.includes('HeadlessChrome')) {
    analysis.flags.push('headless_browser');
    analysis.riskScore += 0.5;
  }
  
  if (fingerprint.webglVendor === 'unknown' || fingerprint.webglRenderer === 'unknown') {
    analysis.flags.push('webgl_blocked');
    analysis.riskScore += 0.2;
  }
  
  if (fingerprint.pluginCount === 0) {
    analysis.flags.push('no_plugins');
    analysis.riskScore += 0.1;
  }
  
  if (fingerprint.availableFonts.split(',').length < 5) {
    analysis.flags.push('limited_fonts');
    analysis.riskScore += 0.1;
  }
  
  if (fingerprint.doNotTrack === '1') {
    analysis.flags.push('privacy_focused');
    analysis.riskScore += 0.1;
  }
  
  return analysis;
}

export default {
  generateFingerprint,
  hashFingerprint,
  compareFingerprints,
  analyzeFingerprintSecurity
};
