import { pgTable, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { user } from "./auth-schema";

export const Post = pgTable("post", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  title: t.varchar({ length: 256 }).notNull(),
  content: t.text().notNull(),
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .$onUpdateFn(() => new Date()),
}));

export const CreatePostSchema = createInsertSchema(Post, {
  title: z.string().max(256),
  content: z.string().max(256),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UserProfile = pgTable("user_profile", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  userId: t
    .text()
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  name: t.varchar({ length: 100 }).notNull().default(""),
  cycleLength: t.integer().notNull().default(28),
  periodLength: t.integer().notNull().default(5),
  lastPeriodStart: t.date({ mode: "string" }).notNull().default("2000-01-01"),
  mode: t.varchar({ length: 20 }).notNull().default("cycle"),
  birthYear: t.integer(),
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .$onUpdateFn(() => new Date()),
}));

export const DailyLog = pgTable(
  "daily_log",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    userId: t
      .text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    date: t.date({ mode: "string" }).notNull(),
    flow: t.varchar({ length: 20 }),
    moods: t.jsonb().$type<string[]>().default([]),
    pains: t.jsonb().$type<string[]>().default([]),
    pms: t.jsonb().$type<string[]>().default([]),
    discharge: t.varchar({ length: 20 }),
    sleepQuality: t.varchar({ length: 20 }),
    sleepHours: t.integer(),
    vitality: t.varchar({ length: 20 }),
    sex: t.jsonb().$type<string[]>().default([]),
    skin: t.jsonb().$type<string[]>().default([]),
    digestion: t.jsonb().$type<string[]>().default([]),
    exercise: t.jsonb().$type<string[]>().default([]),
    social: t.jsonb().$type<string[]>().default([]),
    health: t.jsonb().$type<string[]>().default([]),
    contraception: t.jsonb().$type<string[]>().default([]),
    menopause: t.jsonb().$type<string[]>().default([]),
    pregnancy: t.jsonb().$type<string[]>().default([]),
    weight: t.real(),
    notes: t.text(),
    createdAt: t.timestamp().defaultNow().notNull(),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .$onUpdateFn(() => new Date()),
  }),
  (table) => [
    unique("daily_log_user_date_unique").on(table.userId, table.date),
  ],
);

export * from "./auth-schema";
