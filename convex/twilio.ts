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
    const auth = btoa(
      `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
    );

    const res = await fetch(
      `https://verify.twilio.com/v2/Services/${VERIFY_SERVICE_SID}/VerificationCheck`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ to: phone, code }),
      }
    );

    const data = await res.json();
    return { approved: data.status === "approved" };
  },
});
