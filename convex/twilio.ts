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
    await client.verify.v2
      .services(VERIFY_SERVICE_SID)
      .verifications.create({ to: phone, channel: "sms" });
  },
});
