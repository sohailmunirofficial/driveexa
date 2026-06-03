import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import {
  normalizeEmail,
  normalizePasswordResetOtp,
  validateEmail,
  validatePasswordResetOtp,
} from "../../../services/validation";

type PasswordResetOtpEmailRequest = {
  email: string;
  otp: string;
};

type SmtpConfig = {
  service?: string;
  host?: string;
  port?: number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
};

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

const jsonHeaders = {
  "Content-Type": "application/json",
};
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const rateLimits = new Map<string, RateLimitRecord>();

function getOptionalEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value || undefined;
}

function getRequiredEnv(key: string): string {
  const value = getOptionalEnv(key);
  if (!value) {
    throw new Error(`Missing required SMTP environment variable: ${key}`);
  }

  return value;
}

function parseSmtpPort(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error("SMTP_PORT must be a valid TCP port.");
  }

  return port;
}

function getSmtpConfig(): SmtpConfig {
  const service = getOptionalEnv("SMTP_SERVICE");
  const host = getOptionalEnv("SMTP_HOST");
  const port = parseSmtpPort(getOptionalEnv("SMTP_PORT"));
  const user = getRequiredEnv("SMTP_USER");
  const pass = getRequiredEnv("SMTP_PASS");
  const fromEmail = getOptionalEnv("FROM_EMAIL") || user;
  const fromName = getOptionalEnv("FROM_NAME") || "Driveexa";

  if (!service && !host) {
    throw new Error("Either SMTP_SERVICE or SMTP_HOST must be configured.");
  }

  return {
    service,
    host,
    port,
    secure: port === 465,
    user,
    pass,
    fromEmail,
    fromName,
  };
}

function isPasswordResetOtpEmailRequest(
  value: unknown,
): value is PasswordResetOtpEmailRequest {
  return (
    typeof value === "object" &&
    value !== null &&
    "email" in value &&
    "otp" in value &&
    typeof value.email === "string" &&
    typeof value.otp === "string"
  );
}

function createTransportOptions(config: SmtpConfig): SMTPTransport.Options {
  const auth = {
    user: config.user,
    pass: config.pass,
  };

  if (config.service) {
    return {
      service: config.service,
      auth,
    };
  }

  return {
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth,
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function createRateLimitKey(request: Request, email: string): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientIp =
    forwardedFor?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  return `${clientIp}:${email}`;
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const existingRecord = rateLimits.get(key);

  if (!existingRecord || existingRecord.resetAt <= now) {
    rateLimits.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  if (existingRecord.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  rateLimits.set(key, {
    ...existingRecord,
    count: existingRecord.count + 1,
  });
  return false;
}

function createOtpEmailHtml(otp: string): string {
  const escapedOtp = escapeHtml(otp);

  return `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
      <h2 style="margin: 0 0 12px;">Reset your Driveexa password</h2>
      <p style="margin: 0 0 18px;">Use this one-time password to reset your account password. It expires in 10 minutes.</p>
      <div style="display: inline-block; letter-spacing: 8px; background: #f4f0ff; color: #5b21b6; padding: 14px 18px; border-radius: 12px; font-size: 28px; font-weight: 800;">${escapedOtp}</div>
      <p style="margin: 18px 0 0; color: #6b7280; font-size: 13px;">If you did not request this, no action is required.</p>
    </div>
  `;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body: unknown = await request.json();
    const normalizedEmail = isPasswordResetOtpEmailRequest(body)
      ? normalizeEmail(body.email)
      : "";
    const normalizedOtp = isPasswordResetOtpEmailRequest(body)
      ? normalizePasswordResetOtp(body.otp)
      : "";

    if (
      !isPasswordResetOtpEmailRequest(body) ||
      validateEmail(normalizedEmail) ||
      validatePasswordResetOtp(normalizedOtp)
    ) {
      return Response.json(
        {
          success: false,
          message: "Invalid password reset OTP request.",
        },
        { status: 400, headers: jsonHeaders },
      );
    }

    if (isRateLimited(createRateLimitKey(request, normalizedEmail))) {
      return Response.json(
        {
          success: false,
          message: "Too many reset emails requested. Please try again later.",
        },
        { status: 429, headers: jsonHeaders },
      );
    }

    const config = getSmtpConfig();
    const transporter = nodemailer.createTransport(
      createTransportOptions(config),
    );

    await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: normalizedEmail,
      subject: "Your Driveexa password reset OTP",
      text: `Use this one-time password to reset your Driveexa password. It expires in 10 minutes.\n\nOTP: ${normalizedOtp}\n\nIf you did not request this, no action is required.`,
      html: createOtpEmailHtml(normalizedOtp),
    });

    return Response.json(
      {
        success: true,
        message: "Reset OTP sent.",
      },
      { headers: jsonHeaders },
    );
  } catch (error) {
    console.error("Password reset OTP email error:", error);
    return Response.json(
      {
        success: false,
        message: "Unable to send reset OTP right now.",
      },
      { status: 500, headers: jsonHeaders },
    );
  }
}
