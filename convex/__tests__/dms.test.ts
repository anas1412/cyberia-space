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

test("create DM conversation", async () => {
  const t = convexTest(schema, modules);
  const alice = await createTestUser(t, "alice");
  const bob = await createTestUser(t, "bob");

  const convId = await t.mutation(api.dms.getOrCreate, {
    userId: alice,
    targetId: bob,
  });

  expect(convId).toBeDefined();
});

test("getOrCreate returns same conversation on duplicate call", async () => {
  const t = convexTest(schema, modules);
  const alice = await createTestUser(t, "alice2");
  const bob = await createTestUser(t, "bob2");

  const first = await t.mutation(api.dms.getOrCreate, {
    userId: alice,
    targetId: bob,
  });
  const second = await t.mutation(api.dms.getOrCreate, {
    userId: alice,
    targetId: bob,
  });

  expect(first).toBe(second);
});

test("order of user IDs does not matter", async () => {
  const t = convexTest(schema, modules);
  const alice = await createTestUser(t, "alice3");
  const bob = await createTestUser(t, "bob3");

  const ab = await t.mutation(api.dms.getOrCreate, {
    userId: alice,
    targetId: bob,
  });
  const ba = await t.mutation(api.dms.getOrCreate, {
    userId: bob,
    targetId: alice,
  });

  expect(ab).toBe(ba);
});

test("cannot DM yourself", async () => {
  const t = convexTest(schema, modules);
  const alice = await createTestUser(t, "self-dm");

  await expect(
    t.mutation(api.dms.getOrCreate, { userId: alice, targetId: alice })
  ).rejects.toThrow("Cannot DM yourself");
});

test("send DM and receive", async () => {
  const t = convexTest(schema, modules);
  const alice = await createTestUser(t, "dm-alice");
  const bob = await createTestUser(t, "dm-bob");

  const convId = await t.mutation(api.dms.getOrCreate, {
    userId: alice,
    targetId: bob,
  });

  await t.mutation(api.dms.send, {
    conversationId: convId,
    userId: alice,
    text: "Hey Bob!",
  });

  const messages = await t.query(api.dms.subscribeMessages, {
    conversationId: convId,
  });

  expect(messages).toHaveLength(1);
  expect(messages[0].text).toBe("Hey Bob!");
  expect(messages[0].handle).toBe("dm-alice");
});

test("DM with mentions", async () => {
  const t = convexTest(schema, modules);
  const alice = await createTestUser(t, "mention-alice");
  const bob = await createTestUser(t, "mention-bob");

  const convId = await t.mutation(api.dms.getOrCreate, {
    userId: alice,
    targetId: bob,
  });

  await t.mutation(api.dms.send, {
    conversationId: convId,
    userId: alice,
    text: "Hello @bob, how are you?",
  });

  const messages = await t.query(api.dms.subscribeMessages, {
    conversationId: convId,
  });

  expect(messages[0].mentions).toContain("@bob");
});

test("mark messages as read", async () => {
  const t = convexTest(schema, modules);
  const alice = await createTestUser(t, "read-alice");
  const bob = await createTestUser(t, "read-bob");

  const convId = await t.mutation(api.dms.getOrCreate, {
    userId: alice,
    targetId: bob,
  });

  await t.mutation(api.dms.send, {
    conversationId: convId,
    userId: alice,
    text: "unread message",
  });

  // Mark as read by bob
  await t.mutation(api.dms.markRead, {
    conversationId: convId,
    userId: bob,
  });

  const messages = await t.query(api.dms.subscribeMessages, {
    conversationId: convId,
  });

  expect(messages[0].read).toBe(true);
});

test("list conversations for user", async () => {
  const t = convexTest(schema, modules);
  const alice = await createTestUser(t, "list-alice");
  const bob = await createTestUser(t, "list-bob");
  const carol = await createTestUser(t, "list-carol");

  // Alice talks to both Bob and Carol
  const convAB = await t.mutation(api.dms.getOrCreate, {
    userId: alice,
    targetId: bob,
  });
  const convAC = await t.mutation(api.dms.getOrCreate, {
    userId: alice,
    targetId: carol,
  });

  await t.mutation(api.dms.send, {
    conversationId: convAB,
    userId: alice,
    text: "Hi Bob",
  });
  await t.mutation(api.dms.send, {
    conversationId: convAC,
    userId: alice,
    text: "Hi Carol",
  });

  const conversations = await t.query(api.dms.listForUser, { userId: alice });
  expect(conversations).toHaveLength(2);

  // Should be sorted by lastMessageAt (most recent first)
  expect(conversations[0].lastMessageAt).toBeGreaterThanOrEqual(
    conversations[1].lastMessageAt
  );
});

test("unread count tracks correctly", async () => {
  const t = convexTest(schema, modules);
  const alice = await createTestUser(t, "unread-alice");
  const bob = await createTestUser(t, "unread-bob");

  const convId = await t.mutation(api.dms.getOrCreate, {
    userId: alice,
    targetId: bob,
  });

  await t.mutation(api.dms.send, {
    conversationId: convId,
    userId: alice,
    text: "msg1",
  });
  await t.mutation(api.dms.send, {
    conversationId: convId,
    userId: alice,
    text: "msg2",
  });

  const conversations = await t.query(api.dms.listForUser, { userId: bob });
  const conv = conversations.find((c) => c._id === convId);
  expect(conv?.unreadCount).toBe(2);

  // Mark as read
  await t.mutation(api.dms.markRead, {
    conversationId: convId,
    userId: bob,
  });

  const conversationsAfter = await t.query(api.dms.listForUser, { userId: bob });
  const convAfter = conversationsAfter.find((c) => c._id === convId);
  expect(convAfter?.unreadCount).toBe(0);
});

test("empty message rejected", async () => {
  const t = convexTest(schema, modules);
  const alice = await createTestUser(t, "empty-dm");
  const bob = await createTestUser(t, "empty-dm-b");

  const convId = await t.mutation(api.dms.getOrCreate, {
    userId: alice,
    targetId: bob,
  });

  await expect(
    t.mutation(api.dms.send, { conversationId: convId, userId: alice, text: "   " })
  ).rejects.toThrow("Invalid message");
});

test("subscribe DMs excludes expired messages", async () => {
  const t = convexTest(schema, modules);
  const alice = await createTestUser(t, "cleanup-dm");
  const bob = await createTestUser(t, "cleanup-dm-b");

  const convId = await t.mutation(api.dms.getOrCreate, {
    userId: alice,
    targetId: bob,
  });

  await t.mutation(api.dms.send, {
    conversationId: convId,
    userId: alice,
    text: "still alive",
  });

  await t.mutation(api.dms.send, {
    conversationId: convId,
    userId: alice,
    text: "will expire",
  });

  // Expire only the second message
  await t.run(async (ctx) => {
    const msgs = await ctx.db
      .query("directMessages")
      .withIndex("by_conversation_time", (q) =>
        q.eq("conversationId", convId)
      )
      .collect();
    const toExpire = msgs.find((m) => m.text === "will expire");
    if (toExpire) await ctx.db.patch(toExpire._id, { expiresAt: Date.now() - 1000 });
  });

  const remaining = await t.query(api.dms.subscribeMessages, {
    conversationId: convId,
  });
  expect(remaining).toHaveLength(1);
  expect(remaining[0].text).toBe("still alive");
});
