import { defineConfig } from "eslint/config";

import { baseConfig, restrictEnvAccess } from "@lumi/eslint-config/base";
import { nextjsConfig } from "@lumi/eslint-config/nextjs";
import { reactConfig } from "@lumi/eslint-config/react";

export default defineConfig(
  {
    ignores: [".next/**"],
  },
  baseConfig,
  reactConfig,
  nextjsConfig,
  restrictEnvAccess,
);
