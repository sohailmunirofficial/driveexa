import * as Crypto from "expo-crypto";
import { hashPassword, verifyPasswordHash } from "./auth-security";
import { db } from "./db";
import { normalizeEmail, normalizePasswordResetOtp } from "./validation";

const PASSWORD_RESET_OTP_TTL_MINUTES = 10;
const PASSWORD_RESET_OTP_MAX_ATTEMPTS = 5;
const OTP_MODULO = 1_000_000;

type PasswordResetUser = {
  id: number;
  name: string;
  email: string;
};

type PasswordResetOtpRecord = {
  id: number;
  user_id: number;
  otp_hash: string;
  expires_at: string;
  attempt_count: number;
};

export type PasswordResetOtpCreation = {
  email: string;
  otp: string;
  expiresAt: string;
  userName: string;
};

export type PasswordResetOtpCreationResult =
  | {
      status: "created";
      otp: PasswordResetOtpCreation;
    }
  | {
      status: "not_found";
    }
  | {
      status: "error";
      message: string;
    };

async function createPlainOtp(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(4);
  const randomValue =
    ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;

  return String(randomValue % OTP_MODULO).padStart(6, "0");
}

function getOtpHashInput(userId: number, otp: string): string {
  return `${userId}:${normalizePasswordResetOtp(otp)}`;
}

function createExpiryDate(): Date {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + PASSWORD_RESET_OTP_TTL_MINUTES);
  return expiresAt;
}

function isOtpExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() <= Date.now();
}

async function findUserByEmail(
  email: string,
): Promise<PasswordResetUser | null> {
  const user = await db.getFirstAsync<PasswordResetUser>(
    "SELECT id, name, email FROM users WHERE LOWER(email) = LOWER(?)",
    [normalizeEmail(email)],
  );

  return user || null;
}

async function deleteExpiredOtps(): Promise<void> {
  await db.runAsync("DELETE FROM password_reset_otps WHERE expires_at <= ?", [
    new Date().toISOString(),
  ]);
}

export const PasswordResetRepository = {
  async createOtpForEmail(
    email: string,
  ): Promise<PasswordResetOtpCreationResult> {
    try {
      const normalizedEmail = normalizeEmail(email);
      const user = await findUserByEmail(normalizedEmail);

      if (!user) {
        return { status: "not_found" };
      }

      const otp = await createPlainOtp();
      const otpHash = await hashPassword(getOtpHashInput(user.id, otp));
      const expiresAt = createExpiryDate().toISOString();

      await db.withTransactionAsync(async () => {
        await deleteExpiredOtps();
        await db.runAsync("DELETE FROM password_reset_otps WHERE user_id = ?", [
          user.id,
        ]);
        await db.runAsync(
          "INSERT INTO password_reset_otps (user_id, otp_hash, expires_at, attempt_count) VALUES (?, ?, ?, 0)",
          [user.id, otpHash, expiresAt],
        );
      });

      return {
        status: "created",
        otp: {
          email: normalizedEmail,
          otp,
          expiresAt,
          userName: user.name,
        },
      };
    } catch (error) {
      console.error("Error creating password reset OTP:", error);
      return {
        status: "error",
        message: "Unable to create a password reset OTP right now.",
      };
    }
  },

  async revokeOtpForEmail(email: string): Promise<void> {
    try {
      const user = await findUserByEmail(email);
      if (!user) {
        return;
      }

      await db.runAsync("DELETE FROM password_reset_otps WHERE user_id = ?", [
        user.id,
      ]);
    } catch (error) {
      console.error("Error revoking password reset OTP:", error);
    }
  },

  async resetPasswordWithOtp(
    email: string,
    otp: string,
    password: string,
  ): Promise<boolean> {
    try {
      const normalizedEmail = normalizeEmail(email);
      const normalizedOtp = normalizePasswordResetOtp(otp);
      await deleteExpiredOtps();

      const resetOtp = await db.getFirstAsync<PasswordResetOtpRecord>(
        `
          SELECT password_reset_otps.id,
                 password_reset_otps.user_id,
                 password_reset_otps.otp_hash,
                 password_reset_otps.expires_at,
                 password_reset_otps.attempt_count
          FROM password_reset_otps
          INNER JOIN users ON users.id = password_reset_otps.user_id
          WHERE LOWER(users.email) = LOWER(?)
          ORDER BY password_reset_otps.created_at DESC
          LIMIT 1
        `,
        [normalizedEmail],
      );

      if (!resetOtp || isOtpExpired(resetOtp.expires_at)) {
        if (resetOtp) {
          await db.runAsync("DELETE FROM password_reset_otps WHERE id = ?", [
            resetOtp.id,
          ]);
        }
        return false;
      }

      if (resetOtp.attempt_count >= PASSWORD_RESET_OTP_MAX_ATTEMPTS) {
        await db.runAsync("DELETE FROM password_reset_otps WHERE id = ?", [
          resetOtp.id,
        ]);
        return false;
      }

      const isOtpVerified = await verifyPasswordHash(
        getOtpHashInput(resetOtp.user_id, normalizedOtp),
        resetOtp.otp_hash,
      );

      if (!isOtpVerified) {
        const nextAttemptCount = resetOtp.attempt_count + 1;
        if (nextAttemptCount >= PASSWORD_RESET_OTP_MAX_ATTEMPTS) {
          await db.runAsync("DELETE FROM password_reset_otps WHERE id = ?", [
            resetOtp.id,
          ]);
        } else {
          await db.runAsync(
            "UPDATE password_reset_otps SET attempt_count = ? WHERE id = ?",
            [nextAttemptCount, resetOtp.id],
          );
        }
        return false;
      }

      const passwordHash = await hashPassword(password);

      await db.withTransactionAsync(async () => {
        await db.runAsync("UPDATE users SET password = ? WHERE id = ?", [
          passwordHash,
          resetOtp.user_id,
        ]);
        await db.runAsync("DELETE FROM password_reset_otps WHERE user_id = ?", [
          resetOtp.user_id,
        ]);
      });

      return true;
    } catch (error) {
      console.error("Error resetting password with OTP:", error);
      return false;
    }
  },
};
