import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => ctx.db.get(userId),
});

export const getByHandle = query({
  args: { handle: v.string() },
  handler: async (ctx, { handle }) =>
    ctx.db.query("users").withIndex("by_handle", (q) => q.eq("handle", handle)).first(),
});

export const updateProfile = mutation({
  args: {
    userId: v.id("users"),
    handle: v.optional(v.string()),
    avatarColor: v.optional(v.string()),
  },
  handler: async (ctx, { userId, handle, avatarColor }) => {
    const patch: any = {};
    if (handle) {
      const clean = handle.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase().slice(0, 20);
      if (clean.length < 2) throw new Error("Handle too short");
      const existing = await ctx.db
        .query("users")
        .withIndex("by_handle", (q) => q.eq("handle", clean))
        .first();
      if (existing && existing._id !== userId) throw new Error("Handle taken");
      patch.handle = clean;
    }
    if (avatarColor) patch.avatarColor = avatarColor;
    await ctx.db.patch(userId, patch);
    return { success: true };
  },
});

export const updateLastSeen = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await ctx.db.patch(userId, { lastSeen: Date.now() });
  },
});
