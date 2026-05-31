import type { TRPCRouterRecord } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";

import { PushToken } from "@lumi/db/schema";

import { protectedProcedure } from "../trpc";

export const notificationRouter = {
  registerToken: protectedProcedure
    .input(
      z.object({
        token: z.string().min(1),
        platform: z.enum(["ios", "android"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const existing = await ctx.db.query.PushToken.findFirst({
        where: eq(PushToken.token, input.token),
      });
      if (existing) {
        if (existing.userId !== userId) {
          await ctx.db
            .update(PushToken)
            .set({ userId })
            .where(eq(PushToken.token, input.token));
        }
        return;
      }
      await ctx.db.insert(PushToken).values({
        userId,
        token: input.token,
        platform: input.platform,
      });
    }),
} satisfies TRPCRouterRecord;
