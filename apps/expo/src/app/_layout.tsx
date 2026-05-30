import { useEffect } from "react";
import { View } from "react-native";
import { router, Stack, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";

import { ProfileProvider, useProfile } from "~/data/profile-context";
import { queryClient } from "~/utils/api";
import { authClient } from "~/utils/auth";

import "../styles.css";

const PUBLIC_SEGMENTS = new Set(["login", "register", "onboarding"]);

function AuthGatedStack() {
  const { data: session, isPending } = authClient.useSession();
  const { profile, isLoading: profileLoading } = useProfile();
  const segments = useSegments();
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
