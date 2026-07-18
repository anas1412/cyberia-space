import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function extractMentions(text: string): string[] {
  const matches = text.match(/@[\w]+/g) || [];
  return [...new Set(matches)];
}

// Subscribe to live messages in a room (from join time only)
export const subscribe = query({
  args: { roomId: v.id("rooms"), since: v.optional(v.number()) },
  handler: async (ctx, { roomId, since }) => {
    let q = ctx.db
      .query("messages")
      .withIndex("by_room_time", (q) => q.eq("roomId", roomId));
    if (since) q = q.filter((q) => q.gt(q.field("timestamp"), since));
    return await q.order("asc").take(200);
  },
});

// Send a message to a room
export const send = mutation({
  args: {
    roomId: v.id("rooms"),
    userId: v.id("users"),
    text: v.string(),
  },
  handler: async (ctx, { roomId, userId, text }) => {
    if (!text.trim() || text.length > 1000) throw new Error("Invalid message");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const room = await ctx.db.get(roomId);
    if (!room) throw new Error("Room not found");

    const mentions = extractMentions(text);
    const now = Date.now();

    const msgId = await ctx.db.insert("messages", {
      roomId,
      userId,
      handle: user.handle,
      avatarColor: user.avatarColor,
      text: text.trim(),
      timestamp: now,
      expiresAt: now + TTL_MS,
      mentions,
    });

    // Notify private room owner if they are not present
    if (room.type === "hidden" && room.ownerId !== userId) {
      const ownerPresence = await ctx.db
        .query("presence")
        .withIndex("by_user_room", (q) =>
          q.eq("userId", room.ownerId).eq("roomId", roomId)
        )
        .first();
      const isStale = !ownerPresence || ownerPresence.lastPing < Date.now() - 60000;
      if (isStale) {
        await ctx.db.insert("notifications", {
          userId: room.ownerId,
          type: "room_activity",
          fromUserId: userId,
          fromHandle: user.handle,
          roomId,
          text: text.slice(0, 80),
          read: false,
          timestamp: now,
            expiresAt: now + 90 * 24 * 60 * 60 * 1000,
        });
      }
    }

    return msgId;
  },
});

// Send a message as a guest
export const sendAsGuest = mutation({
  args: {
    roomId: v.id("rooms"),
    handle: v.string(),
    avatarColor: v.string(),
    text: v.string(),
  },
  handler: async (ctx, { roomId, handle, avatarColor, text }) => {
    if (!text.trim() || text.length > 1000) throw new Error("Invalid message");
    const now = Date.now();
    return await ctx.db.insert("messages", {
      roomId,
      userId: "guest" as any,
      handle,
      avatarColor,
      text: text.trim(),
      timestamp: now,
      expiresAt: now + TTL_MS,
      mentions: extractMentions(text),
    });
  },
});

// Cleanup job — delete expired messages (run every hour via cron)
export const cleanupExpired = internalMutation({
  handler: async (ctx) => {
    const expired = await ctx.db
      .query("messages")
      .withIndex("by_expires", (q) => q.lt("expiresAt", Date.now()))
      .take(500);
    for (const msg of expired) await ctx.db.delete(msg._id);
    return { deleted: expired.length };
  },
});
