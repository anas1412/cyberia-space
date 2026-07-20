import { mutation, query, internalMutation, internalQuery, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const AVATAR_COLORS = [
  "#1A6BFF","#0D4ED8","#2DD4BF","#0891B2",
  "#6366F1","#7C3AED","#0EA5E9","#06B6D4",
];

// Internal mutation — creates or finds user (called from verifyOtp action)
export const authenticateUser = internalMutation({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .first();

    if (user) {
      await ctx.db.patch(user._id, { lastSeen: Date.now() });
      return { userId: user._id, isNewUser: false };
    }

    const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    const userId = await ctx.db.insert("users", {
      phone,
      handle: `user_${Math.random().toString(36).slice(2, 8)}`,
      avatarColor: color,
      createdAt: Date.now(),
      lastSeen: Date.now(),
    });
    return { userId, isNewUser: true };
  },
});

// Internal: invalidate old OTP sessions and create new one
export const prepareOtpSession = internalMutation({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    const existing = await ctx.db
      .query("otpSessions")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .collect();
    for (const s of existing) await ctx.db.delete(s._id);

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await ctx.db.insert("otpSessions", {
      phone,
      code,
      expiresAt: Date.now() + 10 * 60 * 1000,
      verified: false,
    });
    return { code };
  },
});

// Send OTP — action
export const sendOtp = action({
  args: { phone: v.string(), bypass: v.boolean() },
  handler: async (ctx, { phone, bypass }): Promise<{ code?: string }> => {
    const { code } = await ctx.runMutation(internal.auth.prepareOtpSession, { phone });
    if (bypass) {
      return { code };
    }
    await ctx.runAction(internal.twilio.sendVerification, { phone });
    return {};
  },
});

// Verify OTP — action
export const verifyOtp = action({
  args: { phone: v.string(), code: v.string(), platform: v.string(), bypass: v.boolean() },
  handler: async (ctx, { phone, code, platform, bypass }) => {
    const pending = await ctx.runQuery(internal.auth.findPendingSession, { phone });
    if (!pending) throw new Error("No OTP found. Request a new one.");
    if (pending.expiresAt < Date.now()) throw new Error("OTP expired.");

    if (bypass) {
      if (pending.code !== code) throw new Error("Invalid code.");
    } else {
      const result = await ctx.runAction(internal.twilio.verifyCode, { phone, code });
      if (!result.approved) throw new Error("Invalid code.");
    }

    await ctx.runMutation(internal.auth.consumePendingSession, { sessionId: pending._id });
    const { userId, isNewUser } = await ctx.runMutation(internal.auth.authenticateUser, { phone }) as { userId: any; isNewUser: boolean };

    const token = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 256).toString(16).padStart(2, "0"),
    ).join("");

    await ctx.runMutation(internal.auth.createSession, { userId, token, platform });

    return { token, userId, isNewUser };
  },
});

// Internal: find pending OTP session
export const findPendingSession = internalQuery({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    return await ctx.db
      .query("otpSessions")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .first();
  },
});

// Internal: delete consumed OTP session
export const consumePendingSession = internalMutation({
  args: { sessionId: v.id("otpSessions") },
  handler: async (ctx, { sessionId }) => {
    await ctx.db.delete(sessionId);
  },
});

// Internal: create auth session
export const createSession = internalMutation({
  args: { userId: v.id("users"), token: v.string(), platform: v.string() },
  handler: async (ctx, { userId, token, platform }) => {
    await ctx.db.insert("sessions", {
      userId,
      token,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      platform,
    });
  },
});

// Validate session token
export const validateSession = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();
    if (!session || session.expiresAt < Date.now()) return null;
    const user = await ctx.db.get(session.userId);
    return user;
  },
});

// Set handle + avatar color (onboarding step)
export const setHandle = mutation({
  args: { userId: v.id("users"), handle: v.string(), avatarColor: v.string() },
  handler: async (ctx, { userId, handle, avatarColor }) => {
    const clean = handle.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase().slice(0, 20);
    if (clean.length < 2) throw new Error("Handle too short.");

    const existing = await ctx.db
      .query("users")
      .withIndex("by_handle", (q) => q.eq("handle", clean))
      .first();
    if (existing && existing._id !== userId) throw new Error("Handle taken.");

    await ctx.db.patch(userId, { handle: clean, avatarColor });
    return { handle: clean };
  },
});

// Update push token
export const updatePushToken = mutation({
  args: { userId: v.id("users"), token: v.string(), type: v.string() },
  handler: async (ctx, { userId, token, type }) => {
    if (type === "expo") {
      await ctx.db.patch(userId, { pushToken: token });
    } else {
      await ctx.db.patch(userId, { webPushSubscription: token });
    }
  },
});

// Logout
export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();
    if (session) await ctx.db.delete(session._id);
    return { success: true };
  },
});

// Cleanup orphaned guest users (run by cron every hour)
export const cleanupGuestUsers = internalMutation({
  handler: async (ctx) => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const oldGuests = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("isGuest"), true))
      .filter((q) => q.lt(q.field("createdAt"), cutoff))
      .collect();

    for (const guest of oldGuests) {
      // Delete their sessions
      const sessions = await ctx.db
        .query("sessions")
        .withIndex("by_user", (q) => q.eq("userId", guest._id))
        .collect();
      for (const s of sessions) await ctx.db.delete(s._id);

      // Delete their presence
      const presence = await ctx.db
        .query("presence")
        .withIndex("by_user", (q) => q.eq("userId", guest._id))
        .collect();
      for (const p of presence) {
        const room = await ctx.db.get(p.roomId);
        if (room) {
          await ctx.db.patch(p.roomId, { memberCount: Math.max(0, room.memberCount - 1) });
        }
        await ctx.db.delete(p._id);
      }

      // Delete the user
      await ctx.db.delete(guest._id);
    }
    return { deleted: oldGuests.length };
  },
});
