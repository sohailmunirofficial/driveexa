import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowRight,
  CalendarDays,
  Headphones,
  ShieldCheck,
} from "lucide-react-native";
import { ComponentType, forwardRef, ReactNode, useMemo } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";
import { AppTheme, useAppTheme } from "./theme";

const heroImage =
  "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1800&q=80";
const purple = "#6d28f5";
const violet = "#8428ff";
const deepText = "#070b1a";

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
  showHero?: boolean;
};

type AuthFieldProps = TextInputProps & {
  label: string;
  icon: ComponentType<{
    color?: string;
    size?: number;
    strokeWidth?: number;
  }>;
  error?: string | null;
  right?: ReactNode;
};

type AuthPrimaryButtonProps = {
  title: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  showHero = true,
}: AuthLayoutProps) {
  const appTheme = useAppTheme();
  const { width, height } = useWindowDimensions();
  const styles = useMemo(
    () => createStyles(appTheme, width, height),
    [appTheme, width, height],
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.keyboard}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {showHero ? (
          <View style={styles.hero}>
            <Image
              source={{ uri: heroImage }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={160}
            />
            <LinearGradient
              colors={[
                "rgba(69, 18, 147, 0.94)",
                "rgba(109, 40, 245, 0.6)",
                "rgba(255, 255, 255, 0.04)",
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0.9 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroContent}>
              <View style={styles.brandRow}>
                <LinearGradient
                  colors={["#ffffff", "#f6efff", "#8a49ff"]}
                  style={styles.logoMark}
                >
                  <Text style={styles.logoLetter}>D</Text>
                </LinearGradient>
                <Text style={styles.brandName}>Driveexa</Text>
              </View>
              <Text style={styles.brandSubline}>Premium Car Rental</Text>
              <View style={styles.heroDivider} />
              <View style={styles.featureList}>
                <FeatureItem
                  icon={ShieldCheck}
                  title="Premium Cars"
                  subtitle="Top quality, always."
                  styles={styles}
                />
                <FeatureItem
                  icon={CalendarDays}
                  title="Easy Booking"
                  subtitle="Book in minutes."
                  styles={styles}
                />
                <FeatureItem
                  icon={Headphones}
                  title="24/7 Support"
                  subtitle="We’re here for you."
                  styles={styles}
                />
              </View>
            </View>
          </View>
        ) : null}

        <View style={[styles.sheet, !showHero ? styles.sheetStandalone : null]}>
          <View style={styles.formWrap}>
            <Text numberOfLines={2} style={styles.title}>
              {title}
            </Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
            <View style={styles.form}>{children}</View>
            {footer}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export const AuthField = forwardRef<TextInput, AuthFieldProps>(
  function AuthField(
    { label, icon: Icon, error, right, style, ...props },
    ref,
  ) {
    const appTheme = useAppTheme();
    const { width } = useWindowDimensions();
    const styles = useMemo(
      () => createStyles(appTheme, width, 760),
      [appTheme, width],
    );

    return (
      <View style={styles.fieldWrap}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <View
          style={[
            styles.inputShell,
            error ? styles.inputShellError : null,
            style as ViewStyle,
          ]}
        >
          <Icon
            color={purple}
            size={styles.inputIcon.width}
            strokeWidth={2.1}
          />
          <TextInput
            ref={ref}
            {...props}
            placeholderTextColor="#8188a4"
            style={styles.input}
          />
          {right}
        </View>
        {error ? <Text style={styles.fieldError}>{error}</Text> : null}
      </View>
    );
  },
);

export function AuthPrimaryButton({
  title,
  loading,
  disabled,
  onPress,
}: AuthPrimaryButtonProps) {
  const appTheme = useAppTheme();
  const { width } = useWindowDimensions();
  const iconSize = width >= 768 ? 26 : width < 360 ? 18 : width < 380 ? 20 : 22;
  const styles = useMemo(
    () => createStyles(appTheme, width, 760),
    [appTheme, width],
  );

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      disabled={disabled || loading}
      onPress={onPress}
      style={[
        styles.primaryButton,
        disabled || loading ? styles.disabled : null,
      ]}
    >
      <LinearGradient
        colors={[violet, purple, "#7c2dff"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Text style={styles.primaryButtonText}>
        {loading ? "Please wait..." : title}
      </Text>
      <ArrowRight color="#ffffff" size={iconSize} strokeWidth={2.3} />
    </TouchableOpacity>
  );
}

function FeatureItem({
  icon: Icon,
  title,
  subtitle,
  styles,
}: {
  icon: ComponentType<{
    color?: string;
    size?: number;
    strokeWidth?: number;
  }>;
  title: string;
  subtitle: string;
  styles: ReturnType<typeof createStyles>;
}) {
  const iconSize =
    typeof styles.featureIcon.width === "number"
      ? Math.max(16, styles.featureIcon.width * 0.46)
      : 22;

  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIcon}>
        <Icon color={purple} size={iconSize} strokeWidth={2.2} />
      </View>
      <View style={styles.featureCopy}>
        <Text numberOfLines={1} style={styles.featureTitle}>
          {title}
        </Text>
        <Text numberOfLines={1} style={styles.featureSubtitle}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

function createStyles(appTheme: AppTheme, width: number, height: number) {
  const isCompact = width < 380;
  const isNarrow = width < 430;
  const isTablet = width >= 768;
  const isShort = height < 700;
  const isTiny = width < 360 || height < 640;
  const sheetPadding = isCompact ? 18 : isTablet ? 72 : 28;
  const heroHeight = isTablet
    ? Math.min(500, Math.max(380, height * 0.42))
    : isCompact
      ? isShort
        ? 238
        : 276
      : isNarrow
        ? isShort
          ? 266
          : 306
        : Math.min(360, Math.max(320, height * 0.4));
  const logoSize = isTiny ? 44 : isCompact ? 50 : isTablet ? 94 : 66;

  return StyleSheet.create({
    keyboard: {
      flex: 1,
      backgroundColor: appTheme.isDark ? appTheme.colors.background : "#ffffff",
    },
    scrollContent: {
      flexGrow: 1,
      backgroundColor: appTheme.isDark ? appTheme.colors.background : "#ffffff",
    },
    hero: {
      minHeight: heroHeight,
      overflow: "hidden",
      backgroundColor: "#38108f",
    },
    heroContent: {
      flex: 1,
      paddingHorizontal: isCompact ? 20 : isTablet ? 72 : 34,
      paddingTop: isCompact ? 20 : isTablet ? 50 : 34,
      paddingBottom: isCompact ? (isShort ? 34 : 40) : isTablet ? 62 : 54,
      justifyContent: "center",
    },
    brandRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: isCompact ? 12 : 20,
    },
    logoMark: {
      width: logoSize,
      height: logoSize,
      borderRadius: logoSize * 0.28,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      boxShadow: "0 20px 40px rgba(70, 22, 180, 0.3)",
    },
    logoLetter: {
      color: purple,
      fontSize: logoSize * 0.58,
      lineHeight: logoSize * 0.68,
      fontWeight: "900",
      letterSpacing: 0,
    },
    brandName: {
      color: "#ffffff",
      fontSize: isTiny ? 30 : isCompact ? 34 : isTablet ? 62 : 46,
      lineHeight: isTiny ? 36 : isCompact ? 40 : isTablet ? 70 : 54,
      fontWeight: "900",
      letterSpacing: 0,
    },
    brandSubline: {
      color: "rgba(255, 255, 255, 0.9)",
      fontSize: isTiny ? 8 : isCompact ? 9 : isTablet ? 16 : 12,
      fontWeight: "900",
      letterSpacing: isTiny ? 4 : isCompact ? 5 : isTablet ? 10 : 8,
      textTransform: "uppercase",
      marginTop: isCompact ? 13 : 22,
    },
    heroDivider: {
      width: isCompact ? 56 : 96,
      height: 1,
      backgroundColor: "rgba(255, 255, 255, 0.24)",
      marginTop: isCompact ? 12 : 22,
      marginBottom: isCompact ? 12 : 22,
    },
    featureList: {
      gap: isTiny ? 8 : isCompact ? 10 : isTablet ? 20 : 16,
      maxWidth: isCompact ? 250 : isTablet ? 390 : 310,
    },
    featureItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: isCompact ? 10 : 16,
    },
    featureIcon: {
      width: isTiny ? 34 : isCompact ? 38 : isTablet ? 62 : 52,
      height: isTiny ? 34 : isCompact ? 38 : isTablet ? 62 : 52,
      borderRadius: isTiny ? 11 : isCompact ? 12 : 17,
      backgroundColor: "rgba(255, 255, 255, 0.86)",
      alignItems: "center",
      justifyContent: "center",
    },
    featureCopy: {
      flex: 1,
      minWidth: 0,
    },
    featureTitle: {
      color: "#ffffff",
      fontSize: isTiny ? 12 : isCompact ? 13 : isTablet ? 19 : 16,
      fontWeight: "900",
      textShadowColor: "rgba(0, 0, 0, 0.28)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    featureSubtitle: {
      color: "rgba(255, 255, 255, 0.88)",
      fontSize: isTiny ? 11 : isCompact ? 12 : isTablet ? 16 : 14,
      fontWeight: "700",
      marginTop: isTiny ? 1 : 2,
      textShadowColor: "rgba(0, 0, 0, 0.25)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    sheet: {
      flexGrow: 1,
      marginTop: isCompact ? -24 : -34,
      borderTopLeftRadius: isCompact ? 30 : isTablet ? 54 : 40,
      borderTopRightRadius: isCompact ? 30 : isTablet ? 54 : 40,
      backgroundColor: appTheme.isDark ? appTheme.colors.surface : "#ffffff",
      paddingHorizontal: sheetPadding,
      paddingTop: isCompact ? 32 : isTablet ? 76 : 48,
      paddingBottom: isCompact ? 24 : 40,
      boxShadow: appTheme.isDark
        ? "0 -16px 36px rgba(0, 0, 0, 0.22)"
        : "0 -16px 36px rgba(15, 23, 42, 0.08)",
    },
    sheetStandalone: {
      minHeight: height,
      marginTop: 0,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      justifyContent: "center",
      paddingTop: isTiny ? 40 : isCompact ? 52 : isTablet ? 96 : 70,
      paddingBottom: isTiny ? 34 : isCompact ? 44 : isTablet ? 88 : 56,
      boxShadow: "none",
    },
    formWrap: {
      width: "100%",
      maxWidth: isTablet ? 780 : undefined,
      alignSelf: "center",
    },
    title: {
      color: appTheme.isDark ? appTheme.colors.text : deepText,
      fontSize: isTiny ? 25 : isCompact ? 28 : isTablet ? 54 : 34,
      lineHeight: isTiny ? 31 : isCompact ? 34 : isTablet ? 62 : 41,
      fontWeight: "900",
      letterSpacing: 0,
    },
    subtitle: {
      color: appTheme.colors.textMuted,
      fontSize: isTiny ? 12 : isCompact ? 13 : isTablet ? 22 : 15,
      lineHeight: isTiny ? 18 : isCompact ? 20 : isTablet ? 30 : 22,
      fontWeight: "600",
      marginTop: isCompact ? 6 : 10,
    },
    form: {
      gap: isTiny ? 10 : isCompact ? 12 : isTablet ? 20 : 16,
      marginTop: isTiny ? 18 : isCompact ? 22 : isTablet ? 36 : 28,
    },
    fieldWrap: {
      gap: isCompact ? 7 : 10,
    },
    fieldLabel: {
      color: appTheme.isDark ? appTheme.colors.text : deepText,
      fontSize: isTiny ? 12 : isCompact ? 13 : isTablet ? 17 : 14,
      fontWeight: "900",
    },
    inputShell: {
      minHeight: isTiny ? 48 : isCompact ? 52 : isTablet ? 78 : 58,
      borderRadius: isTiny ? 15 : isCompact ? 16 : isTablet ? 22 : 18,
      borderWidth: 1,
      borderColor: appTheme.isDark ? appTheme.colors.border : "#d9dce7",
      backgroundColor: appTheme.isDark
        ? appTheme.colors.surfaceRaised
        : "#ffffff",
      flexDirection: "row",
      alignItems: "center",
      gap: isTiny ? 9 : isCompact ? 10 : isTablet ? 18 : 14,
      paddingHorizontal: isTiny ? 12 : isCompact ? 14 : isTablet ? 22 : 18,
    },
    inputShellError: {
      borderColor: "#f4a6b8",
    },
    inputIcon: {
      width: isTiny ? 18 : isCompact ? 20 : isTablet ? 28 : 23,
      height: isTiny ? 18 : isCompact ? 20 : isTablet ? 28 : 23,
    },
    input: {
      flex: 1,
      minWidth: 0,
      color: appTheme.colors.text,
      fontSize: isTiny ? 14 : isCompact ? 15 : isTablet ? 22 : 16,
      fontWeight: "600",
      paddingVertical: 0,
    },
    fieldError: {
      color: "#e9295f",
      fontSize: isTiny ? 11 : isCompact ? 12 : isTablet ? 14 : 12,
      fontWeight: "600",
      lineHeight: isTiny ? 15 : isCompact ? 17 : isTablet ? 20 : 17,
    },
    primaryButton: {
      minHeight: isTiny ? 50 : isCompact ? 54 : isTablet ? 80 : 58,
      borderRadius: isTiny ? 15 : isCompact ? 16 : isTablet ? 22 : 18,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: isCompact ? 10 : isTablet ? 18 : 12,
      overflow: "hidden",
      marginTop: isCompact ? 4 : 10,
      boxShadow: "0 16px 28px rgba(109, 40, 245, 0.24)",
    },
    primaryButtonText: {
      color: "#ffffff",
      fontSize: isTiny ? 15 : isCompact ? 16 : isTablet ? 21 : 17,
      fontWeight: "900",
    },
    disabled: {
      opacity: 0.68,
    },
  });
}
