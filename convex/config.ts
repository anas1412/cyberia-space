// ── All tunable constants in one place ──
// Change these values here — they propagate everywhere automatically.

// ── Rate Limits ──
// How many times an action can be performed within a time window before being blocked.
export const RATE_LIMITS = {
  /** Max OTP (login code) requests per phone number: 3 per 10 minutes */
  otp: { maxCount: 3, windowMs: 10 * 60 * 1000 },
  /** Max messages one user can send in one room: 30 per minute */
  messages: { maxCount: 30, windowMs: 60 * 1000 },
  /** Max guest accounts per room: 3 per 10 minutes */
  guests: { maxCount: 3, windowMs: 10 * 60 * 1000 },
} as const;

// ── Time-to-live durations ──
// How long data stays in the database before being deleted by cleanup jobs.
export const TTL = {
  /** Room messages: deleted after 24 hours */
  message: 24 * 60 * 60 * 1000,
  /** Direct messages: deleted after 24 hours */
  dm: 24 * 60 * 60 * 1000,
  /** Notifications: deleted after 90 days */
  notification: 90 * 24 * 60 * 60 * 1000,
  /** Login code (OTP): expires after 10 minutes */
  otp: 10 * 60 * 1000,
  /** Logged-in session: expires after 30 days */
  session: 30 * 24 * 60 * 60 * 1000,
  /** Guest session: expires after 24 hours */
  guestSession: 24 * 60 * 60 * 1000,
  /** Guests older than 24 hours are deleted by cleanup */
  guestCleanup: 24 * 60 * 60 * 1000,
} as const;

// ── Presence ──
// Controls when users are considered "away" or "offline".
export const PRESENCE = {
  /** User shown as "away" after 60 seconds without a ping */
  staleThreshold: 60 * 1000,
  /** User's presence entry deleted after 90 seconds without a ping */
  pingStaleThreshold: 90 * 1000,
} as const;

// ── Sanitization ──
// Limits on what users can type into messages.
export const SANITIZE = {
  /** Max characters per message: 1000 */
  maxLength: 1000,
  /** Max @mentions per message: 10 */
  maxMentions: 10,
} as const;

// ── Rooms ──
// Limits on room discovery and listing.
export const ROOMS = {
  /** Max rooms returned in search / discover: 100 */
  maxDiscoverable: 100,
} as const;
