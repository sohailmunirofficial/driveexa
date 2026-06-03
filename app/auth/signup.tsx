import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Link } from "expo-router";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  User,
} from "lucide-react-native";
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
import { useAuth } from "../../context/auth";
import {
  validateEmail,
  validatePassword,
  validateRequiredText,
} from "../../services/validation";

type SignupErrors = {
  name: string | null;
  email: string | null;
  password: string | null;
};

export default function Signup() {
  const { signUp, isLoading } = useAuth();
  const appTheme = useAppTheme();
  const { width } = useWindowDimensions();
  const styles = useMemo(
    () => createStyles(appTheme, width),
    [appTheme, width],
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<SignupErrors>({
    name: null,
    email: null,
    password: null,
  });

  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const alertSheetRef = useRef<BottomSheetModal>(null);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    status: "success" | "error" | "info";
  }>({ title: "", message: "", status: "info" });

  const showAlert = (
    title: string,
    message: string,
    status: "success" | "error" | "info",
  ) => {
    setAlertConfig({ title, message, status });
    alertSheetRef.current?.present();
  };

  const handleSignup = async () => {
    const nextErrors: SignupErrors = {
      name: validateRequiredText(name, "Full name"),
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setErrors(nextErrors);

    if (nextErrors.name || nextErrors.email || nextErrors.password) {
      return;
    }

    const result = await signUp(name, email, phone, password);
    if (!result.success) {
      showAlert("Failed", result.message || "Signup failed", "error");
    }
  };

  return (
    <AppScreen>
      <AuthLayout
        title="Create Account"
        subtitle="Set up your admin profile and start managing Driveexa."
        footer={
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/auth/login" asChild>
              <TouchableOpacity activeOpacity={0.8}>
                <Text style={styles.footerLink}>Sign in ›</Text>
              </TouchableOpacity>
            </Link>
          </View>
        }
      >
        <AuthField
          label="Full Name"
          icon={User}
          placeholder="Enter your full name"
          returnKeyType="next"
          value={name}
          error={errors.name}
          onSubmitEditing={() => emailRef.current?.focus()}
          onChangeText={(value) => {
            setName(value);
            if (errors.name) {
              setErrors((current) => ({ ...current, name: null }));
            }
          }}
        />

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
          onSubmitEditing={() => phoneRef.current?.focus()}
          onChangeText={(value) => {
            setEmail(value);
            if (errors.email) {
              setErrors((current) => ({ ...current, email: null }));
            }
          }}
        />

        <AuthField
          ref={phoneRef}
          label="Phone Number"
          icon={Phone}
          placeholder="03XX XXXXXXX"
          keyboardType="phone-pad"
          returnKeyType="next"
          value={phone}
          onSubmitEditing={() => passwordRef.current?.focus()}
          onChangeText={setPhone}
        />

        <AuthField
          ref={passwordRef}
          label="Password"
          icon={LockKeyhole}
          placeholder="Create a password"
          secureTextEntry={!showPassword}
          returnKeyType="done"
          value={password}
          error={errors.password}
          onSubmitEditing={() => {
            void handleSignup();
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

        <AuthPrimaryButton
          title="Create Account"
          onPress={handleSignup}
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
