// Hardware & Device Identification Utility for License Binding

const DEVICE_ID_KEY = 'reduccion_device_hw_id';
const LICENSE_VALIDATED_KEY = 'reduccion_license_validated';
const BOUND_LICENSE_CODE_KEY = 'reduccion_bound_license_code';

/**
 * Returns or generates a persistent unique hardware/device identifier
 * stored in localStorage and derived from the device fingerprint.
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') {
    return 'SRV-00000000';
  }

  try {
    const existingId = localStorage.getItem(DEVICE_ID_KEY);
    if (existingId && existingId.startsWith('DEV-')) {
      return existingId;
    }

    // Build hardware and browser fingerprint components
    const screenInfo = window.screen
      ? `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`
      : 'screen-na';
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'tz-na';
    const cores = navigator.hardwareConcurrency || 4;
    const lang = navigator.language || 'es';
    const ua = navigator.userAgent || 'ua-na';

    const fingerprintRaw = `${screenInfo}|${tz}|${cores}|${lang}|${ua}`;

    // Generate hash of hardware fingerprint
    let hash = 0;
    for (let i = 0; i < fingerprintRaw.length; i++) {
      hash = ((hash << 5) - hash) + fingerprintRaw.charCodeAt(i);
      hash |= 0;
    }
    const hashHex = Math.abs(hash).toString(16).padStart(8, '0').toUpperCase();

    // Unique cryptographic or random token
    let randomToken = '';
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      randomToken = crypto.randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase();
    } else {
      randomToken = Math.random().toString(36).substring(2, 14).toUpperCase();
    }

    const newDeviceId = `DEV-${hashHex}-${randomToken}`;
    localStorage.setItem(DEVICE_ID_KEY, newDeviceId);
    return newDeviceId;
  } catch (err) {
    console.warn('Could not access localStorage for device ID, using session fallback:', err);
    return 'DEV-FALLBACK-' + Math.random().toString(36).substring(2, 10).toUpperCase();
  }
}

/**
 * Checks if the current computer/device has a validated license registered locally.
 */
export function isDeviceLicenseRegistered(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(LICENSE_VALIDATED_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Marks the current device as successfully registered with a validated license.
 */
export function markDeviceLicenseRegistered(code?: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LICENSE_VALIDATED_KEY, 'true');
    if (code) {
      localStorage.setItem(BOUND_LICENSE_CODE_KEY, code.toUpperCase());
    }
    localStorage.setItem('reduccion_bound_device_id', getOrCreateDeviceId());
  } catch (err) {
    console.warn('Could not store license validation in localStorage:', err);
  }
}

/**
 * Summarizes the device specifications for auditing/binding in Firestore.
 */
export function getDeviceSummary(): Record<string, any> {
  if (typeof window === 'undefined') return {};
  return {
    deviceId: getOrCreateDeviceId(),
    platform: navigator.platform || 'Unknown',
    language: navigator.language || 'es',
    screenResolution: window.screen ? `${window.screen.width}x${window.screen.height}` : 'unknown',
    registeredAt: Date.now(),
  };
}
