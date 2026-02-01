/**
 * Input sanitization utilities
 * Prevents XSS and injection attacks
 */

/**
 * Sanitize string input by removing potentially dangerous characters
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < and > to prevent HTML injection
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Sanitize phone number (Indian format)
 */
export function sanitizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // Handle Indian phone numbers (10 digits, optionally with +91 prefix)
  if (cleaned.length === 10) {
    return cleaned;
  } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return cleaned.substring(2);
  }

  return cleaned;
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized = {} as T;

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key as keyof T] = sanitizeString(value) as T[keyof T];
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key as keyof T] = sanitizeObject(value as Record<string, unknown>) as T[keyof T];
    } else if (Array.isArray(value)) {
      sanitized[key as keyof T] = value.map((item) =>
        typeof item === 'string'
          ? sanitizeString(item)
          : typeof item === 'object' && item !== null
            ? sanitizeObject(item as Record<string, unknown>)
            : item
      ) as T[keyof T];
    } else {
      sanitized[key as keyof T] = value as T[keyof T];
    }
  }

  return sanitized;
}

/**
 * Validate Indian phone number format
 */
export function isValidIndianPhone(phone: string): boolean {
  const cleaned = sanitizePhoneNumber(phone);
  return /^[6-9]\d{9}$/.test(cleaned); // Indian mobile numbers start with 6-9
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Mask phone number for display (show only last 4 digits)
 */
export function maskPhoneNumber(phone: string): string {
  const cleaned = sanitizePhoneNumber(phone);
  if (cleaned.length >= 4) {
    return `******${cleaned.slice(-4)}`;
  }
  return '******';
}

/**
 * Mask email for display
 */
export function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) {
    return '***@***';
  }

  const maskedLocal =
    localPart.length > 2
      ? `${localPart.slice(0, 2)}${'*'.repeat(localPart.length - 2)}`
      : `${'*'.repeat(localPart.length)}`;

  return `${maskedLocal}@${domain}`;
}
