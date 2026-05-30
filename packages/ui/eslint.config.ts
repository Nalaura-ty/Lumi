import { defineConfig } from "eslint/config";

import { baseConfig } from "@lumi/eslint-config/base";
import { reactConfig } from "@lumi/eslint-config/react";

export default defineConfig(
  {
    ignores: ["dist/**"],
  },
  baseConfig,
  reactConfig,
);
