import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import {
  Armchair,
  CalendarDays,
  CarFront,
  Check,
  ChevronDown,
  Clock3,
  Droplet,
  FileText,
  Fuel,
  IdCard,
  Settings,
  Tag,
} from "lucide-react-native";
import { ComponentType, useCallback, useMemo, useRef } from "react";
import {
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { MultiImagePickerComponent } from "./image-picker";
import { Card } from "./ui/primitives";
import { ResponsiveLayout, useResponsiveLayout } from "./ui/responsive";
import { AppTheme, useAppTheme } from "./ui/theme";

export type VehicleFormState = {
  name: string;
  type: string;
  registrationNumber: string;
  modelYear: string;
  color: string;
  price: string;
  pricePerHour: string;
  image_urls: string[];
  transmission: string;
  seats: string;
  fuel: string;
  description: string;
  isAvailable: boolean;
};

type VehicleFormProps = {
  form: VehicleFormState;
  onChange: (nextForm: VehicleFormState) => void;
};

type SelectOption = {
  label: string;
  value: string;
};

type IconProps = {
  color?: string;
  size?: number;
  strokeWidth?: number;
};

type VehicleFieldProps = TextInputProps & {
  label: string;
  icon: ComponentType<IconProps>;
  required?: boolean;
};

type VehicleSelectFieldProps = {
  label: string;
  icon: ComponentType<IconProps>;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  required?: boolean;
};

const currentYear = new Date().getFullYear();
const MODEL_YEAR_OPTIONS = Array.from(
  { length: currentYear - 1979 + 2 },
  (_, index) => {
    const year = currentYear + 1 - index;
    return { label: String(year), value: String(year) };
  },
);
const TRANSMISSION_OPTIONS: SelectOption[] = [
  { label: "Automatic", value: "Automatic" },
  { label: "Manual", value: "Manual" },
  { label: "CVT", value: "CVT" },
  { label: "Semi-Automatic", value: "Semi-Automatic" },
  { label: "Electric", value: "Electric" },
];
const SEAT_OPTIONS: SelectOption[] = Array.from({ length: 30 }, (_, index) => {
  const seats = String(index + 1);
  return {
    label: `${seats} ${index === 0 ? "Seat" : "Seats"}`,
    value: seats,
  };
});
const FUEL_TYPE_OPTIONS: SelectOption[] = [
  { label: "Petrol", value: "Petrol" },
  { label: "Diesel", value: "Diesel" },
  { label: "Hybrid", value: "Hybrid" },
  { label: "Electric", value: "Electric" },
  { label: "CNG", value: "CNG" },
  { label: "LPG", value: "LPG" },
];

function cleanCurrencyInput(value: string): string {
  return value.replace(/[^\d.]/g, "");
}

function isPositiveNumber(value: string): boolean {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0;
}

export function validateVehicleForm(form: VehicleFormState): string | null {
  const requiredFields: [string, string][] = [
    [form.name, "Vehicle name"],
    [form.type, "Vehicle type"],
    [form.registrationNumber, "Registration number"],
    [form.modelYear, "Model year"],
    [form.color, "Color"],
    [form.transmission, "Transmission"],
    [form.seats, "Seats"],
    [form.fuel, "Fuel type"],
    [form.price, "Price per day"],
    [form.pricePerHour, "Price per hour"],
    [form.description, "Description"],
  ];

  const missingField = requiredFields.find(([value]) => !value.trim());
  if (missingField) {
    return `${missingField[1]} is required.`;
  }

  if (!isPositiveNumber(form.price)) {
    return "Price per day must be greater than 0.";
  }

  if (!isPositiveNumber(form.pricePerHour)) {
    return "Price per hour must be greater than 0.";
  }

  return null;
}

export function VehicleForm({ form, onChange }: VehicleFormProps) {
  const appTheme = useAppTheme();
  const layout = useResponsiveLayout();
  const { width } = useWindowDimensions();
  const styles = useMemo(
    () => createStyles(appTheme, layout, width),
    [appTheme, layout, width],
  );

  return (
    <View style={styles.stack}>
      <Card style={styles.photoCard}>
        <MultiImagePickerComponent
          label="Photos"
          helper="Add up to 10 images. First image will be the cover photo."
          values={form.image_urls}
          maxImages={10}
          onImagesSelected={(image_urls) => onChange({ ...form, image_urls })}
        />
      </Card>

      <Card style={styles.formCard}>
        <VehicleTextField
          label="Vehicle Name"
          required
          icon={CarFront}
          placeholder="e.g. Mercedes-Benz C-Class AMG"
          value={form.name}
          onChangeText={(name) => onChange({ ...form, name })}
          styles={styles}
          appTheme={appTheme}
        />

        <View style={styles.twoColumn}>
          <VehicleTextField
            label="Vehicle Type"
            required
            icon={CarFront}
            placeholder="e.g. Sedan, SUV, Hiace"
            value={form.type}
            onChangeText={(type) => onChange({ ...form, type })}
            styles={styles}
            appTheme={appTheme}
          />
          <VehicleTextField
            label="Registration Number"
            required
            icon={IdCard}
            placeholder="ABC-123"
            autoCapitalize="characters"
            value={form.registrationNumber}
            onChangeText={(registrationNumber) =>
              onChange({ ...form, registrationNumber })
            }
            styles={styles}
            appTheme={appTheme}
          />
        </View>

        <View style={styles.twoColumn}>
          <VehicleSelectField
            label="Model Year"
            required
            icon={CalendarDays}
            value={form.modelYear}
            options={MODEL_YEAR_OPTIONS}
            onChange={(modelYear) => onChange({ ...form, modelYear })}
          />
          <VehicleTextField
            label="Color"
            required
            icon={Droplet}
            placeholder="e.g. Obsidian Black"
            value={form.color}
            onChangeText={(color) => onChange({ ...form, color })}
            styles={styles}
            appTheme={appTheme}
          />
        </View>

        <View style={styles.twoColumn}>
          <VehicleSelectField
            label="Transmission"
            required
            icon={Settings}
            value={form.transmission}
            options={TRANSMISSION_OPTIONS}
            onChange={(transmission) => onChange({ ...form, transmission })}
          />
          <VehicleSelectField
            label="Seats"
            required
            icon={Armchair}
            value={form.seats}
            options={SEAT_OPTIONS}
            onChange={(seats) => onChange({ ...form, seats })}
          />
        </View>

        <View style={styles.twoColumn}>
          <VehicleSelectField
            label="Fuel Type"
            required
            icon={Fuel}
            value={form.fuel}
            options={FUEL_TYPE_OPTIONS}
            onChange={(fuel) => onChange({ ...form, fuel })}
          />
          <VehicleTextField
            label="Price per Day"
            required
            icon={Tag}
            placeholder="PKR 15,000"
            keyboardType="decimal-pad"
            value={form.price}
            onChangeText={(price) =>
              onChange({ ...form, price: cleanCurrencyInput(price) })
            }
            styles={styles}
            appTheme={appTheme}
          />
        </View>

        <View style={styles.twoColumn}>
          <VehicleTextField
            label="Price per Hour"
            required
            icon={Clock3}
            placeholder="PKR 2,200"
            keyboardType="decimal-pad"
            value={form.pricePerHour}
            onChangeText={(pricePerHour) =>
              onChange({
                ...form,
                pricePerHour: cleanCurrencyInput(pricePerHour),
              })
            }
            styles={styles}
            appTheme={appTheme}
          />
          <View style={styles.columnSpacer} />
        </View>

        <VehicleTextField
          label="Description"
          required
          icon={FileText}
          placeholder="Describe your vehicle features, performance, and any special highlights..."
          multiline
          textAlignVertical="top"
          maxLength={500}
          value={form.description}
          onChangeText={(description) => onChange({ ...form, description })}
          styles={styles}
          appTheme={appTheme}
          inputStyle={styles.descriptionInput}
        />
        <Text style={styles.descriptionCount}>
          {form.description.length}/500
        </Text>
      </Card>

      <View style={styles.availabilityRow}>
        <View style={styles.availabilityTextBlock}>
          <Text style={styles.availabilityTitle}>Availability</Text>
          <Text style={styles.availabilitySubtitle}>
            Make this vehicle available for bookings
          </Text>
        </View>
        <Switch
          value={form.isAvailable}
          onValueChange={(isAvailable) => onChange({ ...form, isAvailable })}
          trackColor={{
            false: appTheme.colors.border,
            true: "#7c2dff",
          }}
          thumbColor="#ffffff"
          ios_backgroundColor={appTheme.colors.border}
        />
      </View>
    </View>
  );
}

function VehicleTextField({
  label,
  icon: Icon,
  required,
  styles,
  appTheme,
  inputStyle,
  ...props
}: VehicleFieldProps & {
  styles: ReturnType<typeof createStyles>;
  appTheme: AppTheme;
  inputStyle?: TextInputProps["style"];
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.floatingLabel}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <View style={styles.inputShell}>
        <Icon
          color={appTheme.colors.textMuted}
          size={styles.fieldIcon.width}
          strokeWidth={2.1}
        />
        <TextInput
          {...props}
          placeholderTextColor={appTheme.colors.textSubtle}
          style={[styles.input, inputStyle]}
        />
      </View>
    </View>
  );
}

function VehicleSelectField({
  label,
  icon: Icon,
  value,
  options,
  onChange,
  required,
}: VehicleSelectFieldProps) {
  const appTheme = useAppTheme();
  const layout = useResponsiveLayout();
  const { width } = useWindowDimensions();
  const styles = useMemo(
    () => createStyles(appTheme, layout, width),
    [appTheme, layout, width],
  );
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["58%", "82%"], []);
  const selectedOption = options.find((option) => option.value === value);
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

  const handleSelect = (nextValue: string) => {
    onChange(nextValue);
    sheetRef.current?.dismiss();
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.84}
        onPress={() => sheetRef.current?.present()}
        style={styles.fieldWrap}
      >
        <Text style={styles.floatingLabel}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
        <View style={styles.inputShell}>
          <Icon
            color={appTheme.colors.textMuted}
            size={styles.fieldIcon.width}
            strokeWidth={2.1}
          />
          <Text numberOfLines={1} style={styles.selectValue}>
            {selectedOption?.label || "Select"}
          </Text>
          <ChevronDown
            color={appTheme.colors.textMuted}
            size={20}
            strokeWidth={2.2}
          />
        </View>
      </TouchableOpacity>

      <BottomSheetModal
        ref={sheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: appTheme.colors.surface }}
        handleIndicatorStyle={{ backgroundColor: appTheme.colors.border }}
      >
        <BottomSheetScrollView
          contentContainerStyle={styles.selectSheetContent}
        >
          <Text style={styles.selectSheetTitle}>{label}</Text>
          <View style={styles.optionList}>
            {options.map((option) => {
              const selected = option.value === value;
              return (
                <TouchableOpacity
                  key={option.value}
                  activeOpacity={0.84}
                  onPress={() => handleSelect(option.value)}
                  style={[
                    styles.optionRow,
                    selected ? styles.optionRowSelected : null,
                  ]}
                >
                  {selected ? (
                    <LinearGradient
                      colors={[
                        "rgba(109, 40, 245, 0.16)",
                        "rgba(109, 40, 245, 0.06)",
                      ]}
                      style={StyleSheet.absoluteFill}
                    />
                  ) : null}
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.optionText,
                      selected ? styles.optionTextSelected : null,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {selected ? (
                    <Check color="#6d28f5" size={20} strokeWidth={2.5} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>
    </>
  );
}

function createStyles(
  appTheme: AppTheme,
  layout: ResponsiveLayout,
  width: number,
) {
  const isTiny = width < 360;
  const isCompact = width < 380;
  const isTablet = layout.isTablet;
  const inputMinHeight = isTiny ? 55 : isTablet ? 70 : 60;

  return StyleSheet.create({
    stack: {
      gap: isCompact ? 16 : isTablet ? 24 : 20,
    },
    photoCard: {
      gap: isCompact ? 14 : 18,
      borderRadius: isCompact ? 20 : isTablet ? 26 : 22,
      padding: isCompact ? 16 : isTablet ? 26 : 20,
    },
    formCard: {
      gap: isCompact ? 18 : isTablet ? 24 : 20,
      borderRadius: isCompact ? 20 : isTablet ? 26 : 22,
      padding: isCompact ? 16 : isTablet ? 26 : 20,
    },
    twoColumn: {
      flexDirection: layout.isNarrow ? "column" : "row",
      gap: isCompact ? 14 : isTablet ? 22 : 18,
    },
    columnSpacer: {
      flex: 1,
      minWidth: 0,
      display: layout.isNarrow ? "none" : "flex",
    },
    fieldWrap: {
      flex: 1,
      minWidth: 0,
    },
    floatingLabel: {
      alignSelf: "flex-start",
      backgroundColor: appTheme.colors.surface,
      color: appTheme.colors.textMuted,
      fontSize: isTiny ? 11 : isTablet ? 15 : 13,
      fontWeight: "800",
      marginLeft: 16,
      marginBottom: -9,
      paddingHorizontal: 6,
      zIndex: 2,
    },
    required: {
      color: appTheme.colors.danger,
    },
    inputShell: {
      minHeight: inputMinHeight,
      borderRadius: isTiny ? 16 : isTablet ? 20 : 18,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      backgroundColor: appTheme.colors.surfaceRaised,
      flexDirection: "row",
      alignItems: "center",
      gap: isTiny ? 10 : isTablet ? 16 : 13,
      paddingHorizontal: isTiny ? 14 : isTablet ? 18 : 16,
    },
    fieldIcon: {
      width: isTiny ? 19 : isTablet ? 25 : 21,
      height: isTiny ? 19 : isTablet ? 25 : 21,
    },
    input: {
      flex: 1,
      minWidth: 0,
      color: appTheme.colors.text,
      fontSize: isTiny ? 14 : isTablet ? 19 : 16,
      fontWeight: "700",
      paddingVertical: 0,
    },
    selectValue: {
      flex: 1,
      minWidth: 0,
      color: appTheme.colors.text,
      fontSize: isTiny ? 14 : isTablet ? 19 : 16,
      fontWeight: "700",
    },
    descriptionInput: {
      minHeight: isTiny ? 90 : isTablet ? 132 : 108,
      paddingTop: isTiny ? 15 : 18,
      lineHeight: isTiny ? 20 : isTablet ? 27 : 23,
    },
    descriptionCount: {
      alignSelf: "flex-end",
      color: appTheme.colors.textMuted,
      fontSize: isTiny ? 12 : isTablet ? 15 : 13,
      fontWeight: "700",
      marginTop: -14,
      marginRight: 16,
    },
    availabilityRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      paddingHorizontal: isCompact ? 6 : 10,
      paddingBottom: 2,
    },
    availabilityTextBlock: {
      flex: 1,
      minWidth: 0,
    },
    availabilityTitle: {
      color: appTheme.colors.text,
      fontSize: isTiny ? 17 : isTablet ? 22 : 19,
      fontWeight: "900",
    },
    availabilitySubtitle: {
      color: appTheme.colors.textMuted,
      fontSize: isTiny ? 13 : isTablet ? 17 : 15,
      fontWeight: "600",
      marginTop: 5,
      lineHeight: isTiny ? 18 : isTablet ? 24 : 21,
    },
    selectSheetContent: {
      paddingHorizontal: isCompact ? 18 : 24,
      paddingTop: 18,
      paddingBottom: 42,
      gap: 16,
    },
    selectSheetTitle: {
      color: appTheme.colors.text,
      fontSize: isTiny ? 20 : isTablet ? 25 : 22,
      fontWeight: "900",
      textAlign: "center",
    },
    optionList: {
      gap: 9,
    },
    optionRow: {
      minHeight: isTiny ? 48 : isTablet ? 58 : 52,
      borderRadius: isTiny ? 15 : 17,
      borderWidth: 1,
      borderColor: appTheme.colors.borderSoft,
      backgroundColor: appTheme.colors.surfaceRaised,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      overflow: "hidden",
    },
    optionRowSelected: {
      borderColor: "#a78bfa",
    },
    optionText: {
      flex: 1,
      minWidth: 0,
      color: appTheme.colors.text,
      fontSize: isTiny ? 14 : isTablet ? 18 : 16,
      fontWeight: "800",
    },
    optionTextSelected: {
      color: "#6d28f5",
    },
  });
}
