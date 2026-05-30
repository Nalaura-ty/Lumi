import { authRouter } from "./router/auth";
import { logRouter } from "./router/log";
import { postRouter } from "./router/post";
import { profileRouter } from "./router/profile";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  post: postRouter,
  profile: profileRouter,
  log: logRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
