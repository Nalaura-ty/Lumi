import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { eq, notInArray } from "drizzle-orm";

import { sendPushToUser } from "@lumi/api";
import { db } from "@lumi/db/client";
import { DailyLog, PushToken } from "@lumi/db/schema";

import { env } from "~/env";

export const runtime = "nodejs";

function todayBRT(): string {
  const brt = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return brt.toISOString().substring(0, 10);
}

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = todayBRT();

  const loggedToday = db
    .select({ userId: DailyLog.userId })
    .from(DailyLog)
    .where(eq(DailyLog.date, today));

  const users = await db
    .selectDistinct({ userId: PushToken.userId })
    .from(PushToken)
    .where(notInArray(PushToken.userId, loggedToday));

  await Promise.all(
    users.map(({ userId }) =>
      sendPushToUser(
        userId,
        "Como você está hoje? 🌸",
        "Não se esqueça de registrar seu ciclo antes de dormir!",
      ),
    ),
  );

  return NextResponse.json({ sent: users.length });
}
