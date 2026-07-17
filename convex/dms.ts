import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

const TTL_MS = 24 * 60 * 60 * 1000;

function sortIds(a: Id<"users">, b: Id<"users">): [Id<"users">, Id<"users">] {
  return [a, b].sort() as [Id<"users">, Id<"users">];
}

// Get or create a DM conversation
export const getOrCreate = mutation({
  args: { userId: v.id("users"), targetId: v.id("users") },
  handler: async (ctx, { userId, targetId }) => {
    if (userId === targetId) throw new Error("Cannot DM yourself");
    const sorted = sortIds(userId, targetId);

    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_participants", (q) => q.eq("participantIds", sorted))
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("conversations", {
      participantIds: sorted,
      lastMessageAt: Date.now(),
    });
  },
});

// Get all DM conversations for a user
export const listForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const all = await ctx.db.query("conversations").collect();
    const mine = all.filter((c) => c.participantIds.includes(userId));
    mine.sort((a, b) => b.lastMessageAt - a.lastMessageAt);

    return await Promise.all(
      mine.map(async (conv) => {
        const otherId = conv.participantIds.find((id) => id !== userId);
        const other = otherId ? (await ctx.db.get(otherId) as any) : null;
        const unread = await ctx.db
          .query("directMessages")
          .withIndex("by_conversation_time", (q) =>
            q.eq("conversationId", conv._id)
          )
          .filter((q) =>
            q.and(
              q.neq(q.field("userId"), userId),
              q.eq(q.field("readBy"), [])
            )
          )
          .take(99);
        return {
          ...conv,
          other: other ? { handle: other.handle, avatarColor: other.avatarColor, _id: other._id } : null,
          unreadCount: unread.length,
        };
      })
    );
  },
});

// Subscribe to messages in a conversation
export const subscribeMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    return await ctx.db
      .query("directMessages")
      .withIndex("by_conversation_time", (q) =>
        q.eq("conversationId", conversationId)
      )
      .filter((q) => q.gt(q.field("expiresAt"), Date.now()))
      .order("asc")
      .take(300);
  },
});

// Send a DM
export const send = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    text: v.string(),
  },
  handler: async (ctx, { conversationId, userId, text }) => {
    if (!text.trim() || text.length > 1000) throw new Error("Invalid message");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const conv = await ctx.db.get(conversationId);
    if (!conv) throw new Error("Conversation not found");

    const mentions = (text.match(/@[\w]+/g) || []) as string[];
    const now = Date.now();

    await ctx.db.insert("directMessages", {
      conversationId,
      userId,
      handle: user.handle,
      avatarColor: user.avatarColor,
      text: text.trim(),
      timestamp: now,
      expiresAt: now + TTL_MS,
      readBy: [userId],
      mentions,
    });

    await ctx.db.patch(conversationId, {
      lastMessageAt: now,
      lastMessageText: text.slice(0, 60),
    });

    // Notify the other participant
    const otherId = conv.participantIds.find((id) => id !== userId);
    if (otherId) {
      await ctx.db.insert("notifications", {
        userId: otherId as any,
        type: "dm",
        fromUserId: userId,
        fromHandle: user.handle,
        conversationId,
        text: text.slice(0, 80),
        read: false,
        timestamp: now,
        expiresAt: now + 90 * 24 * 60 * 60 * 1000,
      });
    }
  },
});

// Mark messages as read
export const markRead = mutation({
  args: { conversationId: v.id("conversations"), userId: v.id("users") },
  handler: async (ctx, { conversationId, userId }) => {
    const unread = await ctx.db
      .query("directMessages")
      .withIndex("by_conversation_time", (q) =>
        q.eq("conversationId", conversationId)
      )
      .collect();

    for (const msg of unread) {
      if (!msg.readBy.includes(userId)) {
        await ctx.db.patch(msg._id, { readBy: [...msg.readBy, userId] });
      }
    }
  },
});

// Cleanup expired DMs (called by cron)
export const cleanupExpired = internalMutation({
  handler: async (ctx) => {
    const expired = await ctx.db
      .query("directMessages")
      .withIndex("by_expires", (q) => q.lt("expiresAt", Date.now()))
      .take(500);
    for (const msg of expired) await ctx.db.delete(msg._id);
    return { deleted: expired.length };
  },
});

