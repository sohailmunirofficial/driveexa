import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, IdCard, Phone, Save, User } from "lucide-react-native";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Customer } from "../services/customer-repository";
import { ImagePickerComponent } from "./image-picker";
import { AppScreen } from "./ui/primitives";
import { AppTheme, useAppTheme } from "./ui/theme";

export type CustomerFormData = {
  name: string;
  phone: string;
  cnic: string;
  license_image_url: string;
  license_back_image_url: string;
  cnic_image_url: string;
  cnic_back_image_url: string;
};

type CustomerDetailsFormProps = {
  form: CustomerFormData;
  title: string;
  subtitle: string;
  saveLabel: string;
  saving: boolean;
  onBack: () => void;
  onChange: (field: keyof CustomerFormData, value: string) => void;
  onSave: () => void;
};

type IconComponent = typeof User;

const purple = "#6d28f5";

export function createEmptyCustomerForm(): CustomerFormData {
  return {
    name: "",
    phone: "",
    cnic: "",
    license_image_url: "",
    license_back_image_url: "",
    cnic_image_url: "",
    cnic_back_image_url: "",
  };
}

export function customerToForm(customer: Customer): CustomerFormData {
  return {
    name: customer.name,
    phone: customer.phone,
    cnic: customer.cnic || "",
    license_image_url: customer.license_image_url || "",
    license_back_image_url: customer.license_back_image_url || "",
    cnic_image_url: customer.cnic_image_url || "",
    cnic_back_image_url: customer.cnic_back_image_url || "",
  };
}

export function CustomerDetailsForm({
  form,
  title,
  subtitle,
  saveLabel,
  saving,
  onBack,
  onChange,
  onSave,
}: CustomerDetailsFormProps) {
  const appTheme = useAppTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => createStyles(appTheme, width, insets.bottom),
    [appTheme, insets.bottom, width],
  );

  return (
    <AppScreen>
      <View style={styles.topBar}>
        <TouchableOpacity
          activeOpacity={0.84}
          onPress={onBack}
          style={styles.backButton}
        >
          <ArrowLeft
            color={appTheme.colors.slate}
            size={25}
            strokeWidth={2.3}
          />
        </TouchableOpacity>
        <View style={styles.brandBlock}>
          <Text numberOfLines={1} style={styles.brandText}>
            Drive<Text style={styles.brandAccent}>x</Text>a
          </Text>
          <Text numberOfLines={1} style={styles.brandSubtitle}>
            Premium Car Rental
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.titleBlock}>
          <Text numberOfLines={2} style={styles.title}>
            {title}
          </Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <View style={styles.formCard}>
          <FormInput
            icon={User}
            label="Full Name"
            required
            helper="Enter customer's full name as per CNIC."
            value={form.name}
            placeholder="Ali Raza"
            styles={styles}
            onChangeText={(value) => onChange("name", value)}
          />
          <FormInput
            icon={Phone}
            label="Phone Number"
            required
            helper="Enter a valid mobile number."
            value={form.phone}
            placeholder="+92 300 0000000"
            keyboardType="phone-pad"
            styles={styles}
            onChangeText={(value) => onChange("phone", value)}
          />
          <FormInput
            icon={IdCard}
            label="CNIC Number"
            required
            helper="Enter CNIC number without spaces."
            value={form.cnic}
            placeholder="35202-1234567-1"
            keyboardType="number-pad"
            styles={styles}
            onChangeText={(value) => onChange("cnic", value)}
          />

          <View style={styles.divider} />

          <DocumentGroup
            title="License Images"
            helper="Upload clear front and back sides of the driving license."
            frontValue={form.license_image_url}
            backValue={form.license_back_image_url}
            frontLabel="License Front"
            backLabel="License Back"
            styles={styles}
            onFrontSelected={(uri) => onChange("license_image_url", uri)}
            onBackSelected={(uri) => onChange("license_back_image_url", uri)}
          />

          <View style={styles.divider} />

          <DocumentGroup
            title="CNIC Images"
            helper="Upload clear front and back sides of the CNIC."
            frontValue={form.cnic_image_url}
            backValue={form.cnic_back_image_url}
            frontLabel="CNIC Front"
            backLabel="CNIC Back"
            styles={styles}
            onFrontSelected={(uri) => onChange("cnic_image_url", uri)}
            onBackSelected={(uri) => onChange("cnic_back_image_url", uri)}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          activeOpacity={0.86}
          disabled={saving}
          onPress={onSave}
          style={[styles.saveButton, saving ? styles.disabled : null]}
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
              <Save color="#ffffff" size={24} strokeWidth={2.4} />
              <Text numberOfLines={1} style={styles.saveButtonText}>
                {saveLabel}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </AppScreen>
  );
}

function FormInput({
  icon: Icon,
  label,
  helper,
  required,
  value,
  placeholder,
  keyboardType,
  styles,
  onChangeText,
}: {
  icon: IconComponent;
  label: string;
  helper: string;
  required?: boolean;
  value: string;
  placeholder: string;
  keyboardType?: "default" | "phone-pad" | "number-pad";
  styles: ReturnType<typeof createStyles>;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>
        {label} {required ? <Text style={styles.required}>*</Text> : null}
      </Text>
      <View style={styles.inputFrame}>
        <Icon color={purple} size={24} strokeWidth={2.2} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#8992aa"
          keyboardType={keyboardType}
          style={styles.input}
        />
      </View>
      <Text style={styles.helperText}>{helper}</Text>
    </View>
  );
}

function DocumentGroup({
  title,
  helper,
  frontValue,
  backValue,
  frontLabel,
  backLabel,
  styles,
  onFrontSelected,
  onBackSelected,
}: {
  title: string;
  helper: string;
  frontValue: string;
  backValue: string;
  frontLabel: string;
  backLabel: string;
  styles: ReturnType<typeof createStyles>;
  onFrontSelected: (uri: string) => void;
  onBackSelected: (uri: string) => void;
}) {
  return (
    <View style={styles.documentGroup}>
      <Text style={styles.documentTitle}>
        {title} <Text style={styles.required}>*</Text>
      </Text>
      <View style={styles.documentGrid}>
        <View style={styles.documentColumn}>
          <ImagePickerComponent
            label={frontLabel}
            value={frontValue}
            onImageSelected={onFrontSelected}
          />
        </View>
        <View style={styles.documentColumn}>
          <ImagePickerComponent
            label={backLabel}
            value={backValue}
            onImageSelected={onBackSelected}
          />
        </View>
      </View>
      <Text style={styles.helperText}>{helper}</Text>
    </View>
  );
}

function createStyles(appTheme: AppTheme, width: number, bottomInset: number) {
  const isTiny = width < 360;
  const isCompact = width < 390;
  const isNarrow = width < 680;
  const isTablet = width >= 768;
  const screenPadding = isTiny ? 14 : isCompact ? 16 : isTablet ? 32 : 20;
  const footerPaddingBottom = Math.max(bottomInset, 14);
  const footerHeight = isCompact ? 90 : 104;

  return StyleSheet.create({
    topBar: {
      paddingHorizontal: screenPadding,
      paddingTop: isCompact ? 10 : 18,
      paddingBottom: isCompact ? 12 : 18,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 14,
    },
    backButton: {
      width: isCompact ? 50 : 58,
      height: isCompact ? 50 : 58,
      borderRadius: isCompact ? 17 : 20,
      borderWidth: 1,
      borderColor: appTheme.colors.borderSoft,
      backgroundColor: appTheme.colors.glass,
      alignItems: "center",
      justifyContent: "center",
      boxShadow: appTheme.shadow.soft,
    },
    brandBlock: {
      flex: 1,
      minWidth: 0,
      alignItems: "center",
    },
    brandText: {
      color: appTheme.colors.text,
      fontSize: isTiny ? 34 : isTablet ? 48 : 42,
      lineHeight: isTiny ? 40 : isTablet ? 56 : 49,
      fontWeight: "900",
      letterSpacing: 0,
    },
    brandAccent: {
      color: purple,
    },
    brandSubtitle: {
      color: appTheme.colors.textMuted,
      fontSize: isTiny ? 13 : isTablet ? 18 : 15,
      fontWeight: "700",
      marginTop: -2,
    },
    headerSpacer: {
      width: isCompact ? 50 : 58,
    },
    content: {
      paddingHorizontal: screenPadding,
      paddingBottom: footerHeight + footerPaddingBottom + 28,
      gap: isCompact ? 16 : 20,
    },
    titleBlock: {
      gap: 8,
    },
    title: {
      color: appTheme.colors.text,
      fontSize: isTiny ? 30 : isTablet ? 42 : 36,
      lineHeight: isTiny ? 38 : isTablet ? 50 : 44,
      fontWeight: "900",
      letterSpacing: 0,
    },
    subtitle: {
      color: appTheme.colors.textMuted,
      fontSize: isTiny ? 15 : isTablet ? 22 : 18,
      lineHeight: isTiny ? 22 : isTablet ? 30 : 25,
      fontWeight: "700",
    },
    formCard: {
      borderRadius: isCompact ? 20 : 24,
      borderWidth: 1,
      borderColor: appTheme.colors.borderSoft,
      backgroundColor: appTheme.colors.glass,
      padding: isTiny ? 14 : isTablet ? 28 : 20,
      gap: isTiny ? 17 : 22,
      boxShadow: appTheme.shadow.card,
    },
    fieldWrap: {
      gap: 8,
    },
    fieldLabel: {
      color: appTheme.colors.text,
      fontSize: isTiny ? 16 : isTablet ? 21 : 18,
      fontWeight: "900",
    },
    required: {
      color: "#e11d48",
    },
    inputFrame: {
      minHeight: isTiny ? 58 : isTablet ? 76 : 68,
      borderRadius: isCompact ? 17 : 20,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      backgroundColor: appTheme.colors.surfaceRaised,
      paddingHorizontal: isTiny ? 14 : 18,
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    input: {
      flex: 1,
      minWidth: 0,
      color: appTheme.colors.text,
      fontSize: isTiny ? 16 : isTablet ? 22 : 19,
      fontWeight: "700",
      paddingVertical: 0,
    },
    helperText: {
      color: appTheme.colors.textMuted,
      fontSize: isTiny ? 13 : isTablet ? 18 : 15,
      lineHeight: isTiny ? 19 : isTablet ? 25 : 21,
      fontWeight: "600",
    },
    divider: {
      height: 1,
      backgroundColor: appTheme.colors.borderSoft,
    },
    documentGroup: {
      gap: 12,
    },
    documentTitle: {
      color: appTheme.colors.text,
      fontSize: isTiny ? 16 : isTablet ? 21 : 18,
      fontWeight: "900",
    },
    documentGrid: {
      flexDirection: isNarrow ? "column" : "row",
      gap: isTiny ? 12 : 16,
    },
    documentColumn: {
      flex: 1,
      minWidth: 0,
    },
    footer: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      minHeight: footerHeight,
      paddingHorizontal: screenPadding,
      paddingTop: 14,
      paddingBottom: footerPaddingBottom,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      borderWidth: 1,
      borderColor: appTheme.colors.borderSoft,
      backgroundColor: appTheme.colors.glass,
      boxShadow: "0 -12px 34px rgba(16, 24, 39, 0.12)",
    },
    saveButton: {
      minHeight: isTiny ? 56 : 64,
      borderRadius: isTiny ? 18 : 20,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 13,
      boxShadow: "0 16px 30px rgba(109, 40, 245, 0.28)",
    },
    saveButtonText: {
      color: "#ffffff",
      fontSize: isTiny ? 17 : isTablet ? 23 : 20,
      fontWeight: "900",
    },
    disabled: {
      opacity: 0.7,
    },
  });
}
