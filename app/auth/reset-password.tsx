import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { Eye, EyeOff, KeyRound, LockKeyhole, Mail } from "lucide-react-native";
import { useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { ActionSheet } from "../../components/ui/action-sheet";
import {
  AuthField,
  AuthLayout,
  AuthPrimaryButton,
} from "../../components/ui/auth-layout";
import { AppScreen } from "../../components/ui/primitives";
import { AppTheme, useAppTheme } from "../../components/ui/theme";
import { PasswordResetService } from "../../services/password-reset-service";
import {
  normalizePasswordResetOtp,
  validateEmail,
  validatePassword,
  validatePasswordResetOtp,
} from "../../services/validation";

type ResetPasswordParams = {
  email?: string | string[];
};

type ResetPasswordErrors = {
  email: string | null;
  otp: string | null;
  password: string | null;
  confirmPassword: string | null;
};

type AlertConfig = {
  title: string;
  message: string;
  status: "success" | "error" | "info";
  onConfirm: () => void;
};

function getRouteParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default function ResetPassword() {
  const router = useRouter();
  const params = useLocalSearchParams<ResetPasswordParams>();
  const routeEmail = getRouteParam(params.email);
  const appTheme = useAppTheme();
  const { width } = useWindowDimensions();
  const styles = useMemo(
    () => createStyles(appTheme, width),
    [appTheme, width],
  );

  const [email, setEmail] = useState(routeEmail);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<ResetPasswordErrors>({
    email: null,
    otp: null,
    password: null,
    confirmPassword: null,
  });

  const otpRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);
  const alertSheetRef = useRef<BottomSheetModal>(null);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    title: "",
    message: "",
    status: "info",
    onConfirm: () => {},
  });

  const showAlert = (
    title: string,
    message: string,
    status: AlertConfig["status"],
    onConfirm: () => void = () => {},
  ) => {
    setAlertConfig({ title, message, status, onConfirm });
    alertSheetRef.current?.present();
  };

  const handleResetPassword = async () => {
    const passwordError = validatePassword(password);
    const nextErrors: ResetPasswordErrors = {
      email: validateEmail(email),
      otp: validatePasswordResetOtp(otp),
      password: passwordError,
      confirmPassword:
        passwordError || password === confirmPassword
          ? null
          : "Passwords do not match.",
    };
    setErrors(nextErrors);

    if (
      nextErrors.email ||
      nextErrors.otp ||
      nextErrors.password ||
      nextErrors.confirmPassword
    ) {
      return;
    }

    setIsSubmitting(true);
    const result = await PasswordResetService.resetPassword(
      email,
      otp,
      password,
      confirmPassword,
    );
    setIsSubmitting(false);

    showAlert(
      result.success ? "Password Updated" : "Reset Failed",
      result.message,
      result.success ? "success" : "error",
      result.success ? () => router.replace("/auth/login") : () => {},
    );
  };

  return (
    <AppScreen>
      <AuthLayout
        title="New Password"
        subtitle="Enter your email OTP and create a strong new password."
        showHero={false}
        footer={
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Back to </Text>
            <Link href="/auth/login" asChild>
              <TouchableOpacity activeOpacity={0.8}>
                <Text style={styles.footerLink}>Sign in ›</Text>
              </TouchableOpacity>
            </Link>
          </View>
        }
      >
        <AuthField
          label="Email"
          icon={Mail}
          placeholder="you@example.com"
          autoCapitalize="none"
          editable={!routeEmail}
          keyboardType="email-address"
          returnKeyType="next"
          value={email}
          error={errors.email}
          onSubmitEditing={() => otpRef.current?.focus()}
          onChangeText={(value) => {
            setEmail(value);
            if (errors.email) {
              setErrors((current) => ({ ...current, email: null }));
            }
          }}
        />

        <AuthField
          ref={otpRef}
          label="Email OTP"
          icon={KeyRound}
          placeholder="Enter 6-digit OTP"
          keyboardType="number-pad"
          returnKeyType="next"
          value={otp}
          error={errors.otp}
          maxLength={6}
          onSubmitEditing={() => passwordRef.current?.focus()}
          onChangeText={(value) => {
            setOtp(normalizePasswordResetOtp(value));
            if (errors.otp) {
              setErrors((current) => ({ ...current, otp: null }));
            }
          }}
        />

        <AuthField
          ref={passwordRef}
          label="New Password"
          icon={LockKeyhole}
          placeholder="Enter new password"
          secureTextEntry={!showPassword}
          returnKeyType="next"
          value={password}
          error={errors.password}
          onSubmitEditing={() => confirmPasswordRef.current?.focus()}
          onChangeText={(value) => {
            setPassword(value);
            if (errors.password) {
              setErrors((current) => ({ ...current, password: null }));
            }
          }}
          right={
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setShowPassword((visible) => !visible)}
              style={styles.eyeButton}
            >
              {showPassword ? (
                <EyeOff size={styles.eyeIcon.width} color="#737b95" />
              ) : (
                <Eye size={styles.eyeIcon.width} color="#737b95" />
              )}
            </TouchableOpacity>
          }
        />

        <AuthField
          ref={confirmPasswordRef}
          label="Confirm Password"
          icon={LockKeyhole}
          placeholder="Confirm new password"
          secureTextEntry={!showConfirmPassword}
          returnKeyType="done"
          value={confirmPassword}
          error={errors.confirmPassword}
          onSubmitEditing={() => {
            void handleResetPassword();
          }}
          onChangeText={(value) => {
            setConfirmPassword(value);
            if (errors.confirmPassword) {
              setErrors((current) => ({
                ...current,
                confirmPassword: null,
              }));
            }
          }}
          right={
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setShowConfirmPassword((visible) => !visible)}
              style={styles.eyeButton}
            >
              {showConfirmPassword ? (
                <EyeOff size={styles.eyeIcon.width} color="#737b95" />
              ) : (
                <Eye size={styles.eyeIcon.width} color="#737b95" />
              )}
            </TouchableOpacity>
          }
        />

        <AuthPrimaryButton
          title="Update Password"
          onPress={handleResetPassword}
          loading={isSubmitting}
          disabled={isSubmitting}
        />
      </AuthLayout>

      <ActionSheet
        sheetRef={alertSheetRef}
        title={alertConfig.title}
        message={alertConfig.message}
        status={alertConfig.status}
        actions={[{ label: "OK", onPress: alertConfig.onConfirm }]}
      />
    </AppScreen>
  );
}

function createStyles(appTheme: AppTheme, width: number) {
  const isTiny = width < 360;
  const isCompact = width < 380;
  const isTablet = width >= 768;
  const iconSize = isTiny ? 18 : isCompact ? 20 : isTablet ? 31 : 22;

  return StyleSheet.create({
    eyeButton: {
      width: isTiny ? 30 : isCompact ? 34 : isTablet ? 44 : 38,
      height: isTiny ? 30 : isCompact ? 34 : isTablet ? 44 : 38,
      alignItems: "center",
      justifyContent: "center",
    },
    eyeIcon: {
      width: iconSize,
      height: iconSize,
    },
    footerRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      marginTop: isTiny ? 18 : isCompact ? 22 : isTablet ? 34 : 28,
    },
    footerText: {
      color: appTheme.colors.textMuted,
      fontSize: isTiny ? 12 : isCompact ? 13 : isTablet ? 20 : 15,
      fontWeight: "700",
    },
    footerLink: {
      color: "#6d28f5",
      fontSize: isTiny ? 12 : isCompact ? 13 : isTablet ? 20 : 15,
      fontWeight: "900",
    },
  });
}
