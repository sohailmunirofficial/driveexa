import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const AUTH_USER_ID_KEY = "drivexa.auth.userId";

let memoryUserId: number | null = null;

async function canUseSecureStore(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function getStoredAuthUserId(): Promise<number | null> {
  if (!(await canUseSecureStore())) {
    return memoryUserId;
  }

  const storedValue = await SecureStore.getItemAsync(AUTH_USER_ID_KEY, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  const parsedUserId = storedValue ? Number(storedValue) : NaN;

  return Number.isSafeInteger(parsedUserId) && parsedUserId > 0
    ? parsedUserId
    : null;
}

export async function setStoredAuthUserId(userId: number): Promise<void> {
  memoryUserId = userId;

  if (!(await canUseSecureStore())) {
    return;
  }

  await SecureStore.setItemAsync(AUTH_USER_ID_KEY, userId.toString(), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function clearStoredAuthUserId(): Promise<void> {
  memoryUserId = null;

  if (!(await canUseSecureStore())) {
    return;
  }

  await SecureStore.deleteItemAsync(AUTH_USER_ID_KEY, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}
