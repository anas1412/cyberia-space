import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const AVATAR_COLORS = [
  "#1A6BFF","#0D4ED8","#2DD4BF","#0891B2",
  "#6366F1","#7C3AED","#0EA5E9","#06B6D4",
];

// Send OTP — in production replace with Twilio Verify
export const sendOtp = mutation({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 min

    // Invalidate old sessions
    const existing = await ctx.db
      .query("otpSessions")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .collect();
    for (const s of existing) await ctx.db.delete(s._id);

    await ctx.db.insert("otpSessions", {
      phone,
      code, // In production: hash this and send via Twilio
      expiresAt,
      verified: false,
    });

    await ctx.scheduler.runAfter(0, internal.twilio.sendSms, { phone, code });
    return { success: true };
  },
});

// Verify OTP and create/login user
export const verifyOtp = mutation({
  args: { phone: v.string(), code: v.string(), platform: v.string() },
  handler: async (ctx, { phone, code, platform }) => {
    const session = await ctx.db
      .query("otpSessions")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .first();

    if (!session) return { success: false, error: "No OTP found. Request a new one." };
    if (session.expiresAt < Date.now()) return { success: false, error: "OTP expired." };
    if (session.code !== code) return { success: false, error: "Invalid code." };

    await ctx.db.patch(session._id, { verified: true });

    // Find or create user
    let user = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .first();

    let isNewUser = false;
    if (!user) {
      isNewUser = true;
      const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
      const userId = await ctx.db.insert("users", {
        phone,
        handle: `user_${Math.random().toString(36).slice(2, 8)}`,
        avatarColor: color,
        createdAt: Date.now(),
        lastSeen: Date.now(),
      });
      user = await ctx.db.get(userId);
    } else {
      await ctx.db.patch(user._id, { lastSeen: Date.now() });
    }

    // Create auth session (30 day expiry)
    const token = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 256).toString(16).padStart(2, "0"),
    ).join("");

    await ctx.db.insert("sessions", {
      userId: user!._id,
      token,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      platform,
    });

    return { success: true, token, userId: user!._id, isNewUser };
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
    if (clean.length < 2) return { success: false, error: "Handle too short." };

    const existing = await ctx.db
      .query("users")
      .withIndex("by_handle", (q) => q.eq("handle", clean))
      .first();
    if (existing && existing._id !== userId) return { success: false, error: "Handle taken." };

    await ctx.db.patch(userId, { handle: clean, avatarColor });
    return { success: true, handle: clean };
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
