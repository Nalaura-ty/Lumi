import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { eq, ne, sql } from "drizzle-orm";

import { sendPushToUser } from "@lumi/api";
import { db } from "@lumi/db/client";
import { PushToken, UserProfile } from "@lumi/db/schema";

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

  // Usuárias cuja menstruação está prevista para daqui a 2 dias
  // Data prevista = lastPeriodStart + cycleLength dias
  const upcoming = await db
    .selectDistinct({ userId: UserProfile.userId })
    .from(UserProfile)
    .innerJoin(PushToken, eq(PushToken.userId, UserProfile.userId))
    .where(
      sql`${UserProfile.lastPeriodStart}::date
        + (${UserProfile.cycleLength} || ' days')::interval
        = ${today}::date + interval '2 days'
        AND ${ne(UserProfile.lastPeriodStart, "2000-01-01")}`,
    );

  await Promise.all(
    upcoming.map(({ userId }) =>
      sendPushToUser(
        userId,
        "Sua menstruação pode estar chegando 🩸",
        "Seu ciclo prevê a menstruação em 2 dias. Fique atenta!",
      ),
    ),
  );

  return NextResponse.json({ sent: upcoming.length });
}
