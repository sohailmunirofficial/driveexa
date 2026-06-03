import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Link, useRouter } from "expo-router";
import { Mail } from "lucide-react-native";
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
import { normalizeEmail, validateEmail } from "../../services/validation";

type ForgotPasswordErrors = {
  email: string | null;
};

type AlertConfig = {
  title: string;
  message: string;
  status: "success" | "error" | "info";
  onConfirm: () => void;
};

export default function ForgotPassword() {
  const router = useRouter();
  const appTheme = useAppTheme();
  const { width } = useWindowDimensions();
  const styles = useMemo(
    () => createStyles(appTheme, width),
    [appTheme, width],
  );

  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<ForgotPasswordErrors>({ email: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailRef = useRef<TextInput>(null);

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

  const handlePasswordResetRequest = async () => {
    const emailError = validateEmail(email);
    setErrors({ email: emailError });

    if (emailError) {
      return;
    }

    setIsSubmitting(true);
    const result = await PasswordResetService.requestPasswordReset(email);
    setIsSubmitting(false);

    showAlert(
      result.success ? "Check Your Email" : "Unable to Send",
      result.message,
      result.success ? "success" : "error",
      result.success
        ? () =>
            router.push({
              pathname: "/auth/reset-password",
              params: { email: normalizeEmail(email) },
            })
        : () => {},
    );
  };

  return (
    <AppScreen>
      <AuthLayout
        title="Reset Password"
        subtitle="Enter your admin email and we’ll send a secure 6-digit OTP."
        showHero={false}
        footer={
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Remembered your password? </Text>
            <Link href="/auth/login" asChild>
              <TouchableOpacity activeOpacity={0.8}>
                <Text style={styles.footerLink}>Sign in ›</Text>
              </TouchableOpacity>
            </Link>
          </View>
        }
      >
        <AuthField
          ref={emailRef}
          label="Email"
          icon={Mail}
          placeholder="you@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          returnKeyType="send"
          value={email}
          error={errors.email}
          onSubmitEditing={() => {
            void handlePasswordResetRequest();
          }}
          onChangeText={(value) => {
            setEmail(value);
            if (errors.email) {
              setErrors({ email: null });
            }
          }}
        />

        <AuthPrimaryButton
          title="Send OTP"
          onPress={handlePasswordResetRequest}
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

  return StyleSheet.create({
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
