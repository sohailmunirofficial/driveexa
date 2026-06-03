import { LinearGradient } from "expo-linear-gradient";
import { Search } from "lucide-react-native";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppTheme, useAppTheme } from "./theme";

type IconProps = {
  color?: string;
  size?: number;
  strokeWidth?: number;
};

export type IconComponent = React.ComponentType<IconProps>;

type BaseProps = {
  children: React.ReactNode;
};

type AppScreenProps = BaseProps & {
  style?: ViewStyle;
};

function usePrimitiveStyles() {
  const appTheme = useAppTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);
  return { appTheme, styles };
}

export function AppScreen({ children, style }: AppScreenProps) {
  const { appTheme, styles } = usePrimitiveStyles();

  return (
    <SafeAreaView style={[styles.screen, style]}>
      <LinearGradient
        colors={appTheme.gradients.screen}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </SafeAreaView>
  );
}

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
};

export function ScreenHeader({
  title,
  subtitle,
  left,
  right,
}: ScreenHeaderProps) {
  const { appTheme, styles } = usePrimitiveStyles();

  return (
    <View style={styles.header}>
      <LinearGradient
        colors={appTheme.gradients.card}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.headerMain}>
        {left}
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>Driveexa</Text>
          <Text numberOfLines={1} style={styles.headerTitle}>
            {title}
          </Text>
          {subtitle ? (
            <Text numberOfLines={2} style={styles.headerSubtitle}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {right ? <View style={styles.headerActions}>{right}</View> : null}
    </View>
  );
}

type IconButtonProps = {
  icon: IconComponent;
  onPress: () => void;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  size?: number;
  disabled?: boolean;
};

export function IconButton({
  icon: Icon,
  onPress,
  color,
  backgroundColor,
  borderColor,
  size = 20,
  disabled,
}: IconButtonProps) {
  const { appTheme, styles } = usePrimitiveStyles();

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.iconButton,
        {
          backgroundColor: backgroundColor || appTheme.colors.glass,
          borderColor: borderColor || appTheme.colors.borderSoft,
        },
        disabled ? styles.disabled : null,
      ]}
    >
      <Icon
        color={color || appTheme.colors.slate}
        size={size}
        strokeWidth={2.2}
      />
    </TouchableOpacity>
  );
}

type CardProps = BaseProps & {
  style?: ViewStyle;
  muted?: boolean;
};

export function Card({ children, style, muted }: CardProps) {
  const { styles } = usePrimitiveStyles();

  return (
    <View style={[styles.card, muted ? styles.cardMuted : null, style]}>
      {children}
    </View>
  );
}

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
};

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  const { styles } = usePrimitiveStyles();

  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? (
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}

type SearchFieldProps = TextInputProps & {
  value: string;
  onChangeText: (value: string) => void;
};

export function SearchField({
  value,
  onChangeText,
  placeholder,
  ...props
}: SearchFieldProps) {
  const { appTheme, styles } = usePrimitiveStyles();

  return (
    <View style={styles.searchField}>
      <Search color={appTheme.colors.textSubtle} size={19} />
      <TextInput
        {...props}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={appTheme.colors.textSubtle}
        style={styles.searchInput}
      />
    </View>
  );
}

type AppTextInputProps = TextInputProps & {
  label?: string;
  helper?: string;
};

export function AppTextInput({
  label,
  helper,
  style,
  ...props
}: AppTextInputProps) {
  const { appTheme, styles } = usePrimitiveStyles();

  return (
    <View style={styles.fieldWrap}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput
        {...props}
        placeholderTextColor={appTheme.colors.textSubtle}
        style={[styles.input, style]}
      />
      {helper ? <Text style={styles.fieldHelper}>{helper}</Text> : null}
    </View>
  );
}

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconComponent;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

export function Button({
  title,
  onPress,
  variant = "primary",
  icon: Icon,
  disabled,
  loading,
  style,
}: ButtonProps) {
  const { appTheme, styles } = usePrimitiveStyles();
  const buttonStyle = getButtonStyle(variant, appTheme);
  const textStyle = getButtonTextStyle(variant, styles);
  const iconColor = getButtonIconColor(variant, appTheme);
  const isPrimary = variant === "primary";

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      disabled={disabled || loading}
      onPress={onPress}
      style={[
        styles.button,
        buttonStyle,
        isPrimary ? styles.primaryShadow : null,
        disabled || loading ? styles.disabled : null,
        style,
      ]}
    >
      {isPrimary ? (
        <LinearGradient
          colors={appTheme.gradients.primary}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {loading ? (
        <ActivityIndicator color={iconColor} />
      ) : (
        <>
          {Icon ? <Icon color={iconColor} size={18} strokeWidth={2.3} /> : null}
          <Text numberOfLines={1} style={textStyle}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

type FilterChipProps = {
  label: string;
  selected?: boolean;
  onPress: () => void;
};

export function FilterChip({ label, selected, onPress }: FilterChipProps) {
  const { appTheme, styles } = usePrimitiveStyles();

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      style={[styles.chip, selected ? styles.chipSelected : null]}
    >
      {selected ? (
        <LinearGradient
          colors={appTheme.gradients.primary}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <Text
        numberOfLines={1}
        style={[styles.chipText, selected ? styles.chipTextSelected : null]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

type StatusTone = "info" | "success" | "warning" | "danger" | "neutral";

type StatusBadgeProps = {
  label: string;
  tone?: StatusTone;
  icon?: IconComponent;
};

export function StatusBadge({
  label,
  tone = "neutral",
  icon: Icon,
}: StatusBadgeProps) {
  const { appTheme, styles } = usePrimitiveStyles();
  const colors = getToneColors(tone, appTheme);

  return (
    <View style={[styles.badge, { backgroundColor: colors.background }]}>
      {Icon ? (
        <Icon color={colors.foreground} size={13} strokeWidth={2.4} />
      ) : null}
      <Text
        numberOfLines={1}
        style={[styles.badgeText, { color: colors.foreground }]}
      >
        {label}
      </Text>
    </View>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
  icon: IconComponent;
  tone?: "primary" | "dark" | "accent" | "warning";
  onPress?: () => void;
};

export function MetricCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
  onPress,
}: MetricCardProps) {
  const { appTheme, styles } = usePrimitiveStyles();
  const palette = getMetricPalette(tone, appTheme);
  const gradient = getMetricGradient(tone, appTheme);
  const content = (
    <View style={styles.metricCard}>
      <LinearGradient colors={gradient} style={StyleSheet.absoluteFill} />
      <View
        style={[styles.metricIcon, { backgroundColor: palette.iconBackground }]}
      >
        <Icon color={palette.icon} size={20} strokeWidth={2.3} />
      </View>
      <Text
        numberOfLines={2}
        style={[styles.metricLabel, { color: palette.label }]}
      >
        {label}
      </Text>
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.58}
        numberOfLines={1}
        style={[styles.metricValue, { color: palette.value }]}
      >
        {value}
      </Text>
    </View>
  );

  if (!onPress) return content;

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={onPress}
      style={{ flex: 1, minWidth: 146 }}
    >
      {content}
    </TouchableOpacity>
  );
}

type AmountTextProps = {
  value: string;
  style?: TextStyle;
  color?: string;
  prefix?: string;
};

export function AmountText({ value, style, color, prefix }: AmountTextProps) {
  const { appTheme, styles } = usePrimitiveStyles();

  return (
    <Text
      adjustsFontSizeToFit
      minimumFontScale={0.58}
      numberOfLines={1}
      style={[
        styles.amountText,
        { color: color || appTheme.colors.primary },
        style,
      ]}
    >
      {prefix}
      {value}
    </Text>
  );
}

type EmptyStateProps = {
  title: string;
  message?: string;
  icon?: IconComponent;
};

export function EmptyState({ title, message, icon: Icon }: EmptyStateProps) {
  const { appTheme, styles } = usePrimitiveStyles();

  return (
    <View style={styles.emptyState}>
      {Icon ? (
        <View style={styles.emptyIcon}>
          <Icon
            color={appTheme.colors.textSubtle}
            size={24}
            strokeWidth={2.2}
          />
        </View>
      ) : null}
      <Text style={styles.emptyTitle}>{title}</Text>
      {message ? <Text style={styles.emptyMessage}>{message}</Text> : null}
    </View>
  );
}

type SegmentedControlOption<T extends string> = {
  label: string;
  value: T;
};

type SegmentedControlProps<T extends string> = {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const { appTheme, styles } = usePrimitiveStyles();

  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            activeOpacity={0.86}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected ? styles.segmentSelected : null]}
          >
            {selected ? (
              <LinearGradient
                colors={appTheme.gradients.card}
                style={StyleSheet.absoluteFill}
              />
            ) : null}
            <Text
              numberOfLines={1}
              style={[
                styles.segmentText,
                selected ? styles.segmentTextSelected : null,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function getButtonStyle(variant: ButtonVariant, appTheme: AppTheme): ViewStyle {
  switch (variant) {
    case "secondary":
      return {
        backgroundColor: appTheme.colors.glass,
        borderColor: appTheme.colors.border,
      };
    case "danger":
      return {
        backgroundColor: appTheme.colors.dangerSoft,
        borderColor: appTheme.colors.dangerSoft,
      };
    case "ghost":
      return {
        backgroundColor: "transparent",
        borderColor: "transparent",
      };
    case "primary":
    default:
      return {
        backgroundColor: appTheme.colors.primary,
        borderColor: "transparent",
      };
  }
}

function getButtonTextStyle(
  variant: ButtonVariant,
  styles: ReturnType<typeof createStyles>,
): TextStyle {
  switch (variant) {
    case "secondary":
      return styles.buttonTextSecondary;
    case "danger":
      return styles.buttonTextDanger;
    case "ghost":
      return styles.buttonTextGhost;
    case "primary":
    default:
      return styles.buttonTextPrimary;
  }
}

function getButtonIconColor(
  variant: ButtonVariant,
  appTheme: AppTheme,
): string {
  switch (variant) {
    case "secondary":
      return appTheme.colors.primary;
    case "danger":
      return appTheme.colors.danger;
    case "ghost":
      return appTheme.colors.textMuted;
    case "primary":
    default:
      return appTheme.colors.white;
  }
}

function getToneColors(tone: StatusTone, appTheme: AppTheme) {
  switch (tone) {
    case "info":
      return {
        background: appTheme.colors.primarySoft,
        foreground: appTheme.colors.primary,
      };
    case "success":
      return {
        background: appTheme.colors.successSoft,
        foreground: appTheme.colors.success,
      };
    case "warning":
      return {
        background: appTheme.colors.warningSoft,
        foreground: appTheme.colors.warning,
      };
    case "danger":
      return {
        background: appTheme.colors.dangerSoft,
        foreground: appTheme.colors.danger,
      };
    case "neutral":
    default:
      return {
        background: appTheme.colors.surfaceMuted,
        foreground: appTheme.colors.slate,
      };
  }
}

function getMetricPalette(tone: MetricCardProps["tone"], appTheme: AppTheme) {
  switch (tone) {
    case "dark":
      return {
        iconBackground: "rgba(255, 255, 255, 0.14)",
        icon: appTheme.colors.white,
        label: "rgba(255, 255, 255, 0.72)",
        value: appTheme.colors.white,
      };
    case "accent":
      return {
        iconBackground: "rgba(255, 255, 255, 0.16)",
        icon: appTheme.colors.white,
        label: "rgba(255, 255, 255, 0.74)",
        value: appTheme.colors.white,
      };
    case "warning":
      return {
        iconBackground: "rgba(255, 255, 255, 0.18)",
        icon: appTheme.colors.white,
        label: "rgba(255, 255, 255, 0.78)",
        value: appTheme.colors.white,
      };
    case "primary":
    default:
      return {
        iconBackground: "rgba(255, 255, 255, 0.16)",
        icon: appTheme.colors.white,
        label: "rgba(255, 255, 255, 0.76)",
        value: appTheme.colors.white,
      };
  }
}

function getMetricGradient(tone: MetricCardProps["tone"], appTheme: AppTheme) {
  switch (tone) {
    case "dark":
      return appTheme.gradients.graphite;
    case "accent":
      return appTheme.gradients.emerald;
    case "warning":
      return appTheme.gradients.amber;
    case "primary":
    default:
      return appTheme.gradients.primary;
  }
}

function createStyles(appTheme: AppTheme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: appTheme.colors.background,
    },
    header: {
      paddingHorizontal: appTheme.spacing.screen,
      paddingTop: 14,
      paddingBottom: 18,
      borderBottomWidth: 1,
      borderBottomColor: appTheme.colors.borderSoft,
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 14,
      overflow: "hidden",
    },
    headerMain: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    headerText: {
      flex: 1,
      minWidth: 0,
    },
    headerActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 10,
      justifyContent: "flex-end",
    },
    eyebrow: {
      color: appTheme.colors.primary,
      fontSize: 11,
      fontWeight: "900",
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 2,
    },
    headerTitle: {
      color: appTheme.colors.text,
      fontSize: 26,
      fontWeight: "900",
      letterSpacing: 0,
    },
    headerSubtitle: {
      marginTop: 3,
      color: appTheme.colors.textMuted,
      fontSize: 14,
      lineHeight: 19,
    },
    iconButton: {
      width: 42,
      height: 42,
      borderRadius: appTheme.radius.md,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      boxShadow: appTheme.shadow.soft,
    },
    card: {
      backgroundColor: appTheme.colors.glass,
      borderRadius: appTheme.radius.lg,
      borderWidth: 1,
      borderColor: appTheme.colors.borderSoft,
      padding: appTheme.spacing.card,
      boxShadow: appTheme.shadow.card,
    },
    cardMuted: {
      backgroundColor: appTheme.colors.surfaceMuted,
    },
    sectionHeader: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      marginBottom: 12,
    },
    sectionTitle: {
      color: appTheme.colors.text,
      fontSize: 18,
      fontWeight: "900",
      letterSpacing: 0,
    },
    sectionSubtitle: {
      marginTop: 2,
      color: appTheme.colors.textMuted,
      fontSize: 13,
      lineHeight: 18,
    },
    searchField: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      minHeight: 52,
      borderRadius: appTheme.radius.md,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      backgroundColor: appTheme.colors.glass,
      paddingHorizontal: 15,
      boxShadow: appTheme.shadow.soft,
    },
    searchInput: {
      flex: 1,
      color: appTheme.colors.text,
      fontSize: 16,
      paddingVertical: 12,
    },
    fieldWrap: {
      gap: 8,
    },
    fieldLabel: {
      color: appTheme.colors.slate,
      fontSize: 13,
      fontWeight: "800",
    },
    input: {
      minHeight: 52,
      borderRadius: appTheme.radius.md,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      backgroundColor: appTheme.colors.surfaceRaised,
      color: appTheme.colors.text,
      fontSize: 16,
      paddingHorizontal: 15,
      paddingVertical: 12,
    },
    fieldHelper: {
      color: appTheme.colors.textMuted,
      fontSize: 12,
      lineHeight: 16,
    },
    button: {
      minHeight: 52,
      borderRadius: appTheme.radius.md,
      borderWidth: 1,
      paddingHorizontal: 18,
      paddingVertical: 14,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 9,
      overflow: "hidden",
    },
    primaryShadow: {
      boxShadow: appTheme.shadow.action,
    },
    disabled: {
      opacity: 0.65,
    },
    buttonTextPrimary: {
      color: appTheme.colors.white,
      fontSize: 16,
      fontWeight: "900",
    },
    buttonTextSecondary: {
      color: appTheme.colors.primary,
      fontSize: 16,
      fontWeight: "900",
    },
    buttonTextDanger: {
      color: appTheme.colors.danger,
      fontSize: 16,
      fontWeight: "900",
    },
    buttonTextGhost: {
      color: appTheme.colors.textMuted,
      fontSize: 16,
      fontWeight: "900",
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: appTheme.radius.pill,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      backgroundColor: appTheme.colors.glass,
      overflow: "hidden",
    },
    chipSelected: {
      borderColor: "transparent",
    },
    chipText: {
      color: appTheme.colors.slate,
      fontSize: 13,
      fontWeight: "800",
      textTransform: "capitalize",
    },
    chipTextSelected: {
      color: appTheme.colors.white,
    },
    badge: {
      borderRadius: appTheme.radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 6,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      maxWidth: 138,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: "900",
      textTransform: "capitalize",
    },
    metricCard: {
      flex: 1,
      minWidth: 146,
      minHeight: 142,
      borderRadius: appTheme.radius.xl,
      padding: 18,
      justifyContent: "space-between",
      overflow: "hidden",
      boxShadow: appTheme.shadow.glow,
    },
    metricIcon: {
      width: 42,
      height: 42,
      borderRadius: appTheme.radius.md,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14,
    },
    metricLabel: {
      fontSize: 13,
      fontWeight: "900",
      lineHeight: 18,
    },
    metricValue: {
      marginTop: 4,
      fontSize: 26,
      fontWeight: "900",
      letterSpacing: 0,
      fontVariant: ["tabular-nums"],
    },
    amountText: {
      fontSize: 17,
      fontWeight: "900",
      letterSpacing: 0,
      fontVariant: ["tabular-nums"],
      includeFontPadding: false,
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 48,
      paddingHorizontal: 24,
    },
    emptyIcon: {
      width: 52,
      height: 52,
      borderRadius: appTheme.radius.lg,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: appTheme.colors.surfaceMuted,
      marginBottom: 14,
    },
    emptyTitle: {
      color: appTheme.colors.text,
      fontSize: 17,
      fontWeight: "900",
      textAlign: "center",
    },
    emptyMessage: {
      color: appTheme.colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
      textAlign: "center",
      marginTop: 5,
    },
    segmented: {
      flexDirection: "row",
      gap: 4,
      padding: 4,
      borderRadius: appTheme.radius.md,
      backgroundColor: appTheme.colors.surfaceMuted,
    },
    segment: {
      flex: 1,
      minHeight: 40,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    segmentSelected: {
      boxShadow: appTheme.shadow.soft,
    },
    segmentText: {
      color: appTheme.colors.textMuted,
      fontSize: 14,
      fontWeight: "900",
    },
    segmentTextSelected: {
      color: appTheme.colors.primary,
    },
  });
}
