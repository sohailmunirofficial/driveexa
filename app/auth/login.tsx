import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Link } from "expo-router";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { useAuth } from "../../context/auth";
import { SettingsRepository } from "../../services/settings-repository";
import { validateEmail, validatePassword } from "../../services/validation";

type LoginErrors = {
  email: string | null;
  password: string | null;
};

export default function Login() {
  const { signIn, isLoading } = useAuth();
  const appTheme = useAppTheme();
  const { width } = useWindowDimensions();
  const styles = useMemo(
    () => createStyles(appTheme, width),
    [appTheme, width],
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({
    email: null,
    password: null,
  });

  const passwordRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);

  const alertSheetRef = useRef<BottomSheetModal>(null);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    status: "success" | "error" | "info";
  }>({ title: "", message: "", status: "info" });

  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout> | null = null;

    async function loadSavedEmail() {
      const savedEmail = await SettingsRepository.get("last_logged_in_email");
      if (savedEmail) {
        setEmail(savedEmail);
        timerId = setTimeout(() => passwordRef.current?.focus(), 100);
      } else {
        timerId = setTimeout(() => emailRef.current?.focus(), 100);
      }
    }

    void loadSavedEmail();

    return () => {
      if (timerId) {
        clearTimeout(timerId);
      }
    };
  }, []);

  const showAlert = (
    title: string,
    message: string,
    status: "success" | "error" | "info",
  ) => {
    setAlertConfig({ title, message, status });
    alertSheetRef.current?.present();
  };

  const handleLogin = async () => {
    const nextErrors: LoginErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setErrors(nextErrors);

    if (nextErrors.email || nextErrors.password) {
      return;
    }

    const result = await signIn(email, password);
    if (!result.success) {
      showAlert("Failed", result.message || "Invalid credentials", "error");
    } else {
      await SettingsRepository.set("last_logged_in_email", email);
    }
  };

  return (
    <AppScreen>
      <AuthLayout
        title="Welcome Back 👋"
        subtitle="Sign in to continue your journey with Driveexa."
        footer={
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>{"Don't have an account? "}</Text>
            <Link href="/auth/signup" asChild>
              <TouchableOpacity activeOpacity={0.8}>
                <Text style={styles.footerLink}>Create one ›</Text>
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
          returnKeyType="next"
          value={email}
          error={errors.email}
          onSubmitEditing={() => passwordRef.current?.focus()}
          onChangeText={(value) => {
            setEmail(value);
            if (errors.email) {
              setErrors((current) => ({ ...current, email: null }));
            }
          }}
        />

        <View style={styles.passwordBlock}>
          <AuthField
            ref={passwordRef}
            label="Password"
            icon={LockKeyhole}
            placeholder="Enter your password"
            secureTextEntry={!showPassword}
            returnKeyType="done"
            value={password}
            error={errors.password}
            onSubmitEditing={() => {
              void handleLogin();
            }}
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
          <Link href="/auth/forgot-password" asChild>
            <TouchableOpacity activeOpacity={0.8} style={styles.forgotButton}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          </Link>
        </View>

        <AuthPrimaryButton
          title="Sign In"
          onPress={handleLogin}
          loading={isLoading}
          disabled={isLoading}
        />
      </AuthLayout>

      <ActionSheet
        sheetRef={alertSheetRef}
        title={alertConfig.title}
        message={alertConfig.message}
        status={alertConfig.status}
        actions={[{ label: "OK", onPress: () => {} }]}
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
    passwordBlock: {
      gap: isTiny ? 7 : 10,
    },
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
    forgotButton: {
      alignSelf: "flex-end",
    },
    forgotText: {
      color: "#6d28f5",
      fontSize: isTiny ? 12 : isCompact ? 13 : isTablet ? 19 : 15,
      fontWeight: "900",
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
