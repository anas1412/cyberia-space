import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// List public rooms
export const listPublic = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("rooms")
      .withIndex("by_type", (q) => q.eq("type", "public"))
      .order("desc")
      .take(50);
  },
});

// Get a single room
export const get = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    return await ctx.db.get(roomId);
  },
});

// Create a public room
export const createPublic = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    topic: v.optional(v.string()),
  },
  handler: async (ctx, { userId, name, topic }) => {
    const roomId = await ctx.db.insert("rooms", {
      name: name.slice(0, 40),
      topic: topic?.slice(0, 100),
      ownerId: userId,
      type: "public",
      memberCount: 0,
      createdAt: Date.now(),
    });
    return roomId;
  },
});

// Create private room (one per user enforced)
export const createPrivate = mutation({
  args: { userId: v.id("users"), name: v.string() },
  handler: async (ctx, { userId, name }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    if (user.privateRoomId) return { error: "You already have a private room.", roomId: user.privateRoomId };

    const roomId = await ctx.db.insert("rooms", {
      name: name.slice(0, 40),
      ownerId: userId,
      type: "private",
      memberCount: 0,
      createdAt: Date.now(),
    });

    await ctx.db.patch(userId, { privateRoomId: roomId });
    return { roomId };
  },
});

// Get live presence in a room
export const getPresence = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const staleThreshold = Date.now() - 60 * 1000; // 60s stale
    const presence = await ctx.db
      .query("presence")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .collect();

    const live = presence.filter((p) => p.lastPing > staleThreshold);
    const users = await Promise.all(
      live.map(async (p) => {
        const u = await ctx.db.get(p.userId);
        return u ? { userId: p.userId, handle: u.handle, avatarColor: u.avatarColor, joinedAt: p.joinedAt } : null;
      })
    );
    return users.filter(Boolean);
  },
});

// Join a room (set presence)
export const join = mutation({
  args: { userId: v.id("users"), roomId: v.id("rooms") },
  handler: async (ctx, { userId, roomId }) => {
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user_room", (q) => q.eq("userId", userId).eq("roomId", roomId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { lastPing: Date.now() });
    } else {
      await ctx.db.insert("presence", {
        userId,
        roomId,
        joinedAt: Date.now(),
        lastPing: Date.now(),
      });
      const room = await ctx.db.get(roomId);
      if (room) await ctx.db.patch(roomId, { memberCount: room.memberCount + 1 });

      // Notify everyone else currently in the room
      const user = await ctx.db.get(userId);
      if (user) {
        const now = Date.now();
        const staleThreshold = now - 60_000;
        const allPresence = await ctx.db
          .query("presence")
          .withIndex("by_room", (q) => q.eq("roomId", roomId))
          .collect();
        const live = allPresence.filter((p) => p.lastPing > staleThreshold && p.userId !== userId);
        for (const p of live) {
          await ctx.db.insert("notifications", {
            userId: p.userId,
            type: "join",
            fromUserId: userId,
            fromHandle: user.handle,
            roomId,
            text: `@${user.handle} joined`,
            read: false,
            timestamp: now,
            expiresAt: now + 90 * 24 * 60 * 60 * 1000,
          });
        }
      }
    }
    return { success: true };
  },
});

// Ping presence (call every 30s)
export const ping = mutation({
  args: { userId: v.id("users"), roomId: v.id("rooms") },
  handler: async (ctx, { userId, roomId }) => {
    const p = await ctx.db
      .query("presence")
      .withIndex("by_user_room", (q) => q.eq("userId", userId).eq("roomId", roomId))
      .first();
    if (p) await ctx.db.patch(p._id, { lastPing: Date.now() });
  },
});

// Leave a room
export const leave = mutation({
  args: { userId: v.id("users"), roomId: v.id("rooms") },
  handler: async (ctx, { userId, roomId }) => {
    const p = await ctx.db
      .query("presence")
      .withIndex("by_user_room", (q) => q.eq("userId", userId).eq("roomId", roomId))
      .first();
    if (p) {
      const user = await ctx.db.get(userId);

      // Notify everyone else still in the room
      if (user) {
        const now = Date.now();
        const staleThreshold = now - 60_000;
        const allPresence = await ctx.db
          .query("presence")
          .withIndex("by_room", (q) => q.eq("roomId", roomId))
          .collect();
        const live = allPresence.filter((p) => p.lastPing > staleThreshold && p.userId !== userId);
        for (const other of live) {
          await ctx.db.insert("notifications", {
            userId: other.userId,
            type: "leave",
            fromUserId: userId,
            fromHandle: user.handle,
            roomId,
            text: `@${user.handle} left`,
            read: false,
            timestamp: now,
            expiresAt: now + 90 * 24 * 60 * 60 * 1000,
          });
        }
      }

      await ctx.db.delete(p._id);
      const room = await ctx.db.get(roomId);
      if (room && room.memberCount > 0) {
        await ctx.db.patch(roomId, { memberCount: room.memberCount - 1 });
      }
    }
    return { success: true };
  },
});
