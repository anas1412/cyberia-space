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
        const unreadCount = (conv.unreadBy?.[userId]) ?? 0;
        return {
          ...conv,
          other: other ? { handle: other.handle, avatarColor: other.avatarColor, _id: other._id } : null,
          unreadCount,
        };
      })
    );
  },
});

// Subscribe to messages in a conversation
export const subscribeMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const msgs = await ctx.db
      .query("directMessages")
      .withIndex("by_conversation_time", (q) =>
        q.eq("conversationId", conversationId)
      )
      .filter((q) => q.gt(q.field("expiresAt"), Date.now()))
      .order("asc")
      .take(300);

    return await Promise.all(
      msgs.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        return {
          ...m,
          handle: user?.handle ?? "unknown",
          avatarColor: user?.avatarColor ?? "#555",
        };
      })
    );
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
      text: text.trim(),
      timestamp: now,
      expiresAt: now + TTL_MS,
      read: false,
      mentions,
    });

    // Increment unread count for all participants except sender
    const current = conv.unreadBy ?? {};
    for (const pid of conv.participantIds) {
      if (pid !== userId) {
        current[pid] = (current[pid] || 0) + 1;
      }
    }
    await ctx.db.patch(conversationId, {
      lastMessageAt: now,
      lastMessageText: text.slice(0, 60),
      unreadBy: current,
    });

    // Notify the other participant
    const otherId = conv.participantIds.find((id) => id !== userId);
    if (otherId) {
      await ctx.db.insert("notifications", {
        userId: otherId,
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
      if (!msg.read) {
        await ctx.db.patch(msg._id, { read: true });
      }
    }
    // Reset unread count for this user
    const conv = await ctx.db.get(conversationId);
    if (conv?.unreadBy) {
      const updated = { ...conv.unreadBy };
      delete updated[userId];
      await ctx.db.patch(conversationId, { unreadBy: updated });
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

