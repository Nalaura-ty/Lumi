import { defineConfig } from "eslint/config";

import { baseConfig } from "@lumi/eslint-config/base";
import { reactConfig } from "@lumi/eslint-config/react";

export default defineConfig(
  {
    ignores: [".expo/**", "expo-plugins/**"],
  },
  baseConfig,
  reactConfig,
);
