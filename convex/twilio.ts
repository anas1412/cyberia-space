"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import Twilio from "twilio";

const client = Twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

const VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID!;

export const sendVerification = internalAction({
  args: { phone: v.string() },
  handler: async (_, { phone }) => {
    try {
      const verification = await client.verify.v2
        .services(VERIFY_SERVICE_SID)
        .verifications.create({ to: phone, channel: "sms" });
      console.log(`Twilio verification sent to ${phone}, status: ${verification.status}`);
    } catch (err: any) {
      console.error(`Twilio sendVerification failed for ${phone}:`, err.message);
      throw err;
    }
  },
});

export const verifyCode = internalAction({
  args: { phone: v.string(), code: v.string() },
  handler: async (_, { phone, code }) => {
    try {
      const check = await client.verify.v2
        .services(VERIFY_SERVICE_SID)
        .verificationChecks.create({ to: phone, code });
      console.log(`Twilio verify check for ${phone}: status=${check.status}`);
      return { approved: check.status === "approved" };
    } catch (err: any) {
      console.error(`Twilio verifyCode failed for ${phone}:`, err.message);
      return { approved: false };
    }
  },
});
