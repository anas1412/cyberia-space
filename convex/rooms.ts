import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const ROOM_TYPES = v.union(v.literal("public"), v.literal("invite"), v.literal("hidden"));

// List public + invite rooms
export const listPublic = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, { userId }) => {
    const [publicRooms, inviteRooms] = await Promise.all([
      ctx.db.query("rooms").withIndex("by_type", (q) => q.eq("type", "public")).order("desc").take(50),
      ctx.db.query("rooms").withIndex("by_type", (q) => q.eq("type", "invite")).order("desc").take(50),
    ]);
    let rooms = [...publicRooms, ...inviteRooms];

    // Include owner's own room even if hidden
    if (userId) {
      const myRoom = await ctx.db
        .query("rooms")
        .withIndex("by_owner", (q) => q.eq("ownerId", userId))
        .first();
      if (myRoom && !rooms.some((r) => r._id === myRoom._id)) {
        rooms.push(myRoom);
      }
    }

    rooms.sort((a, b) => b.createdAt - a.createdAt);
    rooms = rooms.slice(0, 50);

    return await Promise.all(rooms.map(async (room) => {
      const owner = await ctx.db.get(room.ownerId);
      return {
        ...room,
        ownerHandle: owner?.handle ?? 'unknown',
        ownerColor: owner?.avatarColor ?? '#888',
      };
    }));
  },
});

// Get a single room
export const get = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    return await ctx.db.get(roomId);
  },
});

// Returns the user's own room if it exists, cleans stale privateRoomId
export const getMyRoom = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user?.privateRoomId) return null;
    const room = await ctx.db.get(user.privateRoomId);
    return room;
  },
});

// Create a room
export const create = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    type: ROOM_TYPES,
    topic: v.optional(v.string()),
  },
  handler: async (ctx, { userId, name, type, topic }) => {
    if (!name.trim()) throw new Error("Room name required");
    // Clean stale privateRoomId
    const user = await ctx.db.get(userId);
    if (user?.privateRoomId) {
      const ref = await ctx.db.get(user.privateRoomId);
      if (!ref) await ctx.db.patch(userId, { privateRoomId: undefined });
    }
    // One room per user
    const existing = await ctx.db
      .query("rooms")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .first();
    if (existing) {
      // Sync privateRoomId if missing (legacy room)
      if (user && !user.privateRoomId) {
        await ctx.db.patch(userId, { privateRoomId: existing._id });
      }
      return { roomId: existing._id, name: existing.name };
    }

    const roomId = await ctx.db.insert("rooms", {
      name: name.slice(0, 40),
      topic: topic?.slice(0, 100),
      ownerId: userId,
      type,
      memberCount: 0,
      createdAt: Date.now(),
    });

    if (user && !user.privateRoomId) {
      await ctx.db.patch(userId, { privateRoomId: roomId });
    }
    return { roomId, name: name.trim() };
  },
});

// Get live presence in a room
export const getPresence = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const staleThreshold = Date.now() - 60 * 1000;
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
  args: { userId: v.id("users"), roomId: v.id("rooms"), code: v.optional(v.string()) },
  handler: async (ctx, { userId, roomId, code }) => {
    const room = await ctx.db.get(roomId);
    if (!room) throw new Error("Room not found");

    // Access control
    const isOwner = room.ownerId === userId;

    if (room.type === "invite" && !isOwner) {
      if (!code) return { error: "Invite code required" };
      const invite = await ctx.db
        .query("roomInvites")
        .withIndex("by_code", (q) => q.eq("code", code.toUpperCase()))
        .first();
      if (!invite) return { error: "Invalid invite code" };
      if (invite.roomId !== roomId) return { error: "Invalid invite code" };
      if (invite.expiresAt < Date.now()) return { error: "Invite code expired" };
      if (!invite.multiUse && invite.useCount >= 1) return { error: "Invite code already used" };
      await ctx.db.patch(invite._id, { useCount: invite.useCount + 1 });
    }

    if (room.type === "hidden" && !isOwner) {
      return { error: "Cannot join this room" };
    }

    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user_room", (q) => q.eq("userId", userId).eq("roomId", roomId))
      .first();

    // Check if banned
    const ban = await ctx.db
      .query("roomBans")
      .withIndex("by_room_user", (q) => q.eq("roomId", roomId).eq("userId", userId))
      .first();
    if (ban) return { error: "You are banned from this room" };

    if (existing) {
      await ctx.db.patch(existing._id, { lastPing: Date.now() });
    } else {
      await ctx.db.insert("presence", {
        userId,
        roomId,
        joinedAt: Date.now(),
        lastPing: Date.now(),
      });
      if (room) await ctx.db.patch(roomId, { memberCount: room.memberCount + 1 });

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

// Update room (owner only)
export const update = mutation({
  args: {
    roomId: v.id("rooms"),
    userId: v.id("users"),
    name: v.optional(v.string()),
    topic: v.optional(v.string()),
    type: v.optional(ROOM_TYPES),
  },
  handler: async (ctx, { roomId, userId, name, topic, type }) => {
    const room = await ctx.db.get(roomId);
    if (!room) throw new Error("Room not found");
    if (room.ownerId !== userId) throw new Error("Not the owner");
    const patch: any = {};
    if (name) { if (!name.trim()) throw new Error("Room name required"); patch.name = name.slice(0, 40); }
    if (topic !== undefined) patch.topic = topic.slice(0, 100) || undefined;
    if (type) patch.type = type;
    await ctx.db.patch(roomId, patch);
    return { success: true };
  },
});

// Delete room (owner only)
export const remove = mutation({
  args: { roomId: v.id("rooms"), userId: v.id("users") },
  handler: async (ctx, { roomId, userId }) => {
    const room = await ctx.db.get(roomId);
    if (!room) throw new Error("Room not found");
    if (room.ownerId !== userId) throw new Error("Not the owner");

    // Clear owner's privateRoomId
    const owner = await ctx.db.get(userId);
    if (owner?.privateRoomId === roomId) {
      await ctx.db.patch(userId, { privateRoomId: undefined });
    }

    // Delete all messages
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_room_time", (q) => q.eq("roomId", roomId))
      .take(500);
    for (const m of messages) await ctx.db.delete(m._id);

    // Delete presence
    const presence = await ctx.db
      .query("presence")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .collect();
    for (const p of presence) await ctx.db.delete(p._id);

    // Delete bans
    const bans = await ctx.db
      .query("roomBans")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .collect();
    for (const b of bans) await ctx.db.delete(b._id);

    // Delete invites
    const invites = await ctx.db
      .query("roomInvites")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .collect();
    for (const i of invites) await ctx.db.delete(i._id);

    // Delete guest sessions
    const guests = await ctx.db
      .query("guestSessions")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .collect();
    for (const g of guests) await ctx.db.delete(g._id);

    // Delete room
    await ctx.db.delete(roomId);
    return { success: true };
  },
});

// Kick a user from the room (owner only)
export const kick = mutation({
  args: { roomId: v.id("rooms"), ownerId: v.id("users"), userId: v.id("users") },
  handler: async (ctx, { roomId, ownerId, userId }) => {
    const room = await ctx.db.get(roomId);
    if (!room || room.ownerId !== ownerId) throw new Error("Not the owner");
    if (userId === ownerId) throw new Error("Cannot kick yourself");
    const p = await ctx.db
      .query("presence")
      .withIndex("by_user_room", (q) => q.eq("userId", userId).eq("roomId", roomId))
      .first();
    if (p) {
      await ctx.db.delete(p._id);
      if (room.memberCount > 0) await ctx.db.patch(roomId, { memberCount: room.memberCount - 1 });
    }
    return { success: true };
  },
});

// Ban a user from the room (owner only)
export const ban = mutation({
  args: { roomId: v.id("rooms"), ownerId: v.id("users"), userId: v.id("users") },
  handler: async (ctx, { roomId, ownerId, userId }) => {
    const room = await ctx.db.get(roomId);
    if (!room || room.ownerId !== ownerId) throw new Error("Not the owner");
    if (userId === ownerId) throw new Error("Cannot ban yourself");
    const existing = await ctx.db
      .query("roomBans")
      .withIndex("by_room_user", (q) => q.eq("roomId", roomId).eq("userId", userId))
      .first();
    if (!existing) {
      await ctx.db.insert("roomBans", { roomId, userId, bannedBy: ownerId, bannedAt: Date.now() });
    }
    const p = await ctx.db
      .query("presence")
      .withIndex("by_user_room", (q) => q.eq("userId", userId).eq("roomId", roomId))
      .first();
    if (p) {
      await ctx.db.delete(p._id);
      if (room.memberCount > 0) await ctx.db.patch(roomId, { memberCount: room.memberCount - 1 });
    }
    return { success: true };
  },
});

// Unban a user
export const unban = mutation({
  args: { roomId: v.id("rooms"), ownerId: v.id("users"), userId: v.id("users") },
  handler: async (ctx, { roomId, ownerId, userId }) => {
    const room = await ctx.db.get(roomId);
    if (!room || room.ownerId !== ownerId) throw new Error("Not the owner");
    const ban = await ctx.db
      .query("roomBans")
      .withIndex("by_room_user", (q) => q.eq("roomId", roomId).eq("userId", userId))
      .first();
    if (ban) await ctx.db.delete(ban._id);
    return { success: true };
  },
});

// List banned users
export const listBans = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const bans = await ctx.db
      .query("roomBans")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .collect();
    const users = await Promise.all(bans.map(async (b) => {
      const u = await ctx.db.get(b.userId);
      return u ? { _id: b._id, userId: b.userId, handle: u.handle, bannedAt: b.bannedAt } : null;
    }));
    return users.filter(Boolean);
  },
});

// ── Invite Codes ──

// Look up a code (public — for join preview)
export const lookupCode = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const invite = await ctx.db
      .query("roomInvites")
      .withIndex("by_code", (q) => q.eq("code", code.toUpperCase()))
      .first();
    if (!invite) return null;
    if (invite.expiresAt < Date.now()) return null;
    if (!invite.multiUse && invite.useCount >= 1) return null;
    const room = await ctx.db.get(invite.roomId);
    if (!room) return null;
    return { roomId: room._id, roomName: room.name, memberCount: room.memberCount };
  },
});

// Generate an invite code (owner only, invite rooms only)
export const generateInvite = mutation({
  args: {
    roomId: v.id("rooms"),
    userId: v.id("users"),
    multiUse: v.boolean(),
    expiresInHours: v.optional(v.number()), // null = never
  },
  handler: async (ctx, { roomId, userId, multiUse, expiresInHours }) => {
    const room = await ctx.db.get(roomId);
    if (!room) throw new Error("Room not found");
    if (room.ownerId !== userId) throw new Error("Not the owner");
    if (room.type !== "invite") throw new Error("Invite codes only available for invite rooms");

    const code = generateCode();
    const now = Date.now();
    const expiresAt = expiresInHours ? now + expiresInHours * 60 * 60 * 1000 : now + 24 * 60 * 60 * 1000;

    const _id = await ctx.db.insert("roomInvites", {
      roomId,
      code,
      createdBy: userId,
      multiUse,
      useCount: 0,
      expiresAt,
      createdAt: now,
    });

    return { code, expiresAt, inviteId: _id };
  },
});

// Revoke an invite code
export const revokeInvite = mutation({
  args: { roomId: v.id("rooms"), userId: v.id("users"), inviteId: v.id("roomInvites") },
  handler: async (ctx, { roomId, userId, inviteId }) => {
    const room = await ctx.db.get(roomId);
    if (!room) throw new Error("Room not found");
    if (room.ownerId !== userId) throw new Error("Not the owner");
    const invite = await ctx.db.get(inviteId);
    if (!invite || invite.roomId !== roomId) throw new Error("Invite not found");
    await ctx.db.delete(inviteId);
    return { success: true };
  },
});

// List active invite codes for a room (owner only)
export const listInvites = query({
  args: { roomId: v.id("rooms"), userId: v.id("users") },
  handler: async (ctx, { roomId, userId }) => {
    const room = await ctx.db.get(roomId);
    if (!room) return [];
    if (room.ownerId !== userId) return [];
    const invites = await ctx.db
      .query("roomInvites")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .order("desc")
      .collect();
    return invites.filter((i) => i.expiresAt > Date.now());
  },
});

// ── Guest Links ──

// Generate a guest link (owner only, all room types)
export const createGuestLink = mutation({
  args: {
    roomId: v.id("rooms"),
    userId: v.id("users"),
    multiUse: v.boolean(),
    expiresInHours: v.optional(v.number()),
  },
  handler: async (ctx, { roomId, userId, multiUse, expiresInHours }) => {
    const room = await ctx.db.get(roomId);
    if (!room) throw new Error("Room not found");
    if (room.ownerId !== userId) throw new Error("Not the owner");

    const token = generateToken();
    const now = Date.now();
    const expiresAt = expiresInHours ? now + expiresInHours * 60 * 60 * 1000 : now + 24 * 60 * 60 * 1000;

    await ctx.db.insert("guestSessions", {
      token,
      roomId,
      handle: `guest_${token.slice(0, 6)}`,
      avatarColor: randomColor(),
      createdBy: userId,
      multiUse,
      useCount: 0,
      joinedAt: 0,
      expiresAt,
      active: false,
    });

    return { token, expiresAt };
  },
});

// Consume a guest link (no auth required)
export const consumeGuestLink = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("guestSessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();
    if (!session) return { error: "Invalid link" };
    if (session.expiresAt < Date.now()) return { error: "Link expired" };
    if (!session.multiUse && session.useCount >= 1) return { error: "Link already used" };
    if (session.active) return { error: "Link already in use" };

    await ctx.db.patch(session._id, {
      active: true,
      useCount: session.useCount + 1,
      joinedAt: Date.now(),
    });

    const room = await ctx.db.get(session.roomId);
    return {
      handle: session.handle,
      avatarColor: session.avatarColor,
      roomId: session.roomId,
      roomName: room?.name ?? "Room",
      joinedAt: Date.now(),
    };
  },
});

// Leave as guest
export const leaveGuest = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("guestSessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();
    if (session) {
      await ctx.db.patch(session._id, { active: false });
    }
    return { success: true };
  },
});

// List guest links for a room (owner only)
export const listGuestLinks = query({
  args: { roomId: v.id("rooms"), userId: v.id("users") },
  handler: async (ctx, { roomId, userId }) => {
    const room = await ctx.db.get(roomId);
    if (!room) return [];
    if (room.ownerId !== userId) return [];
    return await ctx.db
      .query("guestSessions")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .order("desc")
      .collect();
  },
});

// Revoke a guest link (owner only)
export const revokeGuestLink = mutation({
  args: { roomId: v.id("rooms"), userId: v.id("users"), guestId: v.id("guestSessions") },
  handler: async (ctx, { roomId, userId, guestId }) => {
    const room = await ctx.db.get(roomId);
    if (!room) throw new Error("Room not found");
    if (room.ownerId !== userId) throw new Error("Not the owner");
    const guest = await ctx.db.get(guestId);
    if (!guest || guest.roomId !== roomId) throw new Error("Guest link not found");
    await ctx.db.delete(guestId);
    return { success: true };
  },
});

// ── Helpers ──

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function generateToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) token += chars[Math.floor(Math.random() * chars.length)];
  return token;
}

function randomColor(): string {
  const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9"];
  return colors[Math.floor(Math.random() * colors.length)];
}
