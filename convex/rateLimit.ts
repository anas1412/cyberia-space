import type { GenericMutationCtx } from "convex/server";
import type { DataModel } from "./_generated/dataModel";

interface RateLimitConfig {
  /** Unique key for this rate limit (e.g. "otp:+15551234567") */
  key: string;
  /** Max requests allowed in the window */
  maxCount: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

/**
 * Check and increment a rate limit. Throws if exceeded.
 * Uses a single doc per key, atomically bumped via ctx.db.patch.
 */
export async function checkRateLimit(
  ctx: GenericMutationCtx<DataModel>,
  config: RateLimitConfig
): Promise<void> {
  const now = Date.now();
  const existing = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q) => q.eq("key", config.key))
    .first();

  if (!existing) {
    // First request in this window
    await ctx.db.insert("rateLimits", {
      key: config.key,
      count: 1,
      windowStart: now,
    });
    return;
  }

  const elapsed = now - existing.windowStart;

  if (elapsed >= config.windowMs) {
    // Window expired — reset
    await ctx.db.patch(existing._id, {
      count: 1,
      windowStart: now,
    });
    return;
  }

  if (existing.count >= config.maxCount) {
    const waitSec = Math.ceil((config.windowMs - elapsed) / 1000);
    throw new Error(`Rate limit exceeded. Try again in ${waitSec}s.`);
  }

  // Within window and under limit — increment
  await ctx.db.patch(existing._id, { count: existing.count + 1 });
}
