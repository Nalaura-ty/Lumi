import type { TRPCRouterRecord } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";

import { user, UserProfile } from "@lumi/db/schema";

import { protectedProcedure, publicProcedure } from "../trpc";

export const profileRouter = {
  // publicProcedure so unauthenticated users get null instead of UNAUTHORIZED
  get: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user) return null;
    const result = await ctx.db.query.UserProfile.findFirst({
      where: eq(UserProfile.userId, ctx.session.user.id),
    });
    return result ?? null;
  }),

  upsert: protectedProcedure
    .input(
      z.object({
        name: z.string().max(100).optional(),
        cycleLength: z.number().int().min(21).max(45).optional(),
        periodLength: z.number().int().min(1).max(10).optional(),
        lastPeriodStart: z.string().optional(),
        mode: z.enum(["cycle", "perimenopause"]).optional(),
        birthYear: z.number().int().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const existing = await ctx.db.query.UserProfile.findFirst({
        where: eq(UserProfile.userId, userId),
      });

      if (existing) {
        return ctx.db
          .update(UserProfile)
          .set(input)
          .where(eq(UserProfile.userId, userId));
      }

      return ctx.db.insert(UserProfile).values({
        userId,
        name: input.name ?? "",
        cycleLength: input.cycleLength ?? 28,
        periodLength: input.periodLength ?? 5,
        lastPeriodStart:
          input.lastPeriodStart ?? new Date().toISOString().slice(0, 10),
        mode: input.mode ?? "cycle",
        birthYear: input.birthYear,
      });
    }),
  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.delete(user).where(eq(user.id, ctx.session.user.id));
  }),
} satisfies TRPCRouterRecord;
