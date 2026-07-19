import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    phone: v.string(),
    handle: v.string(),
    avatarColor: v.string(),
    isGuest: v.optional(v.boolean()),
    privateRoomId: v.optional(v.id("rooms")),
    pushToken: v.optional(v.string()),
    webPushSubscription: v.optional(v.string()),
    createdAt: v.number(),
    lastSeen: v.number(),
  })
    .index("by_phone", ["phone"])
    .index("by_handle", ["handle"]),

  otpSessions: defineTable({
    phone: v.string(),
    code: v.string(),
    expiresAt: v.number(),
    verified: v.boolean(),
  }).index("by_phone", ["phone"]),

  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
    platform: v.string(),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"]),

  rooms: defineTable({
    name: v.string(),
    topic: v.optional(v.string()),
    ownerId: v.id("users"),
    type: v.union(v.literal("public"), v.literal("private"), v.literal("hidden")),
    password: v.optional(v.string()),
    memberCount: v.number(),
    createdAt: v.number(),
  })
    .index("by_type", ["type"])
    .index("by_owner", ["ownerId"])
    .index("by_createdAt", ["createdAt"]),

  presence: defineTable({
    userId: v.id("users"),
    roomId: v.id("rooms"),
    joinedAt: v.number(),
    lastPing: v.number(),
  })
    .index("by_room", ["roomId"])
    .index("by_user", ["userId"])
    .index("by_user_room", ["userId", "roomId"]),

  messages: defineTable({
    roomId: v.id("rooms"),
    userId: v.union(v.id("users"), v.string()),
    handle: v.string(),
    avatarColor: v.string(),
    text: v.string(),
    timestamp: v.number(),
    expiresAt: v.number(),
    mentions: v.array(v.string()),
  })
    .index("by_room_time", ["roomId", "timestamp"])
    .index("by_expires", ["expiresAt"]),

  conversations: defineTable({
    participantIds: v.array(v.id("users")),
    lastMessageAt: v.number(),
    lastMessageText: v.optional(v.string()),
    unreadBy: v.optional(v.record(v.string(), v.float64())),
  }).index("by_participants", ["participantIds"]),

  directMessages: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    text: v.string(),
    timestamp: v.number(),
    expiresAt: v.number(),
    read: v.optional(v.boolean()),
    readBy: v.optional(v.array(v.id("users"))),
    mentions: v.array(v.string()),
  })
    .index("by_conversation_time", ["conversationId", "timestamp"])
    .index("by_expires", ["expiresAt"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("dm"),
      v.literal("mention"),
      v.literal("room_activity"),
      v.literal("join"),
      v.literal("leave")
    ),
    fromUserId: v.id("users"),
    fromHandle: v.string(),
    roomId: v.optional(v.id("rooms")),
    conversationId: v.optional(v.id("conversations")),
    text: v.string(),
    read: v.boolean(),
    timestamp: v.number(),
    expiresAt: v.number(),
  })
    .index("by_user_unread", ["userId", "read"])
    .index("by_user_time", ["userId", "timestamp"])
    .index("by_expires", ["expiresAt"]),

  roomBans: defineTable({
    roomId: v.id("rooms"),
    userId: v.id("users"),
    bannedBy: v.id("users"),
    bannedAt: v.number(),
  })
    .index("by_room", ["roomId"])
    .index("by_room_user", ["roomId", "userId"]),

  guestSessions: defineTable({
    token: v.string(),
    roomId: v.id("rooms"),
    handle: v.string(),
    avatarColor: v.string(),
    createdBy: v.id("users"),
    multiUse: v.boolean(),
    useCount: v.number(),
    joinedAt: v.number(),
    expiresAt: v.number(),
    active: v.boolean(),
  })
    .index("by_token", ["token"])
    .index("by_room", ["roomId"]),
});
