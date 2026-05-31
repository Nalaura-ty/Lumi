import { eq } from "drizzle-orm";

import { db } from "@lumi/db/client";
import { PushToken } from "@lumi/db/schema";

interface ExpoPushMessage {
  to: string | string[];
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  badge?: number;
}

/**
 * Send a push notification to all devices registered for a given user.
 * Must be called server-side only.
 */
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  const tokens = await db.query.PushToken.findMany({
    where: eq(PushToken.userId, userId),
  });
  if (tokens.length === 0) return;

  const messages: ExpoPushMessage[] = tokens.map((t) => ({
    to: t.token,
    title,
    body,
    data,
    sound: "default",
  }));

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(messages),
  });
}
