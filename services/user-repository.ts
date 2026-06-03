import { db } from "./db";
import {
  hashPassword,
  shouldRehashPassword,
  verifyPasswordHash,
} from "./auth-security";
import { normalizeEmail } from "./validation";

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  created_at?: string;
}

export type UserCreateInput = {
  name: string;
  email: string;
  phone?: string;
  password: string;
};

export type UserUpdateInput = Partial<
  Pick<User, "name" | "email" | "phone">
> & {
  password?: string;
};

type UserPasswordRecord = User & {
  password: string;
};

type SqliteValue = string | number | null;

const USER_PUBLIC_COLUMNS = "id, name, email, phone, created_at";

function toPublicUser(user: UserPasswordRecord): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    created_at: user.created_at,
  };
}

async function migratePasswordIfNeeded(
  userId: number,
  password: string,
  storedPassword: string,
): Promise<void> {
  if (!shouldRehashPassword(storedPassword)) {
    return;
  }

  const passwordHash = await hashPassword(password);
  await db.runAsync("UPDATE users SET password = ? WHERE id = ?", [
    passwordHash,
    userId,
  ]);
}

export const UserRepository = {
  async createUser(user: UserCreateInput): Promise<User | null> {
    try {
      const email = normalizeEmail(user.email);
      const passwordHash = await hashPassword(user.password);
      const result = await db.runAsync(
        "INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)",
        [user.name.trim(), email, user.phone?.trim() || "", passwordHash],
      );
      return {
        id: result.lastInsertRowId,
        name: user.name.trim(),
        email,
        phone: user.phone?.trim() || "",
      };
    } catch (error) {
      console.error("Error creating user:", error);
      return null;
    }
  },

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const user = await db.getFirstAsync<User>(
        `SELECT ${USER_PUBLIC_COLUMNS} FROM users WHERE LOWER(email) = LOWER(?)`,
        [normalizeEmail(email)],
      );
      return user || null;
    } catch (error) {
      console.error("Error getting user by email:", error);
      return null;
    }
  },

  async getUserById(id: number): Promise<User | null> {
    try {
      const user = await db.getFirstAsync<User>(
        `SELECT ${USER_PUBLIC_COLUMNS} FROM users WHERE id = ?`,
        [id],
      );
      return user || null;
    } catch (error) {
      console.error("Error getting user by ID:", error);
      return null;
    }
  },

  async verifyCredentials(
    email: string,
    password: string,
  ): Promise<User | null> {
    try {
      const user = await db.getFirstAsync<UserPasswordRecord>(
        `SELECT ${USER_PUBLIC_COLUMNS}, password FROM users WHERE LOWER(email) = LOWER(?)`,
        [normalizeEmail(email)],
      );

      if (!user) return null;

      const isVerified = await verifyPasswordHash(password, user.password);
      if (!isVerified) return null;

      await migratePasswordIfNeeded(user.id, password, user.password);

      return toPublicUser(user);
    } catch (error) {
      console.error("Error verifying credentials:", error);
      return null;
    }
  },

  async updateUser(id: number, updates: UserUpdateInput): Promise<boolean> {
    try {
      const sets: string[] = [];
      const params: SqliteValue[] = [];
      if (updates.name) {
        sets.push("name = ?");
        params.push(updates.name.trim());
      }
      if (updates.email) {
        sets.push("email = ?");
        params.push(normalizeEmail(updates.email));
      }
      if (updates.phone !== undefined) {
        sets.push("phone = ?");
        params.push(updates.phone.trim());
      }
      if (updates.password) {
        sets.push("password = ?");
        params.push(await hashPassword(updates.password));
      }

      if (sets.length === 0) return true;

      params.push(id);
      await db.runAsync(
        `UPDATE users SET ${sets.join(", ")} WHERE id = ?`,
        params,
      );
      return true;
    } catch (error) {
      console.error("Error updating user:", error);
      return false;
    }
  },

  async verifyPassword(id: number, password: string): Promise<boolean> {
    try {
      const user = await db.getFirstAsync<
        Pick<UserPasswordRecord, "id" | "password">
      >("SELECT id, password FROM users WHERE id = ?", [id]);
      if (!user) return false;

      const isVerified = await verifyPasswordHash(password, user.password);
      if (!isVerified) return false;

      await migratePasswordIfNeeded(id, password, user.password);

      return true;
    } catch (error) {
      console.error("Error verifying password:", error);
      return false;
    }
  },

  async getUserCount(): Promise<number> {
    try {
      const result = await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM users",
      );
      return result?.count || 0;
    } catch (error) {
      console.error("Error getting user count", error);
      return 0;
    }
  },
};
