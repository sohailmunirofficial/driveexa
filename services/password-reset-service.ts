import Constants from "expo-constants";
import { PasswordResetRepository } from "./password-reset-repository";
import {
  normalizeEmail,
  normalizePasswordResetOtp,
  validateEmail,
  validatePassword,
  validatePasswordResetOtp,
} from "./validation";

const RESET_EMAIL_SUCCESS_MESSAGE =
  "If an admin account exists for this email, a 6-digit OTP has been sent.";
const RESET_EMAIL_FAILURE_MESSAGE =
  "Unable to send reset OTP right now. Please check the SMTP setup and try again.";
const INVALID_OTP_MESSAGE =
  "The OTP is invalid, expired, or already used. Please request a new OTP.";

type PasswordResetResult = {
  success: boolean;
  message: string;
};

type ResetEmailApiResponse = {
  success: boolean;
  message?: string;
};

function isResetEmailApiResponse(
  value: unknown,
): value is ResetEmailApiResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    typeof value.success === "boolean" &&
    (!("message" in value) || typeof value.message === "string")
  );
}

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, "");
}

function getApiBaseUrl(): string | null {
  const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

  if (configuredBaseUrl) {
    return trimTrailingSlashes(configuredBaseUrl);
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) {
    return null;
  }

  return `http://${trimTrailingSlashes(hostUri.split("/")[0] ?? hostUri)}`;
}

async function readJsonResponse(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function sendResetOtp(
  email: string,
  otp: string,
): Promise<PasswordResetResult> {
  const apiBaseUrl = getApiBaseUrl();

  if (!apiBaseUrl) {
    return {
      success: false,
      message:
        "Password reset email service is not configured for this build. Set EXPO_PUBLIC_API_BASE_URL and try again.",
    };
  }

  try {
    const response = await fetch(`${apiBaseUrl}/api/password-reset/send-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, otp }),
    });

    const payload = await readJsonResponse(response);
    const apiPayload = isResetEmailApiResponse(payload) ? payload : null;

    if (!response.ok || !apiPayload?.success) {
      return {
        success: false,
        message: apiPayload?.message || RESET_EMAIL_FAILURE_MESSAGE,
      };
    }

    return {
      success: true,
      message: apiPayload.message || RESET_EMAIL_SUCCESS_MESSAGE,
    };
  } catch (error) {
    console.error("Password reset OTP email request failed:", error);
    return {
      success: false,
      message: RESET_EMAIL_FAILURE_MESSAGE,
    };
  }
}

export const PasswordResetService = {
  async requestPasswordReset(email: string): Promise<PasswordResetResult> {
    const emailError = validateEmail(email);
    if (emailError) {
      return { success: false, message: emailError };
    }

    const otpResult = await PasswordResetRepository.createOtpForEmail(email);

    if (otpResult.status === "error") {
      return { success: false, message: otpResult.message };
    }

    if (otpResult.status === "not_found") {
      return { success: true, message: RESET_EMAIL_SUCCESS_MESSAGE };
    }

    const emailResult = await sendResetOtp(
      otpResult.otp.email,
      otpResult.otp.otp,
    );

    if (!emailResult.success) {
      await PasswordResetRepository.revokeOtpForEmail(otpResult.otp.email);
      return emailResult;
    }

    return { success: true, message: RESET_EMAIL_SUCCESS_MESSAGE };
  },

  async resetPassword(
    email: string,
    otp: string,
    password: string,
    confirmPassword: string,
  ): Promise<PasswordResetResult> {
    const emailError = validateEmail(email);
    if (emailError) {
      return { success: false, message: emailError };
    }

    const otpError = validatePasswordResetOtp(otp);
    if (otpError) {
      return { success: false, message: otpError };
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return { success: false, message: passwordError };
    }

    if (password !== confirmPassword) {
      return { success: false, message: "Passwords do not match." };
    }

    const didResetPassword = await PasswordResetRepository.resetPasswordWithOtp(
      normalizeEmail(email),
      normalizePasswordResetOtp(otp),
      password,
    );

    if (!didResetPassword) {
      return { success: false, message: INVALID_OTP_MESSAGE };
    }

    return {
      success: true,
      message: "Your password has been updated. You can sign in now.",
    };
  },
};
