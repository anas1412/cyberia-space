/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

async function createTestUser(t: ReturnType<typeof convexTest>, handle: string) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      phone: `+1555${Math.random().toString().slice(2, 10)}`,
      handle,
      avatarColor: "#E8A840",
      createdAt: Date.now(),
      lastSeen: Date.now(),
    });
  });
}

async function createTestRoom(t: ReturnType<typeof convexTest>, ownerId: string & { __tableName: "users" }) {
  return await t.mutation(api.rooms.create, {
    userId: ownerId,
    name: "msg-room",
    type: "public",
  });
}

test("send a message", async () => {
  const t = convexTest(schema, modules);
  const userId = await createTestUser(t, "sender");
  const { roomId } = await createTestRoom(t, userId);

  const msgId = await t.mutation(api.messages.send, {
    roomId,
    userId,
    text: "Hello world!",
  });

  expect(msgId).toBeDefined();

  const messages = await t.query(api.messages.subscribe, { roomId });
  expect(messages).toHaveLength(1);
  expect(messages[0].text).toBe("Hello world!");
  expect(messages[0].handle).toBe("sender");
});

test("message with mentions extracts @mentions", async () => {
  const t = convexTest(schema, modules);
  const userId = await createTestUser(t, "mentioner");
  const { roomId } = await createTestRoom(t, userId);

  await t.mutation(api.messages.send, {
    roomId,
    userId,
    text: "Hey @alice and @bob, check this out",
  });

  const messages = await t.query(api.messages.subscribe, { roomId });
  expect(messages[0].mentions).toContain("@alice");
  expect(messages[0].mentions).toContain("@bob");
  expect(messages[0].mentions).toHaveLength(2);
});

test("deduplicates mentions", async () => {
  const t = convexTest(schema, modules);
  const userId = await createTestUser(t, "dedup");
  const { roomId } = await createTestRoom(t, userId);

  await t.mutation(api.messages.send, {
    roomId,
    userId,
    text: "@alice @alice @alice",
  });

  const messages = await t.query(api.messages.subscribe, { roomId });
  expect(messages[0].mentions).toEqual(["@alice"]);
});

test("empty message rejected", async () => {
  const t = convexTest(schema, modules);
  const userId = await createTestUser(t, "empty-sender");
  const { roomId } = await createTestRoom(t, userId);

  await expect(
    t.mutation(api.messages.send, { roomId, userId, text: "   " })
  ).rejects.toThrow("Invalid message");
});

test("message over 1000 chars rejected", async () => {
  const t = convexTest(schema, modules);
  const userId = await createTestUser(t, "long-sender");
  const { roomId } = await createTestRoom(t, userId);

  const longText = "a".repeat(1001);
  await expect(
    t.mutation(api.messages.send, { roomId, userId, text: longText })
  ).rejects.toThrow("Message too long");
});

test("HTML tags are stripped from messages", async () => {
  const t = convexTest(schema, modules);
  const userId = await createTestUser(t, "html-sender");
  const { roomId } = await createTestRoom(t, userId);

  await t.mutation(api.messages.send, { roomId, userId, text: "<b>bold</b> and <script>alert('x')</script> clean" });
  const messages = await t.query(api.messages.subscribe, { roomId });
  expect(messages).toHaveLength(1);
  expect(messages[0]!.text).toBe("bold and alert('x') clean");
});

test("mentions are capped at 10", async () => {
  const t = convexTest(schema, modules);
  const userId = await createTestUser(t, "mention-sender");
  const { roomId } = await createTestRoom(t, userId);

  const text = Array.from({ length: 15 }, (_, i) => `@user${i}`).join(" ");
  await t.mutation(api.messages.send, { roomId, userId, text });
  const messages = await t.query(api.messages.subscribe, { roomId });
  expect(messages).toHaveLength(1);
  expect(messages[0]!.mentions).toHaveLength(10);
});

test("subscribe filters by since timestamp", async () => {
  const t = convexTest(schema, modules);
  const userId = await createTestUser(t, "filter-sender");
  const { roomId } = await createTestRoom(t, userId);

  await t.mutation(api.messages.send, { roomId, userId, text: "msg1" });
  await t.mutation(api.messages.send, { roomId, userId, text: "msg2" });
  await t.mutation(api.messages.send, { roomId, userId, text: "msg3" });

  const all = await t.query(api.messages.subscribe, { roomId });
  expect(all).toHaveLength(3);

  // since = far future → should return 0
  const future = await t.query(api.messages.subscribe, { roomId, since: Date.now() + 100000 });
  expect(future).toHaveLength(0);

  // since = 0 → should return all
  const everything = await t.query(api.messages.subscribe, { roomId, since: 0 });
  expect(everything).toHaveLength(3);
});

test("empty or whitespace-only message is rejected", async () => {
  const t = convexTest(schema, modules);
  const userId = await createTestUser(t, "empty-sender");
  const { roomId } = await createTestRoom(t, userId);

  await expect(
    t.mutation(api.messages.send, { roomId, userId, text: "" })
  ).rejects.toThrow("Invalid message");

  await expect(
    t.mutation(api.messages.send, { roomId, userId, text: "   " })
  ).rejects.toThrow("Invalid message");
});

test("cannot send to non-existent room", async () => {
  const t = convexTest(schema, modules);
  const userId = await createTestUser(t, "ghost-sender");

  // Use a valid-format but non-existent ID by inserting and deleting a room
  const fakeRoomId = await t.run(async (ctx) => {
    const id = await ctx.db.insert("rooms", {
      name: "temp",
      ownerId: userId,
      type: "public",
      memberCount: 0,
      createdAt: Date.now(),
    });
    await ctx.db.delete(id);
    return id;
  });

  await expect(
    t.mutation(api.messages.send, { roomId: fakeRoomId, userId, text: "hello?" })
  ).rejects.toThrow("Room not found");
});

test("cannot send as non-existent user", async () => {
  const t = convexTest(schema, modules);
  const ownerId = await createTestUser(t, "room-owner");
  const { roomId } = await createTestRoom(t, ownerId);

  const fakeUserId = await t.run(async (ctx) => {
    const id = await ctx.db.insert("users", {
      phone: "temp",
      handle: "temp",
      avatarColor: "#000",
      createdAt: Date.now(),
      lastSeen: Date.now(),
    });
    await ctx.db.delete(id);
    return id;
  });

  await expect(
    t.mutation(api.messages.send, { roomId, userId: fakeUserId, text: "impersonation" })
  ).rejects.toThrow("User not found");
});

test("message preserves user handle and color", async () => {
  const t = convexTest(schema, modules);
  const userId = await createTestUser(t, "color-user");
  const { roomId } = await createTestRoom(t, userId);

  await t.mutation(api.messages.send, { roomId, userId, text: "colored" });

  const messages = await t.query(api.messages.subscribe, { roomId });
  expect(messages[0].handle).toBe("color-user");
  expect(messages[0].avatarColor).toBe("#E8A840");
});
