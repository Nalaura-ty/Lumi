import { eq, notInArray } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { sendPushToUser } from "@lumi/api";
import { db } from "@lumi/db/client";
import { DailyLog, PushToken } from "@lumi/db/schema";

import { env } from "~/env";

export const runtime = "nodejs";

function todayBRT(): { date: string; hour: number } {
  const brt = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const iso = brt.toISOString();
  return {
    date: iso.substring(0, 10),
    hour: brt.getUTCHours(),
  };
}

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { date: today, hour } = todayBRT();

  // Só envia entre 8h e 21h (horário de Brasília)
  if (hour < 8 || hour >= 21) {
    return NextResponse.json({ skipped: "outside hours" });
  }

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
        "Registre seu ciclo agora — leva só um minutinho!",
      ),
    ),
  );

  return NextResponse.json({ sent: users.length });
}
