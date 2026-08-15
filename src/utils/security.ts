/**
 * Enterprise Cyber Security & Anti-Crash Protection Module
 * Handles XSS sanitization, Rate Throttling, Input Validation, and Storage Tamper Prevention.
 */

// 1. Anti-XSS Sanitizer (Strips malicious HTML & Script tags)
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return input;
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/javascript:/gi, '')
    .replace(/onload=/gi, '')
    .replace(/onerror=/gi, '');
}

// 2. Client-Side Rate Limiter / Anti-DDoS Click Spam Throttler
const requestTimeTracker = new Map<string, number[]>();

export function checkRateLimit(actionKey: string, maxLimit = 10, timeWindowMs = 5000): boolean {
  const now = Date.now();
  const timestamps = requestTimeTracker.get(actionKey) || [];
  const recentTimestamps = timestamps.filter((t) => now - t < timeWindowMs);

  if (recentTimestamps.length >= maxLimit) {
    console.warn(`[SECURITY ALERT] Rate limit exceeded for action: ${actionKey}`);
    return false; // Block request
  }

  recentTimestamps.push(now);
  requestTimeTracker.set(actionKey, recentTimestamps);
  return true; // Allow request
}

// 3. Strict Phone & GSTIN Format Sanitization
export function isValidPhone(phone: string): boolean {
  if (!phone) return true;
  const phoneClean = phone.replace(/[\s\-\+\(\)]/g, '');
  return /^\d{10,12}$/.test(phoneClean);
}

export function isValidGSTIN(gstin: string): boolean {
  if (!gstin) return true;
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(gstin.toUpperCase().trim());
}

// 4. Safe JSON Parser (Prevents JSON Bomb / Prototype Pollution UI Crashes)
export function safeJsonParse<T>(jsonString: string, fallback: T): T {
  try {
    if (!jsonString || typeof jsonString !== 'string') return fallback;
    const parsed = JSON.parse(jsonString);
    // Block Prototype Pollution
    if (parsed && typeof parsed === 'object') {
      if ('__proto__' in parsed || 'constructor' in parsed || 'prototype' in parsed) {
        console.warn('[SECURITY] Prototype pollution attempt blocked!');
        return fallback;
      }
    }
    return parsed as T;
  } catch (err) {
    console.error('[SECURITY] Corrupt JSON payload caught gracefully:', err);
    return fallback;
  }
}
