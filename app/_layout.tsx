import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import * as ScreenCapture from "expo-screen-capture";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { LogBox, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, useThemeController } from "../components/ui/theme";
import { AuthProvider, useAuth } from "../context/auth";
import "./global.css";

// Suppress SafeAreaView deprecation warning since we're using react-native-safe-area-context
LogBox.ignoreLogs(["SafeAreaView has been deprecated"]);
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <RootLayoutContent />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function RootLayoutContent() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();
  const { appTheme, isReady: isThemeReady } = useThemeController();

  useEffect(() => {
    if (Platform.OS === "web") return;

    void ScreenCapture.allowScreenCaptureAsync().catch((error: unknown) => {
      console.warn("Unable to allow screen capture:", error);
    });
  }, []);

  useEffect(() => {
    if (isLoading || !isThemeReady) return;

    const inAuthGroup = segments[0] === "auth";
    const isRootRoute = pathname === "/";

    if (!user && !inAuthGroup) {
      router.replace("/auth/login");
      return;
    }

    if (user && (inAuthGroup || isRootRoute)) {
      router.replace("/home");
    }
  }, [user, segments, pathname, isLoading, isThemeReady, router]);

  useEffect(() => {
    if (isLoading || !isThemeReady) {
      return;
    }

    void SplashScreen.hideAsync();
  }, [isLoading, isThemeReady]);

  if (isLoading || !isThemeReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <StatusBar style={appTheme.isDark ? "light" : "dark"} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: appTheme.colors.background },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}