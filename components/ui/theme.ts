import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Appearance, ColorSchemeName, useColorScheme } from "react-native";
import {
  getStoredThemeMode,
  setStoredThemeMode,
  type ThemeMode,
} from "../../services/theme-preference";

const spacing = {
  screen: 20,
  card: 18,
  section: 24,
};

const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
};

export const lightTheme = {
  isDark: false,
  colors: {
    background: "#eef3f8",
    backgroundElevated: "#f7fafc",
    surface: "#ffffff",
    surfaceMuted: "#edf3f7",
    surfaceRaised: "#fbfdff",
    glass: "rgba(255, 255, 255, 0.82)",
    border: "#d9e3ec",
    borderSoft: "#e8eef5",
    text: "#101827",
    textMuted: "#617187",
    textSubtle: "#96a3b5",
    primary: "#2f6fed",
    primaryDark: "#174ea6",
    primarySoft: "#dfeaff",
    accent: "#11a37f",
    accentSoft: "#d8f8ee",
    warning: "#d97706",
    warningSoft: "#fff2cc",
    success: "#079669",
    successSoft: "#d9f8e9",
    danger: "#dc2626",
    dangerSoft: "#ffe1e1",
    slate: "#39475b",
    dark: "#0f172a",
    white: "#ffffff",
  },
  gradients: {
    screen: ["#f7fbff", "#eef4fb", "#e8f1f7"],
    hero: ["#123a73", "#2f6fed", "#12a98f"],
    card: ["rgba(255,255,255,0.96)", "rgba(247,250,252,0.9)"],
    primary: ["#4f8cff", "#2f6fed", "#174ea6"],
    emerald: ["#16c79a", "#0f9f7c"],
    graphite: ["#1e293b", "#111827"],
    amber: ["#f59e0b", "#d97706"],
  },
  shadow: {
    card: "0 18px 42px rgba(16, 24, 39, 0.12)",
    soft: "0 10px 24px rgba(16, 24, 39, 0.09)",
    action: "0 14px 30px rgba(47, 111, 237, 0.28)",
    glow: "0 24px 56px rgba(47, 111, 237, 0.18)",
  },
  spacing,
  radius,
} as const;

export const darkTheme = {
  isDark: true,
  colors: {
    background: "#07111f",
    backgroundElevated: "#0b1626",
    surface: "#111c2d",
    surfaceMuted: "#162337",
    surfaceRaised: "#18273d",
    glass: "rgba(17, 28, 45, 0.82)",
    border: "#25364f",
    borderSoft: "#1c2a40",
    text: "#f7fafc",
    textMuted: "#b3c0cf",
    textSubtle: "#7d8da4",
    primary: "#7aa7ff",
    primaryDark: "#4f8cff",
    primarySoft: "#172a4d",
    accent: "#36d6ad",
    accentSoft: "#0d3b34",
    warning: "#f7ba43",
    warningSoft: "#3b2b10",
    success: "#42d69f",
    successSoft: "#0d3a2d",
    danger: "#ff7b7b",
    dangerSoft: "#421b22",
    slate: "#d8e1ed",
    dark: "#e7eef8",
    white: "#ffffff",
  },
  gradients: {
    screen: ["#07111f", "#0a1524", "#101d30"],
    hero: ["#07111f", "#143a76", "#0b7564"],
    card: ["rgba(24,39,61,0.96)", "rgba(17,28,45,0.9)"],
    primary: ["#7aa7ff", "#4f8cff", "#235fc8"],
    emerald: ["#36d6ad", "#119a78"],
    graphite: ["#24324a", "#111c2d"],
    amber: ["#f7ba43", "#d97706"],
  },
  shadow: {
    card: "0 20px 46px rgba(0, 0, 0, 0.32)",
    soft: "0 12px 28px rgba(0, 0, 0, 0.24)",
    action: "0 16px 34px rgba(79, 140, 255, 0.28)",
    glow: "0 24px 56px rgba(54, 214, 173, 0.16)",
  },
  spacing,
  radius,
} as const;

export type AppTheme = typeof lightTheme | typeof darkTheme;
export type ThemeColor = keyof AppTheme["colors"];
type ResolvedThemeScheme = "light" | "dark";

type ThemeContextValue = {
  appTheme: AppTheme;
  isReady: boolean;
  mode: ThemeMode;
  resolvedScheme: ResolvedThemeScheme;
  setMode: (mode: ThemeMode) => Promise<void>;
};

export const theme =
  Appearance.getColorScheme() === "dark" ? darkTheme : lightTheme;

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveThemeScheme(
  mode: ThemeMode,
  systemScheme: ColorSchemeName,
): ResolvedThemeScheme {
  if (mode === "light" || mode === "dark") {
    return mode;
  }

  return systemScheme === "dark" ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [isReady, setIsReady] = useState(false);
  const resolvedScheme = resolveThemeScheme(mode, systemScheme);
  const appTheme = resolvedScheme === "dark" ? darkTheme : lightTheme;

  useEffect(() => {
    let isMounted = true;

    async function loadThemeMode() {
      const storedMode = await getStoredThemeMode();
      if (!isMounted) {
        return;
      }

      setModeState(storedMode);
      setIsReady(true);
    }

    void loadThemeMode();

    return () => {
      isMounted = false;
    };
  }, []);

  const setMode = useCallback(async (nextMode: ThemeMode) => {
    setModeState(nextMode);
    try {
      await setStoredThemeMode(nextMode);
    } catch (error) {
      console.error("Theme preference save failed:", error);
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      appTheme,
      isReady,
      mode,
      resolvedScheme,
      setMode,
    }),
    [appTheme, isReady, mode, resolvedScheme, setMode],
  );

  return React.createElement(ThemeContext.Provider, { value }, children);
}

export function useAppTheme(): AppTheme {
  const context = useContext(ThemeContext);
  const scheme = useColorScheme();

  if (context) {
    return context.appTheme;
  }

  return scheme === "dark" ? darkTheme : lightTheme;
}

export function useThemeController(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeController must be used within ThemeProvider");
  }

  return context;
}
