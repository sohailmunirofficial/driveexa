import { db } from "./db";

export const SettingsRepository = {
  async set(key: string, value: string): Promise<void> {
    try {
      await db.runAsync(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
        [key, value],
      );
    } catch (error) {
      console.error("Error setting setting:", error);
    }
  },

  async get(key: string): Promise<string | null> {
    try {
      const result = await db.getFirstAsync<{ value: string }>(
        "SELECT value FROM settings WHERE key = ?",
        [key],
      );
      return result?.value || null;
    } catch (error) {
      console.error("Error getting setting:", error);
      return null;
    }
  },
};
