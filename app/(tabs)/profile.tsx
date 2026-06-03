import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  LockKeyhole,
  LogOut,
  Mail,
  Monitor,
  Moon,
  Phone,
  Save,
  Sun,
  User as UserIcon,
} from "lucide-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActionSheet } from "../../components/ui/action-sheet";
import { AppScreen, Button } from "../../components/ui/primitives";
import { type AppTheme, useThemeController } from "../../components/ui/theme";
import { UserAvatar } from "../../components/ui/user-avatar";
import { useAuth } from "../../context/auth";
import { type ThemeMode } from "../../services/theme-preference";
import {
  type User,
  UserRepository,
  type UserUpdateInput,
} from "../../services/user-repository";
import {
  normalizeEmail,
  validateEmail,
  validatePassword,
  validateRequiredText,
} from "../../services/validation";

type AlertStatus = "success" | "error" | "info";

type ProfileForm = {
  name: string;
  email: string;
  phone: string;
};

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type ValidatedProfileUpdate = {
  name: string;
  email: string;
  phone: string;
  hasChanges: boolean;
  emailChanged: boolean;
};

type IconComponent = typeof UserIcon;

const purple = "#6d28f5";
const heroImage =
  "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1800&q=80";

function getInitialForm(user: User): ProfileForm {
  return {
    name: user.name,
    email: user.email,
    phone: user.phone || "",
  };
}

export default function Profile() {
  const router = useRouter();
  const { user, signOut, refreshUser } = useAuth();

  if (!user) {
    return (
      <AppScreen style={styles.centered}>
        <Text style={styles.emptyTitle}>Please login to view profile</Text>
        <Button title="Login" onPress={() => router.replace("/auth/login")} />
      </AppScreen>
    );
  }

  return (
    <ProfileContent
      key={user.id}
      user={user}
      signOut={signOut}
      refreshUser={refreshUser}
    />
  );
}

function ProfileContent({
  user,
  signOut,
  refreshUser,
}: {
  user: User;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}) {
  const router = useRouter();
  const {
    appTheme,
    mode: themeMode,
    setMode: setThemeMode,
  } = useThemeController();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const avatarSize =
    width < 360 ? 76 : width < 420 ? 86 : width >= 768 ? 124 : 100;
  const styles = useMemo(
    () => createStyles(appTheme, width, insets.bottom),
    [appTheme, insets.bottom, width],
  );
  const [form, setForm] = useState<ProfileForm>(() => getInitialForm(user));
  const [emailPassword, setEmailPassword] = useState("");
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [saving, setSaving] = useState(false);
  const alertSheetRef = useRef<BottomSheetModal>(null);
  const emailPasswordSheetRef = useRef<BottomSheetModal>(null);
  const passwordSheetRef = useRef<BottomSheetModal>(null);
  const emailPasswordSnapPoints = useMemo(() => ["42%"], []);
  const passwordSnapPoints = useMemo(() => ["64%"], []);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    status: AlertStatus;
    onConfirm?: () => void;
  }>({ title: "", message: "", status: "info" });

  const showAlert = (
    title: string,
    message: string,
    status: AlertStatus,
    onConfirm?: () => void,
  ) => {
    setAlertConfig({ title, message, status, onConfirm });
    alertSheetRef.current?.present();
  };

  const updateField = (field: keyof ProfileForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updatePasswordField = (field: keyof PasswordForm, value: string) => {
    setPasswordForm((current) => ({ ...current, [field]: value }));
  };

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    [],
  );

  const handleLogout = () => {
    void signOut();
  };

  const getValidatedProfileUpdate = (): ValidatedProfileUpdate | null => {
    const trimmedName = form.name.trim();
    const trimmedEmail = normalizeEmail(form.email);
    const trimmedPhone = form.phone.trim();
    const nameError = validateRequiredText(trimmedName, "Full name");

    if (nameError) {
      showAlert("Missing Details", nameError, "error");
      return null;
    }

    const emailError = validateEmail(trimmedEmail);
    if (emailError) {
      showAlert("Invalid Email", emailError, "error");
      return null;
    }

    const hasProfileChanges =
      trimmedName !== user.name ||
      trimmedEmail !== user.email ||
      trimmedPhone !== (user.phone || "");

    if (!hasProfileChanges) {
      showAlert("No Changes", "There are no profile changes to save.", "info");
      return null;
    }

    return {
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      hasChanges: hasProfileChanges,
      emailChanged: trimmedEmail !== user.email,
    };
  };

  const saveProfile = async (
    update: ValidatedProfileUpdate,
    currentPassword?: string,
  ) => {
    if (!update.hasChanges) {
      return;
    }

    if (update.emailChanged && !currentPassword) {
      showAlert(
        "Verification Required",
        "Current password is required.",
        "error",
      );
      return;
    }

    setSaving(true);
    try {
      if (update.emailChanged) {
        const isVerified = await UserRepository.verifyPassword(
          user.id,
          currentPassword || "",
        );

        if (!isVerified) {
          showAlert(
            "Incorrect Password",
            "Current password is incorrect.",
            "error",
          );
          return;
        }

        const existingUser = await UserRepository.getUserByEmail(update.email);
        if (existingUser && existingUser.id !== user.id) {
          showAlert(
            "Email Already Exists",
            "Another account is already using this email address.",
            "error",
          );
          return;
        }
      }

      const updates: UserUpdateInput = {
        name: update.name,
        email: update.email,
        phone: update.phone,
      };

      const success = await UserRepository.updateUser(user.id, updates);
      if (success) {
        await refreshUser();
        setForm({
          name: update.name,
          email: update.email,
          phone: update.phone,
        });
        emailPasswordSheetRef.current?.dismiss();
        setEmailPassword("");
        showAlert(
          "Profile Updated",
          "Profile details updated successfully.",
          "success",
        );
      } else {
        showAlert("Update Failed", "Failed to update profile.", "error");
      }
    } catch (error) {
      console.error("Profile update error:", error);
      showAlert("Update Failed", "An unexpected error occurred.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProfile = async () => {
    const update = getValidatedProfileUpdate();
    if (!update) {
      return;
    }

    if (update.emailChanged) {
      setEmailPassword("");
      emailPasswordSheetRef.current?.present();
      return;
    }

    await saveProfile(update);
  };

  const handleConfirmEmailUpdate = async () => {
    const update = getValidatedProfileUpdate();
    if (!update) {
      return;
    }

    await saveProfile(update, emailPassword);
  };

  const openPasswordSheet = () => {
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    passwordSheetRef.current?.present();
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword) {
      showAlert(
        "Verification Required",
        "Current password is required.",
        "error",
      );
      return;
    }

    const passwordError = validatePassword(passwordForm.newPassword);
    if (passwordError) {
      showAlert("Invalid Password", passwordError, "error");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showAlert("Password Mismatch", "New passwords do not match.", "error");
      return;
    }

    setSaving(true);
    try {
      const isVerified = await UserRepository.verifyPassword(
        user.id,
        passwordForm.currentPassword,
      );

      if (!isVerified) {
        showAlert(
          "Incorrect Password",
          "Current password is incorrect.",
          "error",
        );
        return;
      }

      const updates: UserUpdateInput = {
        password: passwordForm.newPassword,
      };

      const success = await UserRepository.updateUser(user.id, updates);
      if (success) {
        passwordSheetRef.current?.dismiss();
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        showAlert(
          "Password Updated",
          "Password changed successfully.",
          "success",
        );
      } else {
        showAlert("Update Failed", "Failed to change password.", "error");
      }
    } catch (error) {
      console.error("Password update error:", error);
      showAlert("Update Failed", "An unexpected error occurred.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.hero}>
            <Image
              source={{ uri: heroImage }}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={[
                "rgba(108, 32, 238, 0.95)",
                "rgba(52, 13, 146, 0.92)",
                "rgba(16, 24, 39, 0.76)",
              ]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroTop}>
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={() => router.back()}
                style={styles.heroIconButton}
              >
                <ArrowLeft color="#ffffff" size={24} strokeWidth={2.4} />
              </TouchableOpacity>
              <Text numberOfLines={1} style={styles.heroTitle}>
                Profile
              </Text>
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={handleLogout}
                style={styles.heroIconButton}
              >
                <LogOut color="#ffffff" size={22} strokeWidth={2.3} />
              </TouchableOpacity>
            </View>

            <View style={styles.heroProfile}>
              <UserAvatar name={user.name} size={avatarSize} />
              <View style={styles.heroCopy}>
                <Text numberOfLines={1} style={styles.profileName}>
                  {user.name}
                </Text>
                <View style={styles.profileMetaLine}>
                  <Mail color="#ffffff" size={18} strokeWidth={2.1} />
                  <Text numberOfLines={1} style={styles.profileMetaText}>
                    {user.email}
                  </Text>
                </View>
                {user.phone?.trim() ? (
                  <View style={styles.profileMetaLine}>
                    <Phone color="#ffffff" size={18} strokeWidth={2.1} />
                    <Text numberOfLines={1} style={styles.profileMetaText}>
                      {user.phone}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Personal Information</Text>
            <Text style={styles.cardSubtitle}>
              Update your personal details
            </Text>

            <ProfileField
              icon={UserIcon}
              label="Full Name"
              value={form.name}
              placeholder="Full name"
              styles={styles}
              onChangeText={(value) => updateField("name", value)}
            />
            <ProfileField
              icon={Mail}
              label="Email Address"
              value={form.email}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              styles={styles}
              onChangeText={(value) => updateField("email", value)}
            />
            <ProfileField
              icon={Phone}
              label="Phone Number"
              value={form.phone}
              placeholder="+92 300 0000000"
              keyboardType="phone-pad"
              styles={styles}
              onChangeText={(value) => updateField("phone", value)}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Account & Preferences</Text>
            <Text style={styles.cardSubtitle}>Manage account security</Text>

            <ThemeSelector
              currentMode={themeMode}
              styles={styles}
              onChange={(nextMode) => {
                void setThemeMode(nextMode);
              }}
            />

            <View style={styles.divider} />

            <ActionRow
              icon={LockKeyhole}
              title="Change Password"
              subtitle="Update your account password"
              styles={styles}
              onPress={openPasswordSheet}
            />
          </View>

          <TouchableOpacity
            activeOpacity={0.86}
            disabled={saving}
            onPress={handleUpdateProfile}
            style={[styles.updateButton, saving ? styles.disabled : null]}
          >
            <LinearGradient
              colors={["#8a28ff", "#6d28f5", "#5b21d6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Save color="#ffffff" size={23} strokeWidth={2.4} />
                <Text style={styles.updateButtonText}>Update Profile</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.86}
            onPress={handleLogout}
            style={styles.logoutButton}
          >
            <LogOut color="#e53a53" size={22} strokeWidth={2.3} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomSheetModal
        ref={emailPasswordSheetRef}
        index={0}
        snapPoints={emailPasswordSnapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: appTheme.colors.surface }}
        handleIndicatorStyle={{ backgroundColor: appTheme.colors.border }}
      >
        <BottomSheetView style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Confirm Email Change</Text>
          <Text style={styles.sheetSubtitle}>
            Enter your current password to update your email address.
          </Text>
          <ProfileField
            icon={LockKeyhole}
            label="Current Password"
            value={emailPassword}
            placeholder="Enter current password"
            secureTextEntry
            styles={styles}
            onChangeText={setEmailPassword}
          />
          <TouchableOpacity
            activeOpacity={0.86}
            disabled={saving}
            onPress={handleConfirmEmailUpdate}
            style={[styles.sheetPrimaryButton, saving ? styles.disabled : null]}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Check color="#ffffff" size={22} strokeWidth={2.4} />
                <Text style={styles.sheetPrimaryText}>Confirm Update</Text>
              </>
            )}
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheetModal>

      <BottomSheetModal
        ref={passwordSheetRef}
        index={0}
        snapPoints={passwordSnapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: appTheme.colors.surface }}
        handleIndicatorStyle={{ backgroundColor: appTheme.colors.border }}
      >
        <BottomSheetView style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Change Password</Text>
          <Text style={styles.sheetSubtitle}>
            Confirm your current password and choose a new secure password.
          </Text>
          <ProfileField
            icon={LockKeyhole}
            label="Current Password"
            value={passwordForm.currentPassword}
            placeholder="Enter current password"
            secureTextEntry
            styles={styles}
            onChangeText={(value) =>
              updatePasswordField("currentPassword", value)
            }
          />
          <ProfileField
            icon={LockKeyhole}
            label="New Password"
            value={passwordForm.newPassword}
            placeholder="Enter new password"
            secureTextEntry
            styles={styles}
            onChangeText={(value) => updatePasswordField("newPassword", value)}
          />
          <ProfileField
            icon={LockKeyhole}
            label="Confirm New Password"
            value={passwordForm.confirmPassword}
            placeholder="Confirm new password"
            secureTextEntry
            styles={styles}
            onChangeText={(value) =>
              updatePasswordField("confirmPassword", value)
            }
          />
          <TouchableOpacity
            activeOpacity={0.86}
            disabled={saving}
            onPress={handleChangePassword}
            style={[styles.sheetPrimaryButton, saving ? styles.disabled : null]}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Save color="#ffffff" size={22} strokeWidth={2.4} />
                <Text style={styles.sheetPrimaryText}>Save Password</Text>
              </>
            )}
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheetModal>

      <ActionSheet
        sheetRef={alertSheetRef}
        title={alertConfig.title}
        message={alertConfig.message}
        status={alertConfig.status}
        actions={[{ label: "OK", onPress: () => alertConfig.onConfirm?.() }]}
      />
    </AppScreen>
  );
}

function ProfileField({
  icon: Icon,
  label,
  value,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  styles,
  onChangeText,
}: {
  icon: IconComponent;
  label: string;
  value: string;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  styles: ReturnType<typeof createStyles>;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputFrame}>
        <Icon color={purple} size={24} strokeWidth={2.2} />
        <TextInput
          value={value}
          placeholder={placeholder}
          placeholderTextColor="#8992aa"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onChangeText={onChangeText}
          style={styles.input}
        />
      </View>
    </View>
  );
}

function ThemeSelector({
  currentMode,
  styles,
  onChange,
}: {
  currentMode: ThemeMode;
  styles: ReturnType<typeof createStyles>;
  onChange: (mode: ThemeMode) => void;
}) {
  const options: {
    mode: ThemeMode;
    label: string;
    icon: IconComponent;
  }[] = [
    { mode: "system", label: "System", icon: Monitor },
    { mode: "light", label: "Light", icon: Sun },
    { mode: "dark", label: "Dark", icon: Moon },
  ];

  return (
    <View style={styles.themeBlock}>
      <View style={styles.preferenceRow}>
        <View style={styles.preferenceIcon}>
          <Moon color={purple} size={23} strokeWidth={2.2} />
        </View>
        <View style={styles.preferenceCopy}>
          <Text numberOfLines={1} style={styles.preferenceTitle}>
            Theme
          </Text>
          <Text numberOfLines={2} style={styles.preferenceSubtitle}>
            Choose system, light, or dark mode
          </Text>
        </View>
      </View>
      <View style={styles.themeOptions}>
        {options.map((option) => (
          <ThemeOptionButton
            key={option.mode}
            option={option}
            selected={currentMode === option.mode}
            styles={styles}
            onPress={() => onChange(option.mode)}
          />
        ))}
      </View>
    </View>
  );
}

function ThemeOptionButton({
  option,
  selected,
  styles,
  onPress,
}: {
  option: {
    mode: ThemeMode;
    label: string;
    icon: IconComponent;
  };
  selected: boolean;
  styles: ReturnType<typeof createStyles>;
  onPress: () => void;
}) {
  const Icon = option.icon;

  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={onPress}
      style={[styles.themeOption, selected ? styles.themeOptionActive : null]}
    >
      <Icon color={selected ? "#ffffff" : purple} size={18} strokeWidth={2.2} />
      <Text
        numberOfLines={1}
        style={[
          styles.themeOptionText,
          selected ? styles.themeOptionTextActive : null,
        ]}
      >
        {option.label}
      </Text>
    </TouchableOpacity>
  );
}

function ActionRow({
  icon: Icon,
  title,
  subtitle,
  styles,
  onPress,
}: {
  icon: IconComponent;
  title: string;
  subtitle: string;
  styles: ReturnType<typeof createStyles>;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={onPress}
      style={styles.preferenceRow}
    >
      <View style={styles.preferenceIcon}>
        <Icon color={purple} size={23} strokeWidth={2.2} />
      </View>
      <View style={styles.preferenceCopy}>
        <Text numberOfLines={1} style={styles.preferenceTitle}>
          {title}
        </Text>
        <Text numberOfLines={2} style={styles.preferenceSubtitle}>
          {subtitle}
        </Text>
      </View>
      <ChevronRight color="#7b879b" size={22} strokeWidth={2.2} />
    </TouchableOpacity>
  );
}

function createStyles(appTheme: AppTheme, width: number, bottomInset: number) {
  const isTiny = width < 360;
  const isCompact = width < 420;
  const isTablet = width >= 768;
  const horizontalPadding = isTiny ? 14 : isCompact ? 16 : 28;
  const heroHeight = isTiny ? 295 : isCompact ? 330 : isTablet ? 420 : 360;

  return StyleSheet.create({
    flex: {
      flex: 1,
    },
    content: {
      paddingBottom: Math.max(bottomInset, 16) + 104,
      gap: isCompact ? 18 : 24,
    },
    hero: {
      minHeight: heroHeight,
      paddingHorizontal: horizontalPadding,
      paddingTop: isCompact ? 16 : 24,
      paddingBottom: isCompact ? 26 : 34,
      borderBottomLeftRadius: isCompact ? 28 : 36,
      borderBottomRightRadius: isCompact ? 28 : 36,
      overflow: "hidden",
      justifyContent: "space-between",
    },
    heroTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 13,
    },
    heroIconButton: {
      width: isCompact ? 44 : 52,
      height: isCompact ? 44 : 52,
      borderRadius: isCompact ? 15 : 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255, 255, 255, 0.14)",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.16)",
    },
    heroTitle: {
      flex: 1,
      color: "#ffffff",
      fontSize: isTiny ? 20 : isCompact ? 23 : isTablet ? 34 : 27,
      lineHeight: isTiny ? 26 : isCompact ? 30 : isTablet ? 42 : 34,
      fontWeight: "900",
      letterSpacing: 0,
    },
    heroProfile: {
      alignItems: "center",
      justifyContent: "center",
      gap: isCompact ? 14 : 18,
    },
    heroCopy: {
      width: "100%",
      minWidth: 0,
      gap: isTiny ? 8 : 11,
      alignItems: "center",
    },
    profileName: {
      color: "#ffffff",
      fontSize: isTiny ? 25 : isCompact ? 29 : isTablet ? 40 : 34,
      lineHeight: isTiny ? 32 : isCompact ? 37 : isTablet ? 50 : 42,
      fontWeight: "900",
      letterSpacing: 0,
      textAlign: "center",
    },
    profileMetaLine: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      minWidth: 0,
      maxWidth: "100%",
    },
    profileMetaText: {
      flexShrink: 1,
      minWidth: 0,
      color: "rgba(255,255,255,0.9)",
      fontSize: isTiny ? 13 : isCompact ? 15 : isTablet ? 19 : 16,
      lineHeight: isTiny ? 19 : isCompact ? 21 : isTablet ? 26 : 22,
      fontWeight: "700",
      textAlign: "center",
    },
    card: {
      marginHorizontal: horizontalPadding,
      borderRadius: isCompact ? 22 : 26,
      borderWidth: 1,
      borderColor: appTheme.colors.borderSoft,
      backgroundColor: appTheme.colors.glass,
      padding: isTiny ? 16 : isCompact ? 18 : isTablet ? 32 : 24,
      gap: isTiny ? 14 : 18,
      boxShadow: appTheme.shadow.card,
    },
    cardTitle: {
      color: appTheme.colors.text,
      fontSize: isTiny ? 20 : isCompact ? 22 : isTablet ? 30 : 25,
      lineHeight: isTiny ? 27 : isCompact ? 29 : isTablet ? 38 : 33,
      fontWeight: "900",
    },
    cardSubtitle: {
      color: appTheme.colors.textMuted,
      fontSize: isTiny ? 14 : isCompact ? 16 : isTablet ? 21 : 18,
      lineHeight: isTiny ? 20 : isCompact ? 23 : isTablet ? 29 : 25,
      fontWeight: "600",
      marginTop: -10,
    },
    fieldBlock: {
      gap: 8,
    },
    fieldLabel: {
      color: appTheme.colors.textMuted,
      fontSize: isTiny ? 13 : isCompact ? 14 : isTablet ? 18 : 16,
      fontWeight: "700",
    },
    inputFrame: {
      minHeight: isTiny ? 58 : isCompact ? 64 : isTablet ? 78 : 70,
      borderRadius: isCompact ? 17 : 20,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      backgroundColor: appTheme.colors.surfaceRaised,
      paddingHorizontal: isTiny ? 14 : 18,
      flexDirection: "row",
      alignItems: "center",
      gap: isTiny ? 11 : 16,
    },
    input: {
      flex: 1,
      minWidth: 0,
      color: appTheme.colors.text,
      fontSize: isTiny ? 16 : isCompact ? 18 : isTablet ? 23 : 20,
      fontWeight: "700",
      paddingVertical: 0,
    },
    preferenceRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    preferenceIcon: {
      width: isCompact ? 52 : 58,
      height: isCompact ? 52 : 58,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: purpleSoft,
    },
    preferenceCopy: {
      flex: 1,
      minWidth: 0,
    },
    preferenceTitle: {
      color: appTheme.colors.text,
      fontSize: isTiny ? 16 : isCompact ? 18 : isTablet ? 22 : 20,
      fontWeight: "900",
    },
    preferenceSubtitle: {
      color: appTheme.colors.textMuted,
      fontSize: isTiny ? 13 : isCompact ? 15 : isTablet ? 19 : 16,
      fontWeight: "600",
      marginTop: 3,
    },
    themeBlock: {
      gap: 16,
    },
    themeOptions: {
      flexDirection: isTiny ? "column" : "row",
      gap: 10,
    },
    themeOption: {
      flex: 1,
      minHeight: isTiny ? 48 : 52,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      backgroundColor: appTheme.colors.surfaceRaised,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: 12,
    },
    themeOptionActive: {
      borderColor: purple,
      backgroundColor: purple,
    },
    themeOptionText: {
      color: appTheme.colors.text,
      fontSize: isTiny ? 13 : isTablet ? 17 : 14,
      fontWeight: "900",
    },
    themeOptionTextActive: {
      color: "#ffffff",
    },
    divider: {
      height: 1,
      backgroundColor: appTheme.colors.borderSoft,
    },
    updateButton: {
      minHeight: isTiny ? 58 : isTablet ? 74 : 64,
      marginHorizontal: horizontalPadding,
      borderRadius: isTiny ? 18 : 20,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 12,
      boxShadow: "0 16px 32px rgba(109, 40, 245, 0.3)",
    },
    updateButtonText: {
      color: "#ffffff",
      fontSize: isTiny ? 17 : isTablet ? 23 : 20,
      fontWeight: "900",
    },
    logoutButton: {
      minHeight: isTiny ? 56 : 64,
      marginHorizontal: horizontalPadding,
      borderRadius: isTiny ? 18 : 20,
      borderWidth: 1,
      borderColor: appTheme.colors.borderSoft,
      backgroundColor: appTheme.colors.glass,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 10,
    },
    logoutText: {
      color: "#e53a53",
      fontSize: isTiny ? 16 : 18,
      fontWeight: "900",
    },
    sheetContent: {
      paddingHorizontal: horizontalPadding,
      paddingTop: 8,
      gap: 16,
    },
    sheetTitle: {
      color: appTheme.colors.text,
      fontSize: isTiny ? 21 : isTablet ? 28 : 24,
      lineHeight: isTiny ? 28 : isTablet ? 36 : 31,
      fontWeight: "900",
    },
    sheetSubtitle: {
      color: appTheme.colors.textMuted,
      fontSize: isTiny ? 13 : isTablet ? 18 : 15,
      lineHeight: isTiny ? 20 : isTablet ? 25 : 22,
      fontWeight: "600",
    },
    sheetPrimaryButton: {
      minHeight: isTiny ? 54 : isTablet ? 68 : 60,
      borderRadius: isTiny ? 17 : 19,
      backgroundColor: purple,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 10,
      boxShadow: "0 14px 28px rgba(109, 40, 245, 0.24)",
    },
    sheetPrimaryText: {
      color: "#ffffff",
      fontSize: isTiny ? 16 : isTablet ? 21 : 18,
      fontWeight: "900",
    },
    disabled: {
      opacity: 0.7,
    },
  });
}

const purpleSoft = "#f0e8ff";

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 16,
  },
  emptyTitle: {
    color: "#101827",
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
});
