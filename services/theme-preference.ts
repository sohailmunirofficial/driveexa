import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type ThemeMode = "system" | "light" | "dark";

const THEME_MODE_KEY = "drivexa.theme.mode";
let memoryThemeMode: ThemeMode = "system";

type LocalStorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

function getWebStorage(): LocalStorageLike | null {
  if (Platform.OS !== "web") {
    return null;
  }

  const globalWithStorage = globalThis as typeof globalThis & {
    localStorage?: LocalStorageLike;
  };

  return globalWithStorage.localStorage ?? null;
}

async function canUseSecureStore(): Promise<boolean> {
  if (Platform.OS === "web") {
    return false;
  }

  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function getStoredThemeMode(): Promise<ThemeMode> {
  const webStorage = getWebStorage();
  if (webStorage) {
    const webValue = webStorage.getItem(THEME_MODE_KEY);
    if (isThemeMode(webValue)) {
      memoryThemeMode = webValue;
      return webValue;
    }
  }

  if (!(await canUseSecureStore())) {
    return memoryThemeMode;
  }

  let storedValue: string | null = null;
  try {
    storedValue = await SecureStore.getItemAsync(THEME_MODE_KEY, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } catch (error) {
    console.error("Theme preference read failed:", error);
    return memoryThemeMode;
  }

  if (!isThemeMode(storedValue)) {
    return "system";
  }

  memoryThemeMode = storedValue;
  return storedValue;
}

export async function setStoredThemeMode(mode: ThemeMode): Promise<void> {
  memoryThemeMode = mode;

  const webStorage = getWebStorage();
  if (webStorage) {
    webStorage.setItem(THEME_MODE_KEY, mode);
    return;
  }

  if (!(await canUseSecureStore())) {
    return;
  }

  await SecureStore.setItemAsync(THEME_MODE_KEY, mode, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}
