import type { TRPCRouterRecord } from "@trpc/server";
import { and, desc, eq, gte } from "drizzle-orm";
import { z } from "zod/v4";

import { DailyLog } from "@lumi/db/schema";

import { protectedProcedure } from "../trpc";

const LogInputSchema = z.object({
  date: z.string(),
  flow: z.string().nullable().optional(),
  moods: z.array(z.string()).optional(),
  pains: z.array(z.string()).optional(),
  pms: z.array(z.string()).optional(),
  discharge: z.string().nullable().optional(),
  sleepQuality: z.string().nullable().optional(),
  sleepHours: z.number().int().nullable().optional(),
  vitality: z.string().nullable().optional(),
  sex: z.array(z.string()).optional(),
  skin: z.array(z.string()).optional(),
  digestion: z.array(z.string()).optional(),
  exercise: z.array(z.string()).optional(),
  social: z.array(z.string()).optional(),
  health: z.array(z.string()).optional(),
  contraception: z.array(z.string()).optional(),
  menopause: z.array(z.string()).optional(),
  pregnancy: z.array(z.string()).optional(),
  weight: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const logRouter = {
  today: protectedProcedure
    .input(z.object({ date: z.string() }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db.query.DailyLog.findFirst({
        where: and(
          eq(DailyLog.userId, ctx.session.user.id),
          eq(DailyLog.date, input.date),
        ),
      });
      return result ?? null;
    }),

  byDate: protectedProcedure
    .input(z.object({ date: z.string() }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db.query.DailyLog.findFirst({
        where: and(
          eq(DailyLog.userId, ctx.session.user.id),
          eq(DailyLog.date, input.date),
        ),
      });
      return result ?? null;
    }),

  save: protectedProcedure
    .input(LogInputSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const existing = await ctx.db.query.DailyLog.findFirst({
        where: and(eq(DailyLog.userId, userId), eq(DailyLog.date, input.date)),
      });

      if (existing) {
        return ctx.db
          .update(DailyLog)
          .set(input)
          .where(
            and(eq(DailyLog.userId, userId), eq(DailyLog.date, input.date)),
          );
      }

      return ctx.db.insert(DailyLog).values({ ...input, userId });
    }),

  history: protectedProcedure
    .input(
      z.object({ days: z.number().int().min(1).max(365).default(90) }),
    )
    .query(async ({ ctx, input }) => {
      const since = new Date();
      since.setDate(since.getDate() - input.days);
      const sinceStr = since.toISOString().slice(0, 10);

      return ctx.db.query.DailyLog.findMany({
        where: and(
          eq(DailyLog.userId, ctx.session.user.id),
          gte(DailyLog.date, sinceStr),
        ),
        orderBy: desc(DailyLog.date),
      });
    }),

  clearAll: protectedProcedure.mutation(async ({ ctx }) => {
    const { db } = ctx;
    await db.delete(DailyLog).where(eq(DailyLog.userId, ctx.session.user.id));
  }),
} satisfies TRPCRouterRecord;
