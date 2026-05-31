import { useEffect } from "react";
import { Platform, View } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { router, Stack, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider, useMutation } from "@tanstack/react-query";

// Show notifications when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Android 8+ requires a channel
if (Platform.OS === "android") {
  void Notifications.setNotificationChannelAsync("default", {
    name: "Lumi",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
  });
}

import { ProfileProvider, useProfile } from "~/data/profile-context";
import { queryClient, trpc } from "~/utils/api";
import { authClient } from "~/utils/auth";

import "../styles.css";

const PUBLIC_SEGMENTS = new Set(["login", "register", "onboarding"]);

function AuthGatedStack() {
  const { data: session, isPending } = authClient.useSession();
  const { profile, isLoading: profileLoading } = useProfile();
  const segments = useSegments();
  const registerTokenMutation = useMutation(
    trpc.notification.registerToken.mutationOptions(),
  );

  // Register Expo push token with backend after login
  useEffect(() => {
    if (!session?.user) return;
    void (async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== "granted") return;
        const projectId = Constants.expoConfig?.extra?.eas?.projectId as
          | string
          | undefined;
        if (!projectId) return;
        const { data: token } = await Notifications.getExpoPushTokenAsync({
          projectId,
        });
        const platform = Platform.OS === "ios" ? "ios" : "android";
        registerTokenMutation.mutate({ token, platform });
      } catch {
        // not a physical device or permissions not granted
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (isPending) return;
    if (session) return;

    const firstSegment = segments[0] as string | undefined;
    const alreadyOnPublic = !!firstSegment && PUBLIC_SEGMENTS.has(firstSegment);

    if (!alreadyOnPublic) {
      router.replace("/login");
    }
  }, [session, isPending, segments]);

  // Redirect authenticated users to the correct screen
  useEffect(() => {
    if (isPending || !session) return;

    const firstSegment = segments[0] as string | undefined;
    const onPublic = !!firstSegment && PUBLIC_SEGMENTS.has(firstSegment);

    // Send authenticated users away from public screens
    if (onPublic) {
      if (!profileLoading && !profile) {
        router.replace("/onboarding");
      } else if (!profileLoading) {
        router.replace("/(tabs)");
      }
      return;
    }

    // Redirect to onboarding if profile is missing
    if (!profileLoading && !profile && firstSegment !== "onboarding") {
      router.replace("/onboarding");
    }
  }, [session, isPending, profile, profileLoading, segments]);

  // Block render only during the initial auth check
  if (isPending) {
    return <View style={{ flex: 1, backgroundColor: "#F8F7FD" }} />;
  }

  // Block render while profile is loading for authenticated users
  // (prevents flash of home before onboarding redirect)
  if (session && profileLoading) {
    return <View style={{ flex: 1, backgroundColor: "#F8F7FD" }} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Screen name="login" options={{ animation: "fade" }} />
      <Stack.Screen
        name="register"
        options={{ animation: "slide_from_bottom" }}
      />
      <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
      <Stack.Screen
        name="profile"
        options={{
          headerShown: true,
          headerTitle: "Meu Perfil",
          headerTintColor: "#fC6B87",
          headerStyle: { backgroundColor: "#FDF8FA" },
          presentation: "card",
          animation: "slide_from_right",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <Stack.Screen
        name="onboarding"
        options={{
          presentation: "fullScreenModal",
          animation: "fade_from_bottom",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ProfileProvider>
        <AuthGatedStack />
        <StatusBar style="dark" />
      </ProfileProvider>
    </QueryClientProvider>
  );
}
