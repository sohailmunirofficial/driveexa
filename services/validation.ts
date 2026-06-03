const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const PASSWORD_RESET_OTP_PATTERN = /^\d{6}$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateEmail(email: string): string | null {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return "Email is required.";
  }

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    return "Please enter a valid email address.";
  }

  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) {
    return "Password is required.";
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  return null;
}

export function normalizePasswordResetOtp(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6);
}

export function validatePasswordResetOtp(value: string): string | null {
  const normalizedOtp = normalizePasswordResetOtp(value);

  if (!normalizedOtp) {
    return "OTP is required.";
  }

  if (!PASSWORD_RESET_OTP_PATTERN.test(normalizedOtp)) {
    return "Please enter the 6-digit OTP sent to your email.";
  }

  return null;
}

export function validateRequiredText(
  value: string,
  label: string,
): string | null {
  if (!value.trim()) {
    return `${label} is required.`;
  }

  return null;
}
