import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Lumi",
  slug: "lumi",
  scheme: "lumi",
  version: "0.1.0",
  orientation: "portrait",
  icon: "./assets/icon-novo.png",
  userInterfaceStyle: "automatic",
  updates: {
    fallbackToCacheTimeout: 0,
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    bundleIdentifier: "com.lumi.app",
    supportsTablet: true,
    icon: {
      light: "./assets/icon-novo.png",
      dark: "./assets/icon-novo.png",
    },
  },
  android: {
    package: "com.lumi.app",
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
    adaptiveIcon: {
      foregroundImage: "./assets/icon-novo.png",
      backgroundColor: "#1A0F2E",
    },
  },
  extra: {
    eas: {
      projectId: "9f120495-4e47-4bb9-a7a3-076a07cd7741",
    },
  },
  experiments: {
    tsconfigPaths: true,
    typedRoutes: true,
    reactCanary: true,
    reactCompiler: true,
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-web-browser",
    [
      "expo-notifications",
      {
        icon: "./assets/icon-novo.png",
        color: "#8B7EC8",
        sounds: [],
      },
    ],
    [
      "expo-splash-screen",
      {
        backgroundColor: "#E4E4E7",
        image: "./assets/icon-novo.png",
        dark: {
          backgroundColor: "#18181B",
          image: "./assets/icon-novo.png",
        },
      },
    ],
  ],
});
