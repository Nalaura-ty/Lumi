import Constants from "expo-constants";

/**
 * Extend this function when going to production by
 * setting the baseUrl to your production API URL.
 */
export const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  const debuggerHost = Constants.expoConfig?.hostUri;
  const host = debuggerHost?.split(":")[0];

  if (!host || host === "127.0.0.1" || host === "localhost") {
    throw new Error(
      "Metro is running on loopback. Set EXPO_PUBLIC_API_URL=http://<your-ip>:3000 in apps/expo/.env",
    );
  }

  return `http://${host}:3000`;
};
